/// Phase 3: Real buy instruction.
/// Fan sends SOL → receives song tokens. Artist simultaneously receives
/// a smaller token allocation. Treasury receives a SOL cut. Vault retains infra.
use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::constants::*;
use crate::errors::LitCurveError;
use crate::events::TokensBought;
use crate::math;
use crate::state::BondingCurveAccount;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BuyParams {
    pub gross_sol_in: u64,       // total SOL buyer is spending
    pub min_tokens_out: u64,     // slippage guard: revert if fan_tokens < this
}

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        seeds = [BondingCurveAccount::SEED, &curve.song_id],
        bump = curve.bump,
        constraint = !curve.is_graduated @ LitCurveError::CurveGraduated,
    )]
    pub curve: Account<'info, BondingCurveAccount>,

    /// Token vault owned by curve PDA
    #[account(
        mut,
        address = curve.token_vault @ LitCurveError::InsufficientTokenReserves,
    )]
    pub token_vault: Account<'info, TokenAccount>,

    /// Buyer's token account (init if needed)
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    /// Artist's token account (init if needed)
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = mint,
        associated_token::authority = creator,
    )]
    pub artist_token_account: Account<'info, TokenAccount>,

    /// CHECK: validated against curve.creator
    #[account(address = curve.creator @ LitCurveError::CreatorMismatch)]
    pub creator: AccountInfo<'info>,

    /// CHECK: validated against TREASURY_WALLET constant
    #[account(
        mut,
        address = TREASURY_WALLET @ LitCurveError::FeeDestinationMismatch,
    )]
    pub treasury: AccountInfo<'info>,

    /// CHECK: the mint for this curve
    #[account(address = curve.mint)]
    pub mint: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<Buy>, params: BuyParams) -> Result<()> {
    require!(params.gross_sol_in > 0, LitCurveError::ZeroAmount);

    let fees = math::split_buy_fees(params.gross_sol_in)?;

    // Fan portion: compute tokens out
    let fan_result = math::compute_buy(
        ctx.accounts.curve.virtual_sol_reserves,
        ctx.accounts.curve.virtual_token_reserves,
        fees.fan_lamports,
    )?;

    // Slippage check
    require!(
        fan_result.tokens_out >= params.min_tokens_out,
        LitCurveError::SlippageExceeded
    );

    // Artist portion: computed on updated reserves
    let artist_result = math::compute_buy(
        fan_result.new_virtual_sol,
        fan_result.new_virtual_tokens,
        fees.artist_lamports,
    )?;

    let total_tokens_out = fan_result.tokens_out + artist_result.tokens_out;
    require!(
        total_tokens_out <= ctx.accounts.curve.real_token_reserves,
        LitCurveError::InsufficientTokenReserves
    );

    // Transfer SOL from buyer to curve (entire gross amount)
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.curve.to_account_info(),
            },
        ),
        params.gross_sol_in,
    )?;

    // Forward treasury cut from curve to treasury wallet
    **ctx.accounts.curve.to_account_info().try_borrow_mut_lamports()? -= fees.treasury_lamports;
    **ctx.accounts.treasury.try_borrow_mut_lamports()? += fees.treasury_lamports;

    // Transfer tokens from vault to buyer and artist via PDA signer
    let song_id = ctx.accounts.curve.song_id;
    let bump = ctx.accounts.curve.bump;
    let seeds: &[&[u8]] = &[BondingCurveAccount::SEED, &song_id, &[bump]];
    let signer = &[seeds];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.token_vault.to_account_info(),
                to: ctx.accounts.buyer_token_account.to_account_info(),
                authority: ctx.accounts.curve.to_account_info(),
            },
            signer,
        ),
        fan_result.tokens_out,
    )?;

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.token_vault.to_account_info(),
                to: ctx.accounts.artist_token_account.to_account_info(),
                authority: ctx.accounts.curve.to_account_info(),
            },
            signer,
        ),
        artist_result.tokens_out,
    )?;

    // Update state
    let curve = &mut ctx.accounts.curve;
    curve.virtual_sol_reserves = artist_result.new_virtual_sol;
    curve.virtual_token_reserves = artist_result.new_virtual_tokens;
    curve.real_sol_reserves += fees.fan_lamports + fees.artist_lamports;
    curve.real_token_reserves -= total_tokens_out;
    curve.total_buy_volume_lamports += params.gross_sol_in;
    curve.total_buys += 1;

    let clock = Clock::get()?;
    emit!(TokensBought {
        song_id: curve.song_id,
        buyer: ctx.accounts.buyer.key(),
        gross_sol_in: params.gross_sol_in,
        fan_tokens: fan_result.tokens_out,
        artist_tokens: artist_result.tokens_out,
        treasury_sol: fees.treasury_lamports,
        infra_sol: fees.infra_lamports,
        new_virtual_sol: curve.virtual_sol_reserves,
        new_virtual_tokens: curve.virtual_token_reserves,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
