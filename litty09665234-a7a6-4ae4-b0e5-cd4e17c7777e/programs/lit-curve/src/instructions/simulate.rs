/// Phase 2: Read-only simulation instructions.
/// These instructions do NOT mutate state. Call them via .simulate() on the client
/// to get buy/sell quotes without spending SOL.
use anchor_lang::prelude::*;

use crate::errors::LitCurveError;
use crate::events::{SimulateBuyResult, SimulateSellResult};
use crate::math;
use crate::state::BondingCurveAccount;

#[derive(Accounts)]
pub struct Simulate<'info> {
    pub curve: Account<'info, BondingCurveAccount>,
}

/// Simulate a buy: given gross SOL in, emit how many tokens the fan and artist
/// would receive, all fee breakdowns, and the resulting spot price.
pub fn simulate_buy(ctx: Context<Simulate>, gross_sol_in: u64) -> Result<()> {
    let curve = &ctx.accounts.curve;
    require!(!curve.is_graduated, LitCurveError::CurveGraduated);
    require!(gross_sol_in > 0, LitCurveError::ZeroAmount);

    let fees = math::split_buy_fees(gross_sol_in)?;

    let k_before = (curve.virtual_sol_reserves as u128) * (curve.virtual_token_reserves as u128);

    // Step 1: fan buys tokens
    let fan_result = math::compute_buy(
        curve.virtual_sol_reserves,
        curve.virtual_token_reserves,
        fees.fan_lamports,
    )?;

    // Step 2: artist buys tokens with updated reserves
    let artist_result = math::compute_buy(
        fan_result.new_virtual_sol,
        fan_result.new_virtual_tokens,
        fees.artist_lamports,
    )?;

    let k_after =
        (artist_result.new_virtual_sol as u128) * (artist_result.new_virtual_tokens as u128);

    let price_after = math::spot_price(
        artist_result.new_virtual_sol,
        artist_result.new_virtual_tokens,
    );

    emit!(SimulateBuyResult {
        song_id: curve.song_id,
        sol_in: gross_sol_in,
        fan_sol: fees.fan_lamports,
        artist_sol: fees.artist_lamports,
        treasury_sol: fees.treasury_lamports,
        infra_sol: fees.infra_lamports,
        fan_tokens_out: fan_result.tokens_out,
        artist_tokens_out: artist_result.tokens_out,
        price_after,
        k_before,
        k_after,
    });

    Ok(())
}

/// Simulate a sell: given tokens in, emit gross SOL out, all fee splits,
/// and the resulting spot price.
pub fn simulate_sell(ctx: Context<Simulate>, tokens_in: u64) -> Result<()> {
    let curve = &ctx.accounts.curve;
    require!(!curve.is_graduated, LitCurveError::CurveGraduated);
    require!(tokens_in > 0, LitCurveError::ZeroAmount);
    require!(
        tokens_in <= curve.real_token_reserves,
        LitCurveError::ExceedsReserves
    );

    let k_before = (curve.virtual_sol_reserves as u128) * (curve.virtual_token_reserves as u128);

    let sell_result = math::compute_sell(
        curve.virtual_sol_reserves,
        curve.virtual_token_reserves,
        tokens_in,
    )?;

    let fees = math::split_sell_fees(sell_result.sol_out)?;

    let k_after =
        (sell_result.new_virtual_sol as u128) * (sell_result.new_virtual_tokens as u128);

    let price_after = math::spot_price(
        sell_result.new_virtual_sol,
        sell_result.new_virtual_tokens,
    );

    emit!(SimulateSellResult {
        song_id: curve.song_id,
        tokens_in,
        gross_sol_out: sell_result.sol_out,
        fan_sol: fees.fan_lamports,
        artist_sol: fees.artist_lamports,
        treasury_sol: fees.treasury_lamports,
        infra_sol: fees.infra_lamports,
        price_after,
        k_before,
        k_after,
    });

    Ok(())
}
