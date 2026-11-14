#![allow(
    deprecated,
    semicolon_in_expressions_from_non_local_macros,
    clippy::manual_div_ceil,
    clippy::assign_op_pattern,
    clippy::too_many_arguments
)]

use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use near_api::{AccountId, Chain, Contract, NearGas, NearToken, NetworkConfig, Signer};
use near_sandbox::Sandbox;
use near_sdk::serde::de::DeserializeOwned;
use near_sdk::serde_json::{Value, json};
use uint::construct_uint;

pub type TestResult<T = ()> = testresult::TestResult<T>;

construct_uint! {
    pub struct U256(4);
}

construct_uint! {
    pub struct U512(8);
}

pub const SCALE: u128 = 1_000_000_000_000_000_000_000_000;
pub const ONE_YOCTO: NearToken = NearToken::from_yoctonear(1);

pub fn mul_div(a: u128, b: u128, c: u128) -> u128 {
    (U256::from(a) * U256::from(b) / U256::from(c)).low_u128()
}

pub fn accrue(balance: u128, prev: u128, cur: u128) -> u128 {
    if cur <= prev || prev == 0 {
        return 0;
    }
    let num = U512::from(balance) * U512::from(SCALE) * U512::from(cur - prev);
    let den = U512::from(prev) * U512::from(cur);
    (num / den).low_u128()
}

pub fn tokens(whole: u128) -> u128 {
    whole * SCALE
}

fn wasm(name: &str) -> TestResult<Vec<u8>> {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("target")
        .join("near")
        .join(name)
        .join(format!("{name}.wasm"));
    std::fs::read(&path).map_err(|e| {
        format!(
            "missing {} ({e}); run `cargo near build non-reproducible-wasm` in contracts/{}",
            path.display(),
            name.replace('_', "-")
        )
        .into()
    })
}

pub struct GasSample {
    pub label: String,
    pub total_gas: u64,
    pub max_receipt_gas: u64,
}

pub struct World {
    pub sandbox: Sandbox,
    pub network: NetworkConfig,
    pub signer: Arc<Signer>,
    pub owner: AccountId,
    pub mst: AccountId,
    pub pt: AccountId,
    pub vault: AccountId,
    pub maturity_ms: u64,
    pub gas: Vec<GasSample>,
}

pub struct Params {
    pub maturity_in_secs: u64,
    pub apr_bps: u32,
    pub year_secs: u64,
    pub min_strip: u128,
}

impl Default for Params {
    fn default() -> Self {
        Self {
            maturity_in_secs: 600,
            apr_bps: 5000,
            year_secs: 100,
            min_strip: tokens(1),
        }
    }
}

impl World {
    pub async fn start(params: Params) -> TestResult<World> {
        let sandbox = Sandbox::start_sandbox().await?;
        let network = NetworkConfig::from_rpc_url("sandbox", sandbox.rpc_addr.parse()?);
        let signer = Signer::from_secret_key(
            near_sandbox::config::DEFAULT_GENESIS_ACCOUNT_PRIVATE_KEY.parse()?,
        )?;
        let mut world = World {
            sandbox,
            network,
            signer,
            owner: "owner.sandbox".parse()?,
            mst: "mst.sandbox".parse()?,
            pt: "pt.sandbox".parse()?,
            vault: "strip.sandbox".parse()?,
            maturity_ms: 0,
            gas: Vec::new(),
        };
        for name in ["owner", "mst", "pt", "strip"] {
            world.create(name, 60).await?;
        }
        world.maturity_ms = world.now_ms().await? + params.maturity_in_secs * 1000;
        world
            .deploy(
                &world.mst.clone(),
                "mock_stnear",
                "new",
                json!({
                    "owner": world.owner,
                    "apr_bps": params.apr_bps,
                    "year_secs": params.year_secs.to_string(),
                }),
            )
            .await?;
        world
            .deploy(
                &world.pt.clone(),
                "pt_token",
                "new",
                json!({
                    "minter": world.vault,
                    "name": "Principal Token mstNEAR",
                    "symbol": "PT-mstNEAR-TEST",
                    "maturity_ms": world.maturity_ms.to_string(),
                }),
            )
            .await?;
        world
            .deploy(
                &world.vault.clone(),
                "strip_vault",
                "new",
                json!({
                    "owner": world.owner,
                    "underlying": world.mst,
                    "pt": world.pt,
                    "maturity_ms": world.maturity_ms.to_string(),
                    "year_secs": params.year_secs.to_string(),
                    "min_strip": params.min_strip.to_string(),
                }),
            )
            .await?;
        world.settle_chain().await;
        Ok(world)
    }

    pub async fn settle_chain(&self) {
        tokio::time::sleep(Duration::from_secs(4)).await;
    }

    pub async fn create(&self, name: &str, near: u128) -> TestResult<AccountId> {
        let id: AccountId = format!("{name}.sandbox").parse()?;
        self.sandbox
            .create_account(id.as_str().parse()?)
            .initial_balance(NearToken::from_near(near))
            .send()
            .await?;
        Ok(id)
    }

    async fn deploy(
        &self,
        account: &AccountId,
        wasm_name: &str,
        init: &str,
        args: Value,
    ) -> TestResult {
        Contract::deploy(account.clone())
            .use_code(wasm(wasm_name)?)
            .with_init_call(init, args)?
            .gas(NearGas::from_tgas(300))
            .with_signer(self.signer.clone())
            .send_to(&self.network)
            .await?
            .assert_success();
        Ok(())
    }

    pub async fn deploy_fake_token(&self, name: &str) -> TestResult<AccountId> {
        let id = self.create(name, 20).await?;
        self.deploy(
            &id,
            "mock_stnear",
            "new",
            json!({"owner": self.owner, "apr_bps": 0, "year_secs": "100"}),
        )
        .await?;
        Ok(id)
    }

    pub async fn now_ms(&self) -> TestResult<u64> {
        let block = Chain::block().fetch_from(&self.network).await?;
        Ok(block.header.timestamp / 1_000_000)
    }

    pub async fn wait_until_ms(&self, target_ms: u64) -> TestResult {
        loop {
            if self.now_ms().await? >= target_ms {
                return Ok(());
            }
            tokio::time::sleep(Duration::from_millis(700)).await;
        }
    }

    pub async fn call(
        &mut self,
        label: &str,
        who: &AccountId,
        contract: &AccountId,
        method: &str,
        args: Value,
        deposit: NearToken,
        tgas: u64,
    ) -> TestResult<near_api::types::transaction::result::ExecutionFinalResult> {
        let result = Contract(contract.clone())
            .call_function(method, args)
            .transaction()
            .deposit(deposit)
            .gas(NearGas::from_tgas(tgas))
            .with_signer(who.clone(), self.signer.clone())
            .send_to(&self.network)
            .await?;
        let full = result
            .into_full()
            .ok_or("transaction did not reach a final status")?;
        let max_receipt = full
            .outcomes()
            .iter()
            .map(|o| o.gas_burnt.as_gas())
            .max()
            .unwrap_or(0);
        self.gas.push(GasSample {
            label: label.to_string(),
            total_gas: full.total_gas_burnt.as_gas(),
            max_receipt_gas: max_receipt,
        });
        Ok(full)
    }

    pub async fn view<T: DeserializeOwned + Send + Sync>(
        &self,
        contract: &AccountId,
        method: &str,
        args: Value,
    ) -> TestResult<T> {
        let out: T = Contract(contract.clone())
            .call_function(method, args)
            .read_only()
            .fetch_from(&self.network)
            .await?
            .data;
        Ok(out)
    }

    pub async fn ft_balance(&self, token: &AccountId, who: &AccountId) -> TestResult<u128> {
        let raw: String = self
            .view(token, "ft_balance_of", json!({"account_id": who}))
            .await?;
        Ok(raw.parse()?)
    }

    pub async fn series(&self) -> TestResult<Value> {
        self.view(&self.vault, "get_series", json!({})).await
    }

    pub async fn position(&self, who: &AccountId) -> TestResult<Value> {
        self.view(&self.vault, "get_position", json!({"account_id": who}))
            .await
    }

    pub async fn index(&self) -> TestResult<u128> {
        let series = self.series().await?;
        Ok(num(&series["index"]))
    }

    pub async fn register(
        &mut self,
        who: &AccountId,
        token: &AccountId,
        deposit_milli_near: u128,
    ) -> TestResult {
        self.call(
            "storage_deposit",
            who,
            token,
            "storage_deposit",
            json!({"account_id": who, "registration_only": true}),
            NearToken::from_millinear(deposit_milli_near),
            30,
        )
        .await?
        .assert_success();
        Ok(())
    }

    pub async fn faucet(&mut self, who: &AccountId) -> TestResult {
        let mst = self.mst.clone();
        self.call("faucet", who, &mst, "faucet", json!({}), NearToken::from_yoctonear(0), 30)
            .await?
            .assert_success();
        Ok(())
    }

    pub async fn faucet_on(&mut self, token: &AccountId, who: &AccountId) -> TestResult {
        self.call("faucet", who, token, "faucet", json!({}), NearToken::from_yoctonear(0), 30)
            .await?
            .assert_success();
        Ok(())
    }

    pub async fn transfer_call(
        &mut self,
        label: &str,
        token: &AccountId,
        who: &AccountId,
        amount: u128,
        msg: &str,
        tgas: u64,
    ) -> TestResult<near_api::types::transaction::result::ExecutionFinalResult> {
        let vault = self.vault.clone();
        self.call(
            label,
            who,
            token,
            "ft_transfer_call",
            json!({
                "receiver_id": vault,
                "amount": amount.to_string(),
                "msg": msg,
            }),
            ONE_YOCTO,
            tgas,
        )
        .await
    }

    pub async fn vault_call(
        &mut self,
        label: &str,
        who: &AccountId,
        method: &str,
        args: Value,
        yocto: bool,
        tgas: u64,
    ) -> TestResult<near_api::types::transaction::result::ExecutionFinalResult> {
        let vault = self.vault.clone();
        let deposit = if yocto { ONE_YOCTO } else { NearToken::from_yoctonear(0) };
        self.call(label, who, &vault, method, args, deposit, tgas).await
    }

    pub fn report_gas(&self) {
        println!("---- gas (TGas) ----");
        for s in &self.gas {
            println!(
                "GAS {:<28} total {:>4}.{:02} max_receipt {:>3}.{:02}",
                s.label,
                s.total_gas / 1_000_000_000_000,
                s.total_gas % 1_000_000_000_000 / 10_000_000_000,
                s.max_receipt_gas / 1_000_000_000_000,
                s.max_receipt_gas % 1_000_000_000_000 / 10_000_000_000
            );
        }
    }
}

pub fn num(value: &Value) -> u128 {
    match value {
        Value::String(s) => s.parse().unwrap_or(0),
        Value::Number(n) => n.as_u64().map(u128::from).unwrap_or(0),
        _ => 0,
    }
}
