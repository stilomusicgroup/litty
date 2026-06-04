use crate::errors::LitCurveError;
use anchor_lang::prelude::*;

pub struct BuyResult {
    pub tokens_out: u64,
    pub new_virtual_sol: u64,
    pub new_virtual_tokens: u64,
}

pub struct SellResult {
    pub sol_out: u64,
    pub new_virtual_sol: u64,
    pub new_virtual_tokens: u64,
}

pub struct FeeComponents {
    pub fan_lamports: u64,
    pub artist_lamports: u64,
    pub treasury_lamports: u64,
    pub infra_lamports: u64,
}

/// Constant-product buy: given net SOL entering the curve, return tokens out.
/// All intermediate arithmetic in u128 to prevent overflow.
pub fn compute_buy(
    virtual_sol: u64,
    virtual_tokens: u64,
    sol_in: u64,
) -> Result<BuyResult> {
    require!(sol_in > 0, LitCurveError::ZeroAmount);
    require!(virtual_tokens > 0, LitCurveError::InsufficientTokenReserves);

    let k = (virtual_sol as u128)
        .checked_mul(virtual_tokens as u128)
        .ok_or(LitCurveError::MathOverflow)?;

    let new_virtual_sol = (virtual_sol as u128)
        .checked_add(sol_in as u128)
        .ok_or(LitCurveError::MathOverflow)?;

    // Floor division: protocol receives slightly more than exact k
    let new_virtual_tokens = k
        .checked_div(new_virtual_sol)
        .ok_or(LitCurveError::MathOverflow)?;

    let tokens_out = (virtual_tokens as u128)
        .checked_sub(new_virtual_tokens)
        .ok_or(LitCurveError::InsufficientTokenReserves)?;

    require!(tokens_out > 0, LitCurveError::InsufficientOutput);

    Ok(BuyResult {
        tokens_out: tokens_out as u64,
        new_virtual_sol: new_virtual_sol as u64,
        new_virtual_tokens: new_virtual_tokens as u64,
    })
}

/// Constant-product sell: given tokens in, return SOL out (before fee split).
pub fn compute_sell(
    virtual_sol: u64,
    virtual_tokens: u64,
    tokens_in: u64,
) -> Result<SellResult> {
    require!(tokens_in > 0, LitCurveError::ZeroAmount);
    require!(virtual_sol > 0, LitCurveError::InsufficientSolReserves);

    let k = (virtual_sol as u128)
        .checked_mul(virtual_tokens as u128)
        .ok_or(LitCurveError::MathOverflow)?;

    let new_virtual_tokens = (virtual_tokens as u128)
        .checked_add(tokens_in as u128)
        .ok_or(LitCurveError::MathOverflow)?;

    let new_virtual_sol = k
        .checked_div(new_virtual_tokens)
        .ok_or(LitCurveError::MathOverflow)?;

    let sol_out = (virtual_sol as u128)
        .checked_sub(new_virtual_sol)
        .ok_or(LitCurveError::InsufficientSolReserves)?;

    require!(sol_out > 0, LitCurveError::InsufficientOutput);

    Ok(SellResult {
        sol_out: sol_out as u64,
        new_virtual_sol: new_virtual_sol as u64,
        new_virtual_tokens: new_virtual_tokens as u64,
    })
}

/// Split gross SOL into fan/artist/treasury/infra shares.
/// Uses remainder for infra so all pieces sum exactly to gross_lamports.
pub fn split_buy_fees(gross_lamports: u64) -> Result<FeeComponents> {
    require!(gross_lamports > 0, LitCurveError::ZeroAmount);

    let fan = (gross_lamports as u128)
        .checked_mul(9_600)
        .ok_or(LitCurveError::MathOverflow)?
        / 10_000;

    let artist = (gross_lamports as u128)
        .checked_mul(200)
        .ok_or(LitCurveError::MathOverflow)?
        / 10_000;

    let treasury = (gross_lamports as u128)
        .checked_mul(100)
        .ok_or(LitCurveError::MathOverflow)?
        / 10_000;

    let infra = gross_lamports as u128 - fan - artist - treasury;

    Ok(FeeComponents {
        fan_lamports: fan as u64,
        artist_lamports: artist as u64,
        treasury_lamports: treasury as u64,
        infra_lamports: infra as u64,
    })
}

/// Split gross SOL output into fan/artist/treasury/infra on a sell.
pub fn split_sell_fees(gross_lamports: u64) -> Result<FeeComponents> {
    split_buy_fees(gross_lamports) // same split ratios
}

/// Spot price: lamports per 1 full token (10^6 raw units).
/// Returns 0 if reserves are zero.
pub fn spot_price(virtual_sol: u64, virtual_tokens: u64) -> u64 {
    if virtual_tokens == 0 {
        return 0;
    }
    let one_token: u64 = 1_000_000; // 10^6 raw units
    ((virtual_sol as u128) * (one_token as u128) / (virtual_tokens as u128)) as u64
}

/// Verify k is conserved within 1 unit of rounding.
pub fn assert_k_conserved(
    v_sol_before: u64,
    v_tokens_before: u64,
    v_sol_after: u64,
    v_tokens_after: u64,
) -> Result<()> {
    let k_before = (v_sol_before as u128) * (v_tokens_before as u128);
    let k_after = (v_sol_after as u128) * (v_tokens_after as u128);
    // k_after must be >= k_before (protocol captures rounding)
    // and not more than k_before + a small epsilon
    require!(k_after >= k_before, LitCurveError::MathOverflow);
    // epsilon: allow up to (v_sol_after) rounding units
    let epsilon = v_sol_after as u128;
    require!(k_after <= k_before + epsilon, LitCurveError::MathOverflow);
    Ok(())
}
