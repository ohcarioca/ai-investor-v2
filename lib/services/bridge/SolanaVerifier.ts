/**
 * SolanaVerifier
 * Verifies Solana transactions on-chain before processing bridge transfers
 */

import { Connection, ParsedTransactionWithMeta, ParsedInstruction } from '@solana/web3.js';
import {
  SOLANA_RPC_URL,
  SOLANA_DEPOSIT_WALLET,
  SOLANA_USDC_MINT,
} from '@/lib/constants/blockchain';
import type { SolanaVerificationResult } from '@/types/bridge';

interface ParsedTokenTransfer {
  source: string;
  destination: string;
  amount: number;
  mint?: string;
}

export class SolanaVerifier {
  private connection: Connection;

  constructor(rpcUrl: string = SOLANA_RPC_URL) {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Verify a Solana transaction signature
   * Checks that the transaction:
   * 1. Exists and is confirmed
   * 2. Was successful (no errors)
   * 3. Contains a USDC transfer to our deposit wallet
   */
  async verifyTransaction(txSignature: string): Promise<SolanaVerificationResult> {
    try {
      console.log(`[SolanaVerifier] Verifying transaction: ${txSignature.slice(0, 20)}...`);

      // 1. Fetch the parsed transaction
      const tx = await this.connection.getParsedTransaction(txSignature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      });

      if (!tx) {
        return { isValid: false, error: 'Transaction not found on Solana' };
      }

      // 2. Check if transaction failed
      if (tx.meta?.err) {
        return {
          isValid: false,
          error: `Transaction failed on-chain: ${JSON.stringify(tx.meta.err)}`,
        };
      }

      // 3. Parse token transfer instructions
      const transfer = this.parseTokenTransfer(tx);
      if (!transfer) {
        return { isValid: false, error: 'No valid SPL token transfer found in transaction' };
      }

      // 4. Verify the transfer was to our deposit wallet's token account
      // Note: For SPL tokens, we need to check the token account, not the wallet directly
      // The destination in the parsed instruction is the token account address
      const depositWalletTokenAccounts =
        await this.getTokenAccountsForWallet(SOLANA_DEPOSIT_WALLET);

      const isValidDestination =
        depositWalletTokenAccounts.includes(transfer.destination) ||
        transfer.destination === SOLANA_DEPOSIT_WALLET;

      if (!isValidDestination) {
        console.log(
          `[SolanaVerifier] Invalid destination. Expected one of: ${depositWalletTokenAccounts.join(', ')}, got: ${transfer.destination}`
        );
        return { isValid: false, error: 'Transfer not sent to deposit wallet' };
      }

      // 5. Verify the token is USDC (if mint info available)
      if (transfer.mint && transfer.mint !== SOLANA_USDC_MINT) {
        return { isValid: false, error: `Wrong token. Expected USDC, got: ${transfer.mint}` };
      }

      // Calculate human-readable amount (USDC has 6 decimals)
      const amountUsdc = transfer.amount / 1_000_000;

      console.log(
        `[SolanaVerifier] Verified transfer: ${amountUsdc} USDC from ${transfer.source} to deposit wallet`
      );

      return {
        isValid: true,
        details: {
          signature: txSignature,
          slot: tx.slot,
          blockTime: tx.blockTime || Math.floor(Date.now() / 1000),
          from: transfer.source,
          to: transfer.destination,
          amount: amountUsdc,
          tokenMint: transfer.mint || SOLANA_USDC_MINT,
          confirmationStatus: 'confirmed',
        },
      };
    } catch (error) {
      console.error('[SolanaVerifier] Verification error:', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown verification error',
      };
    }
  }

  /**
   * Parse SPL token transfer instruction from transaction
   */
  private parseTokenTransfer(tx: ParsedTransactionWithMeta): ParsedTokenTransfer | null {
    const instructions = tx.transaction.message.instructions;

    for (const ix of instructions) {
      // Check if it's a parsed instruction (vs compiled)
      if ('parsed' in ix && 'program' in ix) {
        const parsedIx = ix as ParsedInstruction;

        // Check for SPL Token program
        if (parsedIx.program === 'spl-token') {
          const parsed = parsedIx.parsed;

          // Handle both 'transfer' and 'transferChecked' instructions
          if (parsed.type === 'transfer' || parsed.type === 'transferChecked') {
            const info = parsed.info;
            return {
              source: info.source || info.authority,
              destination: info.destination,
              amount: parseFloat(info.amount || info.tokenAmount?.amount || '0'),
              mint: info.mint,
            };
          }
        }
      }
    }

    // Also check inner instructions (for associated token account creation + transfer)
    if (tx.meta?.innerInstructions) {
      for (const inner of tx.meta.innerInstructions) {
        for (const ix of inner.instructions) {
          if ('parsed' in ix && 'program' in ix) {
            const parsedIx = ix as ParsedInstruction;
            if (parsedIx.program === 'spl-token') {
              const parsed = parsedIx.parsed;
              if (parsed.type === 'transfer' || parsed.type === 'transferChecked') {
                const info = parsed.info;
                return {
                  source: info.source || info.authority,
                  destination: info.destination,
                  amount: parseFloat(info.amount || info.tokenAmount?.amount || '0'),
                  mint: info.mint,
                };
              }
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Get all token accounts associated with a wallet
   * This is needed because SPL token transfers go to token accounts, not wallet addresses
   */
  private async getTokenAccountsForWallet(walletAddress: string): Promise<string[]> {
    try {
      const { PublicKey } = await import('@solana/web3.js');
      const { TOKEN_PROGRAM_ID } = await import('@solana/spl-token');

      const wallet = new PublicKey(walletAddress);
      const tokenAccounts = await this.connection.getTokenAccountsByOwner(wallet, {
        programId: TOKEN_PROGRAM_ID,
      });

      return tokenAccounts.value.map((account) => account.pubkey.toBase58());
    } catch (error) {
      console.error('[SolanaVerifier] Error fetching token accounts:', error);
      // Return empty array on error - verification will fail if destination doesn't match
      return [];
    }
  }
}
