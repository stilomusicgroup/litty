use anchor_lang::prelude::Pubkey;
use anchor_lang::solana_program::pubkey;

// Bonding curve parameters (pump.fun model)
pub const INITIAL_VIRTUAL_SOL: u64 = 30_000_000_000; // 30 SOL in lamports
pub const INITIAL_VIRTUAL_TOKENS: u64 = 1_073_000_000_000_000; // 1,073,000,000 × 10^6
pub const TOTAL_SUPPLY: u64 = 1_000_000_000_000_000; // 1,000,000,000 × 10^6
pub const TOKEN_RESERVES_IN_CURVE: u64 = 793_100_000_000_000; // 793,100,000 × 10^6
pub const GRADUATION_THRESHOLD: u64 = 85_000_000_000; // 85 SOL in lamports

pub const TOKEN_DECIMALS: u8 = 6;

// Artist fee constraints
pub const DEFAULT_ARTIST_FEE_BPS: u16 = 200; // 2%
pub const MIN_ARTIST_FEE_BPS: u16 = 100; // 1%
pub const MAX_ARTIST_FEE_BPS: u16 = 500; // 5%

// Buy/sell fee split (basis points, sum = 10_000)
// BUY:  fan gets 96% of gross_sol as tokens,
//       artist gets 2% as tokens, treasury 1% as SOL, infra 1% vault-retained
// SELL: fan gets 96% of curve output as SOL,
//       artist 2% as SOL, treasury 1% as SOL, infra 1% vault-retained
pub const FAN_BPS: u32 = 9_600;
pub const ARTIST_BPS: u32 = 200;
pub const TREASURY_BPS: u32 = 100;
// INFRA_BPS = 10_000 - FAN_BPS - ARTIST_BPS - TREASURY_BPS = 100 (vault-retained)

// Hardcoded fee destinations — immutable after deploy
pub const TREASURY_WALLET: Pubkey =
    pubkey!("GWWQr5yVPnCH9Y8zToy69SK4LvLPhogLTPSx8AJK3UF9");
pub const PLATFORM_WALLET: Pubkey =
    pubkey!("9LLTjsWhYJBxFgca43MQtrLLsPcxWMR86NoxAHGsBUCk");

pub const VAULT_MIN_SOL: u64 = 50_000_000; // 0.05 SOL — minimum curve balance
