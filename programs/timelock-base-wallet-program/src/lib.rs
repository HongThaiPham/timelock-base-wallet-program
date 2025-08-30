pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("61DbVFQopKRi1kyCHBNdYeHHs5xE633Sen2JLFP91reU");

#[program]
pub mod timelock_base_wallet_program {
    use super::*;

    pub fn initialize_sol_lock(
        ctx: Context<InitializeSolLock>,
        amount: u64,
        unlock_timestamp: i64,
    ) -> Result<()> {
        ctx.accounts.handler(amount, unlock_timestamp, &ctx.bumps)
    }

    pub fn withdraw_sol_lock(ctx: Context<WithdrawSolLock>) -> Result<()> {
        ctx.accounts.handler()
    }

    pub fn initialize_spl_lock(
        ctx: Context<InitializeSplLock>,
        amount: u64,
        unlock_timestamp: i64,
    ) -> Result<()> {
        ctx.accounts.handler(amount, unlock_timestamp, &ctx.bumps)
    }

    pub fn withdraw_spl_lock(ctx: Context<WithdrawSplLock>) -> Result<()> {
        ctx.accounts.handler()
    }
}
