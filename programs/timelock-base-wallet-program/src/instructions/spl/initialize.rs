use crate::Vault;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

#[derive(Accounts)]
#[instruction(amount: u64, unlock_timestamp: i64)]
pub struct InitializeSplLock<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mint::token_program = token_program
    )]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = signer,
        associated_token::token_program = token_program
    )]
    pub user_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = signer,
        space = 8 + Vault::INIT_SPACE,
        seeds = [Vault::SEED, signer.key().as_ref(), mint.key().as_ref(), &amount.to_le_bytes(), &unlock_timestamp.to_le_bytes()],
        bump
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        init,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = vault,
        associated_token::token_program = token_program
    )]
    pub vault_ata: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitializeSplLock<'info> {
    pub fn handler(
        &mut self,
        amount: u64,
        unlock_timestamp: i64,
        bumps: &InitializeSplLockBumps,
    ) -> Result<()> {
        self.vault.set_inner(Vault::new(
            self.signer.key(),
            amount,
            bumps.vault,
            unlock_timestamp,
            Some(self.mint.key()),
        )?);

        transfer_checked(
            CpiContext::new(
                self.token_program.to_account_info(),
                TransferChecked {
                    from: self.user_ata.to_account_info(),
                    mint: self.mint.to_account_info(),
                    to: self.vault_ata.to_account_info(),
                    authority: self.signer.to_account_info(),
                },
            ),
            amount,
            self.mint.decimals,
        )?;
        Ok(())
    }
}
