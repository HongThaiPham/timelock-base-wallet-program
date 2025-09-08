# Timelock Base Wallet Program

A Solana blockchain program that provides timelock functionality for both SOL (native tokens) and SPL tokens. Users can lock their tokens for a specified period and withdraw them only after the unlock timestamp has passed.

## 🚀 Features

- **SOL Timelock**: Lock native SOL tokens with customizable unlock timestamps
- **SPL Token Timelock**: Lock any SPL tokens with timelock functionality  
- **Secure Withdrawal**: Tokens can only be withdrawn by the original owner after the unlock time
- **Flexible Timing**: Set any future timestamp for unlock
- **Built with Anchor**: Uses the modern Anchor framework for Solana development

## 📁 Project Structure

```
timelock-base-wallet-program/
├── programs/timelock-base-wallet-program/   # Main Rust program code
│   ├── src/
│   │   ├── lib.rs                          # Main program entry point
│   │   ├── state/
│   │   │   └── vault.rs                    # Vault state definition
│   │   ├── instructions/
│   │   │   ├── sol/                        # SOL token instructions
│   │   │   └── spl/                        # SPL token instructions
│   │   ├── error.rs                        # Custom error definitions
│   │   ├── events.rs                       # Program events
│   │   └── constants.rs                    # Program constants
│   └── Cargo.toml                          # Rust dependencies
├── tests/                                   # TypeScript tests
│   └── timelock-base-wallet-program.ts     # Main test file
├── migrations/                              # Anchor migrations
├── Anchor.toml                             # Anchor configuration
├── package.json                            # Node.js dependencies
└── tsconfig.json                           # TypeScript configuration
```

## 🛠️ Prerequisites

Before building and running this project, ensure you have the following installed:

- **Rust** (latest stable version)
- **Solana CLI** (v1.18.0 or later)
- **Anchor CLI** (v0.31.1 or later)
- **Node.js** (v18 or later)
- **Yarn** package manager

### Installation Commands

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked

# Install Node.js and Yarn (if not already installed)
# Visit https://nodejs.org/ for Node.js installation
npm install -g yarn
```

## 🔧 Build Instructions

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd timelock-base-wallet-program
   ```

2. **Install dependencies**:
   ```bash
   yarn install
   ```

3. **Build the Anchor program**:
   ```bash
   anchor build
   ```

4. **Generate TypeScript types** (optional):
   ```bash
   anchor idl parse -f programs/timelock-base-wallet-program/src/lib.rs > target/idl/timelock_base_wallet_program.json
   ```

## 🧪 Testing Instructions

The project uses TypeScript tests with Mocha and Anchor's bankrun for testing:

1. **Make sure the program is built**:
   ```bash
   anchor build
   ```

2. **Run the tests**:
   ```bash
   anchor test
   ```

   Or run tests directly:
   ```bash
   yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts
   ```

3. **Run specific test files**:
   ```bash
   yarn run ts-mocha -p ./tsconfig.json tests/timelock-base-wallet-program.ts
   ```

## 🔍 Code Quality

- **Lint TypeScript code**:
  ```bash
  yarn lint
  ```

- **Fix linting issues**:
  ```bash
  yarn lint:fix
  ```

## 📖 Program API

### Core Functions

#### 1. Initialize SOL Lock
```rust
pub fn initialize_sol_lock(
    ctx: Context<InitializeSolLock>,
    amount: u64,
    unlock_timestamp: i64,
) -> Result<()>
```
Creates a new timelock vault for SOL tokens.

**Parameters:**
- `amount`: Amount of SOL to lock (in lamports)
- `unlock_timestamp`: Unix timestamp when tokens can be withdrawn

#### 2. Withdraw SOL Lock
```rust
pub fn withdraw_sol_lock(ctx: Context<WithdrawSolLock>) -> Result<()>
```
Withdraws SOL tokens from a vault after the unlock timestamp has passed.

#### 3. Initialize SPL Lock
```rust
pub fn initialize_spl_lock(
    ctx: Context<InitializeSplLock>,
    amount: u64,
    unlock_timestamp: i64,
) -> Result<()>
```
Creates a new timelock vault for SPL tokens.

**Parameters:**
- `amount`: Amount of SPL tokens to lock
- `unlock_timestamp`: Unix timestamp when tokens can be withdrawn

#### 4. Withdraw SPL Lock
```rust
pub fn withdraw_spl_lock(ctx: Context<WithdrawSplLock>) -> Result<()>
```
Withdraws SPL tokens from a vault after the unlock timestamp has passed.

### State Structure

#### Vault
```rust
pub struct Vault {
    pub owner: Pubkey,           // Owner of the locked tokens
    pub amount: u64,             // Amount of tokens locked
    pub bump: u8,                // PDA bump seed
    pub unlock_timestamp: i64,   // When tokens can be withdrawn
    pub mint: Option<Pubkey>,    // None for SOL, Some(mint) for SPL
}
```

### Error Codes

- `UnlockTimestampMustBeInFuture`: Unlock timestamp must be in the future
- `AmountMustBeGreaterThanZero`: Amount must be greater than zero
- `VaultLocked`: Vault is still locked (current time < unlock_timestamp)
- `VaultLocking`: Vault is in locking state
- `InvalidVaultMint`: Invalid vault mint provided

## 🎯 Usage Examples

### Using with Anchor TypeScript Client

```typescript
import * as anchor from '@coral-xyz/anchor';
import { TimelockBaseWalletProgram } from './target/types/timelock_base_wallet_program';

// Initialize program
const program = anchor.workspace.TimelockBaseWalletProgram as Program<TimelockBaseWalletProgram>;

// Lock SOL for 24 hours
const unlockTimestamp = Date.now() / 1000 + 24 * 60 * 60; // 24 hours from now
const amount = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL); // 1 SOL

await program.methods
  .initializeSolLock(amount, new anchor.BN(unlockTimestamp))
  .accounts({
    // ... account setup
  })
  .rpc();

// Withdraw after unlock time
await program.methods
  .withdrawSolLock()
  .accounts({
    // ... account setup
  })
  .rpc();
```

## 🔒 Security Considerations

- Always verify the unlock timestamp is in the future when creating locks
- Ensure proper account validation in all instructions
- The program uses Program Derived Addresses (PDAs) for secure vault management
- All withdrawals are validated against the vault owner and unlock timestamp

## 📄 License

This project is licensed under the ISC License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run tests and linting
6. Submit a pull request

## 📞 Support

For questions or issues, please open an issue in the GitHub repository.