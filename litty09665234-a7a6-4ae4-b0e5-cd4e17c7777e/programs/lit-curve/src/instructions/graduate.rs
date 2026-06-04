/// Phase 4: Graduation — triggered when real_sol_reserves >= 85 SOL.
/// Locks the curve, burns remaining vault tokens, and transfers real SOL
/// reserves to the Raydium migration account. After this point all
/// buys/sells revert with CurveGraduated.
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Token, TokenAccount};

use crate::constants::GRADUATION_THRESHOLD;
use crate::errors::LitCurveError;
use crate::events::CurveGraduated;
use crate::state::BondingCurveAccount;

#[derive(Accounts)]
pub struct Graduate<'info> {
    /// Anyone can trigger graduation once the threshold is met
    #[account(mut)]
    pub caller: Signer<'info>,

    #[account(
        mut,
        seeds = [BondingCurveAccount::SEED, &curve.song_id],
        bump = curve.bump,
        constraint = !curve.is_graduated @ LitCurveError::NotGraduated,
    )]
    pub curve: Account<'info, BondingCurveAccount>,

    #[account(
        mut,
        address = curve.token_vault,
    )]
    pub token_vault: Account<'info, TokenAccount>,

    /// CHECK: Raydium migration authority — receives the SOL liquidity.
    /// In production this is the Raydium CPMM migration program.
    /// For devnet testing use a known test wallet.
    #[account(mut)]
    pub raydium_migration: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Graduate>) -> Result<()> {
    require!(
        ctx.accounts.curve.real_sol_reserves >= GRADUATION_THRESHOLD,
        LitCurveError::NotGraduated
    );

    let song_id = ctx.accounts.curve.song_id;
    let bump = ctx.accounts.curve.bump;
    let seeds: &[&[u8]] = &[BondingCurveAccount::SEED, &song_id, &[bump]];
    let signer = &[seeds];

    // Burn all remaining tokens in vault (they don't migrate to Raydium)
    let remaining_tokens = ctx.accounts.token_vault.amount;
    if remaining_tokens > 0 {
        token::burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.curve.mint.into(),
                    from: ctx.accounts.token_vault.to_account_info(),
                    authority: ctx.accounts.curve.to_account_info(),
                },
                signer,
            ),
            remaining_tokens,
        )?;
    }

    // Transfer real_sol_reserves to Raydium migration account
    let sol_to_migrate = ctx.accounts.curve.real_sol_reserves;
    **ctx.accounts.curve.to_account_info().try_borrow_mut_lamports()? -= sol_to_migrate;
    **ctx.accounts.raydium_migration.try_borrow_mut_lamports()? += sol_to_migrate;

    // Lock the curve
    let curve = &mut ctx.accounts.curve;
    curve.is_graduated = true;
    curve.real_sol_reserves = 0;
    curve.real_token_reserves = 0;

    let clock = Clock::get()?;
    emit!(CurveGraduated {
        song_id: curve.song_id,
        real_sol_reserves: sol_to_migrate,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
