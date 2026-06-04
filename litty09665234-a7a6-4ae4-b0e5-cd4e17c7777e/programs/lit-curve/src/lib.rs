use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod math;
pub mod state;

use instructions::*;

// Replace with real program ID after: anchor build && anchor keys sync
declare_id!("LitCrvXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");

#[program]
pub mod lit_curve {
    use super::*;

    // ── Phase 1: Initialize ──────────────────────────────────────────────────

    /// Create a new bonding curve for a Lit Studio song.
    /// Mints TOTAL_SUPPLY tokens into the vault. Creator pays rent.
    pub fn initialize_curve(
        ctx: Context<InitializeCurve>,
        params: InitializeCurveParams,
    ) -> Result<()> {
        initialize_curve::handler(ctx, params)
    }

    // ── Phase 2: Simulate (read-only — call via .simulate()) ─────────────────

    /// Quote a buy without mutating state. Emits SimulateBuyResult event.
    pub fn simulate_buy(ctx: Context<Simulate>, gross_sol_in: u64) -> Result<()> {
        simulate::simulate_buy(ctx, gross_sol_in)
    }

    /// Quote a sell without mutating state. Emits SimulateSellResult event.
    pub fn simulate_sell(ctx: Context<Simulate>, tokens_in: u64) -> Result<()> {
        simulate::simulate_sell(ctx, tokens_in)
    }

    // ── Phase 3: Real Trades ─────────────────────────────────────────────────

    /// Buy song tokens with SOL. Distributes fees to artist, treasury, and vault.
    pub fn buy(ctx: Context<Buy>, params: BuyParams) -> Result<()> {
        buy::handler(ctx, params)
    }

    /// Sell song tokens for SOL. Distributes fees to artist, treasury, and vault.
    pub fn sell(ctx: Context<Sell>, params: SellParams) -> Result<()> {
        sell::handler(ctx, params)
    }

    // ── Phase 4: Graduation ──────────────────────────────────────────────────

    /// Trigger graduation once real_sol_reserves >= 85 SOL.
    /// Burns remaining vault tokens, sends SOL to Raydium migration.
    pub fn graduate(ctx: Context<Graduate>) -> Result<()> {
        graduate::handler(ctx)
    }

    // ── Phase 5: Admin ───────────────────────────────────────────────────────

    /// Artist-only: update their fee rate (100–500 bps, default 200).
    pub fn update_artist_fee(ctx: Context<UpdateArtistFee>, new_fee_bps: u16) -> Result<()> {
        update_artist_fee::handler(ctx, new_fee_bps)
    }
}
