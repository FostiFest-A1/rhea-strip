use near_sdk::env;
use near_sdk::serde_json::{Value, json};

pub fn emit(event: &str, data: Value) {
    let payload = json!({
        "standard": "rhea_strip",
        "version": "1.0.0",
        "event": event,
        "data": [data],
    });
    env::log_str(&format!("EVENT_JSON:{payload}"));
}
