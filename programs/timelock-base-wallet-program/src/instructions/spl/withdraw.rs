use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{
        close_account, transfer_checked, CloseAccount, Mint, TokenAccount, TokenInterface,
        TransferChecked,
    },
};

use crate::{error::TimelockBaseWalletErrorCode, Vault};

#[derive(Accounts)]
pub struct WithdrawSplLock<'info> {
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
        mut,
        seeds = [Vault::SEED, signer.key().as_ref(), mint.key().as_ref(), &vault.amount.to_le_bytes(), &vault.unlock_timestamp.to_le_bytes()],
        bump = vault.bump,
        constraint = vault.mint == Some(mint.key()) @ TimelockBaseWalletErrorCode::InvalidVaultMint,
        close = signer
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vault,
        associated_token::token_program = token_program
    )]
    pub vault_ata: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> WithdrawSplLock<'info> {
    pub fn handler(&mut self) -> Result<()> {
        let clock = Clock::get()?;
        require!(
            self.vault.unlock_timestamp.le(&clock.unix_timestamp),
            TimelockBaseWalletErrorCode::VaultLocking
        );
        let mint_key = &self.mint.key();
        let seeds = &[
            Vault::SEED,
            self.signer.key.as_ref(),
            mint_key.as_ref(),
            &self.vault.amount.to_le_bytes(),
            &self.vault.unlock_timestamp.to_le_bytes(),
            &[self.vault.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        transfer_checked(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                TransferChecked {
                    from: self.vault_ata.to_account_info(),
                    mint: self.mint.to_account_info(),
                    to: self.user_ata.to_account_info(),
                    authority: self.vault.to_account_info(),
                },
                signer_seeds,
            ),
            self.vault.amount,
            self.mint.decimals,
        )?;

        close_account(CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            CloseAccount {
                account: self.vault_ata.to_account_info(),
                destination: self.signer.to_account_info(),
                authority: self.vault.to_account_info(),
            },
            signer_seeds,
        ))?;

        Ok(())
    }
}
