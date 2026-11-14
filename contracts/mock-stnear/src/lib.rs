use near_contract_standards::fungible_token::events::FtMint;
use near_contract_standards::fungible_token::metadata::{
    FT_METADATA_SPEC, FungibleTokenMetadata, FungibleTokenMetadataProvider,
};
use near_contract_standards::fungible_token::{
    FungibleToken, FungibleTokenCore, FungibleTokenResolver,
};
use near_contract_standards::storage_management::{
    StorageBalance, StorageBalanceBounds, StorageManagement,
};
use near_sdk::json_types::{U64, U128};
use near_sdk::store::LookupMap;
use near_sdk::{
    AccountId, BorshStorageKey, NearToken, PanicOnDefault, PromiseOrValue, env, near, require,
};

mod wide {
    #![allow(
        deprecated,
        semicolon_in_expressions_from_non_local_macros,
        clippy::manual_div_ceil,
        clippy::assign_op_pattern
    )]

    use uint::construct_uint;

    construct_uint! {
        pub struct U256(4);
    }
}

use wide::U256;

const DECIMALS: u8 = 24;
const DEFAULT_P0: u128 = 1_514_411_535_945_873_749_259_456;
const DEFAULT_APR_BPS: u32 = 800;
const DEFAULT_YEAR_SECS: u64 = 3600;
const FAUCET_AMOUNT: u128 = 100_000_000_000_000_000_000_000_000;
const FAUCET_CAP: u128 = 1_000_000_000_000_000_000_000_000_000;
const BPS_DENOMINATOR: u128 = 10_000;

#[derive(BorshStorageKey)]
#[near(serializers = [borsh])]
enum StorageKey {
    FungibleToken,
    Faucet,
}

#[near(serializers = [json])]
pub struct Params {
    pub owner: AccountId,
    pub p0: U128,
    pub apr_bps: u32,
    pub year_secs: U64,
    pub started_ms: U64,
}

pub fn mul_div(a: u128, b: u128, c: u128) -> u128 {
    require!(c != 0, "E_DIV_ZERO");
    let result = U256::from(a) * U256::from(b) / U256::from(c);
    require!(result <= U256::from(u128::MAX), "E_OVERFLOW");
    result.as_u128()
}

pub fn price_at(p0: u128, apr_bps: u32, year_secs: u64, started_ms: u64, now_ms: u64) -> u128 {
    let elapsed_ms = now_ms.saturating_sub(started_ms) as u128;
    let numerator_factor = (apr_bps as u128) * elapsed_ms;
    let denominator = BPS_DENOMINATOR * (year_secs as u128) * 1000;
    p0 + mul_div(p0, numerator_factor, denominator)
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    token: FungibleToken,
    metadata: FungibleTokenMetadata,
    owner: AccountId,
    p0: u128,
    apr_bps: u32,
    year_secs: u64,
    started_ms: u64,
    faucet_minted: LookupMap<AccountId, u128>,
}

#[near]
impl Contract {
    #[init]
    pub fn new(
        owner: AccountId,
        p0: Option<U128>,
        apr_bps: Option<u32>,
        year_secs: Option<U64>,
    ) -> Self {
        let p0 = p0.map(u128::from).unwrap_or(DEFAULT_P0);
        let year_secs = year_secs.map(u64::from).unwrap_or(DEFAULT_YEAR_SECS);
        require!(p0 > 0, "E_PRICE_ZERO");
        require!(year_secs > 0, "E_BAD_YEAR_SECS");
        Self {
            token: FungibleToken::new(StorageKey::FungibleToken),
            metadata: FungibleTokenMetadata {
                spec: FT_METADATA_SPEC.to_string(),
                name: "Mock Staked NEAR (demo)".to_string(),
                symbol: "mstNEAR".to_string(),
                icon: None,
                reference: None,
                reference_hash: None,
                decimals: DECIMALS,
            },
            owner,
            p0,
            apr_bps: apr_bps.unwrap_or(DEFAULT_APR_BPS),
            year_secs,
            started_ms: env::block_timestamp_ms(),
            faucet_minted: LookupMap::new(StorageKey::Faucet),
        }
    }

    pub fn get_st_near_price(&self) -> U128 {
        self.current_price().into()
    }

    pub fn faucet(&mut self) -> U128 {
        let account_id = env::predecessor_account_id();
        let minted = self.faucet_minted.get(&account_id).copied().unwrap_or(0);
        require!(
            minted + FAUCET_AMOUNT <= FAUCET_CAP,
            "E_FAUCET_CAP: faucet cap reached"
        );
        self.faucet_minted
            .insert(account_id.clone(), minted + FAUCET_AMOUNT);
        if !self.token.accounts.contains_key(&account_id) {
            self.token.internal_register_account(&account_id);
        }
        self.token.internal_deposit(&account_id, FAUCET_AMOUNT);
        FtMint {
            owner_id: &account_id,
            amount: FAUCET_AMOUNT.into(),
            memo: Some("faucet"),
        }
        .emit();
        FAUCET_AMOUNT.into()
    }

    pub fn set_apr_bps(&mut self, apr_bps: u32) {
        require!(env::predecessor_account_id() == self.owner, "E_NOT_OWNER");
        self.p0 = self.current_price();
        self.started_ms = env::block_timestamp_ms();
        self.apr_bps = apr_bps;
    }

    pub fn get_params(&self) -> Params {
        Params {
            owner: self.owner.clone(),
            p0: self.p0.into(),
            apr_bps: self.apr_bps,
            year_secs: self.year_secs.into(),
            started_ms: self.started_ms.into(),
        }
    }

    pub fn get_faucet_minted(&self, account_id: AccountId) -> U128 {
        self.faucet_minted
            .get(&account_id)
            .copied()
            .unwrap_or(0)
            .into()
    }

    fn current_price(&self) -> u128 {
        price_at(
            self.p0,
            self.apr_bps,
            self.year_secs,
            self.started_ms,
            env::block_timestamp_ms(),
        )
    }
}

#[near]
impl FungibleTokenCore for Contract {
    #[payable]
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>) {
        self.token.ft_transfer(receiver_id, amount, memo)
    }

    #[payable]
    fn ft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        amount: U128,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<U128> {
        self.token.ft_transfer_call(receiver_id, amount, memo, msg)
    }

    fn ft_total_supply(&self) -> U128 {
        self.token.ft_total_supply()
    }

    fn ft_balance_of(&self, account_id: AccountId) -> U128 {
        self.token.ft_balance_of(account_id)
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
        let (used_amount, _burned) =
            self.token
                .internal_ft_resolve_transfer(&sender_id, receiver_id, amount);
        used_amount.into()
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
        self.token.storage_deposit(account_id, registration_only)
    }

    #[payable]
    fn storage_withdraw(&mut self, amount: Option<NearToken>) -> StorageBalance {
        self.token.storage_withdraw(amount)
    }

    #[payable]
    fn storage_unregister(&mut self, force: Option<bool>) -> bool {
        self.token.internal_storage_unregister(force).is_some()
    }

    fn storage_balance_bounds(&self) -> StorageBalanceBounds {
        self.token.storage_balance_bounds()
    }

    fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance> {
        self.token.storage_balance_of(account_id)
    }
}

#[near]
impl FungibleTokenMetadataProvider for Contract {
    fn ft_metadata(&self) -> FungibleTokenMetadata {
        self.metadata.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{VMContextBuilder, accounts};
    use near_sdk::{NearToken, testing_env};

    const MS_PER_SEC: u64 = 1000;

    fn context(predecessor: AccountId, ts_ms: u64) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder
            .current_account_id(accounts(0))
            .predecessor_account_id(predecessor)
            .block_timestamp(ts_ms * 1_000_000);
        builder
    }

    fn fresh(ts_ms: u64) -> Contract {
        testing_env!(context(accounts(1), ts_ms).build());
        Contract::new(accounts(1), None, None, None)
    }

    #[test]
    fn price_starts_at_p0_and_follows_the_formula() {
        let contract = fresh(1_000);
        assert_eq!(contract.get_st_near_price().0, DEFAULT_P0);
        testing_env!(context(accounts(2), 1_000 + 1800 * MS_PER_SEC).build());
        let expected = DEFAULT_P0 + DEFAULT_P0 * 800 * 1800 / (10_000 * 3600);
        assert_eq!(contract.get_st_near_price().0, expected);
    }

    #[test]
    fn price_matches_worked_vector() {
        let p0 = 1_500_000_000_000_000_000_000_000u128;
        let price = price_at(p0, 1000, 3600, 0, 2400 * MS_PER_SEC);
        assert_eq!(price, 1_600_000_000_000_000_000_000_000u128);
    }

    #[test]
    fn price_never_decreases() {
        let contract = fresh(0);
        let mut last = 0u128;
        for step in 0..50u64 {
            testing_env!(context(accounts(2), step * 7_919).build());
            let price = contract.get_st_near_price().0;
            assert!(price >= last);
            last = price;
        }
        assert!(last > DEFAULT_P0);
    }

    #[test]
    fn set_apr_settles_accrual_before_changing_the_rate() {
        let mut contract = fresh(0);
        testing_env!(context(accounts(2), 1800 * MS_PER_SEC).build());
        let before = contract.get_st_near_price().0;
        testing_env!(context(accounts(1), 1800 * MS_PER_SEC).build());
        contract.set_apr_bps(0);
        assert_eq!(contract.get_st_near_price().0, before);
        testing_env!(context(accounts(2), 5000 * MS_PER_SEC).build());
        assert_eq!(contract.get_st_near_price().0, before);
        assert_eq!(contract.get_params().apr_bps, 0);
        assert_eq!(contract.get_params().p0.0, before);
    }

    #[test]
    #[should_panic(expected = "E_NOT_OWNER")]
    fn set_apr_is_owner_only() {
        let mut contract = fresh(0);
        testing_env!(context(accounts(2), 10).build());
        contract.set_apr_bps(10);
    }

    #[test]
    fn faucet_mints_registers_and_caps_at_one_thousand() {
        let mut contract = fresh(0);
        testing_env!(context(accounts(2), 5).build());
        for _ in 0..10 {
            contract.faucet();
        }
        assert_eq!(contract.ft_balance_of(accounts(2)).0, FAUCET_CAP);
        assert_eq!(contract.ft_total_supply().0, FAUCET_CAP);
        assert!(contract.storage_balance_of(accounts(2)).is_some());
        assert_eq!(contract.get_faucet_minted(accounts(2)).0, FAUCET_CAP);
    }

    #[test]
    #[should_panic(expected = "E_FAUCET_CAP")]
    fn faucet_rejects_the_eleventh_call() {
        let mut contract = fresh(0);
        testing_env!(context(accounts(2), 5).build());
        for _ in 0..11 {
            contract.faucet();
        }
    }

    #[test]
    fn metadata_matches_meta_pool_shape() {
        let contract = fresh(0);
        let metadata = contract.ft_metadata();
        assert_eq!(metadata.decimals, 24);
        assert_eq!(metadata.symbol, "mstNEAR");
        assert_eq!(metadata.name, "Mock Staked NEAR (demo)");
    }

    #[test]
    fn transfer_works_once_the_receiver_registered() {
        let mut contract = fresh(0);
        testing_env!(context(accounts(2), 5).build());
        contract.faucet();
        let mut register = context(accounts(3), 6);
        register.attached_deposit(NearToken::from_yoctonear(1_250_000_000_000_000_000_000));
        testing_env!(register.build());
        contract.storage_deposit(None, Some(true));
        let mut transfer = context(accounts(2), 7);
        transfer.attached_deposit(NearToken::from_yoctonear(1));
        testing_env!(transfer.build());
        contract.ft_transfer(accounts(3), U128(40), None);
        assert_eq!(contract.ft_balance_of(accounts(3)).0, 40);
        assert_eq!(contract.ft_balance_of(accounts(2)).0, FAUCET_AMOUNT - 40);
    }

    #[test]
    #[should_panic]
    fn transfer_to_an_unregistered_receiver_fails() {
        let mut contract = fresh(0);
        testing_env!(context(accounts(2), 5).build());
        contract.faucet();
        let mut transfer = context(accounts(2), 7);
        transfer.attached_deposit(NearToken::from_yoctonear(1));
        testing_env!(transfer.build());
        contract.ft_transfer(accounts(4), U128(40), None);
    }
}
