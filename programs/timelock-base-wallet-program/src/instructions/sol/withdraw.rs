use anchor_lang::prelude::*;

use crate::{error::TimelockBaseWalletErrorCode, Vault};

#[derive(Accounts)]
pub struct WithdrawSolLock<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mut, 
        seeds = [Vault::SEED, signer.key().as_ref(), &vault.amount.to_le_bytes(), &vault.unlock_timestamp.to_le_bytes()],
        bump = vault.bump,
        close = signer
    )]
    pub vault: Account<'info, Vault>,
}

impl<'info> WithdrawSolLock<'info> {
    pub fn handler(&mut self) -> Result<()> {
        let clock = Clock::get()?;
        require!(self.vault.unlock_timestamp.le(&clock.unix_timestamp), TimelockBaseWalletErrorCode::VaultLocking);
        **self.signer.to_account_info().try_borrow_mut_lamports()? += self.vault.amount;
        **self.vault.to_account_info().try_borrow_mut_lamports()? -= self.vault.amount;
        Ok(())
    }
}
