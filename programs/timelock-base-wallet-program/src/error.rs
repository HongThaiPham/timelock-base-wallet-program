use anchor_lang::prelude::*;

#[error_code]
pub enum TimelockBaseWalletErrorCode {
    #[msg("Unlock timestamp must be in the future")]
    UnlockTimestampMustBeInFuture,
    #[msg("Amount must be greater than zero")]
    AmountMustBeGreaterThanZero,
    #[msg("Vault is locked")]
    VaultLocked,
    #[msg("Vault is locking")]
    VaultLocking,
    #[msg("Invalid vault mint")]
    InvalidVaultMint,
    #[msg("Custom error message")]
    CustomError,
}
