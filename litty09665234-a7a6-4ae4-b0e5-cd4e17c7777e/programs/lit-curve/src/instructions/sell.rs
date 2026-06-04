/// Phase 3: Real sell instruction.
/// Seller sends tokens → receives SOL (96%). Artist, treasury, and infra
/// each receive their cuts from the gross SOL output.
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::constants::*;
use crate::errors::LitCurveError;
use crate::events::TokensSold;
use crate::math;
use crate::state::BondingCurveAccount;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SellParams {
    pub tokens_in: u64,
    pub min_sol_out: u64, // slippage guard: revert if fan_sol < this
}

#[derive(Accounts)]
pub struct Sell<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(
        mut,
        seeds = [BondingCurveAccount::SEED, &curve.song_id],
        bump = curve.bump,
        constraint = !curve.is_graduated @ LitCurveError::CurveGraduated,
    )]
    pub curve: Account<'info, BondingCurveAccount>,

    #[account(
        mut,
        address = curve.token_vault @ LitCurveError::InsufficientTokenReserves,
    )]
    pub token_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = seller,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    /// CHECK: validated against curve.creator — receives artist SOL fee
    #[account(mut, address = curve.creator @ LitCurveError::CreatorMismatch)]
    pub creator: AccountInfo<'info>,

    /// CHECK: validated against TREASURY_WALLET
    #[account(
        mut,
        address = TREASURY_WALLET @ LitCurveError::FeeDestinationMismatch,
    )]
    pub treasury: AccountInfo<'info>,

    /// CHECK: mint for this curve
    #[account(address = curve.mint)]
    pub mint: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Sell>, params: SellParams) -> Result<()> {
    require!(params.tokens_in > 0, LitCurveError::ZeroAmount);
    require!(
        params.tokens_in <= ctx.accounts.seller_token_account.amount,
        LitCurveError::InsufficientTokenReserves
    );

    // Compute gross SOL out from curve
    let sell_result = math::compute_sell(
        ctx.accounts.curve.virtual_sol_reserves,
        ctx.accounts.curve.virtual_token_reserves,
        params.tokens_in,
    )?;

    // Split gross SOL into fee components
    let fees = math::split_sell_fees(sell_result.sol_out)?;

    // Slippage guard on fan's net SOL
    require!(
        fees.fan_lamports >= params.min_sol_out,
        LitCurveError::SlippageExceeded
    );

    // Curve must have enough real reserves
    require!(
        ctx.accounts.curve.real_sol_reserves >= sell_result.sol_out,
        LitCurveError::InsufficientSolReserves
    );

    // Transfer tokens from seller to vault (PDA doesn't need to sign for user→vault)
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.seller_token_account.to_account_info(),
                to: ctx.accounts.token_vault.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        ),
        params.tokens_in,
    )?;

    // Distribute SOL out of the curve account
    let curve_info = ctx.accounts.curve.to_account_info();
    **curve_info.try_borrow_mut_lamports()? -= sell_result.sol_out;

    **ctx.accounts.seller.try_borrow_mut_lamports()? += fees.fan_lamports;
    **ctx.accounts.creator.try_borrow_mut_lamports()? += fees.artist_lamports;
    **ctx.accounts.treasury.try_borrow_mut_lamports()? += fees.treasury_lamports;
    // infra_lamports remain in curve (vault-retained)

    // Update state
    let curve = &mut ctx.accounts.curve;
    curve.virtual_sol_reserves = sell_result.new_virtual_sol;
    curve.virtual_token_reserves = sell_result.new_virtual_tokens;
    curve.real_sol_reserves -= sell_result.sol_out - fees.infra_lamports;
    curve.real_token_reserves += params.tokens_in;
    curve.total_sell_volume_lamports += sell_result.sol_out;
    curve.total_sells += 1;

    let clock = Clock::get()?;
    emit!(TokensSold {
        song_id: curve.song_id,
        seller: ctx.accounts.seller.key(),
        tokens_in: params.tokens_in,
        fan_sol_out: fees.fan_lamports,
        artist_sol_fee: fees.artist_lamports,
        treasury_sol: fees.treasury_lamports,
        infra_sol: fees.infra_lamports,
        new_virtual_sol: curve.virtual_sol_reserves,
        new_virtual_tokens: curve.virtual_token_reserves,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
