/**
 * Get Solana Balance Tool
 * Fetches USDC and SOL balance from Solana wallet
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { BaseTool } from '../../base/BaseTool';
import {
  ToolContext,
  ToolResult,
  ToolDefinition,
  ValidationResult,
  SolanaBalanceData,
} from '../../base/types';
import { SOLANA_USDC_MINT, SOLANA_RPC_URL } from '../../../constants/blockchain';

interface BalanceResult {
  balance: SolanaBalanceData;
  formattedBalance: string;
}

export class GetSolanaBalanceTool extends BaseTool {
  readonly name = 'get_solana_balance';
  readonly description =
    'Obtém o saldo da carteira Solana. Retorna saldo em USDC e SOL. Use quando o usuário perguntar sobre seu saldo na rede Solana.';
  readonly category = 'solana' as const;
  readonly requiresWallet = true;

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    };
  }

  /**
   * Override base validation to use Solana address validation instead of EVM
   * The base class validates for 0x addresses, but Solana uses base58
   */
  validateParams(_params: Record<string, unknown>, context: ToolContext): ValidationResult {
    // Check if wallet is connected
    if (!context.isConnected || !context.walletAddress) {
      return {
        isValid: false,
        error: 'Wallet not connected. Please connect your Solana wallet first.',
        errorCode: 'WALLET_NOT_CONNECTED',
      };
    }

    // Validate Solana address format (base58, 32-44 chars)
    try {
      new PublicKey(context.walletAddress);
    } catch {
      return {
        isValid: false,
        error: 'Invalid Solana wallet address format. Please connect a Solana wallet.',
        errorCode: 'INVALID_ADDRESS',
      };
    }

    return { isValid: true };
  }

  protected validateSpecificParams(
    _params: Record<string, unknown>,
    _context: ToolContext
  ): ValidationResult {
    // All validation is done in validateParams override
    return { isValid: true };
  }

  protected async executeImpl(
    _params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult<BalanceResult>> {
    const walletAddress = context.walletAddress!;

    this.log(`Fetching Solana balance for: ${walletAddress}`);

    try {
      const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
      const publicKey = new PublicKey(walletAddress);

      // Get SOL balance
      const solBalance = await connection.getBalance(publicKey);
      const solBalanceFormatted = solBalance / LAMPORTS_PER_SOL;

      // Get USDC balance
      let usdcBalance = 0;
      try {
        const usdcMint = new PublicKey(SOLANA_USDC_MINT);
        const usdcTokenAccount = await getAssociatedTokenAddress(usdcMint, publicKey);
        const tokenAccountInfo = await getAccount(connection, usdcTokenAccount);
        usdcBalance = Number(tokenAccountInfo.amount) / 1e6; // USDC has 6 decimals
      } catch {
        // Token account doesn't exist = 0 balance
        this.log('USDC token account not found, assuming 0 balance');
      }

      const balanceData: SolanaBalanceData = {
        address: walletAddress,
        usdcBalance,
        solBalance: solBalanceFormatted,
        lastUpdated: new Date(),
      };

      this.log('Solana balance fetched', balanceData);

      return {
        success: true,
        data: {
          balance: balanceData,
          formattedBalance: `USDC: $${usdcBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | SOL: ${solBalanceFormatted.toFixed(4)}`,
        },
      };
    } catch (error) {
      this.log('Error fetching Solana balance', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Solana balance',
        errorCode: 'NETWORK_ERROR',
      };
    }
  }
}
