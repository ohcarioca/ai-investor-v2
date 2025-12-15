'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import type { SwapQuote, Token } from '@/types/swap';

interface UseSwapQuoteParams {
  fromToken: Token | null;
  toToken: Token | null;
  amount: string;
  slippage: number;
  enabled: boolean;
}

export function useSwapQuote({
  fromToken,
  toToken,
  amount,
  slippage,
  enabled,
}: UseSwapQuoteParams) {
  const { chain } = useAccount();
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = useCallback(async () => {
    if (
      !enabled ||
      !fromToken ||
      !toToken ||
      !amount ||
      parseFloat(amount) <= 0
    ) {
      setQuote(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert amount to base units
      const amountInBaseUnits = (
        parseFloat(amount) * Math.pow(10, fromToken.decimals)
      ).toFixed(0);

      const params = new URLSearchParams({
        chainId: (chain?.id || 1).toString(), // Default to Ethereum
        fromToken: fromToken.address,
        toToken: toToken.address,
        amount: amountInBaseUnits,
        slippage: slippage.toString(),
      });

      const response = await fetch(`/api/swap/quote?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch quote');
      }

      const data = await response.json();
      setQuote(data.quote);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quote');
      setQuote(null);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, fromToken, toToken, amount, slippage, chain]);

  // Auto-fetch with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuote();
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [fetchQuote]);

  return {
    quote,
    isLoading,
    error,
    refetch: fetchQuote,
  };
}
