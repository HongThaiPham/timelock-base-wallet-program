import * as anchor from '@coral-xyz/anchor';
import { Program, web3, BN } from '@coral-xyz/anchor';
import { TimelockBaseWalletProgram } from '../target/types/timelock_base_wallet_program';
import { expect } from 'chai';
import {
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMint,
  createMintToCheckedInstruction,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  MINT_SIZE,
  mintTo,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { BankrunProvider } from 'anchor-bankrun';
import { startAnchor, AddedAccount, ProgramTestContext } from 'solana-bankrun';

interface TestContext {
  context: ProgramTestContext;
  program: Program<TimelockBaseWalletProgram>;
  provider: BankrunProvider;
  payer: web3.Keypair;
  users: web3.Keypair[];
  mint: web3.PublicKey;
}

async function setupTest(): Promise<TestContext> {
  const payer = web3.Keypair.generate();
  const users = Array.from({ length: 3 }, () => web3.Keypair.generate());

  const accountsWithBalance: AddedAccount[] = [payer, ...users].map(
    (keypair) => ({
      address: keypair.publicKey,
      info: {
        lamports: 10 * anchor.web3.LAMPORTS_PER_SOL,
        data: Buffer.alloc(0),
        owner: web3.SystemProgram.programId,
        executable: false,
        rentEpoch: 0,
      },
    })
  );
  const context = await startAnchor('./', [], [...accountsWithBalance]);
  const provider = new BankrunProvider(context);
  const program = new Program<TimelockBaseWalletProgram>(
    require('../target/idl/timelock_base_wallet_program.json'),
    provider
  );

  // Create mint manually for bankrun
  const mintKeypair = web3.Keypair.generate();

  // Create mint account manually
  const mintRent = await provider.connection.getMinimumBalanceForRentExemption(
    MINT_SIZE
  );

  const createMintAccountIx = web3.SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: mintKeypair.publicKey,
    lamports: mintRent,
    space: MINT_SIZE,
    programId: TOKEN_PROGRAM_ID,
  });

  const initMintIx = createInitializeMintInstruction(
    mintKeypair.publicKey,
    6, // decimals
    payer.publicKey, // mint authority
    null // freeze authority
  );

  const payerAta = getAssociatedTokenAddressSync(
    mintKeypair.publicKey,
    payer.publicKey
  );

  const createAtaIx = createAssociatedTokenAccountInstruction(
    payer.publicKey,
    payerAta,
    payer.publicKey,
    mintKeypair.publicKey
  );

  const mintToIx = createMintToCheckedInstruction(
    mintKeypair.publicKey,
    payerAta,
    payer.publicKey,
    1000 * 10 ** 6,
    6
  );

  const tx = new web3.Transaction().add(
    createMintAccountIx,
    initMintIx,
    createAtaIx,
    mintToIx
  );
  await provider.sendAndConfirm(tx, [payer, mintKeypair]);
  const mint = mintKeypair.publicKey;

  return { context, provider, program, payer, users, mint };
}

describe('timelock-base-wallet-program', () => {
  let testContext: TestContext;

  const mintX = web3.Keypair.generate();
  console.log({ mintX: mintX.publicKey.toBase58() });

  before(async () => {
    {
      testContext = await setupTest();
    }
  });

  it('Init sol vault should be successful', async () => {
    const { program, payer, context } = testContext;
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
      .signers([payer])
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
    const vaultAccount = await context.banksClient.getAccount(vaultAddress);
    expect(vaultAccount).to.be.not.null;

    const vaultBalance = await context.banksClient.getBalance(vaultAddress);
    expect(new BN(vaultBalance).gt(params.amount)).to.be.true;
    console.log('Your transaction signature', tx);
  });

  it('Withdraw sol should be successful', async () => {
    const { program, payer, context } = testContext;

    const params = {
      amount: new BN(100000000),
      unlockTimestamp: new BN(new Date().getTime() / 1000 + 1), // 1 minute in the future
    };

    await program.methods
      .initializeSolLock(params.amount, params.unlockTimestamp)
      .accounts({
        signer: payer.publicKey,
      })
      .signers([payer])
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
      .signers([payer])
      .rpc();

    const vaultAccount = await context.banksClient.getAccount(vaultAddress);
    expect(vaultAccount).to.be.null;

    const vaultBalance = await context.banksClient.getBalance(vaultAddress);
    expect(new BN(vaultBalance).eq(new BN(0))).to.be.true;
    console.log('Your transaction signature', tx);
  });

  it.skip('Withdraw sol should be failt when vault is not unlocked', async () => {
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
    const { provider, program, payer, context, mint } = testContext;

    const params = {
      amount: new BN(100000000),
      unlockTimestamp: new BN(new Date().getTime() / 1000 + 60),
    };
    const [vaultAddress] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        payer.publicKey.toBuffer(),
        mint.toBuffer(),
        params.amount.toArrayLike(Buffer, 'le', 8),
        params.unlockTimestamp.toArrayLike(Buffer, 'le', 8),
      ],
      program.programId
    );

    const vaultAta = getAssociatedTokenAddressSync(mint, vaultAddress, true);

    const tx = await program.methods
      .initializeSplLock(params.amount, params.unlockTimestamp)
      .accountsPartial({
        signer: payer.publicKey,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    const vaultAccount = await context.banksClient.getAccount(vaultAddress);
    expect(vaultAccount).to.be.not.null;

    // const vaultBalance = await provider.connection.getTokenAccountBalance(
    //   vaultAta
    // );
    // expect(vaultBalance.value.amount).to.eq(params.amount.toString());
    console.log('Your transaction signature', tx);
  });

  it('Withdraw spl should be successful', async () => {
    const { provider, program, payer, context, mint } = testContext;

    const params = {
      amount: new BN(100000000),
      unlockTimestamp: new BN(new Date().getTime() / 1000 + 1),
    };
    const [vaultAddress] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        payer.publicKey.toBuffer(),
        mint.toBuffer(),
        params.amount.toArrayLike(Buffer, 'le', 8),
        params.unlockTimestamp.toArrayLike(Buffer, 'le', 8),
      ],
      program.programId
    );

    const vaultAta = getAssociatedTokenAddressSync(mint, vaultAddress, true);

    await program.methods
      .initializeSplLock(params.amount, params.unlockTimestamp)
      .accounts({
        signer: payer.publicKey,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    const vaultAccount = await context.banksClient.getAccount(vaultAddress);
    expect(vaultAccount).to.be.not.null;

    // const vaultBalance = await provider.connection.getTokenAccountBalance(
    //   vaultAta
    // );
    // expect(vaultBalance.value.amount).to.eq(params.amount.toString());

    const tx = await program.methods
      .withdrawSplLock()
      .accountsPartial({
        signer: payer.publicKey,
        mint,
        vault: vaultAddress,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    console.log('Your transaction signature', tx);
  });
});
