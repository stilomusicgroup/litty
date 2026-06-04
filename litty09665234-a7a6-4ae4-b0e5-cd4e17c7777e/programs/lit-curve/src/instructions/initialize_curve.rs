use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};

use crate::constants::*;
use crate::errors::LitCurveError;
use crate::events::CurveInitialized;
use crate::state::BondingCurveAccount;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeCurveParams {
    pub song_id: [u8; 32],
    pub artist_fee_bps: u16,
}

#[derive(Accounts)]
#[instruction(params: InitializeCurveParams)]
pub struct InitializeCurve<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = BondingCurveAccount::SIZE,
        seeds = [BondingCurveAccount::SEED, &params.song_id],
        bump,
    )]
    pub curve: Account<'info, BondingCurveAccount>,

    /// New SPL mint — program sets curve PDA as mint authority
    #[account(
        init,
        payer = creator,
        mint::decimals = TOKEN_DECIMALS,
        mint::authority = curve,
        mint::freeze_authority = curve,
    )]
    pub mint: Account<'info, Mint>,

    /// Token vault — ATA owned by the curve PDA, will hold all unsold tokens
    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = curve,
    )]
    pub token_vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<InitializeCurve>, params: InitializeCurveParams) -> Result<()> {
    require!(
        params.song_id != [0u8; 32],
        LitCurveError::InvalidSongId
    );
    require!(
        params.artist_fee_bps >= MIN_ARTIST_FEE_BPS
            && params.artist_fee_bps <= MAX_ARTIST_FEE_BPS,
        LitCurveError::InvalidArtistFee
    );

    let clock = Clock::get()?;

    let curve = &mut ctx.accounts.curve;
    curve.bump = ctx.bumps.curve;
    curve.song_id = params.song_id;
    curve.creator = ctx.accounts.creator.key();
    curve.mint = ctx.accounts.mint.key();
    curve.token_vault = ctx.accounts.token_vault.key();
    curve.virtual_sol_reserves = INITIAL_VIRTUAL_SOL;
    curve.virtual_token_reserves = INITIAL_VIRTUAL_TOKENS;
    curve.real_sol_reserves = 0;
    curve.real_token_reserves = TOKEN_RESERVES_IN_CURVE;
    curve.artist_fee_bps = params.artist_fee_bps;
    curve.is_graduated = false;
    curve.total_buy_volume_lamports = 0;
    curve.total_sell_volume_lamports = 0;
    curve.total_buys = 0;
    curve.total_sells = 0;
    curve.created_at = clock.unix_timestamp;

    // Mint TOTAL_SUPPLY tokens to the vault
    // Signing with curve PDA seeds
    let song_id = params.song_id;
    let seeds: &[&[u8]] = &[
        BondingCurveAccount::SEED,
        &song_id,
        &[curve.bump],
    ];
    let signer_seeds = &[seeds];

    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.token_vault.to_account_info(),
                authority: ctx.accounts.curve.to_account_info(),
            },
            signer_seeds,
        ),
        TOTAL_SUPPLY,
    )?;

    emit!(CurveInitialized {
        song_id: params.song_id,
        creator: ctx.accounts.creator.key(),
        mint: ctx.accounts.mint.key(),
        virtual_sol: INITIAL_VIRTUAL_SOL,
        virtual_tokens: INITIAL_VIRTUAL_TOKENS,
        artist_fee_bps: params.artist_fee_bps,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
