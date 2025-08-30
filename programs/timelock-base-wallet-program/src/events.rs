use anchor_lang::prelude::*;

#[event]
pub struct VaultInitialized {
    pub owner: Pubkey,
    pub amount: u64,
    pub unlock_timestamp: i64,
    pub mint: Option<Pubkey>,
}
