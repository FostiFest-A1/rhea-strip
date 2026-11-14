use near_contract_standards::fungible_token::metadata::FungibleTokenMetadata;
use near_sdk::json_types::{U128, U64};
use near_sdk::{AccountId, Gas, NearToken, ext_contract, near};

pub const MAX_STALE_MS: u64 = 120_000;
pub const MAX_OFFERS_PER_ACCOUNT: usize = 5;
pub const STORAGE_HEADROOM_YOCTO: u128 = 20_000_000_000_000_000_000_000;
pub const ONE_YOCTO: NearToken = NearToken::from_yoctonear(1);
pub const UNDERLYING_REGISTRATION: NearToken = NearToken::from_yoctonear(1_250_000_000_000_000_000_000);
pub const PT_REGISTRATION: NearToken = NearToken::from_yoctonear(2_500_000_000_000_000_000_000);
pub const YT_REGISTRATION: NearToken = NearToken::from_yoctonear(1_250_000_000_000_000_000_000);

pub const GAS_PRICE: Gas = Gas::from_tgas(10);
pub const GAS_SYNC_CALLBACK: Gas = Gas::from_tgas(10);
pub const GAS_STRIP_INDEX: Gas = Gas::from_tgas(45);
pub const GAS_BUY_INDEX: Gas = Gas::from_tgas(25);
pub const GAS_MINT: Gas = Gas::from_tgas(12);
pub const GAS_MINTED: Gas = Gas::from_tgas(15);
pub const GAS_TRANSFER: Gas = Gas::from_tgas(10);
pub const GAS_PAYOUT_CALLBACK: Gas = Gas::from_tgas(15);
pub const GAS_RESOLVE_TRANSFER: Gas = Gas::from_tgas(5);
pub const GAS_FT_TRANSFER_CALL_RESERVE: Gas = Gas::from_tgas(30);

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum OfferKind {
    Pt,
    Yt,
}

#[near(serializers = [json])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Status {
    Active,
    Matured,
    Settled,
}

#[near(serializers = [json])]
pub struct SeriesView {
    pub underlying: AccountId,
    pub pt: AccountId,
    pub yt: AccountId,
    pub maturity_ms: U64,
    pub year_secs: U64,
    pub min_strip: U128,
    pub status: Status,
    pub index: U128,
    pub index_ts_ms: U64,
    pub maturity_index: Option<U128>,
    pub total_sy: U128,
    pub pt_supply: U128,
    pub yt_supply: U128,
    pub open_offers: u64,
}

#[near(serializers = [json])]
pub struct PositionView {
    pub yt_balance: U128,
    pub yt_locked: U128,
    pub yt_accrued_sy: U128,
    pub yt_pending_sy: U128,
    pub sy_credit: U128,
}

#[near(serializers = [json])]
#[derive(Clone)]
pub struct Offer {
    pub id: U64,
    pub seller: AccountId,
    pub kind: OfferKind,
    pub amount: U128,
    pub ask_sy: U128,
    pub created_ms: U64,
}

#[near(serializers = [borsh])]
#[derive(Clone)]
pub struct StoredOffer {
    pub id: u64,
    pub seller: AccountId,
    pub kind: OfferKind,
    pub amount: u128,
    pub ask_sy: u128,
    pub created_ms: u64,
    pub pending: bool,
}

impl StoredOffer {
    pub fn view(&self) -> Offer {
        Offer {
            id: U64(self.id),
            seller: self.seller.clone(),
            kind: self.kind,
            amount: U128(self.amount),
            ask_sy: U128(self.ask_sy),
            created_ms: U64(self.created_ms),
        }
    }
}

#[near(serializers = [json])]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum TransferMsg {
    Strip,
    Buy { offer_id: U64 },
    Redeem,
    ListPt { ask_sy: U128 },
}

#[ext_contract(ext_underlying)]
pub trait Underlying {
    fn get_st_near_price(&self) -> U128;
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>);
    fn ft_balance_of(&self, account_id: AccountId) -> U128;
    fn storage_deposit(&mut self, account_id: Option<AccountId>, registration_only: Option<bool>);
}

#[ext_contract(ext_pt)]
pub trait PtToken {
    fn mint(&mut self, account_id: AccountId, amount: U128);
    fn burn(&mut self, amount: U128);
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>);
    fn ft_metadata(&self) -> FungibleTokenMetadata;
    fn storage_deposit(&mut self, account_id: Option<AccountId>, registration_only: Option<bool>);
}
