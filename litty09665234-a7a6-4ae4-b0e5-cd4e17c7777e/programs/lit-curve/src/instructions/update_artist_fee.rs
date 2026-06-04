/// Phase 5: Let the song creator adjust their fee within the allowed range.
use anchor_lang::prelude::*;

use crate::constants::{MAX_ARTIST_FEE_BPS, MIN_ARTIST_FEE_BPS};
use crate::errors::LitCurveError;
use crate::events::ArtistFeeUpdated;
use crate::state::BondingCurveAccount;

#[derive(Accounts)]
pub struct UpdateArtistFee<'info> {
    /// Only the original creator can change the fee
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [BondingCurveAccount::SEED, &curve.song_id],
        bump = curve.bump,
        constraint = curve.creator == creator.key() @ LitCurveError::CreatorMismatch,
    )]
    pub curve: Account<'info, BondingCurveAccount>,
}

pub fn handler(ctx: Context<UpdateArtistFee>, new_fee_bps: u16) -> Result<()> {
    require!(
        new_fee_bps >= MIN_ARTIST_FEE_BPS && new_fee_bps <= MAX_ARTIST_FEE_BPS,
        LitCurveError::InvalidArtistFee
    );

    let curve = &mut ctx.accounts.curve;
    let old_bps = curve.artist_fee_bps;
    curve.artist_fee_bps = new_fee_bps;

    emit!(ArtistFeeUpdated {
        song_id: curve.song_id,
        old_bps,
        new_bps: new_fee_bps,
    });

    Ok(())
}
