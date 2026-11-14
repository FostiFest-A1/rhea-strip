use near_contract_standards::fungible_token::events::{FtBurn, FtMint};
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
use near_sdk::{
    AccountId, BorshStorageKey, NearToken, PanicOnDefault, PromiseOrValue, env, near, require,
};

const DECIMALS: u8 = 24;

#[derive(BorshStorageKey)]
#[near(serializers = [borsh])]
enum StorageKey {
    FungibleToken,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    token: FungibleToken,
    metadata: FungibleTokenMetadata,
    minter: AccountId,
    maturity_ms: u64,
}

#[near]
impl Contract {
    #[init]
    pub fn new(minter: AccountId, name: String, symbol: String, maturity_ms: U64) -> Self {
        Self {
            token: FungibleToken::new(StorageKey::FungibleToken),
            metadata: FungibleTokenMetadata {
                spec: FT_METADATA_SPEC.to_string(),
                name,
                symbol,
                icon: None,
                reference: None,
                reference_hash: None,
                decimals: DECIMALS,
            },
            minter,
            maturity_ms: maturity_ms.into(),
        }
    }

    pub fn mint(&mut self, account_id: AccountId, amount: U128) {
        self.assert_minter();
        require!(amount.0 > 0, "E_MIN_AMOUNT");
        if !self.token.accounts.contains_key(&account_id) {
            self.token.internal_register_account(&account_id);
        }
        self.token.internal_deposit(&account_id, amount.0);
        FtMint {
            owner_id: &account_id,
            amount,
            memo: None,
        }
        .emit();
    }

    pub fn burn(&mut self, amount: U128) {
        self.assert_minter();
        require!(amount.0 > 0, "E_MIN_AMOUNT");
        let minter = self.minter.clone();
        self.token.internal_withdraw(&minter, amount.0);
        FtBurn {
            owner_id: &minter,
            amount,
            memo: None,
        }
        .emit();
    }

    pub fn get_minter(&self) -> AccountId {
        self.minter.clone()
    }

    pub fn get_maturity_ms(&self) -> U64 {
        self.maturity_ms.into()
    }

    fn assert_minter(&self) {
        require!(env::predecessor_account_id() == self.minter, "E_NOT_OWNER");
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
    use near_sdk::testing_env;

    fn context(predecessor: AccountId) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder
            .current_account_id(accounts(0))
            .predecessor_account_id(predecessor);
        builder
    }

    fn fresh() -> Contract {
        testing_env!(context(accounts(1)).build());
        Contract::new(
            accounts(1),
            "Rhea PT mstNEAR".to_string(),
            "PT-mstNEAR-15NOV26".to_string(),
            U64(1_800_000_000_000),
        )
    }

    #[test]
    fn minter_mints_and_auto_registers() {
        let mut contract = fresh();
        contract.mint(accounts(2), U128(500));
        assert_eq!(contract.ft_balance_of(accounts(2)).0, 500);
        assert_eq!(contract.ft_total_supply().0, 500);
        assert!(contract.storage_balance_of(accounts(2)).is_some());
    }

    #[test]
    #[should_panic(expected = "E_NOT_OWNER")]
    fn only_the_minter_can_mint() {
        let mut contract = fresh();
        testing_env!(context(accounts(2)).build());
        contract.mint(accounts(2), U128(1));
    }

    #[test]
    fn burn_reduces_the_minter_balance_and_supply() {
        let mut contract = fresh();
        contract.mint(accounts(1), U128(300));
        contract.mint(accounts(2), U128(200));
        contract.burn(U128(100));
        assert_eq!(contract.ft_balance_of(accounts(1)).0, 200);
        assert_eq!(contract.ft_total_supply().0, 400);
    }

    #[test]
    #[should_panic(expected = "E_NOT_OWNER")]
    fn only_the_minter_can_burn() {
        let mut contract = fresh();
        contract.mint(accounts(2), U128(10));
        testing_env!(context(accounts(2)).build());
        contract.burn(U128(1));
    }

    #[test]
    fn metadata_carries_series_naming() {
        let contract = fresh();
        let metadata = contract.ft_metadata();
        assert_eq!(metadata.decimals, 24);
        assert_eq!(metadata.symbol, "PT-mstNEAR-15NOV26");
        assert_eq!(contract.get_maturity_ms().0, 1_800_000_000_000);
        assert_eq!(contract.get_minter(), accounts(1));
    }
}
