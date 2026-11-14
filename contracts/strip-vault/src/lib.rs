mod events;
mod ledger;
mod market;
mod math;
mod series;
#[cfg(test)]
mod tests;
pub mod types;

use near_contract_standards::fungible_token::metadata::FungibleTokenMetadata;
use near_contract_standards::fungible_token::receiver::FungibleTokenReceiver;
use near_sdk::json_types::{U128, U64};
use near_sdk::serde_json::{self, json};
use near_sdk::store::{IterableMap, LookupMap};
use near_sdk::{
    AccountId, BorshStorageKey, PanicOnDefault, Promise, PromiseError, PromiseOrValue,
    assert_one_yocto, env, near, require,
};

use crate::events::emit;
use crate::ledger::YtAccount;
use crate::math::{SCALE, mul_div};
use crate::types::*;

#[near(serializers = [borsh])]
#[derive(BorshStorageKey)]
enum StorageKey {
    Accounts,
    Credits,
    Offers,
    SellerOffers,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    owner: AccountId,
    underlying: AccountId,
    pt: AccountId,
    maturity_ms: u64,
    year_secs: u64,
    min_strip: u128,
    index: u128,
    index_ts_ms: u64,
    maturity_index: Option<u128>,
    total_sy: u128,
    total_credit: u128,
    total_accrued: u128,
    pt_supply: u128,
    yt_supply: u128,
    yt_symbol: String,
    next_offer_id: u64,
    accounts: LookupMap<AccountId, YtAccount>,
    credits: LookupMap<AccountId, u128>,
    offers: IterableMap<u64, StoredOffer>,
    seller_offers: LookupMap<AccountId, Vec<u64>>,
}

pub(crate) fn refund(code: &str, amount: u128) -> PromiseOrValue<U128> {
    env::log_str(code);
    PromiseOrValue::Value(U128(amount))
}

#[near]
impl Contract {
    #[init]
    pub fn new(
        owner: AccountId,
        underlying: AccountId,
        pt: AccountId,
        maturity_ms: U64,
        year_secs: U64,
        min_strip: U128,
    ) -> Self {
        require!(year_secs.0 > 0, "E_BAD_MSG");
        require!(min_strip.0 > 0, "E_MIN_AMOUNT");
        let this = env::current_account_id();
        ext_underlying::ext(underlying.clone())
            .with_attached_deposit(UNDERLYING_REGISTRATION)
            .with_static_gas(GAS_TRANSFER)
            .storage_deposit(Some(this.clone()), Some(true))
            .detach();
        ext_pt::ext(pt.clone())
            .with_attached_deposit(PT_REGISTRATION)
            .with_static_gas(GAS_TRANSFER)
            .storage_deposit(Some(this.clone()), Some(true))
            .detach();
        ext_pt::ext(pt.clone())
            .with_static_gas(GAS_PRICE)
            .ft_metadata()
            .then(
                Self::ext(this.clone())
                    .with_static_gas(GAS_SYNC_CALLBACK)
                    .on_pt_metadata(),
            )
            .detach();
        ext_underlying::ext(underlying.clone())
            .with_static_gas(GAS_PRICE)
            .get_st_near_price()
            .then(
                Self::ext(this)
                    .with_static_gas(GAS_SYNC_CALLBACK)
                    .on_sync_index(),
            )
            .detach();
        Self {
            owner,
            underlying,
            pt,
            maturity_ms: maturity_ms.0,
            year_secs: year_secs.0,
            min_strip: min_strip.0,
            index: 0,
            index_ts_ms: 0,
            maturity_index: None,
            total_sy: 0,
            total_credit: 0,
            total_accrued: 0,
            pt_supply: 0,
            yt_supply: 0,
            yt_symbol: "YT".to_string(),
            next_offer_id: 1,
            accounts: LookupMap::new(StorageKey::Accounts),
            credits: LookupMap::new(StorageKey::Credits),
            offers: IterableMap::new(StorageKey::Offers),
            seller_offers: LookupMap::new(StorageKey::SellerOffers),
        }
    }

    #[private]
    pub fn on_pt_metadata(
        &mut self,
        #[callback_result] meta: Result<FungibleTokenMetadata, PromiseError>,
    ) {
        if let Ok(metadata) = meta
            && let Some(rest) = metadata.symbol.strip_prefix("PT-")
        {
            self.yt_symbol = format!("YT-{rest}");
        }
    }

    #[private]
    pub fn on_strip_index(
        &mut self,
        sender: AccountId,
        amount: U128,
        #[callback_result] price: Result<U128, PromiseError>,
    ) -> PromiseOrValue<U128> {
        let amount = amount.0;
        let fetched = match price {
            Ok(p) if p.0 > 0 => p.0,
            Ok(_) => return refund("E_PRICE_ZERO", amount),
            Err(_) => return refund("E_STALE_INDEX", amount),
        };
        if self.status() != Status::Active {
            return refund("E_NOT_ACTIVE", amount);
        }
        if !self.has_headroom() {
            return refund("E_STORAGE_LOW", amount);
        }
        self.apply_index(fetched);
        let py = mul_div(amount, self.index, SCALE);
        if py == 0 {
            return refund("E_MIN_AMOUNT", amount);
        }
        PromiseOrValue::Promise(
            ext_pt::ext(self.pt.clone())
                .with_static_gas(GAS_MINT)
                .mint(sender.clone(), U128(py))
                .then(
                    Self::ext(env::current_account_id())
                        .with_static_gas(GAS_MINTED)
                        .with_unused_gas_weight(1)
                        .on_strip_minted(sender, U128(amount), U128(py)),
                ),
        )
    }

    #[private]
    pub fn on_strip_minted(&mut self, sender: AccountId, amount: U128, py: U128) -> U128 {
        if !near_sdk::is_promise_success() {
            env::log_str("E_MINT_FAILED");
            return amount;
        }
        self.credit_yt(&sender, py.0);
        self.total_sy = self.total_sy.saturating_add(amount.0);
        self.pt_supply = self.pt_supply.saturating_add(py.0);
        emit(
            "strip",
            json!({
                "account_id": sender,
                "sy_in": amount.0.to_string(),
                "py": py.0.to_string(),
                "index": self.index.to_string(),
            }),
        );
        U128(0)
    }

    #[payable]
    pub fn sweep_residual(&mut self) -> Promise {
        assert_one_yocto();
        require!(env::predecessor_account_id() == self.owner, "E_NOT_OWNER");
        require!(self.fully_settled(), "E_NOT_SETTLED");
        ext_underlying::ext(self.underlying.clone())
            .with_static_gas(GAS_PRICE)
            .ft_balance_of(env::current_account_id())
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_STRIP_INDEX)
                    .on_sweep_balance(),
            )
    }

    #[private]
    pub fn on_sweep_balance(
        &mut self,
        #[callback_result] balance: Result<U128, PromiseError>,
    ) -> PromiseOrValue<U128> {
        let Ok(balance) = balance else {
            return refund("E_SWEEP_FAILED", 0);
        };
        if !self.fully_settled() {
            return refund("E_NOT_SETTLED", 0);
        }
        let surplus = balance.0.saturating_sub(self.total_credit);
        if surplus == 0 {
            return refund("E_MIN_AMOUNT", 0);
        }
        let dust = self.total_sy;
        self.total_sy = 0;
        PromiseOrValue::Promise(
            ext_underlying::ext(self.underlying.clone())
                .with_attached_deposit(ONE_YOCTO)
                .with_static_gas(GAS_TRANSFER)
                .ft_transfer(self.owner.clone(), U128(surplus), Some("sweep".to_string()))
                .then(
                    Self::ext(env::current_account_id())
                        .with_static_gas(GAS_PAYOUT_CALLBACK)
                        .on_sweep_done(U128(surplus), U128(dust)),
                ),
        )
    }

    #[private]
    pub fn on_sweep_done(&mut self, surplus: U128, dust: U128) -> U128 {
        if near_sdk::is_promise_success() {
            surplus
        } else {
            self.total_sy = self.total_sy.saturating_add(dust.0);
            env::log_str("E_PAYOUT_FAILED");
            U128(0)
        }
    }

    #[private]
    pub fn on_redeem(&mut self, sender: AccountId, pt_amount: U128, sy_out: U128) -> U128 {
        if near_sdk::is_promise_success() {
            ext_pt::ext(self.pt.clone())
                .with_static_gas(GAS_TRANSFER)
                .burn(pt_amount)
                .detach();
            emit(
                "redeem",
                json!({
                    "account_id": sender,
                    "pt_amount": pt_amount.0.to_string(),
                    "sy_out": sy_out.0.to_string(),
                }),
            );
            U128(0)
        } else {
            self.total_sy = self.total_sy.saturating_add(sy_out.0);
            self.pt_supply = self.pt_supply.saturating_add(pt_amount.0);
            env::log_str("E_PAYOUT_FAILED");
            pt_amount
        }
    }
}

impl Contract {
    fn fully_settled(&self) -> bool {
        self.maturity_index.is_some()
            && self.pt_supply == 0
            && self.yt_supply == 0
            && self.total_accrued == 0
            && self.offers.is_empty()
    }

    fn start_strip(&mut self, sender: AccountId, amount: u128) -> PromiseOrValue<U128> {
        if self.status() != Status::Active {
            return refund("E_NOT_ACTIVE", amount);
        }
        if amount < self.min_strip {
            return refund("E_MIN_AMOUNT", amount);
        }
        PromiseOrValue::Promise(self.fetch_price().then(
            Self::ext(env::current_account_id())
                .with_static_gas(GAS_STRIP_INDEX)
                .with_unused_gas_weight(1)
                .on_strip_index(sender, U128(amount)),
        ))
    }

    fn start_redeem(&mut self, sender: AccountId, amount: u128) -> PromiseOrValue<U128> {
        let Some(frozen) = self.maturity_index else {
            return refund("E_NOT_SETTLED", amount);
        };
        if amount == 0 || amount > self.pt_supply {
            return refund("E_MIN_AMOUNT", amount);
        }
        let out = mul_div(amount, SCALE, frozen).min(self.total_sy);
        if out == 0 {
            return refund("E_MIN_AMOUNT", amount);
        }
        self.pt_supply -= amount;
        self.total_sy -= out;
        PromiseOrValue::Promise(
            ext_underlying::ext(self.underlying.clone())
                .with_attached_deposit(ONE_YOCTO)
                .with_static_gas(GAS_TRANSFER)
                .ft_transfer(sender.clone(), U128(out), Some("redeem".to_string()))
                .then(
                    Self::ext(env::current_account_id())
                        .with_static_gas(GAS_PAYOUT_CALLBACK)
                        .with_unused_gas_weight(1)
                        .on_redeem(sender, U128(amount), U128(out)),
                ),
        )
    }

    fn start_list_pt(
        &mut self,
        seller: AccountId,
        amount: u128,
        ask_sy: u128,
    ) -> PromiseOrValue<U128> {
        if self.status() != Status::Active {
            return refund("E_NOT_ACTIVE", amount);
        }
        if amount == 0 {
            return refund("E_MIN_AMOUNT", amount);
        }
        if ask_sy == 0 {
            return refund("E_PRICE_ZERO", amount);
        }
        match self.try_create_offer(&seller, OfferKind::Pt, amount, ask_sy) {
            Ok(_) => PromiseOrValue::Value(U128(0)),
            Err(code) => refund(code, amount),
        }
    }
}

#[near]
impl FungibleTokenReceiver for Contract {
    fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> PromiseOrValue<U128> {
        let token = env::predecessor_account_id();
        let amount = amount.0;
        let parsed = serde_json::from_str::<TransferMsg>(&msg);
        if token == self.underlying {
            match parsed {
                Ok(TransferMsg::Strip) => self.start_strip(sender_id, amount),
                Ok(TransferMsg::Buy { offer_id }) => self.start_buy(sender_id, amount, offer_id.0),
                _ => refund("E_BAD_MSG", amount),
            }
        } else if token == self.pt {
            match parsed {
                Ok(TransferMsg::Redeem) => self.start_redeem(sender_id, amount),
                Ok(TransferMsg::ListPt { ask_sy }) => {
                    self.start_list_pt(sender_id, amount, ask_sy.0)
                }
                _ => refund("E_BAD_MSG", amount),
            }
        } else {
            refund("E_WRONG_TOKEN", amount)
        }
    }
}
