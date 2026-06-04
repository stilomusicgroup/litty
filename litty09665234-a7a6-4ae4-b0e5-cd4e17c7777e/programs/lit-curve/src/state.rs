use anchor_lang::prelude::*;

#[account]
pub struct BondingCurveAccount {
    pub bump: u8,
    pub song_id: [u8; 32],           // SHA-256 of the Lit Studio song ID string
    pub creator: Pubkey,              // artist wallet — receives artist-share tokens
    pub mint: Pubkey,                 // SPL token mint
    pub token_vault: Pubkey,          // ATA owned by curve PDA, holds unsold tokens

    // Virtual reserves drive the constant-product price (k = v_sol × v_tokens)
    pub virtual_sol_reserves: u64,    // lamports; starts at INITIAL_VIRTUAL_SOL (30 SOL)
    pub virtual_token_reserves: u64,  // raw units (6 dec); starts at INITIAL_VIRTUAL_TOKENS

    // Real reserves track what actually accumulated (used for graduation check)
    pub real_sol_reserves: u64,       // lamports deposited by buyers (fan + artist portions)
    pub real_token_reserves: u64,     // tokens remaining in vault (decreases on buy)

    pub artist_fee_bps: u16,         // 100–500, default 200 (2%)
    pub is_graduated: bool,

    // Audit counters
    pub total_buy_volume_lamports: u64,
    pub total_sell_volume_lamports: u64,
    pub total_buys: u64,
    pub total_sells: u64,
    pub created_at: i64,
}

impl BondingCurveAccount {
    pub const SEED: &'static [u8] = b"bonding_curve";

    pub const SIZE: usize = 8  // discriminator
        + 1   // bump
        + 32  // song_id
        + 32  // creator
        + 32  // mint
        + 32  // token_vault
        + 8   // virtual_sol_reserves
        + 8   // virtual_token_reserves
        + 8   // real_sol_reserves
        + 8   // real_token_reserves
        + 2   // artist_fee_bps
        + 1   // is_graduated
        + 8   // total_buy_volume_lamports
        + 8   // total_sell_volume_lamports
        + 8   // total_buys
        + 8   // total_sells
        + 8;  // created_at
        // = 202 bytes
}
