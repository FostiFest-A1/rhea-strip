#![allow(unused_must_use)]

use near_sdk::serde_json::{Value, json};
use rhea_tests::*;

const STRIP: &str = "{\"action\":\"strip\"}";

fn buy_msg(offer_id: u64) -> String {
    json!({"action": "buy", "offer_id": offer_id.to_string()}).to_string()
}

fn list_pt_msg(ask: u128) -> String {
    json!({"action": "list_pt", "ask_sy": ask.to_string()}).to_string()
}

async fn offers(w: &World) -> TestResult<Vec<Value>> {
    w.view(&w.vault, "get_offers", json!({"from_index": 0, "limit": 50}))
        .await
}

#[tokio::test]
async fn strip_two_indexes_and_failure_refunds() -> TestResult {
    let mut w = World::start(Params::default()).await?;
    let (mst, pt, vault) = (w.mst.clone(), w.pt.clone(), w.vault.clone());
    let alice = w.create("alice", 20).await?;
    let bob = w.create("bob", 20).await?;
    w.faucet(&alice).await?;
    w.faucet(&bob).await?;

    let meta: Value = w.view(&vault, "ft_metadata", json!({})).await?;
    assert_eq!(meta["symbol"], "YT-mstNEAR-TEST");
    assert_eq!(meta["decimals"], 24);

    let series = w.series().await?;
    assert_eq!(series["status"], "Active");
    assert_eq!(series["yt"], vault.as_str());
    assert!(num(&series["index"]) > 0, "index must be seeded by new()");

    w.transfer_call("strip", &mst, &alice, tokens(10), STRIP, 300)
        .await?;
    let s1 = w.series().await?;
    let i1 = num(&s1["index"]);
    let py_a = mul_div(tokens(10), i1, SCALE);
    assert_eq!(num(&s1["total_sy"]), tokens(10));
    assert_eq!(num(&s1["pt_supply"]), py_a);
    assert_eq!(num(&s1["yt_supply"]), py_a);
    assert_eq!(w.ft_balance(&pt, &alice).await?, py_a);
    assert_eq!(w.ft_balance(&vault, &alice).await?, py_a);
    assert_eq!(w.ft_balance(&mst, &alice).await?, tokens(90));
    let pos = w.position(&alice).await?;
    assert_eq!(num(&pos["yt_balance"]), py_a);
    assert_eq!(num(&pos["yt_pending_sy"]), 0);

    tokio::time::sleep(std::time::Duration::from_secs(3)).await;
    w.transfer_call("strip", &mst, &bob, tokens(10), STRIP, 300)
        .await?;
    let s2 = w.series().await?;
    let i2 = num(&s2["index"]);
    assert!(i2 > i1, "mock yield must raise the index");
    let py_b = mul_div(tokens(10), i2, SCALE);
    assert!(py_b > py_a);
    assert_eq!(w.ft_balance(&pt, &bob).await?, py_b);
    assert_eq!(w.ft_balance(&vault, &bob).await?, py_b);
    assert_eq!(num(&s2["total_sy"]), tokens(20));
    assert_eq!(num(&s2["pt_supply"]), num(&s2["yt_supply"]));

    let pos_a = w.position(&alice).await?;
    assert_eq!(
        num(&pos_a["yt_pending_sy"]),
        accrue(py_a, i1, i2),
        "alice accrues from her own strip index"
    );
    let pos_b = w.position(&bob).await?;
    assert_eq!(num(&pos_b["yt_pending_sy"]), 0);

    let mut last = i2;
    for _ in 0..3 {
        let alice_signer = alice.clone();
        w.vault_call("sync_index", &alice_signer, "sync_index", json!({}), false, 50)
            .await?;
        let now = w.index().await?;
        assert!(now >= last, "index never decreases");
        last = now;
    }
    let after_sync = w.series().await?;
    assert!(num(&after_sync["index_ts_ms"]) >= num(&s2["index_ts_ms"]));

    let before_total = num(&w.series().await?["total_sy"]);

    let fake = w.deploy_fake_token("fake").await?;
    w.faucet_on(&fake, &alice).await?;
    w.call(
        "storage_deposit",
        &alice,
        &fake,
        "storage_deposit",
        json!({"account_id": vault, "registration_only": true}),
        near_api::NearToken::from_millinear(5),
        30,
    )
    .await?
    .assert_success();
    w.transfer_call("strip wrong token", &fake, &alice, tokens(5), STRIP, 300)
        .await?;
    assert_eq!(w.ft_balance(&fake, &alice).await?, tokens(100));

    w.transfer_call("strip malformed", &mst, &alice, tokens(5), "garbage", 300)
        .await?;
    w.transfer_call("strip unknown action", &mst, &alice, tokens(5), "{\"action\":\"x\"}", 300)
        .await?;
    w.transfer_call("strip below min", &mst, &alice, tokens(1) / 2, STRIP, 300)
        .await?;
    w.transfer_call(
        "redeem before settle",
        &pt,
        &alice,
        tokens(1),
        "{\"action\":\"redeem\"}",
        150,
    )
    .await?;
    assert_eq!(w.ft_balance(&mst, &alice).await?, tokens(90));
    assert_eq!(w.ft_balance(&pt, &alice).await?, py_a);
    assert_eq!(num(&w.series().await?["total_sy"]), before_total);

    w.report_gas();
    Ok(())
}

#[tokio::test]
async fn forward_sell_yield_pt_market_settle_redeem_claim() -> TestResult {
    let mut w = World::start(Params {
        maturity_in_secs: 160,
        ..Params::default()
    })
    .await?;
    let (mst, pt, vault) = (w.mst.clone(), w.pt.clone(), w.vault.clone());
    let alice = w.create("alice", 20).await?;
    let bob = w.create("bob", 20).await?;
    let carol = w.create("carol", 20).await?;
    w.faucet(&alice).await?;
    w.faucet(&bob).await?;
    w.faucet(&carol).await?;
    w.register(&bob, &pt, 5).await?;

    w.transfer_call("strip", &mst, &alice, tokens(20), STRIP, 100)
        .await?;
    let strip_series = w.series().await?;
    let i_strip = num(&strip_series["index"]);
    let py = mul_div(tokens(20), i_strip, SCALE);
    assert_eq!(w.ft_balance(&pt, &alice).await?, py);

    w.vault_call(
        "list_yt",
        &alice,
        "list_yt",
        json!({"amount": tokens(10).to_string(), "ask_sy": tokens(1).to_string()}),
        true,
        20,
    )
    .await?
    .assert_success();
    let listed = offers(&w).await?;
    assert_eq!(listed.len(), 1);
    assert_eq!(listed[0]["kind"], "Yt");
    assert_eq!(num(&listed[0]["amount"]), tokens(10));
    let pos = w.position(&alice).await?;
    assert_eq!(num(&pos["yt_locked"]), tokens(10));

    tokio::time::sleep(std::time::Duration::from_secs(3)).await;
    let bob_before = w.ft_balance(&mst, &bob).await?;
    w.transfer_call("buy yt", &mst, &bob, tokens(1), &buy_msg(1), 80)
        .await?;
    let fill_series = w.series().await?;
    let i_fill = num(&fill_series["index"]);
    assert!(i_fill > i_strip);
    assert_eq!(w.ft_balance(&mst, &bob).await?, bob_before - tokens(1));
    assert_eq!(w.ft_balance(&vault, &bob).await?, tokens(10));
    assert_eq!(w.ft_balance(&vault, &alice).await?, py - tokens(10));
    assert_eq!(offers(&w).await?.len(), 0);
    let alice_pos = w.position(&alice).await?;
    let alice_pre_fill = accrue(py, i_strip, i_fill);
    assert_eq!(num(&alice_pos["yt_locked"]), 0);
    assert_eq!(num(&alice_pos["yt_accrued_sy"]), alice_pre_fill);
    assert_eq!(num(&alice_pos["sy_credit"]), tokens(1));
    let bob_pos = w.position(&bob).await?;
    assert_eq!(num(&bob_pos["yt_accrued_sy"]), 0);
    assert_eq!(num(&bob_pos["yt_balance"]), tokens(10));

    let alice_mst = w.ft_balance(&mst, &alice).await?;
    w.vault_call("withdraw_sy", &alice, "withdraw_sy", json!({}), true, 50)
        .await?;
    assert_eq!(w.ft_balance(&mst, &alice).await?, alice_mst + tokens(1));
    assert_eq!(num(&w.position(&alice).await?["sy_credit"]), 0);

    w.transfer_call("list pt", &pt, &alice, tokens(5), &list_pt_msg(tokens(3)), 40)
        .await?;
    let listed = offers(&w).await?;
    assert_eq!(listed.len(), 1);
    assert_eq!(listed[0]["kind"], "Pt");
    let pt_offer = num(&listed[0]["id"]) as u64;
    assert_eq!(w.ft_balance(&pt, &alice).await?, py - tokens(5));

    let carol_mst = w.ft_balance(&mst, &carol).await?;
    w.transfer_call("buy pt unregistered buyer", &mst, &carol, tokens(3), &buy_msg(pt_offer), 80)
        .await?;
    assert_eq!(w.ft_balance(&mst, &carol).await?, carol_mst);
    assert_eq!(offers(&w).await?.len(), 1);

    let bob_mst = w.ft_balance(&mst, &bob).await?;
    w.transfer_call(
        "buy pt overpay",
        &mst,
        &bob,
        tokens(3) + tokens(1) / 10,
        &buy_msg(pt_offer),
        80,
    )
    .await?;
    assert_eq!(w.ft_balance(&mst, &bob).await?, bob_mst - tokens(3));
    assert_eq!(w.ft_balance(&pt, &bob).await?, tokens(5));
    assert_eq!(offers(&w).await?.len(), 0);
    assert_eq!(num(&w.position(&alice).await?["sy_credit"]), tokens(3));

    w.transfer_call("list pt 2", &pt, &alice, tokens(2), &list_pt_msg(tokens(1)), 40)
        .await?;
    let second = num(&offers(&w).await?[0]["id"]) as u64;
    let alice_pt = w.ft_balance(&pt, &alice).await?;
    w.vault_call(
        "cancel pt offer",
        &alice,
        "cancel_offer",
        json!({"offer_id": second.to_string()}),
        true,
        40,
    )
    .await?;
    assert_eq!(w.ft_balance(&pt, &alice).await?, alice_pt + tokens(2));
    assert_eq!(offers(&w).await?.len(), 0);

    w.vault_call(
        "list_yt 2",
        &alice,
        "list_yt",
        json!({"amount": tokens(3).to_string(), "ask_sy": tokens(1).to_string()}),
        true,
        20,
    )
    .await?
    .assert_success();
    let yt_offer = num(&offers(&w).await?[0]["id"]) as u64;
    assert_eq!(num(&w.position(&alice).await?["yt_locked"]), tokens(3));
    let bob_cancel = w
        .vault_call(
            "cancel by stranger",
            &bob,
            "cancel_offer",
            json!({"offer_id": yt_offer.to_string()}),
            true,
            50,
        )
        .await?;
    assert!(bob_cancel.is_failure());
    w.vault_call(
        "cancel yt offer",
        &alice,
        "cancel_offer",
        json!({"offer_id": yt_offer.to_string()}),
        true,
        50,
    )
    .await?;
    assert_eq!(num(&w.position(&alice).await?["yt_locked"]), 0);

    let maturity = w.maturity_ms;
    w.wait_until_ms(maturity + 500).await?;
    assert_eq!(w.series().await?["status"], "Matured");

    let total_before = num(&w.series().await?["total_sy"]);
    w.transfer_call("strip after maturity", &mst, &alice, tokens(2), STRIP, 100)
        .await?;
    assert_eq!(num(&w.series().await?["total_sy"]), total_before);
    let late_list = w
        .vault_call(
            "list_yt after maturity",
            &alice,
            "list_yt",
            json!({"amount": tokens(1).to_string(), "ask_sy": tokens(1).to_string()}),
            true,
            20,
        )
        .await?;
    assert!(late_list.is_failure());
    let early = w
        .vault_call("claim before settle", &alice, "claim_yield", json!({}), true, 50)
        .await?;
    assert!(early.is_failure());

    w.vault_call("settle", &bob, "settle", json!({}), false, 40)
        .await?;
    let settled = w.series().await?;
    assert_eq!(settled["status"], "Settled");
    let mi = num(&settled["maturity_index"]);
    assert!(mi >= i_fill);
    w.vault_call("settle again", &carol, "settle", json!({}), false, 40)
        .await?;
    assert_eq!(num(&w.series().await?["maturity_index"]), mi);

    let alice_before = w.ft_balance(&mst, &alice).await?;
    let alice_pt_now = w.ft_balance(&pt, &alice).await?;
    w.transfer_call(
        "redeem",
        &pt,
        &alice,
        alice_pt_now,
        "{\"action\":\"redeem\"}",
        70,
    )
    .await?;
    let redeem_out = mul_div(alice_pt_now, SCALE, mi);
    assert_eq!(w.ft_balance(&mst, &alice).await?, alice_before + redeem_out);
    assert_eq!(w.ft_balance(&pt, &alice).await?, 0);

    let alice_before = w.ft_balance(&mst, &alice).await?;
    w.vault_call("claim_yield", &alice, "claim_yield", json!({}), true, 50)
        .await?;
    let alice_claim = alice_pre_fill + accrue(py - tokens(10), i_fill, mi);
    assert_eq!(w.ft_balance(&mst, &alice).await?, alice_before + alice_claim);
    assert_eq!(w.ft_balance(&vault, &alice).await?, 0);

    let bob_before = w.ft_balance(&mst, &bob).await?;
    w.vault_call("claim_yield", &bob, "claim_yield", json!({}), true, 50)
        .await?;
    let bob_claim = accrue(tokens(10), i_fill, mi);
    assert_eq!(w.ft_balance(&mst, &bob).await?, bob_before + bob_claim);

    let bob_before = w.ft_balance(&mst, &bob).await?;
    w.transfer_call("redeem", &pt, &bob, tokens(5), "{\"action\":\"redeem\"}", 70)
        .await?;
    let bob_redeem = mul_div(tokens(5), SCALE, mi);
    assert_eq!(w.ft_balance(&mst, &bob).await?, bob_before + bob_redeem);

    let alice_before = w.ft_balance(&mst, &alice).await?;
    w.vault_call("withdraw_sy", &alice, "withdraw_sy", json!({}), true, 50)
        .await?;
    assert_eq!(w.ft_balance(&mst, &alice).await?, alice_before + tokens(3));

    let end = w.series().await?;
    assert_eq!(num(&end["pt_supply"]), 0);
    assert_eq!(num(&end["yt_supply"]), 0);
    let paid = redeem_out + alice_claim + bob_claim + bob_redeem;
    assert!(paid <= tokens(20), "vault never pays more than it took");
    assert!(tokens(20) - paid <= 10, "rounding dust stays below 10 yocto");
    let vault_left = w.ft_balance(&mst, &vault).await?;
    assert_eq!(vault_left, tokens(20) - paid);
    assert_eq!(num(&end["total_sy"]), tokens(20) - paid);

    let supply: String = w.view(&mst, "ft_total_supply", json!({})).await?;
    let mut sum = 0u128;
    for who in [&alice, &bob, &carol, &vault] {
        sum += w.ft_balance(&mst, who).await?;
    }
    assert_eq!(sum, supply.parse::<u128>()?);

    let owner = w.owner.clone();
    w.register(&owner, &mst, 5).await?;
    w.vault_call("sweep_residual", &owner, "sweep_residual", json!({}), true, 80)
        .await?;
    assert_eq!(w.ft_balance(&mst, &vault).await?, 0);
    assert_eq!(num(&w.series().await?["total_sy"]), 0);
    let stranger_sweep = w
        .vault_call("sweep by stranger", &alice, "sweep_residual", json!({}), true, 80)
        .await?;
    assert!(stranger_sweep.is_failure());

    w.report_gas();
    Ok(())
}

#[tokio::test]
async fn failed_payout_restores_credit() -> TestResult {
    let mut w = World::start(Params::default()).await?;
    let (mst, vault) = (w.mst.clone(), w.vault.clone());
    let alice = w.create("alice", 20).await?;
    let carol = w.create("carol", 20).await?;
    w.faucet(&alice).await?;
    w.transfer_call("strip", &mst, &alice, tokens(10), STRIP, 100)
        .await?;
    w.call(
        "yt storage_deposit",
        &carol,
        &vault,
        "storage_deposit",
        json!({"account_id": carol, "registration_only": true}),
        near_api::NearToken::from_millinear(2),
        30,
    )
    .await?
    .assert_success();
    w.call(
        "yt transfer",
        &alice,
        &vault,
        "ft_transfer",
        json!({"receiver_id": carol, "amount": tokens(6).to_string()}),
        ONE_YOCTO,
        30,
    )
    .await?
    .assert_success();
    assert_eq!(w.ft_balance(&vault, &carol).await?, tokens(6));

    w.vault_call(
        "list_yt",
        &carol,
        "list_yt",
        json!({"amount": tokens(6).to_string(), "ask_sy": tokens(1).to_string()}),
        true,
        20,
    )
    .await?
    .assert_success();
    let locked_transfer = w
        .call(
            "yt transfer locked",
            &carol,
            &vault,
            "ft_transfer",
            json!({"receiver_id": alice, "amount": "1"}),
            ONE_YOCTO,
            30,
        )
        .await?;
    assert!(locked_transfer.is_failure());

    w.transfer_call("buy yt", &mst, &alice, tokens(1), &buy_msg(1), 80)
        .await?;
    assert_eq!(num(&w.position(&carol).await?["sy_credit"]), tokens(1));

    let failed = w
        .vault_call("withdraw unregistered", &carol, "withdraw_sy", json!({}), true, 50)
        .await?;
    assert!(failed.logs().iter().any(|l| l.contains("E_PAYOUT_FAILED")));
    assert_eq!(num(&w.position(&carol).await?["sy_credit"]), tokens(1));
    assert_eq!(w.ft_balance(&mst, &carol).await?, 0);

    w.register(&carol, &mst, 5).await?;
    w.vault_call("withdraw registered", &carol, "withdraw_sy", json!({}), true, 50)
        .await?;
    assert_eq!(w.ft_balance(&mst, &carol).await?, tokens(1));
    assert_eq!(num(&w.position(&carol).await?["sy_credit"]), 0);

    w.report_gas();
    Ok(())
}

#[tokio::test]
async fn low_gas_never_creates_unbacked_pt() -> TestResult {
    let mut w = World::start(Params::default()).await?;
    let (mst, pt, vault) = (w.mst.clone(), w.pt.clone(), w.vault.clone());
    let alice = w.create("alice", 20).await?;
    w.faucet(&alice).await?;
    for tgas in [80u64, 60, 50, 40, 30] {
        let before = w.ft_balance(&pt, &alice).await?;
        w.transfer_call(&format!("probe strip {tgas}"), &mst, &alice, tokens(1), STRIP, tgas)
            .await?;
        let after = w.ft_balance(&pt, &alice).await?;
        let series = w.series().await?;
        println!(
            "PROBE strip at {tgas} TGas: {}",
            if after > before { "stripped" } else { "refunded" }
        );
        assert_eq!(num(&series["pt_supply"]), w.ft_balance(&pt, &alice).await?);
        assert_eq!(num(&series["yt_supply"]), w.ft_balance(&vault, &alice).await?);
        let mst_left = w.ft_balance(&mst, &alice).await?;
        assert_eq!(num(&series["total_sy"]), tokens(100) - mst_left);
    }
    for tgas in [60u64, 40, 30, 25, 20] {
        let before = num(&w.series().await?["index_ts_ms"]);
        w.vault_call(&format!("probe sync {tgas}"), &alice, "sync_index", json!({}), false, tgas)
            .await?;
        let after = num(&w.series().await?["index_ts_ms"]);
        println!(
            "PROBE sync_index at {tgas} TGas: {}",
            if after > before { "synced" } else { "failed" }
        );
    }
    w.report_gas();
    Ok(())
}
