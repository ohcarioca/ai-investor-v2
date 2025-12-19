/**
 * Confirm Solana Invest Tool
 * Executes the USDC transfer and sends webhook notification
 * This tool is called after user confirms the investment preview
 */

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { BaseTool } from '../../base/BaseTool';
import {
  ToolContext,
  ToolResult,
  ToolDefinition,
  ValidationResult,
  SolanaInvestConfirmResult,
  SolanaWebhookPayload,
} from '../../base/types';
import {
  SOLANA_DEPOSIT_WALLET,
  SOLANA_USDC_MINT,
  SOLANA_RPC_URL,
  SOLANA_WEBHOOK_URL,
} from '../../../constants/blockchain';
import { isValidAddress } from '../../../wallet-validation';

export class ConfirmSolanaInvestTool extends BaseTool {
  readonly name = 'confirm_solana_invest';
  readonly description = 'Confirma e executa o investimento Solana. Transfere USDC para a carteira de depósito e envia notificação. Use após o usuário confirmar o preview do investimento.';
  readonly category = 'solana' as const;
  readonly requiresWallet = true;

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'string',
            description: 'Quantidade de USDC a investir',
          },
          target_wallet: {
            type: 'string',
            description: 'Endereço da carteira destino em ETH ou AVAX',
          },
          target_network: {
            type: 'string',
            description: 'Rede destino: ETH ou AVAX',
            enum: ['ETH', 'AVAX'],
          },
        },
        required: ['amount', 'target_wallet', 'target_network'],
      },
    };
  }

  /**
   * Override base validation to use Solana address validation instead of EVM
   */
  validateParams(
    _params: Record<string, unknown>,
    context: ToolContext
  ): ValidationResult {
    // Check if wallet is connected
    if (!context.isConnected || !context.walletAddress) {
      return {
        isValid: false,
        error: 'Wallet not connected. Please connect your Solana wallet first.',
        errorCode: 'WALLET_NOT_CONNECTED',
      };
    }

    // Validate Solana address format
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
    params: Record<string, unknown>,
    _context: ToolContext
  ): ValidationResult {
    // Validate amount
    const amountValidation = this.validateAmount(params.amount);
    if (!amountValidation.isValid) {
      return amountValidation;
    }

    // Validate target wallet (must be EVM address)
    const targetWallet = params.target_wallet as string;
    if (!targetWallet || !isValidAddress(targetWallet)) {
      return {
        isValid: false,
        error: 'Invalid target wallet address',
        errorCode: 'INVALID_ADDRESS',
      };
    }

    // Validate target network
    const targetNetwork = params.target_network as string;
    if (!['ETH', 'AVAX'].includes(targetNetwork)) {
      return {
        isValid: false,
        error: 'Invalid target network',
        errorCode: 'NETWORK_ERROR',
      };
    }

    return { isValid: true };
  }

  protected async executeImpl(
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult<SolanaInvestConfirmResult>> {
    const amount = params.amount as string;
    const targetWallet = params.target_wallet as string;
    const targetNetwork = params.target_network as 'ETH' | 'AVAX';
    const solanaWallet = context.walletAddress!;

    this.log('Executing Solana investment', {
      amount,
      targetWallet,
      targetNetwork,
      solanaWallet,
    });

    try {
      const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
      const fromPublicKey = new PublicKey(solanaWallet);
      const toPublicKey = new PublicKey(SOLANA_DEPOSIT_WALLET);
      const usdcMint = new PublicKey(SOLANA_USDC_MINT);

      // Get token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(usdcMint, fromPublicKey);
      const toTokenAccount = await getAssociatedTokenAddress(usdcMint, toPublicKey);

      // Verify source account exists and has balance
      const sourceAccount = await getAccount(connection, fromTokenAccount);
      const amountInLamports = BigInt(Math.floor(parseFloat(amount) * 1e6)); // USDC has 6 decimals

      if (sourceAccount.amount < amountInLamports) {
        return {
          success: false,
          error: `Insufficient USDC balance. You have ${Number(sourceAccount.amount) / 1e6} USDC`,
          errorCode: 'INSUFFICIENT_BALANCE',
        };
      }

      // Build the transfer instruction
      const transferInstruction = createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        fromPublicKey,
        amountInLamports,
        [],
        TOKEN_PROGRAM_ID
      );

      // Create transaction
      const transaction = new Transaction().add(transferInstruction);

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPublicKey;

      // Serialize the transaction for frontend signing
      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      }).toString('base64');

      this.log('Transaction prepared for signing', {
        serializedTransaction: serializedTransaction.slice(0, 50) + '...',
      });

      // The actual signing and sending happens in the frontend
      // For now, we return the transaction data
      // The webhook will be sent after the transaction is confirmed

      const result: SolanaInvestConfirmResult = {
        success: true,
        txHash: 'pending_signature', // Will be replaced after frontend signs
        amount,
        targetWallet,
        targetNetwork,
        webhookSent: false, // Will be true after tx confirmation
      };

      // Return transaction data for frontend to sign and send
      return {
        success: true,
        data: {
          ...result,
          // Include transaction data for frontend
          solanaTransaction: {
            serializedTransaction,
            depositWallet: SOLANA_DEPOSIT_WALLET,
            amount,
            targetWallet,
            targetNetwork,
          },
        } as SolanaInvestConfirmResult & { solanaTransaction: object },
      };
    } catch (error) {
      this.log('Error executing Solana investment', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute investment',
        errorCode: 'BUILD_FAILED',
      };
    }
  }

  /**
   * Send webhook notification after transaction is confirmed
   * This is called from the frontend after successful transaction
   */
  static async sendWebhook(payload: SolanaWebhookPayload): Promise<boolean> {
    try {
      console.log('[ConfirmSolanaInvestTool] Sending webhook', payload);

      // Fire-and-forget webhook (async, don't wait for response)
      fetch(SOLANA_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }).catch((error) => {
        console.error('[ConfirmSolanaInvestTool] Webhook error:', error);
      });

      return true;
    } catch (error) {
      console.error('[ConfirmSolanaInvestTool] Webhook failed:', error);
      return false;
    }
  }
}
