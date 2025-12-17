/**
 * Quote Fetcher Service
 * Centralized service for fetching swap quotes
 * Eliminates duplicated quote fetching code across tools
 */

import { TokenRegistry } from '../token/TokenRegistry';
import type { QuoteRequest } from '../../tools/base/types';

export interface SwapQuote {
  fromAmount: string;
  toAmount: string;
  exchangeRate: string;
  priceImpact: string;
  estimatedGas: string;
}

export interface QuoteFetchResult {
  success: boolean;
  quote?: SwapQuote;
  error?: string;
}

/**
 * Service for fetching swap quotes from the API
 */
export class QuoteFetcher {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }

  /**
   * Fetch a swap quote
   * @param params Quote request parameters
   * @returns Quote result with success/error
   */
  async getQuote(params: QuoteRequest): Promise<QuoteFetchResult> {
    try {
      const quoteUrl = new URL(`${this.baseUrl}/api/swap/quote`);
      quoteUrl.searchParams.append('chainId', params.chainId);
      quoteUrl.searchParams.append('fromToken', params.fromToken);
      quoteUrl.searchParams.append('toToken', params.toToken);
      quoteUrl.searchParams.append('amount', params.amount);
      quoteUrl.searchParams.append('slippage', params.slippage);

      console.log('[QuoteFetcher] Fetching quote:', {
        fromToken: params.fromToken.slice(0, 10) + '...',
        toToken: params.toToken.slice(0, 10) + '...',
        amount: params.amount,
        slippage: params.slippage,
      });

      const response = await fetch(quoteUrl.toString());
      const data = await response.json();

      if (!response.ok) {
        console.error('[QuoteFetcher] Quote failed:', data.error);
        return {
          success: false,
          error: data.error || 'Failed to get quote',
        };
      }

      console.log('[QuoteFetcher] Quote received:', {
        toAmount: data.quote.toAmount,
        exchangeRate: data.quote.exchangeRate,
        priceImpact: data.quote.priceImpact,
      });

      return {
        success: true,
        quote: {
          fromAmount: params.amount,
          toAmount: data.quote.toAmount,
          exchangeRate: data.quote.exchangeRate,
          priceImpact: data.quote.priceImpact,
          estimatedGas: data.quote.estimatedGas,
        },
      };
    } catch (error) {
      console.error('[QuoteFetcher] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get quote',
      };
    }
  }

  /**
   * Fetch quote using token symbols (convenience method)
   * Automatically resolves addresses and calculates slippage
   */
  async getQuoteBySymbols(params: {
    fromToken: string;
    toToken: string;
    amount: string;
    slippage?: number;
    chainId?: number;
  }): Promise<QuoteFetchResult> {
    try {
      // Use chainId from params, default to Ethereum (1) if not provided
      const chainId = params.chainId || 1;

      // Get token addresses for the specific chain
      const fromTokenAddress = TokenRegistry.getAddress(params.fromToken, chainId);
      const toTokenAddress = TokenRegistry.getAddress(params.toToken, chainId);
      const fromDecimals = TokenRegistry.getDecimals(params.fromToken, chainId);

      // Convert human-readable amount to base units
      const baseAmount = Math.floor(parseFloat(params.amount) * 10 ** fromDecimals);

      // Get recommended slippage if not provided
      const slippagePercent =
        params.slippage ?? TokenRegistry.getRecommendedSlippage(params.fromToken, params.toToken);

      // Convert percentage to decimal (e.g., 10% -> 0.1)
      const slippage = (slippagePercent / 100).toString();

      console.log('[QuoteFetcher] Preparing quote for chain', chainId, {
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromTokenAddress,
        toTokenAddress,
      });

      return await this.getQuote({
        chainId: chainId.toString(),
        fromToken: fromTokenAddress,
        toToken: toTokenAddress,
        amount: baseAmount.toString(),
        slippage,
      });
    } catch (error) {
      console.error('[QuoteFetcher] Error preparing quote:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to prepare quote',
      };
    }
  }
}

// Singleton instance
let quoteFetcherInstance: QuoteFetcher | null = null;

export function getQuoteFetcher(): QuoteFetcher {
  if (!quoteFetcherInstance) {
    quoteFetcherInstance = new QuoteFetcher();
  }
  return quoteFetcherInstance;
}
