use anchor_lang::prelude::*;

#[event]
pub struct CurveInitialized {
    pub song_id: [u8; 32],
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub virtual_sol: u64,
    pub virtual_tokens: u64,
    pub artist_fee_bps: u16,
    pub timestamp: i64,
}

#[event]
pub struct SimulateBuyResult {
    pub song_id: [u8; 32],
    pub sol_in: u64,            // gross SOL input
    pub fan_sol: u64,           // net SOL used for fan tokens
    pub artist_sol: u64,        // net SOL used for artist tokens
    pub treasury_sol: u64,      // SOL to treasury
    pub infra_sol: u64,         // SOL vault-retained
    pub fan_tokens_out: u64,    // tokens fan would receive
    pub artist_tokens_out: u64, // tokens artist would receive
    pub price_after: u64,       // spot price (lamports per token) post-trade
    pub k_before: u128,
    pub k_after: u128,
}

#[event]
pub struct SimulateSellResult {
    pub song_id: [u8; 32],
    pub tokens_in: u64,
    pub gross_sol_out: u64,
    pub fan_sol: u64,
    pub artist_sol: u64,
    pub treasury_sol: u64,
    pub infra_sol: u64,
    pub price_after: u64,
    pub k_before: u128,
    pub k_after: u128,
}

#[event]
pub struct TokensBought {
    pub song_id: [u8; 32],
    pub buyer: Pubkey,
    pub gross_sol_in: u64,
    pub fan_tokens: u64,
    pub artist_tokens: u64,
    pub treasury_sol: u64,
    pub infra_sol: u64,
    pub new_virtual_sol: u64,
    pub new_virtual_tokens: u64,
    pub timestamp: i64,
}

#[event]
pub struct TokensSold {
    pub song_id: [u8; 32],
    pub seller: Pubkey,
    pub tokens_in: u64,
    pub fan_sol_out: u64,
    pub artist_sol_fee: u64,
    pub treasury_sol: u64,
    pub infra_sol: u64,
    pub new_virtual_sol: u64,
    pub new_virtual_tokens: u64,
    pub timestamp: i64,
}

#[event]
pub struct CurveGraduated {
    pub song_id: [u8; 32],
    pub real_sol_reserves: u64,
    pub timestamp: i64,
}

#[event]
pub struct ArtistFeeUpdated {
    pub song_id: [u8; 32],
    pub old_bps: u16,
    pub new_bps: u16,
}
