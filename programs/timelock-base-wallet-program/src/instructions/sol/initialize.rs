use anchor_lang::{
    prelude::*,
    system_program::{self, Transfer},
};

use crate::Vault;

#[derive(Accounts)]
#[instruction(amount: u64, unlock_timestamp: i64)]
pub struct InitializeSolLock<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        space = 8 + Vault::INIT_SPACE,
        seeds = [Vault::SEED, signer.key().as_ref(), &amount.to_le_bytes(), &unlock_timestamp.to_le_bytes()],
        bump
    )]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitializeSolLock<'info> {
    pub fn handler(
        &mut self,
        amount: u64,
        unlock_timestamp: i64,
        bumps: &InitializeSolLockBumps,
    ) -> Result<()> {
        self.vault.set_inner(Vault::new(
            self.signer.key(),
            amount,
            bumps.vault,
            unlock_timestamp,
            None,
        )?);

        system_program::transfer(
            CpiContext::new(
                self.system_program.to_account_info(),
                Transfer {
                    from: self.signer.to_account_info(),
                    to: self.vault.to_account_info(),
                },
            ),
            amount,
        )?;
        Ok(())
    }
}
