use near_contract_standards::fungible_token::core::FungibleTokenCore;
use near_contract_standards::fungible_token::events::{FtBurn, FtMint, FtTransfer};
use near_contract_standards::fungible_token::metadata::{
    FT_METADATA_SPEC, FungibleTokenMetadata, FungibleTokenMetadataProvider,
};
use near_contract_standards::fungible_token::receiver::ext_ft_receiver;
use near_contract_standards::fungible_token::resolver::{FungibleTokenResolver, ext_ft_resolver};
use near_contract_standards::storage_management::{
    StorageBalance, StorageBalanceBounds, StorageManagement,
};
use near_sdk::json_types::U128;
use near_sdk::serde_json::{self, json};
use near_sdk::{
    AccountId, NearToken, Promise, PromiseOrValue, assert_one_yocto, env, near, require,
};

use crate::events::emit;
use crate::math::accrue;
use crate::types::*;
use crate::{Contract, ContractExt};

#[near(serializers = [borsh])]
#[derive(Clone, Default)]
pub struct YtAccount {
    pub balance: u128,
    pub locked: u128,
    pub user_index: u128,
    pub accrued_sy: u128,
}

impl Contract {
    pub(crate) fn account_or_default(&self, id: &AccountId) -> YtAccount {
        self.accounts.get(id).cloned().unwrap_or_default()
    }

    pub(crate) fn pending_of(&self, account: &YtAccount) -> u128 {
        accrue(account.balance, account.user_index, self.cur_index())
    }

    pub(crate) fn settle_account(&mut self, id: &AccountId) {
        let cur = self.cur_index();
        let mut account = self.account_or_default(id);
        if cur > 0 {
            if account.user_index == 0 {
                account.user_index = cur;
            } else if cur > account.user_index {
                let add = accrue(account.balance, account.user_index, cur);
                account.accrued_sy = account.accrued_sy.saturating_add(add);
                self.total_accrued = self.total_accrued.saturating_add(add);
                account.user_index = cur;
            }
        }
        self.accounts.insert(id.clone(), account);
    }

    pub(crate) fn credit_yt(&mut self, id: &AccountId, amount: u128) {
        self.settle_account(id);
        let mut account = self.account_or_default(id);
        account.balance = account.balance.saturating_add(amount);
        self.accounts.insert(id.clone(), account);
        self.yt_supply = self.yt_supply.saturating_add(amount);
        FtMint {
            owner_id: id,
            amount: U128(amount),
            memo: Some("strip"),
        }
        .emit();
    }

    pub(crate) fn lock_yt(&mut self, id: &AccountId, amount: u128) -> Result<(), &'static str> {
        let mut account = self.account_or_default(id);
        if account.balance.saturating_sub(account.locked) < amount {
            return Err("E_INSUFFICIENT_YT");
        }
        account.locked += amount;
        self.accounts.insert(id.clone(), account);
        Ok(())
    }

    pub(crate) fn unlock_yt(&mut self, id: &AccountId, amount: u128) {
        let mut account = self.account_or_default(id);
        account.locked = account.locked.saturating_sub(amount);
        self.accounts.insert(id.clone(), account);
    }

    pub(crate) fn move_locked_yt(
        &mut self,
        from: &AccountId,
        to: &AccountId,
        amount: u128,
    ) -> Result<(), &'static str> {
        if from == to {
            return Err("E_BAD_MSG");
        }
        self.settle_account(from);
        self.settle_account(to);
        let mut source = self.account_or_default(from);
        if source.locked < amount || source.balance < amount {
            return Err("E_INSUFFICIENT_YT");
        }
        source.locked -= amount;
        source.balance -= amount;
        let mut target = self.account_or_default(to);
        target.balance = target.balance.saturating_add(amount);
        self.accounts.insert(from.clone(), source);
        self.accounts.insert(to.clone(), target);
        Ok(())
    }

    pub(crate) fn credit_sy(&mut self, id: &AccountId, amount: u128) {
        let current = self.credits.get(id).copied().unwrap_or(0);
        self.credits.insert(id.clone(), current.saturating_add(amount));
        self.total_credit = self.total_credit.saturating_add(amount);
    }

    pub(crate) fn require_active(&self) {
        require!(self.status() == Status::Active, "E_NOT_ACTIVE");
    }

    fn require_transferable(&self) {
        match self.status() {
            Status::Active => {
                let age = env::block_timestamp_ms().saturating_sub(self.index_ts_ms);
                require!(self.index > 0 && age <= MAX_STALE_MS, "E_STALE_INDEX");
            }
            Status::Matured => env::panic_str("E_NOT_SETTLED"),
            Status::Settled => {}
        }
    }

    pub(crate) fn move_unlocked_yt(
        &mut self,
        from: &AccountId,
        to: &AccountId,
        amount: u128,
    ) -> Result<(), &'static str> {
        if amount == 0 {
            return Err("E_MIN_AMOUNT");
        }
        if from == to {
            return Err("E_BAD_MSG");
        }
        self.settle_account(from);
        self.settle_account(to);
        let mut source = self.account_or_default(from);
        if source.balance.saturating_sub(source.locked) < amount {
            return Err("E_INSUFFICIENT_YT");
        }
        source.balance -= amount;
        let mut target = self.account_or_default(to);
        target.balance = target.balance.saturating_add(amount);
        self.accounts.insert(from.clone(), source);
        self.accounts.insert(to.clone(), target);
        Ok(())
    }

    fn public_transfer(
        &mut self,
        from: &AccountId,
        to: &AccountId,
        amount: u128,
        memo: Option<String>,
    ) {
        self.require_transferable();
        if !self.accounts.contains_key(to) {
            env::panic_str("E_NOT_REGISTERED");
        }
        if let Err(code) = self.move_unlocked_yt(from, to, amount) {
            env::panic_str(code);
        }
        FtTransfer {
            old_owner_id: from,
            new_owner_id: to,
            amount: U128(amount),
            memo: memo.as_deref(),
        }
        .emit();
    }

    pub(crate) fn apply_claim_restore(&mut self, id: &AccountId, paid: u128, burned: u128) {
        self.settle_account(id);
        let mut account = self.account_or_default(id);
        account.accrued_sy = account.accrued_sy.saturating_add(paid);
        account.balance = account.balance.saturating_add(burned);
        self.accounts.insert(id.clone(), account);
        self.yt_supply = self.yt_supply.saturating_add(burned);
        self.total_accrued = self.total_accrued.saturating_add(paid);
        self.total_sy = self.total_sy.saturating_add(paid);
    }
}

#[near]
impl Contract {
    #[payable]
    pub fn claim_yield(&mut self) -> PromiseOrValue<U128> {
        assert_one_yocto();
        require!(self.maturity_index.is_some(), "E_NOT_SETTLED");
        let id = env::predecessor_account_id();
        self.release_yt_offers(&id);
        self.settle_account(&id);
        let mut account = self.account_or_default(&id);
        let burned = account.balance;
        let owed = account.accrued_sy;
        if burned == 0 && owed == 0 {
            return PromiseOrValue::Value(U128(0));
        }
        let paid = owed.min(self.total_sy);
        account.balance = 0;
        account.locked = 0;
        account.accrued_sy = 0;
        self.accounts.insert(id.clone(), account);
        self.yt_supply = self.yt_supply.saturating_sub(burned);
        self.total_accrued = self.total_accrued.saturating_sub(owed);
        self.total_sy -= paid;
        if burned > 0 {
            FtBurn {
                owner_id: &id,
                amount: U128(burned),
                memo: Some("claim"),
            }
            .emit();
        }
        if paid == 0 {
            emit(
                "claim",
                json!({"account_id": id, "amount": "0", "yt_burned": burned.to_string()}),
            );
            return PromiseOrValue::Value(U128(0));
        }
        PromiseOrValue::Promise(
            ext_underlying::ext(self.underlying.clone())
                .with_attached_deposit(ONE_YOCTO)
                .with_static_gas(GAS_TRANSFER)
                .ft_transfer(id.clone(), U128(paid), Some("claim".to_string()))
                .then(
                    Self::ext(env::current_account_id())
                        .with_static_gas(GAS_PAYOUT_CALLBACK)
                        .on_claim(id, U128(paid), U128(burned)),
                ),
        )
    }

    #[private]
    pub fn on_claim(&mut self, account_id: AccountId, paid: U128, burned: U128) -> U128 {
        if near_sdk::is_promise_success() {
            emit(
                "claim",
                json!({
                    "account_id": account_id,
                    "amount": paid.0.to_string(),
                    "yt_burned": burned.0.to_string(),
                }),
            );
            paid
        } else {
            self.apply_claim_restore(&account_id, paid.0, burned.0);
            env::log_str("E_PAYOUT_FAILED");
            U128(0)
        }
    }

    #[payable]
    pub fn withdraw_sy(&mut self) -> Promise {
        assert_one_yocto();
        let id = env::predecessor_account_id();
        let amount = self.credits.get(&id).copied().unwrap_or(0);
        require!(amount > 0, "E_MIN_AMOUNT");
        self.credits.remove(&id);
        self.total_credit = self.total_credit.saturating_sub(amount);
        ext_underlying::ext(self.underlying.clone())
            .with_attached_deposit(ONE_YOCTO)
            .with_static_gas(GAS_TRANSFER)
            .ft_transfer(id.clone(), U128(amount), Some("withdraw".to_string()))
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_PAYOUT_CALLBACK)
                    .on_withdraw(id, U128(amount)),
            )
    }

    #[private]
    pub fn on_withdraw(&mut self, account_id: AccountId, amount: U128) -> U128 {
        if near_sdk::is_promise_success() {
            emit(
                "withdraw",
                json!({"account_id": account_id, "amount": amount.0.to_string()}),
            );
            amount
        } else {
            self.credit_sy(&account_id, amount.0);
            env::log_str("E_PAYOUT_FAILED");
            U128(0)
        }
    }
}

#[near]
impl FungibleTokenCore for Contract {
    #[payable]
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>) {
        assert_one_yocto();
        let sender = env::predecessor_account_id();
        self.public_transfer(&sender, &receiver_id, amount.0, memo);
    }

    #[payable]
    fn ft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        amount: U128,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<U128> {
        assert_one_yocto();
        require!(
            env::prepaid_gas() > GAS_FT_TRANSFER_CALL_RESERVE,
            "More gas is required"
        );
        let sender = env::predecessor_account_id();
        self.public_transfer(&sender, &receiver_id, amount.0, memo);
        ext_ft_receiver::ext(receiver_id.clone())
            .with_unused_gas_weight(1)
            .ft_on_transfer(sender.clone(), amount, msg)
            .then(
                ext_ft_resolver::ext(env::current_account_id())
                    .with_static_gas(GAS_RESOLVE_TRANSFER)
                    .with_unused_gas_weight(0)
                    .ft_resolve_transfer(sender, receiver_id, amount),
            )
            .into()
    }

    fn ft_total_supply(&self) -> U128 {
        U128(self.yt_supply)
    }

    fn ft_balance_of(&self, account_id: AccountId) -> U128 {
        U128(self.accounts.get(&account_id).map(|a| a.balance).unwrap_or(0))
    }
}

#[near]
impl FungibleTokenResolver for Contract {
    #[private]
    fn ft_resolve_transfer(
        &mut self,
        sender_id: AccountId,
        receiver_id: AccountId,
        amount: U128,
    ) -> U128 {
        const MAX_RESULT_LENGTH: usize = "\"+340282366920938463463374607431768211455\"".len();
        let amount = amount.0;
        let unused = env::promise_result_checked(0, MAX_RESULT_LENGTH)
            .ok()
            .and_then(|value| serde_json::from_slice::<U128>(&value).ok())
            .map(|v| v.0)
            .unwrap_or(amount)
            .min(amount);
        if unused == 0 {
            return U128(amount);
        }
        let receiver = self.account_or_default(&receiver_id);
        let refund = receiver.balance.saturating_sub(receiver.locked).min(unused);
        if refund == 0 {
            return U128(amount);
        }
        if self.accounts.contains_key(&sender_id) {
            if self.move_unlocked_yt(&receiver_id, &sender_id, refund).is_ok() {
                FtTransfer {
                    old_owner_id: &receiver_id,
                    new_owner_id: &sender_id,
                    amount: U128(refund),
                    memo: Some("refund"),
                }
                .emit();
                return U128(amount - refund);
            }
            return U128(amount);
        }
        self.settle_account(&receiver_id);
        let mut target = self.account_or_default(&receiver_id);
        target.balance = target.balance.saturating_sub(refund);
        self.accounts.insert(receiver_id.clone(), target);
        self.yt_supply = self.yt_supply.saturating_sub(refund);
        FtBurn {
            owner_id: &receiver_id,
            amount: U128(refund),
            memo: Some("refund"),
        }
        .emit();
        U128(amount)
    }
}

#[near]
impl FungibleTokenMetadataProvider for Contract {
    fn ft_metadata(&self) -> FungibleTokenMetadata {
        FungibleTokenMetadata {
            spec: FT_METADATA_SPEC.to_string(),
            name: "Rhea Yield Token".to_string(),
            symbol: self.yt_symbol.clone(),
            icon: None,
            reference: None,
            reference_hash: None,
            decimals: 24,
        }
    }
}

#[near]
impl StorageManagement for Contract {
    #[payable]
    fn storage_deposit(
        &mut self,
        account_id: Option<AccountId>,
        registration_only: Option<bool>,
    ) -> StorageBalance {
        let _ = registration_only;
        let attached = env::attached_deposit();
        let id = account_id.unwrap_or_else(env::predecessor_account_id);
        let payer = env::predecessor_account_id();
        let refund = if self.accounts.contains_key(&id) {
            attached
        } else {
            if attached < YT_REGISTRATION {
                env::panic_str("E_MIN_AMOUNT");
            }
            self.accounts.insert(id, YtAccount::default());
            attached.saturating_sub(YT_REGISTRATION)
        };
        if refund > NearToken::from_yoctonear(0) {
            Promise::new(payer).transfer(refund).detach();
        }
        StorageBalance {
            total: YT_REGISTRATION,
            available: NearToken::from_yoctonear(0),
        }
    }

    #[payable]
    fn storage_withdraw(&mut self, amount: Option<NearToken>) -> StorageBalance {
        assert_one_yocto();
        let id = env::predecessor_account_id();
        require!(self.accounts.contains_key(&id), "E_NOT_REGISTERED");
        if let Some(requested) = amount {
            require!(requested == NearToken::from_yoctonear(0), "E_MIN_AMOUNT");
        }
        StorageBalance {
            total: YT_REGISTRATION,
            available: NearToken::from_yoctonear(0),
        }
    }

    #[payable]
    fn storage_unregister(&mut self, force: Option<bool>) -> bool {
        assert_one_yocto();
        let _ = force;
        let id = env::predecessor_account_id();
        let Some(account) = self.accounts.get(&id) else {
            return false;
        };
        if account.balance > 0 || account.locked > 0 || account.accrued_sy > 0 {
            env::panic_str("E_INSUFFICIENT_YT");
        }
        self.accounts.remove(&id);
        true
    }

    fn storage_balance_bounds(&self) -> StorageBalanceBounds {
        StorageBalanceBounds {
            min: YT_REGISTRATION,
            max: Some(YT_REGISTRATION),
        }
    }

    fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance> {
        self.accounts.contains_key(&account_id).then_some(StorageBalance {
            total: YT_REGISTRATION,
            available: NearToken::from_yoctonear(0),
        })
    }
}
