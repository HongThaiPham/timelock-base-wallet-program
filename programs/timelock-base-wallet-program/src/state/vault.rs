use anchor_lang::prelude::*;

use crate::error::TimelockBaseWalletErrorCode;

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub owner: Pubkey,
    pub amount: u64,
    pub bump: u8,
    pub unlock_timestamp: i64,
    pub mint: Option<Pubkey>, // None for SOL, Some for SPL
}

impl Vault {
    pub const SEED: &'static [u8] = b"vault";

    pub fn new(
        owner: Pubkey,
        amount: u64,
        bump: u8,
        unlock_timestamp: i64,
        mint: Option<Pubkey>,
    ) -> Result<Self> {
        require_gt!(
            unlock_timestamp,
            Clock::get()?.unix_timestamp,
            TimelockBaseWalletErrorCode::UnlockTimestampMustBeInFuture
        );

        require_gt!(
            amount,
            0,
            TimelockBaseWalletErrorCode::AmountMustBeGreaterThanZero
        );
        Ok(Self {
            owner,
            amount,
            bump,
            unlock_timestamp,
            mint,
        })
    }
}
