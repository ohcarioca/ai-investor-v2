/**
 * Transaction Builder Service
 * Centralized service for building swap transactions
 * Eliminates 360 lines of duplicated code across confirm_invest, confirm_withdraw, confirm_swap
 */

import { TokenRegistry } from '../token/TokenRegistry';
import { QuoteFetcher, getQuoteFetcher, SwapQuote } from './QuoteFetcher';
import { TransactionData, ApprovalResponse } from '../../tools/base/types';

export interface BuildSwapParams {
  fromToken: string;
  toToken: string;
  amount: string;
  slippage?: number;
  userAddress: string;
  chainId?: number;
}

export interface BuildSwapResult {
  success: boolean;
  quote?: SwapQuote;
  needsApproval: boolean;
  approvalTransaction?: TransactionData;
  swapTransaction?: TransactionData;
  error?: string;
}

export interface ApprovalCheckResult {
  isApproved: boolean;
  currentAllowance: string;
  requiredAllowance: string;
  spenderAddress: string;
  transaction?: TransactionData;
}

/**
 * Service for building swap transactions with approval handling
 */
export class TransactionBuilder {
  private readonly baseUrl: string;
  private readonly quoteFetcher: QuoteFetcher;

  constructor(baseUrl?: string, quoteFetcher?: QuoteFetcher) {
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    this.quoteFetcher = quoteFetcher || getQuoteFetcher();
  }

  /**
   * Build complete swap transaction with approval if needed
   * This is the main method that replaces duplicated code in confirm_* functions
   */
  async buildSwapTransaction(params: BuildSwapParams): Promise<BuildSwapResult> {
    const chainId = params.chainId || 1;

    try {
      // 1. Get token addresses and decimals for the specific chain
      const fromTokenAddress = TokenRegistry.getAddress(params.fromToken, chainId);
      const toTokenAddress = TokenRegistry.getAddress(params.toToken, chainId);
      const fromDecimals = TokenRegistry.getDecimals(params.fromToken, chainId);

      // 2. Convert amount to base units
      const baseAmount = Math.floor(parseFloat(params.amount) * (10 ** fromDecimals));

      // 3. Calculate slippage (use recommended if not provided)
      const slippagePercent = params.slippage ??
        TokenRegistry.getRecommendedSlippage(params.fromToken, params.toToken);
      const slippage = (slippagePercent / 100).toString();

      console.log('[TransactionBuilder] Building swap:', {
        fromToken: params.fromToken,
        toToken: params.toToken,
        amount: params.amount,
        baseAmount: baseAmount.toString(),
        slippagePercent,
        userAddress: params.userAddress.slice(0, 10) + '...',
      });

      // 4. Get quote first
      const quoteResult = await this.quoteFetcher.getQuote({
        chainId: chainId.toString(),
        fromToken: fromTokenAddress,
        toToken: toTokenAddress,
        amount: baseAmount.toString(),
        slippage,
      });

      if (!quoteResult.success || !quoteResult.quote) {
        return {
          success: false,
          needsApproval: false,
          error: quoteResult.error || 'Failed to get quote',
        };
      }

      // 5. Check approval if not native token
      let needsApproval = false;
      let approvalTx: TransactionData | undefined;

      if (!TokenRegistry.isNative(params.fromToken, chainId)) {
        const approvalCheck = await this.checkApproval({
          chainId,
          tokenAddress: fromTokenAddress,
          amount: baseAmount.toString(),
          userAddress: params.userAddress,
        });

        if (!approvalCheck.isApproved) {
          needsApproval = true;
          approvalTx = approvalCheck.transaction;
          console.log('[TransactionBuilder] Approval needed:', {
            token: params.fromToken,
            currentAllowance: approvalCheck.currentAllowance,
            requiredAllowance: approvalCheck.requiredAllowance,
            spender: approvalCheck.spenderAddress,
          });
        }
      }

      // 6. Build swap transaction
      // IMPORTANT: Never skip allowance check in build API - it uses the correct router
      // from the OKX v6 API response (txData.to), while checkApproval uses a hardcoded router
      const buildResult = await this.buildSwap({
        chainId,
        fromToken: fromTokenAddress,
        toToken: toTokenAddress,
        amount: baseAmount.toString(),
        slippage,
        userAddress: params.userAddress,
        skipAllowanceCheck: false, // Always check - build API has correct router
      });

      console.log('[TransactionBuilder] Build result received:', {
        success: buildResult.success,
        hasTransaction: !!buildResult.transaction,
        needsApproval: buildResult.needsApproval,
        hasApprovalTx: !!buildResult.approvalTransaction,
        approvalDetails: buildResult.approvalDetails,
        error: buildResult.error,
      });

      if (!buildResult.success) {
        return {
          success: false,
          needsApproval: false,
          quote: quoteResult.quote,
          error: buildResult.error || 'Failed to build swap transaction',
        };
      }

      // Determine if approval is needed
      const finalNeedsApproval = buildResult.needsApproval ?? needsApproval;

      // FIXED: Always use approval transaction from /api/swap/approval (uses our fixed router)
      // The build API may return a different router from OKX response
      const finalApprovalTx = approvalTx || buildResult.approvalTransaction;

      if (finalNeedsApproval) {
        console.log('[TransactionBuilder] Approval needed - using fixed router:', {
          currentAllowance: buildResult.approvalDetails?.currentAllowance || '0',
          required: buildResult.approvalDetails?.requiredAmount,
          usingApprovalFrom: approvalTx ? '/api/swap/approval' : '/api/swap/build',
          fixedRouter: '0x40aA958dd87FC8305b97f2BA922CDdCa374bcD7f',
        });
      }

      console.log('[TransactionBuilder] Swap built successfully:', {
        needsApproval: finalNeedsApproval,
        hasSwapTx: !!buildResult.transaction,
      });

      return {
        success: true,
        quote: quoteResult.quote,
        needsApproval: finalNeedsApproval,
        approvalTransaction: finalApprovalTx,
        swapTransaction: buildResult.transaction,
      };
    } catch (error) {
      console.error('[TransactionBuilder] Build error:', error);
      return {
        success: false,
        needsApproval: false,
        error: error instanceof Error ? error.message : 'Failed to build swap transaction',
      };
    }
  }

  /**
   * Check token approval status
   */
  private async checkApproval(params: {
    chainId: number;
    tokenAddress: string;
    amount: string;
    userAddress: string;
  }): Promise<ApprovalCheckResult> {
    try {
      console.log('[TransactionBuilder] checkApproval calling API with:', {
        url: `${this.baseUrl}/api/swap/approval`,
        params,
      });

      const response = await fetch(`${this.baseUrl}/api/swap/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data: ApprovalResponse = await response.json();

      console.log('[TransactionBuilder] checkApproval API response:', {
        ok: response.ok,
        status: response.status,
        spenderAddress: data?.status?.spenderAddress,
        isApproved: data?.status?.isApproved,
        fullData: JSON.stringify(data),
      });

      if (!response.ok) {
        // Default to needing approval on error
        return {
          isApproved: false,
          currentAllowance: '0',
          requiredAllowance: params.amount,
          spenderAddress: '',
        };
      }

      return {
        isApproved: data.status.isApproved,
        currentAllowance: data.status.currentAllowance,
        requiredAllowance: data.status.requiredAllowance,
        spenderAddress: data.status.spenderAddress,
        transaction: data.transaction,
      };
    } catch (error) {
      console.error('[TransactionBuilder] Approval check error:', error);
      // Default to needing approval on error
      return {
        isApproved: false,
        currentAllowance: '0',
        requiredAllowance: params.amount,
        spenderAddress: '',
      };
    }
  }

  /**
   * Build the actual swap transaction
   */
  private async buildSwap(params: {
    chainId: number;
    fromToken: string;
    toToken: string;
    amount: string;
    slippage: string;
    userAddress: string;
    skipAllowanceCheck: boolean;
  }): Promise<{
    success: boolean;
    transaction?: TransactionData;
    needsApproval?: boolean;
    approvalTransaction?: TransactionData;
    approvalDetails?: {
      currentAllowance: string;
      requiredAmount: string;
      router: string;
    };
    error?: string;
  }> {
    try {
      const url = `${this.baseUrl}/api/swap/build?skipAllowanceCheck=${params.skipAllowanceCheck}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainId: params.chainId,
          fromToken: params.fromToken,
          toToken: params.toToken,
          amount: params.amount,
          slippage: params.slippage,
          userAddress: params.userAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to build swap transaction',
        };
      }

      return {
        success: true,
        transaction: data.transaction,
        needsApproval: data.needsApproval,
        approvalTransaction: data.approvalTransaction,
        approvalDetails: data.approvalDetails,
      };
    } catch (error) {
      console.error('[TransactionBuilder] Build swap error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to build swap',
      };
    }
  }
}

// Singleton instance
let transactionBuilderInstance: TransactionBuilder | null = null;

export function getTransactionBuilder(): TransactionBuilder {
  if (!transactionBuilderInstance) {
    transactionBuilderInstance = new TransactionBuilder();
  }
  return transactionBuilderInstance;
}
