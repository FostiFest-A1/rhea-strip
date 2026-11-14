#![allow(
    deprecated,
    semicolon_in_expressions_from_non_local_macros,
    clippy::manual_div_ceil,
    clippy::assign_op_pattern
)]

use near_sdk::env;
use uint::construct_uint;

construct_uint! {
    pub struct U256(4);
}

construct_uint! {
    pub struct U512(8);
}

pub const SCALE: u128 = 1_000_000_000_000_000_000_000_000;

pub fn mul_div(a: u128, b: u128, c: u128) -> u128 {
    if c == 0 {
        env::panic_str("E_MATH");
    }
    let r = U256::from(a) * U256::from(b) / U256::from(c);
    if r > U256::from(u128::MAX) {
        env::panic_str("E_MATH");
    }
    r.low_u128()
}

pub fn accrue(balance: u128, prev: u128, cur: u128) -> u128 {
    if balance == 0 || prev == 0 || cur <= prev {
        return 0;
    }
    let num = U512::from(balance) * U512::from(SCALE) * U512::from(cur - prev);
    let den = U512::from(prev) * U512::from(cur);
    let r = num / den;
    if r > U512::from(u128::MAX) {
        u128::MAX
    } else {
        r.low_u128()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mul_div_floors() {
        assert_eq!(mul_div(10, 3, 4), 7);
        assert_eq!(mul_div(u128::MAX, u128::MAX, u128::MAX), u128::MAX);
    }

    #[test]
    #[should_panic(expected = "E_MATH")]
    fn mul_div_overflow_panics() {
        mul_div(u128::MAX, 2, 1);
    }

    #[test]
    fn accrue_worked_vector() {
        let one = SCALE;
        let prev = 15 * one / 10;
        let cur = 16 * one / 10;
        let bal = 150 * one;
        let got = accrue(bal, prev, cur);
        let expect = 6_250_000_000_000_000_000_000_000u128;
        assert!(got <= expect && expect - got <= 1, "{got}");
    }

    #[test]
    fn accrue_zero_cases() {
        assert_eq!(accrue(0, SCALE, 2 * SCALE), 0);
        assert_eq!(accrue(5, 0, 2 * SCALE), 0);
        assert_eq!(accrue(5, 2 * SCALE, 2 * SCALE), 0);
        assert_eq!(accrue(5, 3 * SCALE, 2 * SCALE), 0);
    }

    #[test]
    fn accrue_large_values_do_not_overflow() {
        let got = accrue(u128::MAX / 2, SCALE, 2 * SCALE);
        assert!(got > 0);
    }
}
