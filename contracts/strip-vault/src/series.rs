use near_sdk::json_types::{U128, U64};
use near_sdk::serde_json::json;
use near_sdk::{AccountId, Promise, PromiseError, PromiseOrValue, env, near, require};

use crate::events::emit;
use crate::types::*;
use crate::{Contract, ContractExt};

impl Contract {
    pub(crate) fn status(&self) -> Status {
        if self.maturity_index.is_some() {
            Status::Settled
        } else if env::block_timestamp_ms() >= self.maturity_ms {
            Status::Matured
        } else {
            Status::Active
        }
    }

    pub(crate) fn cur_index(&self) -> u128 {
        match self.maturity_index {
            Some(frozen) => self.index.min(frozen),
            None => self.index,
        }
    }

    pub(crate) fn apply_index(&mut self, price: u128) -> bool {
        let grew = price > self.index;
        if grew {
            self.index = price;
        }
        self.index_ts_ms = env::block_timestamp_ms();
        if grew {
            emit(
                "index_sync",
                json!({
                    "index": self.index.to_string(),
                    "index_ts_ms": self.index_ts_ms.to_string(),
                }),
            );
        }
        grew
    }

    pub(crate) fn has_headroom(&self) -> bool {
        let locked = u128::from(env::storage_usage())
            .saturating_mul(env::storage_byte_cost().as_yoctonear());
        env::account_balance()
            .as_yoctonear()
            .saturating_sub(locked)
            >= STORAGE_HEADROOM_YOCTO
    }

    pub(crate) fn fetch_price(&self) -> Promise {
        ext_underlying::ext(self.underlying.clone())
            .with_static_gas(GAS_PRICE)
            .get_st_near_price()
    }
}

#[near]
impl Contract {
    pub fn get_series(&self) -> SeriesView {
        SeriesView {
            underlying: self.underlying.clone(),
            pt: self.pt.clone(),
            yt: env::current_account_id(),
            maturity_ms: U64(self.maturity_ms),
            year_secs: U64(self.year_secs),
            min_strip: U128(self.min_strip),
            status: self.status(),
            index: U128(self.index),
            index_ts_ms: U64(self.index_ts_ms),
            maturity_index: self.maturity_index.map(U128),
            total_sy: U128(self.total_sy),
            pt_supply: U128(self.pt_supply),
            yt_supply: U128(self.yt_supply),
            open_offers: self.offers.len() as u64,
        }
    }

    pub fn get_position(&self, account_id: AccountId) -> PositionView {
        let account = self.account_or_default(&account_id);
        PositionView {
            yt_balance: U128(account.balance),
            yt_locked: U128(account.locked),
            yt_accrued_sy: U128(account.accrued_sy),
            yt_pending_sy: U128(self.pending_of(&account)),
            sy_credit: U128(self.credits.get(&account_id).copied().unwrap_or(0)),
        }
    }

    pub fn sync_index(&mut self) -> Promise {
        self.fetch_price().then(
            Self::ext(env::current_account_id())
                .with_static_gas(GAS_SYNC_CALLBACK)
                .on_sync_index(),
        )
    }

    #[private]
    pub fn on_sync_index(&mut self, #[callback_result] price: Result<U128, PromiseError>) -> U128 {
        match price {
            Ok(p) if p.0 > 0 => {
                self.apply_index(p.0);
            }
            Ok(_) => env::log_str("E_PRICE_ZERO"),
            Err(_) => env::log_str("E_PRICE_FETCH_FAILED"),
        }
        U128(self.index)
    }

    pub fn settle(&mut self) -> PromiseOrValue<U128> {
        if let Some(frozen) = self.maturity_index {
            return PromiseOrValue::Value(U128(frozen));
        }
        require!(
            env::block_timestamp_ms() >= self.maturity_ms,
            "E_NOT_MATURED"
        );
        PromiseOrValue::Promise(
            self.fetch_price().then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_SYNC_CALLBACK)
                    .on_settle(),
            ),
        )
    }

    #[private]
    pub fn on_settle(&mut self, #[callback_result] price: Result<U128, PromiseError>) -> U128 {
        if let Some(frozen) = self.maturity_index {
            return U128(frozen);
        }
        let fetched = match price {
            Ok(p) if p.0 > 0 => p.0,
            _ => {
                env::log_str("E_PRICE_ZERO");
                return U128(0);
            }
        };
        self.apply_index(fetched);
        let frozen = self.index;
        self.maturity_index = Some(frozen);
        emit(
            "settle",
            json!({
                "maturity_index": frozen.to_string(),
                "settled_ms": env::block_timestamp_ms().to_string(),
            }),
        );
        U128(frozen)
    }
}
