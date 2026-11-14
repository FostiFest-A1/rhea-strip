use near_sdk::json_types::{U128, U64};
use near_sdk::serde_json::json;
use near_sdk::{
    AccountId, PromiseError, PromiseOrValue, assert_one_yocto, env, near, require,
};

use crate::events::emit;
use crate::types::*;
use crate::{Contract, ContractExt, refund};

impl Contract {
    pub(crate) fn try_create_offer(
        &mut self,
        seller: &AccountId,
        kind: OfferKind,
        amount: u128,
        ask_sy: u128,
    ) -> Result<u64, &'static str> {
        let mut list = self.seller_offers.get(seller).cloned().unwrap_or_default();
        if list.len() >= MAX_OFFERS_PER_ACCOUNT {
            return Err("E_TOO_MANY_OFFERS");
        }
        let id = self.next_offer_id;
        self.next_offer_id = self.next_offer_id.saturating_add(1);
        let created_ms = env::block_timestamp_ms();
        self.offers.insert(
            id,
            StoredOffer {
                id,
                seller: seller.clone(),
                kind,
                amount,
                ask_sy,
                created_ms,
                pending: false,
            },
        );
        list.push(id);
        self.seller_offers.insert(seller.clone(), list);
        emit(
            "list",
            json!({
                "offer_id": id.to_string(),
                "seller": seller,
                "kind": kind,
                "amount": amount.to_string(),
                "ask_sy": ask_sy.to_string(),
            }),
        );
        Ok(id)
    }

    pub(crate) fn remove_offer(&mut self, id: u64) -> Option<StoredOffer> {
        let offer = self.offers.remove(&id)?;
        let mut list = self
            .seller_offers
            .get(&offer.seller)
            .cloned()
            .unwrap_or_default();
        list.retain(|candidate| *candidate != id);
        if list.is_empty() {
            self.seller_offers.remove(&offer.seller);
        } else {
            self.seller_offers.insert(offer.seller.clone(), list);
        }
        Some(offer)
    }

    pub(crate) fn release_yt_offers(&mut self, seller: &AccountId) {
        let ids = self.seller_offers.get(seller).cloned().unwrap_or_default();
        for id in ids {
            let is_open_yt = self
                .offers
                .get(&id)
                .map(|o| o.kind == OfferKind::Yt && !o.pending)
                .unwrap_or(false);
            if !is_open_yt {
                continue;
            }
            if let Some(offer) = self.remove_offer(id) {
                self.unlock_yt(seller, offer.amount);
                emit(
                    "cancel",
                    json!({
                        "offer_id": id.to_string(),
                        "seller": seller,
                        "kind": offer.kind,
                        "amount": offer.amount.to_string(),
                    }),
                );
            }
        }
    }

    pub(crate) fn start_buy(
        &mut self,
        buyer: AccountId,
        amount: u128,
        offer_id: u64,
    ) -> PromiseOrValue<U128> {
        if self.status() != Status::Active {
            return refund("E_NOT_ACTIVE", amount);
        }
        let Some(offer) = self.offers.get(&offer_id).cloned() else {
            return refund("E_OFFER_GONE", amount);
        };
        if offer.pending {
            return refund("E_OFFER_GONE", amount);
        }
        if amount < offer.ask_sy {
            return refund("E_PRICE_MISMATCH", amount);
        }
        if buyer == offer.seller {
            return refund("E_BAD_MSG", amount);
        }
        match offer.kind {
            OfferKind::Yt => PromiseOrValue::Promise(self.fetch_price().then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_BUY_INDEX)
                    .with_unused_gas_weight(1)
                    .on_buy_yt(buyer, U128(amount), U64(offer_id)),
            )),
            OfferKind::Pt => {
                if !self.has_headroom() {
                    return refund("E_STORAGE_LOW", amount);
                }
                if let Some(stored) = self.offers.get_mut(&offer_id) {
                    stored.pending = true;
                }
                PromiseOrValue::Promise(
                    ext_pt::ext(self.pt.clone())
                        .with_attached_deposit(ONE_YOCTO)
                        .with_static_gas(GAS_TRANSFER)
                        .ft_transfer(buyer.clone(), U128(offer.amount), Some("fill".to_string()))
                        .then(
                            Self::ext(env::current_account_id())
                                .with_static_gas(GAS_PAYOUT_CALLBACK)
                                .with_unused_gas_weight(1)
                                .on_buy_pt(buyer, U128(amount), U64(offer_id)),
                        ),
                )
            }
        }
    }

    fn complete_fill(&mut self, offer: &StoredOffer, buyer: &AccountId) {
        self.credit_sy(&offer.seller, offer.ask_sy);
        emit(
            "fill",
            json!({
                "offer_id": offer.id.to_string(),
                "seller": offer.seller,
                "buyer": buyer,
                "kind": offer.kind,
                "amount": offer.amount.to_string(),
                "ask_sy": offer.ask_sy.to_string(),
            }),
        );
    }
}

#[near]
impl Contract {
    #[payable]
    pub fn list_yt(&mut self, amount: U128, ask_sy: U128) -> U64 {
        assert_one_yocto();
        self.require_active();
        require!(amount.0 > 0, "E_MIN_AMOUNT");
        require!(ask_sy.0 > 0, "E_PRICE_ZERO");
        let seller = env::predecessor_account_id();
        let id = match self.try_create_offer(&seller, OfferKind::Yt, amount.0, ask_sy.0) {
            Ok(id) => id,
            Err(code) => env::panic_str(code),
        };
        if let Err(code) = self.lock_yt(&seller, amount.0) {
            env::panic_str(code);
        }
        U64(id)
    }

    #[payable]
    pub fn cancel_offer(&mut self, offer_id: U64) -> PromiseOrValue<bool> {
        assert_one_yocto();
        let caller = env::predecessor_account_id();
        let Some(offer) = self.offers.get(&offer_id.0).cloned() else {
            env::panic_str("E_OFFER_GONE");
        };
        require!(offer.seller == caller, "E_NOT_OWNER");
        require!(!offer.pending, "E_OFFER_GONE");
        self.remove_offer(offer.id);
        match offer.kind {
            OfferKind::Yt => {
                self.unlock_yt(&caller, offer.amount);
                emit(
                    "cancel",
                    json!({
                        "offer_id": offer.id.to_string(),
                        "seller": caller,
                        "kind": offer.kind,
                        "amount": offer.amount.to_string(),
                    }),
                );
                PromiseOrValue::Value(true)
            }
            OfferKind::Pt => PromiseOrValue::Promise(
                ext_pt::ext(self.pt.clone())
                    .with_attached_deposit(ONE_YOCTO)
                    .with_static_gas(GAS_TRANSFER)
                    .ft_transfer(caller, U128(offer.amount), Some("cancel".to_string()))
                    .then(
                        Self::ext(env::current_account_id())
                            .with_static_gas(GAS_PAYOUT_CALLBACK)
                            .on_cancel_pt(
                                U64(offer.id),
                                offer.seller,
                                U128(offer.amount),
                                U128(offer.ask_sy),
                                U64(offer.created_ms),
                            ),
                    ),
            ),
        }
    }

    pub fn get_offers(&self, kind: Option<OfferKind>, from_index: u64, limit: u64) -> Vec<Offer> {
        let skip = usize::try_from(from_index).unwrap_or(usize::MAX);
        let take = usize::try_from(limit).unwrap_or(usize::MAX);
        let mut open: Vec<&StoredOffer> = self
            .offers
            .values()
            .filter(|offer| kind.is_none_or(|k| offer.kind == k))
            .collect();
        open.sort_unstable_by_key(|offer| offer.id);
        open.into_iter()
            .skip(skip)
            .take(take)
            .map(|offer| offer.view())
            .collect()
    }

    pub fn get_offer(&self, offer_id: U64) -> Option<Offer> {
        self.offers.get(&offer_id.0).map(|offer| offer.view())
    }

    #[private]
    pub fn on_buy_yt(
        &mut self,
        buyer: AccountId,
        paid: U128,
        offer_id: U64,
        #[callback_result] price: Result<U128, PromiseError>,
    ) -> U128 {
        let paid = paid.0;
        let fetched = match price {
            Ok(p) if p.0 > 0 => p.0,
            Ok(_) => return refund_value("E_PRICE_ZERO", paid),
            Err(_) => return refund_value("E_STALE_INDEX", paid),
        };
        if self.status() != Status::Active {
            return refund_value("E_NOT_ACTIVE", paid);
        }
        let Some(offer) = self.offers.get(&offer_id.0).cloned() else {
            return refund_value("E_OFFER_GONE", paid);
        };
        if offer.kind != OfferKind::Yt || offer.pending || paid < offer.ask_sy {
            return refund_value("E_OFFER_GONE", paid);
        }
        self.apply_index(fetched);
        if let Err(code) = self.move_locked_yt(&offer.seller, &buyer, offer.amount) {
            return refund_value(code, paid);
        }
        self.remove_offer(offer.id);
        self.complete_fill(&offer, &buyer);
        U128(paid - offer.ask_sy)
    }

    #[private]
    pub fn on_buy_pt(&mut self, buyer: AccountId, paid: U128, offer_id: U64) -> U128 {
        let paid = paid.0;
        if !near_sdk::is_promise_success() {
            if let Some(stored) = self.offers.get_mut(&offer_id.0) {
                stored.pending = false;
            }
            return refund_value("E_PT_TRANSFER_FAILED", paid);
        }
        match self.remove_offer(offer_id.0) {
            Some(offer) => {
                self.complete_fill(&offer, &buyer);
                U128(paid.saturating_sub(offer.ask_sy))
            }
            None => U128(paid),
        }
    }

    #[private]
    pub fn on_cancel_pt(
        &mut self,
        offer_id: U64,
        seller: AccountId,
        amount: U128,
        ask_sy: U128,
        created_ms: U64,
    ) -> bool {
        if near_sdk::is_promise_success() {
            emit(
                "cancel",
                json!({
                    "offer_id": offer_id.0.to_string(),
                    "seller": seller,
                    "kind": OfferKind::Pt,
                    "amount": amount.0.to_string(),
                }),
            );
            return true;
        }
        self.offers.insert(
            offer_id.0,
            StoredOffer {
                id: offer_id.0,
                seller: seller.clone(),
                kind: OfferKind::Pt,
                amount: amount.0,
                ask_sy: ask_sy.0,
                created_ms: created_ms.0,
                pending: false,
            },
        );
        let mut list = self.seller_offers.get(&seller).cloned().unwrap_or_default();
        list.push(offer_id.0);
        self.seller_offers.insert(seller, list);
        env::log_str("E_PT_TRANSFER_FAILED");
        false
    }
}

fn refund_value(code: &str, amount: u128) -> U128 {
    env::log_str(code);
    U128(amount)
}
