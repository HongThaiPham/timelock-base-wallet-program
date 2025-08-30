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
        msg!("Withdrawing sol from vault {}", self.vault.key());
        msg!("Current timestamp: {}", clock.unix_timestamp);
        msg!("Unlock timestamp: {}", self.vault.unlock_timestamp);
        require!(self.vault.unlock_timestamp.ge(&clock.unix_timestamp), TimelockBaseWalletErrorCode::VaultLocked);
        **self.signer.to_account_info().try_borrow_mut_lamports()? += self.vault.amount;
        **self.vault.to_account_info().try_borrow_mut_lamports()? -= self.vault.amount;
        Ok(())
    }
}
