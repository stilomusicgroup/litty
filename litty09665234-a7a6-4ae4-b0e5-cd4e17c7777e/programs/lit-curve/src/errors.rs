use anchor_lang::prelude::*;

#[error_code]
pub enum LitCurveError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Insufficient output — slippage exceeded")]
    InsufficientOutput,
    #[msg("Output would exceed available reserves")]
    ExceedsReserves,
    #[msg("Curve has already graduated to Raydium")]
    CurveGraduated,
    #[msg("Curve has not yet graduated")]
    NotGraduated,
    #[msg("Artist fee out of range — must be 100–500 bps")]
    InvalidArtistFee,
    #[msg("slippage_limit exceeded — got fewer tokens than minimum")]
    SlippageExceeded,
    #[msg("Fee destination mismatch — security violation")]
    FeeDestinationMismatch,
    #[msg("Insufficient SOL in curve for sell")]
    InsufficientSolReserves,
    #[msg("Insufficient tokens in vault")]
    InsufficientTokenReserves,
    #[msg("Vault balance below minimum — fund the vault before trading")]
    VaultBelowMinimum,
    #[msg("Integer overflow in bonding curve math")]
    MathOverflow,
    #[msg("Invalid song_id — must be 32 non-zero bytes")]
    InvalidSongId,
    #[msg("Creator mismatch")]
    CreatorMismatch,
    #[msg("Post-graduation trades are disabled")]
    TradingDisabled,
}
