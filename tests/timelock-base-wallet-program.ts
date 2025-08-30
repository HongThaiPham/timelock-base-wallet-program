import * as anchor from '@coral-xyz/anchor';
import { Program, web3, BN } from '@coral-xyz/anchor';
import { TimelockBaseWalletProgram } from '../target/types/timelock_base_wallet_program';
import { expect } from 'chai';
import {
  createMint,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

describe('timelock-base-wallet-program', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = provider.wallet.payer;

  const program = anchor.workspace
    .timelockBaseWalletProgram as Program<TimelockBaseWalletProgram>;

  const mintX = web3.Keypair.generate();
  console.log({ mintX: mintX.publicKey.toBase58() });

  before(async () => {
    {
      // mint X
      await createMint(
        provider.connection,
        payer,
        payer.publicKey,
        null,
        6,
        mintX,
        {
          commitment: 'confirmed',
        }
      );
      const maker_x_ata = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        mintX.publicKey,
        payer.publicKey,
        false,
        null,
        {
          commitment: 'confirmed',
        }
      );
      await mintTo(
        provider.connection,
        payer,
        mintX.publicKey,
        maker_x_ata.address,
        payer,
        1000 * 10 ** 6,
        [],
        {
          commitment: 'confirmed',
        }
      );
    }
  });

  it('Init sol vault should be successful', async () => {
    const params = {
      amount: new BN(100000000),
      unlockTimestamp: new BN(new Date().getTime() / 1000 + 60), // 1 minute in the future
    };
    // Add your test here.
    const tx = await program.methods
      .initializeSolLock(params.amount, params.unlockTimestamp)
      .accounts({
        signer: payer.publicKey,
      })
      .rpc();

    const [vaultAddress] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        payer.publicKey.toBuffer(),
        params.amount.toArrayLike(Buffer, 'le', 8),
        params.unlockTimestamp.toArrayLike(Buffer, 'le', 8),
      ],
      program.programId
    );

    const vaultAccount = await provider.connection.getAccountInfo(vaultAddress);
    expect(vaultAccount).to.be.not.null;

    const vaultBalance = await provider.connection.getBalance(vaultAddress);
    expect(vaultBalance).to.greaterThan(params.amount.toNumber());
    console.log('Your transaction signature', tx);
  });

  it('Withdraw sol should be successful', async () => {
    const params = {
      amount: new BN(100000000),
      unlockTimestamp: new BN(new Date().getTime() / 1000 + 1), // 1 minute in the future
    };

    await program.methods
      .initializeSolLock(params.amount, params.unlockTimestamp)
      .accounts({
        signer: payer.publicKey,
      })
      .rpc();

    const [vaultAddress] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        payer.publicKey.toBuffer(),
        params.amount.toArrayLike(Buffer, 'le', 8),
        params.unlockTimestamp.toArrayLike(Buffer, 'le', 8),
      ],
      program.programId
    );

    const tx = await program.methods
      .withdrawSolLock()
      .accountsPartial({
        signer: payer.publicKey,
        vault: vaultAddress,
      })
      .rpc();

    const vaultAccount = await provider.connection.getAccountInfo(vaultAddress);
    expect(vaultAccount).to.be.null;

    const vaultBalance = await provider.connection.getBalance(vaultAddress);
    expect(vaultBalance).to.eq(0);
    console.log('Your transaction signature', tx);
  });

  it('Withdraw sol should be failt when vault is not unlocked', async () => {
    const params = {
      amount: new BN(100000000),
      unlockTimestamp: new BN(new Date().getTime() / 1000 + 3756530627),
    };

    console.log(params.unlockTimestamp.toNumber());

    await program.methods
      .initializeSolLock(params.amount, params.unlockTimestamp)
      .accounts({
        signer: payer.publicKey,
      })
      .rpc();

    const [vaultAddress] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        payer.publicKey.toBuffer(),
        params.amount.toArrayLike(Buffer, 'le', 8),
        params.unlockTimestamp.toArrayLike(Buffer, 'le', 8),
      ],
      program.programId
    );

    const tx = await program.methods
      .withdrawSolLock()
      .accountsPartial({
        signer: payer.publicKey,
        vault: vaultAddress,
      })
      .rpc();

    const vaultAccount = await provider.connection.getAccountInfo(vaultAddress);
    expect(vaultAccount).to.be.null;

    const vaultBalance = await provider.connection.getBalance(vaultAddress);
    expect(vaultBalance).to.eq(0);
    console.log('Your transaction signature', tx);
  });

  it('Init spl vault should be successful', async () => {
    const params = {
      amount: new BN(100000000),
      unlockTimestamp: new BN(new Date().getTime() / 1000 + 60),
    };
    const [vaultAddress] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        payer.publicKey.toBuffer(),
        mintX.publicKey.toBuffer(),
        params.amount.toArrayLike(Buffer, 'le', 8),
        params.unlockTimestamp.toArrayLike(Buffer, 'le', 8),
      ],
      program.programId
    );

    const vaultAta = getAssociatedTokenAddressSync(
      mintX.publicKey,
      vaultAddress,
      true
    );

    const tx = await program.methods
      .initializeSplLock(params.amount, params.unlockTimestamp)
      .accountsPartial({
        signer: payer.publicKey,
        mint: mintX.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const vaultAccount = await provider.connection.getAccountInfo(vaultAddress);
    expect(vaultAccount).to.be.not.null;

    const vaultBalance = await provider.connection.getTokenAccountBalance(
      vaultAta
    );
    expect(vaultBalance.value.amount).to.eq(params.amount.toString());
    console.log('Your transaction signature', tx);
  });

  it('Withdraw spl should be successful', async () => {
    const params = {
      amount: new BN(100000000),
      unlockTimestamp: new BN(new Date().getTime() / 1000 + 1),
    };
    const [vaultAddress] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        payer.publicKey.toBuffer(),
        mintX.publicKey.toBuffer(),
        params.amount.toArrayLike(Buffer, 'le', 8),
        params.unlockTimestamp.toArrayLike(Buffer, 'le', 8),
      ],
      program.programId
    );

    const vaultAta = getAssociatedTokenAddressSync(
      mintX.publicKey,
      vaultAddress,
      true
    );

    await program.methods
      .initializeSplLock(params.amount, params.unlockTimestamp)
      .accounts({
        signer: payer.publicKey,
        mint: mintX.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const vaultAccount = await provider.connection.getAccountInfo(vaultAddress);
    expect(vaultAccount).to.be.not.null;

    const vaultBalance = await provider.connection.getTokenAccountBalance(
      vaultAta
    );
    expect(vaultBalance.value.amount).to.eq(params.amount.toString());

    const tx = await program.methods
      .withdrawSplLock()
      .accountsPartial({
        signer: payer.publicKey,
        mint: mintX.publicKey,
        vault: vaultAddress,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log('Your transaction signature', tx);
  });
});
