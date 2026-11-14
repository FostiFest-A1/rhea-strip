use std::collections::HashMap;

use near_contract_standards::fungible_token::core::FungibleTokenCore;
use near_contract_standards::fungible_token::receiver::FungibleTokenReceiver;
use near_sdk::json_types::{U128, U64};
use near_sdk::test_utils::VMContextBuilder;
use near_sdk::{AccountId, NearToken, PromiseOrValue, testing_env};

use crate::math::{SCALE, accrue, mul_div};
use crate::types::*;
use crate::Contract;

const T0: u64 = 1_000_000;
const MATURITY: u64 = T0 + 600_000;
const ONE: u128 = SCALE;

fn acc(name: &str) -> AccountId {
    name.parse().unwrap()
}

fn ctx_at(predecessor: &str, ms: u64, deposit: u128) -> VMContextBuilder {
    let mut builder = VMContextBuilder::new();
    builder
        .current_account_id(acc("strip.testnet"))
        .predecessor_account_id(acc(predecessor))
        .signer_account_id(acc(predecessor))
        .block_timestamp(ms * 1_000_000)
        .attached_deposit(NearToken::from_yoctonear(deposit));
    builder
}

fn enter(predecessor: &str, ms: u64, deposit: u128) {
    testing_env!(ctx_at(predecessor, ms, deposit).build());
}

fn setup() -> Contract {
    enter("owner.testnet", T0, 0);
    let mut c = Contract::new(
        acc("owner.testnet"),
        acc("mst.testnet"),
        acc("pt.testnet"),
        U64(MATURITY),
        U64(3600),
        U128(ONE),
    );
    c.apply_index(15 * ONE / 10);
    c
}

fn value_of(result: PromiseOrValue<U128>) -> u128 {
    match result {
        PromiseOrValue::Value(v) => v.0,
        PromiseOrValue::Promise(_) => panic!("expected an immediate refund value"),
    }
}

fn is_promise(result: &PromiseOrValue<U128>) -> bool {
    matches!(result, PromiseOrValue::Promise(_))
}

fn sim_strip(c: &mut Contract, who: &AccountId, sy: u128) -> u128 {
    let py = mul_div(sy, c.index, SCALE);
    c.credit_yt(who, py);
    c.total_sy += sy;
    c.pt_supply += py;
    py
}

#[test]
fn worked_vector_conserves_value() {
    let mut c = setup();
    let alice = acc("alice.testnet");
    let py = sim_strip(&mut c, &alice, 100 * ONE);
    assert_eq!(py, 150 * ONE);
    assert_eq!(c.pt_supply, c.yt_supply);
    c.apply_index(16 * ONE / 10);
    c.settle_account(&alice);
    let accrued = c.account_or_default(&alice).accrued_sy;
    let expected = 6_250_000_000_000_000_000_000_000u128;
    assert!(accrued <= expected && expected - accrued <= 1);
    c.maturity_index = Some(c.index);
    let redeem = mul_div(py, SCALE, c.index);
    assert_eq!(redeem, 93_750_000_000_000_000_000_000_000u128);
    assert!(redeem + accrued <= 100 * ONE);
    assert!(100 * ONE - (redeem + accrued) <= 1);
}

#[test]
fn index_never_decreases() {
    let mut c = setup();
    let high = c.index;
    assert!(!c.apply_index(high - 1));
    assert_eq!(c.index, high);
    assert!(c.apply_index(high + 1));
    assert_eq!(c.index, high + 1);
}

#[test]
fn status_derivation_and_cap() {
    let mut c = setup();
    assert_eq!(c.status(), Status::Active);
    enter("anyone.testnet", MATURITY, 0);
    assert_eq!(c.status(), Status::Matured);
    c.apply_index(2 * ONE);
    c.maturity_index = Some(2 * ONE);
    assert_eq!(c.status(), Status::Settled);
    c.apply_index(3 * ONE);
    assert_eq!(c.cur_index(), 2 * ONE);
}

#[test]
fn two_strippers_at_different_indexes() {
    let mut c = setup();
    let alice = acc("alice.testnet");
    let bob = acc("bob.testnet");
    sim_strip(&mut c, &alice, 100 * ONE);
    c.apply_index(18 * ONE / 10);
    sim_strip(&mut c, &bob, 100 * ONE);
    c.apply_index(2 * ONE);
    c.settle_account(&alice);
    c.settle_account(&bob);
    let a = c.account_or_default(&alice);
    let b = c.account_or_default(&bob);
    assert_eq!(a.balance, 150 * ONE);
    assert_eq!(b.balance, 180 * ONE);
    assert!(a.accrued_sy > b.accrued_sy);
    assert_eq!(a.accrued_sy, accrue(150 * ONE, 15 * ONE / 10, 2 * ONE));
    assert_eq!(b.accrued_sy, accrue(180 * ONE, 18 * ONE / 10, 2 * ONE));
}

#[test]
fn list_fill_attribution() {
    let mut c = setup();
    let alice = acc("alice.testnet");
    let bob = acc("bob.testnet");
    sim_strip(&mut c, &alice, 100 * ONE);
    enter("alice.testnet", T0 + 1000, 1);
    let id = c.list_yt(U128(50 * ONE), U128(ONE)).0;
    assert_eq!(c.account_or_default(&alice).locked, 50 * ONE);
    c.apply_index(155 * ONE / 100);
    c.move_locked_yt(&alice, &bob, 50 * ONE).unwrap();
    c.remove_offer(id);
    let alice_acc = c.account_or_default(&alice);
    let bob_acc = c.account_or_default(&bob);
    assert_eq!(alice_acc.balance, 100 * ONE);
    assert_eq!(alice_acc.locked, 0);
    assert_eq!(bob_acc.balance, 50 * ONE);
    assert_eq!(
        alice_acc.accrued_sy,
        accrue(150 * ONE, 15 * ONE / 10, 155 * ONE / 100)
    );
    assert_eq!(bob_acc.accrued_sy, 0);
    c.apply_index(16 * ONE / 10);
    c.settle_account(&alice);
    c.settle_account(&bob);
    let bob_after = c.account_or_default(&bob);
    assert_eq!(
        bob_after.accrued_sy,
        accrue(50 * ONE, 155 * ONE / 100, 16 * ONE / 10)
    );
    let alice_after = c.account_or_default(&alice);
    assert_eq!(
        alice_after.accrued_sy,
        accrue(150 * ONE, 15 * ONE / 10, 155 * ONE / 100)
            + accrue(100 * ONE, 155 * ONE / 100, 16 * ONE / 10)
    );
}

#[test]
fn locked_yt_cannot_be_transferred() {
    let mut c = setup();
    let alice = acc("alice.testnet");
    let bob = acc("bob.testnet");
    sim_strip(&mut c, &alice, 100 * ONE);
    c.accounts.insert(bob.clone(), Default::default());
    enter("alice.testnet", T0 + 1000, 1);
    c.list_yt(U128(150 * ONE), U128(ONE));
    assert!(c.move_unlocked_yt(&alice, &bob, 1).is_err());
}

#[test]
#[should_panic(expected = "E_INSUFFICIENT_YT")]
fn list_more_than_unlocked_panics() {
    let mut c = setup();
    let alice = acc("alice.testnet");
    sim_strip(&mut c, &alice, 100 * ONE);
    enter("alice.testnet", T0 + 1000, 1);
    c.list_yt(U128(150 * ONE), U128(ONE));
    c.list_yt(U128(1), U128(ONE));
}

#[test]
#[should_panic(expected = "E_STALE_INDEX")]
fn stale_index_blocks_yt_transfer() {
    let mut c = setup();
    let alice = acc("alice.testnet");
    let bob = acc("bob.testnet");
    sim_strip(&mut c, &alice, 100 * ONE);
    c.accounts.insert(bob.clone(), Default::default());
    c.index_ts_ms = T0;
    enter("alice.testnet", T0 + 121_000, 1);
    c.ft_transfer(bob, U128(ONE), None);
}

#[test]
fn fresh_index_allows_yt_transfer() {
    let mut c = setup();
    let alice = acc("alice.testnet");
    let bob = acc("bob.testnet");
    sim_strip(&mut c, &alice, 100 * ONE);
    c.accounts.insert(bob.clone(), Default::default());
    c.index_ts_ms = T0;
    enter("alice.testnet", T0 + 119_000, 1);
    c.ft_transfer(bob.clone(), U128(10 * ONE), None);
    assert_eq!(c.ft_balance_of(bob).0, 10 * ONE);
    assert_eq!(c.ft_balance_of(alice).0, 140 * ONE);
}

#[test]
#[should_panic(expected = "E_NOT_REGISTERED")]
fn transfer_to_unregistered_panics() {
    let mut c = setup();
    let alice = acc("alice.testnet");
    sim_strip(&mut c, &alice, 100 * ONE);
    c.index_ts_ms = T0;
    enter("alice.testnet", T0 + 1000, 1);
    c.ft_transfer(acc("ghost.testnet"), U128(ONE), None);
}

#[test]
fn offer_cap_and_views() {
    let mut c = setup();
    let alice = acc("alice.testnet");
    sim_strip(&mut c, &alice, 100 * ONE);
    enter("alice.testnet", T0 + 1000, 1);
    for i in 0..5u128 {
        let id = c.list_yt(U128(ONE), U128(i + 1)).0;
        assert_eq!(id, i as u64 + 1);
    }
    assert!(
        c.try_create_offer(&alice, OfferKind::Pt, ONE, 1)
            .is_err()
    );
    assert_eq!(c.get_series().open_offers, 5);
    let all = c.get_offers(None, 0, 100);
    assert_eq!(all.len(), 5);
    assert!(all.windows(2).all(|w| w[0].id.0 < w[1].id.0));
    assert_eq!(c.get_offers(Some(OfferKind::Pt), 0, 100).len(), 0);
    assert_eq!(c.get_offers(Some(OfferKind::Yt), 2, 2).len(), 2);
    assert!(c.get_offer(U64(3)).is_some());
    assert!(c.get_offer(U64(99)).is_none());
}

#[test]
fn cancel_yt_unlocks() {
    let mut c = setup();
    let alice = acc("alice.testnet");
    sim_strip(&mut c, &alice, 100 * ONE);
    enter("alice.testnet", T0 + 1000, 1);
    let id = c.list_yt(U128(40 * ONE), U128(ONE)).0;
    enter("alice.testnet", T0 + 2000, 1);
    let result = c.cancel_offer(U64(id));
    assert!(matches!(result, PromiseOrValue::Value(true)));
    assert_eq!(c.account_or_default(&alice).locked, 0);
    assert_eq!(c.get_series().open_offers, 0);
}

#[test]
#[should_panic(expected = "E_NOT_OWNER")]
fn cancel_by_other_panics() {
    let mut c = setup();
    let alice = acc("alice.testnet");
    sim_strip(&mut c, &alice, 100 * ONE);
    enter("alice.testnet", T0 + 1000, 1);
    let id = c.list_yt(U128(40 * ONE), U128(ONE)).0;
    enter("bob.testnet", T0 + 2000, 1);
    let _ = c.cancel_offer(U64(id));
}

#[test]
fn release_yt_offers_unlocks_all() {
    let mut c = setup();
    let alice = acc("alice.testnet");
    sim_strip(&mut c, &alice, 100 * ONE);
    enter("alice.testnet", T0 + 1000, 1);
    c.list_yt(U128(10 * ONE), U128(ONE));
    c.list_yt(U128(20 * ONE), U128(ONE));
    c.release_yt_offers(&alice);
    assert_eq!(c.account_or_default(&alice).locked, 0);
    assert_eq!(c.offers.len(), 0);
    assert!(c.seller_offers.get(&alice).is_none());
}

#[test]
fn ft_on_transfer_refunds_bad_inputs() {
    let mut c = setup();
    enter("other.testnet", T0 + 1000, 0);
    let wrong = c.ft_on_transfer(acc("alice.testnet"), U128(5), "{\"action\":\"strip\"}".into());
    assert_eq!(value_of(wrong), 5);

    enter("mst.testnet", T0 + 1000, 0);
    let bad = c.ft_on_transfer(acc("alice.testnet"), U128(5), "not json".into());
    assert_eq!(value_of(bad), 5);
    let unknown = c.ft_on_transfer(acc("alice.testnet"), U128(5), "{\"action\":\"nope\"}".into());
    assert_eq!(value_of(unknown), 5);
    let below_min = c.ft_on_transfer(acc("alice.testnet"), U128(ONE - 1), "{\"action\":\"strip\"}".into());
    assert_eq!(value_of(below_min), ONE - 1);
    let wrong_side = c.ft_on_transfer(acc("alice.testnet"), U128(ONE), "{\"action\":\"redeem\"}".into());
    assert_eq!(value_of(wrong_side), ONE);

    let ok = c.ft_on_transfer(acc("alice.testnet"), U128(ONE), "{\"action\":\"strip\"}".into());
    assert!(is_promise(&ok));

    enter("pt.testnet", T0 + 1000, 0);
    let early_redeem = c.ft_on_transfer(acc("alice.testnet"), U128(ONE), "{\"action\":\"redeem\"}".into());
    assert_eq!(value_of(early_redeem), ONE);
    let pt_bad = c.ft_on_transfer(acc("alice.testnet"), U128(ONE), "{\"action\":\"strip\"}".into());
    assert_eq!(value_of(pt_bad), ONE);

    enter("mst.testnet", MATURITY, 0);
    let late = c.ft_on_transfer(acc("alice.testnet"), U128(ONE), "{\"action\":\"strip\"}".into());
    assert_eq!(value_of(late), ONE);
}

#[test]
fn list_pt_escrow_and_cap() {
    let mut c = setup();
    enter("pt.testnet", T0 + 1000, 0);
    let msg = "{\"action\":\"list_pt\",\"ask_sy\":\"1000\"}".to_string();
    for _ in 0..5 {
        let r = c.ft_on_transfer(acc("alice.testnet"), U128(ONE), msg.clone());
        assert_eq!(value_of(r), 0);
    }
    let sixth = c.ft_on_transfer(acc("alice.testnet"), U128(ONE), msg.clone());
    assert_eq!(value_of(sixth), ONE);
    let zero_ask = c.ft_on_transfer(
        acc("bob.testnet"),
        U128(ONE),
        "{\"action\":\"list_pt\",\"ask_sy\":\"0\"}".into(),
    );
    assert_eq!(value_of(zero_ask), ONE);
    assert_eq!(c.get_offers(Some(OfferKind::Pt), 0, 10).len(), 5);
}

#[test]
fn buy_refuses_underpay_gone_and_late() {
    let mut c = setup();
    let alice = acc("alice.testnet");
    sim_strip(&mut c, &alice, 100 * ONE);
    enter("alice.testnet", T0 + 1000, 1);
    let id = c.list_yt(U128(10 * ONE), U128(5 * ONE)).0;
    let msg = format!("{{\"action\":\"buy\",\"offer_id\":\"{id}\"}}");
    enter("mst.testnet", T0 + 2000, 0);
    let under = c.ft_on_transfer(acc("bob.testnet"), U128(5 * ONE - 1), msg.clone());
    assert_eq!(value_of(under), 5 * ONE - 1);
    let gone = c.ft_on_transfer(acc("bob.testnet"), U128(5 * ONE), "{\"action\":\"buy\",\"offer_id\":\"99\"}".into());
    assert_eq!(value_of(gone), 5 * ONE);
    let self_buy = c.ft_on_transfer(alice.clone(), U128(5 * ONE), msg.clone());
    assert_eq!(value_of(self_buy), 5 * ONE);
    let ok = c.ft_on_transfer(acc("bob.testnet"), U128(6 * ONE), msg.clone());
    assert!(is_promise(&ok));
    enter("mst.testnet", MATURITY, 0);
    let late = c.ft_on_transfer(acc("bob.testnet"), U128(5 * ONE), msg);
    assert_eq!(value_of(late), 5 * ONE);
}

#[test]
fn claim_math_after_settlement() {
    let mut c = setup();
    let alice = acc("alice.testnet");
    let py = sim_strip(&mut c, &alice, 100 * ONE);
    c.apply_index(16 * ONE / 10);
    c.maturity_index = Some(c.index);
    c.apply_index(17 * ONE / 10);
    c.settle_account(&alice);
    let account = c.account_or_default(&alice);
    assert_eq!(account.accrued_sy, accrue(py, 15 * ONE / 10, 16 * ONE / 10));
    assert_eq!(account.user_index, 16 * ONE / 10);
    assert_eq!(c.pending_of(&account), 0);
}

struct Rng(u64);

impl Rng {
    fn next(&mut self) -> u64 {
        self.0 = self
            .0
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        self.0 >> 33
    }

    fn below(&mut self, n: u64) -> u64 {
        self.next() % n
    }
}

fn run_conservation(seed: u64, steps: usize) {
    let mut rng = Rng(seed);
    let mut c = setup();
    let users: Vec<AccountId> = (0..4).map(|i| acc(&format!("u{i}.testnet"))).collect();
    for u in &users {
        c.accounts.insert(u.clone(), Default::default());
    }
    let mut pt: HashMap<AccountId, u128> = HashMap::new();
    let mut deposited: u128 = 0;
    let mut previous_index = c.index;
    for _ in 0..steps {
        match rng.below(4) {
            0 => {
                let who = users[rng.below(4) as usize].clone();
                let sy = ONE + (rng.next() as u128 % 1000) * ONE / 7 + rng.next() as u128 % 1000;
                let py = sim_strip(&mut c, &who, sy);
                *pt.entry(who).or_default() += py;
                deposited += sy;
            }
            1 => {
                let bump = (rng.next() as u128 % 1000) * ONE / 100_000;
                c.apply_index(c.index + bump);
                let lower = c.index.saturating_sub(rng.next() as u128);
                c.apply_index(lower);
            }
            2 => {
                let from = users[rng.below(4) as usize].clone();
                let to = users[rng.below(4) as usize].clone();
                let balance = c.account_or_default(&from).balance;
                if balance > 1 {
                    let amount = rng.next() as u128 % balance + 1;
                    let _ = c.move_unlocked_yt(&from, &to, amount);
                }
            }
            _ => {
                let who = users[rng.below(4) as usize].clone();
                let account = c.account_or_default(&who);
                let free = account.balance.saturating_sub(account.locked);
                if free > 1 {
                    let amount = rng.next() as u128 % free + 1;
                    let _ = c.lock_yt(&who, amount);
                    let buyer = users[rng.below(4) as usize].clone();
                    if buyer != who {
                        let _ = c.move_locked_yt(&who, &buyer, amount);
                    } else {
                        c.unlock_yt(&who, amount);
                    }
                }
            }
        }
        assert!(c.index >= previous_index);
        previous_index = c.index;
        assert_eq!(c.pt_supply, c.yt_supply);
        let total_yt: u128 = users.iter().map(|u| c.account_or_default(u).balance).sum();
        assert_eq!(total_yt, c.yt_supply);
    }
    c.maturity_index = Some(c.index);
    let frozen = c.index;
    let mut paid: u128 = 0;
    for u in &users {
        c.settle_account(u);
        paid += c.account_or_default(u).accrued_sy;
        let held = pt.get(u).copied().unwrap_or(0);
        paid += mul_div(held, SCALE, frozen);
    }
    assert!(paid <= deposited, "paid {paid} deposited {deposited}");
    let dust_bound = (steps as u128) * 8 + 16;
    assert!(deposited - paid <= dust_bound, "dust {}", deposited - paid);
}

#[test]
fn conservation_property_random_runs() {
    for seed in 1..=40u64 {
        run_conservation(seed, 120);
    }
}

#[test]
fn rounding_floors_in_favour_of_vault() {
    for sy in [1u128, 3, 7, 999_999_999_999_999_999_999_999, 1_000_000_000_000_000_000_000_001] {
        let index = 1_514_411_535_945_873_749_259_456u128;
        let py = mul_div(sy, index, SCALE);
        let back = mul_div(py, SCALE, index);
        assert!(back <= sy);
    }
}

#[test]
fn storage_headroom_gate() {
    let c = setup();
    let mut low = ctx_at("alice.testnet", T0 + 1000, 0);
    low.account_balance(NearToken::from_yoctonear(1_000_000_000_000_000_000_000));
    testing_env!(low.build());
    assert!(!c.has_headroom());
    let mut high = ctx_at("alice.testnet", T0 + 1000, 0);
    high.account_balance(NearToken::from_near(100));
    testing_env!(high.build());
    assert!(c.has_headroom());
}
