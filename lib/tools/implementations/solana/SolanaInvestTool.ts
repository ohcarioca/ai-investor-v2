/**
 * Solana Invest Tool
 * Prepares USDC transfer from Solana wallet to deposit wallet
 * User must provide target EVM wallet address for receiving funds
 */

import { PublicKey } from '@solana/web3.js';
import { BaseTool } from '../../base/BaseTool';
import {
  ToolContext,
  ToolResult,
  ToolDefinition,
  ValidationResult,
  SolanaInvestResult,
} from '../../base/types';
import { SOLANA_DEPOSIT_WALLET } from '../../../constants/blockchain';
import { isValidAddress } from '../../../wallet-validation';

export class SolanaInvestTool extends BaseTool {
  readonly name = 'solana_invest';
  readonly description =
    'Prepara investimento de USDC da carteira Solana. O usuário precisa informar: quantidade de USDC, endereço da carteira destino (ETH ou AVAX), e rede destino. Use quando usuário Solana quiser investir.';
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
            description: 'Quantidade de USDC a investir (ex: "100" para 100 USDC)',
          },
          target_wallet: {
            type: 'string',
            description: 'Endereço da carteira destino em ETH ou AVAX (deve começar com 0x)',
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
  validateParams(_params: Record<string, unknown>, context: ToolContext): ValidationResult {
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
        error:
          'Invalid target wallet address. Must be a valid Ethereum/Avalanche address starting with 0x',
        errorCode: 'INVALID_ADDRESS',
      };
    }

    // Validate target network
    const targetNetwork = params.target_network as string;
    if (!targetNetwork || !['ETH', 'AVAX'].includes(targetNetwork)) {
      return {
        isValid: false,
        error: 'Invalid target network. Must be ETH or AVAX',
        errorCode: 'NETWORK_ERROR',
      };
    }

    return { isValid: true };
  }

  protected async executeImpl(
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult<SolanaInvestResult>> {
    const amount = params.amount as string;
    const targetWallet = params.target_wallet as string;
    const targetNetwork = params.target_network as 'ETH' | 'AVAX';
    const solanaWallet = context.walletAddress!;

    this.log('Preparing Solana investment', {
      amount,
      targetWallet,
      targetNetwork,
      solanaWallet,
    });

    try {
      // Estimate transaction fee (Solana fees are very low, ~0.000005 SOL)
      const estimatedFee = '0.000005 SOL (~$0.001)';

      const result: SolanaInvestResult = {
        requiresConfirmation: true,
        amount,
        targetWallet,
        targetNetwork,
        depositWallet: SOLANA_DEPOSIT_WALLET,
        estimatedFee,
      };

      this.log('Investment preview prepared', result);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.log('Error preparing Solana investment', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to prepare investment',
        errorCode: 'BUILD_FAILED',
      };
    }
  }
}
