'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import type { AccountBalance, Balance } from '@/types/wallet';
import { SOLANA_USDC_MINT, SOLANA_RPC_URL } from '@/lib/constants/blockchain';

/**
 * USDC token mint on Solana mainnet
 */
const USDC_MINT = new PublicKey(SOLANA_USDC_MINT);

/**
 * USDC has 6 decimals on Solana
 */
const USDC_DECIMALS = 6;

/**
 * Hook to fetch Solana wallet balances
 * Uses Reown AppKit for wallet connection
 * Fetches SOL native balance and USDC SPL token balance
 */
export function useSolanaBalance(autoRefresh: boolean = false, refreshInterval: number = 30000) {
  // Get wallet info from AppKit
  const { address, isConnected, caipAddress } = useAppKitAccount();

  // Check if connected to Solana (caipAddress starts with 'solana:')
  const isSolanaConnected = caipAddress?.startsWith('solana:');
  const connected = isConnected && isSolanaConnected;

  // Create Solana connection (memoized to avoid recreating)
  const connection = useMemo(() => {
    return new Connection(SOLANA_RPC_URL, 'confirmed');
  }, []);

  // Parse Solana address from CAIP format or direct address
  const solanaPublicKey = useMemo(() => {
    if (!connected || !address) return null;

    try {
      // AppKit provides the address directly for Solana
      return new PublicKey(address);
    } catch (err) {
      console.error('[useSolanaBalance] Invalid Solana address:', address, err);
      return null;
    }
  }, [address, connected]);

  const [balance, setBalance] = useState<AccountBalance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    console.log('[useSolanaBalance] fetchBalances called', {
      address,
      connected,
      isSolanaConnected,
      solanaPublicKey: solanaPublicKey?.toBase58(),
      timestamp: new Date().toISOString(),
    });

    if (!solanaPublicKey || !connected) {
      console.warn('[useSolanaBalance] Wallet not connected or not Solana');
      setError(null); // Don't show error, just no data
      setBalance(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const balances: Balance[] = [];
      let totalEquity = 0;

      // 1. Get SOL native balance
      const solBalance = await connection.getBalance(solanaPublicKey);
      const solBalanceFormatted = solBalance / 1e9; // SOL has 9 decimals
      const solPrice = 200; // TODO: Get real SOL price from oracle
      const solUsdValue = solBalanceFormatted * solPrice;

      balances.push({
        currency: 'SOL',
        available: solBalanceFormatted,
        frozen: 0,
        usdValue: solUsdValue,
      });
      totalEquity += solUsdValue;

      console.log('[useSolanaBalance] SOL balance:', {
        balance: solBalanceFormatted,
        usdValue: solUsdValue,
      });

      // 2. Get USDC SPL token balance
      try {
        const usdcTokenAccount = await getAssociatedTokenAddress(USDC_MINT, solanaPublicKey);

        const tokenAccountInfo = await getAccount(connection, usdcTokenAccount);
        const usdcBalance = Number(tokenAccountInfo.amount) / Math.pow(10, USDC_DECIMALS);
        const usdcUsdValue = usdcBalance; // USDC is 1:1 with USD

        balances.push({
          currency: 'USDC',
          available: usdcBalance,
          frozen: 0,
          usdValue: usdcUsdValue,
        });
        totalEquity += usdcUsdValue;

        console.log('[useSolanaBalance] USDC balance:', {
          balance: usdcBalance,
          usdValue: usdcUsdValue,
        });
      } catch {
        // Token account doesn't exist = 0 balance
        console.log('[useSolanaBalance] USDC token account not found, assuming 0 balance');
        balances.push({
          currency: 'USDC',
          available: 0,
          frozen: 0,
          usdValue: 0,
        });
      }

      console.log('[useSolanaBalance] All balances fetched', {
        balanceCount: balances.length,
        totalEquity,
      });

      setBalance({
        balances: balances.sort((a, b) => b.usdValue - a.usdValue),
        totalEquity,
        lastUpdated: new Date(),
      });
    } catch (err) {
      console.error('[useSolanaBalance] Balance fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balances');
    } finally {
      setIsLoading(false);
    }
  }, [solanaPublicKey, connected, connection, address, isSolanaConnected]);

  const refetch = useCallback(async () => {
    await fetchBalances();
  }, [fetchBalances]);

  // Auto-fetch on mount and when wallet changes
  useEffect(() => {
    if (connected && solanaPublicKey) {
      fetchBalances();
    } else {
      // Clear balance when disconnected or not on Solana
      setBalance(null);
      setError(null);
    }
  }, [connected, solanaPublicKey, fetchBalances]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && connected && solanaPublicKey) {
      const interval = setInterval(() => {
        refetch();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, connected, solanaPublicKey, refetch]);

  // Listen for transaction-completed events to refresh balance
  useEffect(() => {
    const handleTransactionCompleted = (event: CustomEvent) => {
      console.log('[useSolanaBalance] Transaction completed, refreshing balance...', event.detail);
      setTimeout(() => {
        refetch();
      }, 2000);
    };

    window.addEventListener('transaction-completed', handleTransactionCompleted as EventListener);

    return () => {
      window.removeEventListener(
        'transaction-completed',
        handleTransactionCompleted as EventListener
      );
    };
  }, [refetch]);

  return {
    balance,
    isLoading,
    error,
    refetch,
    isConnected: connected,
  };
}
