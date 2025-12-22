/**
 * PNL Calculation Service
 *
 * Calculates profit and loss metrics for SIERRA investments using:
 * - Weighted average price for entry calculation
 * - On-chain transaction history for historical data
 * - Real-time SIERRA price from OKX DEX for current valuation
 */

import { createPublicClient, http } from 'viem';
import { mainnet, avalanche } from 'viem/chains';
import { getTransactionHistoryService } from '@/lib/services/history/TransactionHistoryService';
import { fetchWalletBalance } from '@/lib/services/balance';
import { getSierraPrice, getFallbackSierraPrice } from './PriceService';
import { pnlCache } from '@/lib/cache';
import type { TokenTransfer } from '@/types/transaction-history';
import type { PNLResult, Investment, Withdrawal, PNLRequest } from '@/types/pnl';

// APY from environment (as decimal, e.g., 0.0585 = 5.85%)
const SIERRA_APY_DECIMAL = parseFloat(process.env.NEXT_PUBLIC_SIERRA_APY || '0.0585');

export class PNLService {
  /**
   * Generate cache key for PNL data
   */
  private getCacheKey(walletAddress: string, chainId: number): string {
    return `pnl:${walletAddress.toLowerCase()}:${chainId}`;
  }

  /**
   * Invalidate cached PNL data for a wallet
   * Call this after transactions complete
   */
  invalidateCache(walletAddress: string, chainId?: number): void {
    const normalizedAddress = walletAddress.toLowerCase();
    if (chainId) {
      const key = this.getCacheKey(normalizedAddress, chainId);
      pnlCache.delete(key);
      console.log(`[PNLService] Cache invalidated for ${normalizedAddress} on chain ${chainId}`);
    } else {
      // Invalidate all chains
      pnlCache.delete(this.getCacheKey(normalizedAddress, 1));
      pnlCache.delete(this.getCacheKey(normalizedAddress, 43114));
      console.log(`[PNLService] Cache invalidated for ${normalizedAddress} on all chains`);
    }
  }

  /**
   * Calculate complete PNL metrics for a wallet
   * Uses cache to avoid expensive recalculations
   */
  async calculatePNL(request: PNLRequest): Promise<PNLResult> {
    const { walletAddress, chainId } = request;
    const cacheKey = this.getCacheKey(walletAddress, chainId);

    // Check cache first
    const cached = pnlCache.get(cacheKey) as PNLResult | null;
    if (cached) {
      console.log(
        `[PNLService] Returning cached PNL for ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} on chain ${chainId}`
      );
      return cached;
    }

    console.log(
      `[PNLService] Calculating PNL for ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} on chain ${chainId}`
    );

    // 1. Fetch all USDC and SIERRA transactions
    // Use a reasonable block range that works with RPC limits (10k blocks per query)
    // Start with ~1 week, expand to 1 month if needed
    const historyService = getTransactionHistoryService(chainId);
    const currentBlock = await this.getCurrentBlock(chainId);

    // Start with ~1 week of history (reasonable for most use cases)
    // Ethereum: ~50k blocks/week (~5 RPC calls), Avalanche: ~300k blocks/week (~30 RPC calls)
    const blocksOneWeek = chainId === 1 ? 50_000 : 300_000;
    let fromBlock = Math.max(0, currentBlock - blocksOneWeek);

    console.log(`[PNLService] Searching blocks ${fromBlock} to ${currentBlock} (range: ${currentBlock - fromBlock})`);

    let history = await historyService.getTransactionHistory({
      address: walletAddress,
      chainId,
      tokens: ['USDC', 'SIERRA'],
      limit: 1000,
      fromBlock,
      toBlock: currentBlock,
    });

    // If no SIERRA transactions found, expand to 1 month
    const sierraFound = history.transactions.some(
      (tx) => 'tokenSymbol' in tx && tx.tokenSymbol === 'SIERRA'
    );
    if (!sierraFound) {
      console.log('[PNLService] No SIERRA in 1-week range, trying 1-month range...');
      // Ethereum: ~220k blocks/month (~22 RPC calls), Avalanche: ~1.3M blocks/month (~130 RPC calls)
      const blocksOneMonth = chainId === 1 ? 220_000 : 1_300_000;
      fromBlock = Math.max(0, currentBlock - blocksOneMonth);

      history = await historyService.getTransactionHistory({
        address: walletAddress,
        chainId,
        tokens: ['USDC', 'SIERRA'],
        limit: 1000,
        fromBlock,
        toBlock: currentBlock,
      });
    }

    console.log(`[PNLService] Found ${history.transactions.length} transactions`);

    // Log SIERRA transactions specifically
    const sierraTransactions = history.transactions.filter(
      (tx) => 'tokenSymbol' in tx && tx.tokenSymbol === 'SIERRA'
    );
    console.log(`[PNLService] SIERRA transactions: ${sierraTransactions.length}`, sierraTransactions);

    // 2. Get current SIERRA balance
    const balance = await fetchWalletBalance({ address: walletAddress, chainId });
    const sierraToken = balance.tokens.find((t) => t.symbol === 'SIERRA');
    const currentSierraBalance = sierraToken ? parseFloat(sierraToken.balance) : 0;

    console.log(`[PNLService] Current SIERRA balance: ${currentSierraBalance}`);

    // 3. Get current SIERRA price from OKX DEX
    let currentPricePerSierra: number;
    try {
      currentPricePerSierra = await getSierraPrice(chainId);
    } catch {
      console.warn('[PNLService] Failed to fetch price, using fallback');
      currentPricePerSierra = getFallbackSierraPrice();
    }

    console.log(`[PNLService] Current SIERRA price: $${currentPricePerSierra}`);

    // 4. Identify investments and withdrawals by correlating transactions by TX HASH
    const { investments, withdrawals } = this.identifyTransactions(
      history.transactions as TokenTransfer[],
      walletAddress
    );

    console.log(
      `[PNLService] Identified ${investments.length} investments, ${withdrawals.length} withdrawals`
    );

    // 5. Calculate weighted average entry price
    const { averageEntryPrice, totalSierraPurchased, totalInvestedUsdc } =
      this.calculateWeightedAverage(investments);

    // 6. Calculate withdrawal metrics
    const { totalSierraSold, totalWithdrawnUsdc, realizedPnlUsdc } = this.calculateWithdrawalMetrics(
      withdrawals,
      averageEntryPrice
    );

    // 7. Calculate current position metrics
    const netInvestedUsdc = totalInvestedUsdc - totalWithdrawnUsdc;
    const currentValueUsdc = currentSierraBalance * currentPricePerSierra;
    const costBasisUsdc = currentSierraBalance * averageEntryPrice;
    const unrealizedPnlUsdc = currentValueUsdc - costBasisUsdc;
    const unrealizedPnlPercent = costBasisUsdc > 0 ? (unrealizedPnlUsdc / costBasisUsdc) * 100 : 0;
    const realizedPnlPercent =
      totalSierraSold > 0 && averageEntryPrice > 0
        ? (realizedPnlUsdc / (totalSierraSold * averageEntryPrice)) * 100
        : 0;

    // 8. Calculate yield metrics
    const firstInvestmentDate =
      investments.length > 0 ? Math.min(...investments.map((i) => i.timestamp)) : null;
    const lastTransactionDate = this.getLastTransactionDate(investments, withdrawals);
    const holdingPeriodDays = firstInvestmentDate
      ? Math.floor((Date.now() / 1000 - firstInvestmentDate) / 86400)
      : 0;

    // Calculate accumulated yield based on APY
    const accumulatedYieldUsdc = this.calculateAccumulatedYield(
      costBasisUsdc,
      holdingPeriodDays,
      SIERRA_APY_DECIMAL
    );
    const accumulatedYieldPercent =
      costBasisUsdc > 0 ? (accumulatedYieldUsdc / costBasisUsdc) * 100 : 0;

    // 9. Calculate totals
    const totalPnlUsdc = unrealizedPnlUsdc + realizedPnlUsdc;
    const totalPnlPercent = netInvestedUsdc > 0 ? (totalPnlUsdc / netInvestedUsdc) * 100 : 0;

    // 10. Calculate projections
    const projectedAnnualYieldUsdc = currentValueUsdc * SIERRA_APY_DECIMAL;

    const result: PNLResult = {
      totalInvestedUsdc,
      totalWithdrawnUsdc,
      netInvestedUsdc,
      averageEntryPrice,
      totalSierraPurchased,
      totalSierraSold,
      currentSierraBalance,
      currentPricePerSierra,
      currentValueUsdc,
      costBasisUsdc,
      unrealizedPnlUsdc,
      unrealizedPnlPercent,
      realizedPnlUsdc,
      realizedPnlPercent,
      accumulatedYieldUsdc,
      accumulatedYieldPercent,
      holdingPeriodDays,
      totalPnlUsdc,
      totalPnlPercent,
      currentApy: SIERRA_APY_DECIMAL * 100,
      projectedAnnualYieldUsdc,
      investments,
      withdrawals,
      firstInvestmentDate,
      lastTransactionDate,
      chainId,
      walletAddress,
      calculatedAt: Date.now(),
    };

    console.log('[PNLService] PNL calculation complete:', {
      totalPnlUsdc: result.totalPnlUsdc.toFixed(2),
      totalPnlPercent: result.totalPnlPercent.toFixed(2),
      averageEntryPrice: result.averageEntryPrice.toFixed(4),
      currentPrice: result.currentPricePerSierra.toFixed(4),
    });

    // Cache the result
    pnlCache.set(cacheKey, result);
    console.log(`[PNLService] Result cached with key: ${cacheKey}`);

    return result;
  }

  /**
   * Identify investment and withdrawal transactions
   *
   * Investment types:
   * 1. Swap: USDC out + SIERRA in (same tx hash) - use actual price
   * 2. Transfer/Airdrop: SIERRA in without USDC out - use fallback price
   *
   * Withdrawal types:
   * 1. Swap: SIERRA out + USDC in (same tx hash) - use actual price
   * 2. Transfer: SIERRA out without USDC in - use fallback price
   */
  private identifyTransactions(
    transactions: TokenTransfer[],
    _walletAddress: string
  ): { investments: Investment[]; withdrawals: Withdrawal[] } {
    const investments: Investment[] = [];
    const withdrawals: Withdrawal[] = [];

    // Get fallback price for non-swap transactions
    const fallbackPrice = getFallbackSierraPrice();

    // Group transactions by TX hash
    const byHash = new Map<string, TokenTransfer[]>();
    for (const tx of transactions) {
      const hash = tx.hash;
      if (!byHash.has(hash)) {
        byHash.set(hash, []);
      }
      byHash.get(hash)!.push(tx);
    }

    // Track processed SIERRA transactions to avoid duplicates
    const processedSierraHashes = new Set<string>();

    // First pass: identify swaps (USDC <-> SIERRA in same tx)
    for (const [hash, hashTxs] of byHash) {
      const usdcOut = hashTxs.find((tx) => tx.tokenSymbol === 'USDC' && tx.direction === 'out');
      const sierraIn = hashTxs.find((tx) => tx.tokenSymbol === 'SIERRA' && tx.direction === 'in');
      const sierraOut = hashTxs.find((tx) => tx.tokenSymbol === 'SIERRA' && tx.direction === 'out');
      const usdcIn = hashTxs.find((tx) => tx.tokenSymbol === 'USDC' && tx.direction === 'in');

      // Swap Investment: USDC out + SIERRA in (same tx hash)
      if (usdcOut && sierraIn) {
        const usdcAmount = parseFloat(usdcOut.valueFormatted);
        const sierraReceived = parseFloat(sierraIn.valueFormatted);
        const pricePerSierra = sierraReceived > 0 ? usdcAmount / sierraReceived : 0;

        investments.push({
          hash,
          timestamp: sierraIn.timestamp,
          usdcAmount,
          sierraReceived,
          pricePerSierra,
          blockNumber: sierraIn.blockNumber,
        });

        processedSierraHashes.add(hash);
        console.log(`[PNLService] Found swap investment: ${usdcAmount} USDC → ${sierraReceived} SIERRA @ $${pricePerSierra.toFixed(4)}`);
      }

      // Swap Withdrawal: SIERRA out + USDC in (same tx hash)
      if (sierraOut && usdcIn) {
        const sierraAmount = parseFloat(sierraOut.valueFormatted);
        const usdcReceived = parseFloat(usdcIn.valueFormatted);
        const pricePerSierra = sierraAmount > 0 ? usdcReceived / sierraAmount : 0;

        withdrawals.push({
          hash,
          timestamp: sierraOut.timestamp,
          sierraAmount,
          usdcReceived,
          pricePerSierra,
          blockNumber: sierraOut.blockNumber,
        });

        processedSierraHashes.add(hash);
        console.log(`[PNLService] Found swap withdrawal: ${sierraAmount} SIERRA → ${usdcReceived} USDC @ $${pricePerSierra.toFixed(4)}`);
      }
    }

    // Second pass: identify transfers (SIERRA without USDC correlation)
    for (const [hash, hashTxs] of byHash) {
      // Skip if already processed as swap
      if (processedSierraHashes.has(hash)) continue;

      const sierraIn = hashTxs.find((tx) => tx.tokenSymbol === 'SIERRA' && tx.direction === 'in');
      const sierraOut = hashTxs.find((tx) => tx.tokenSymbol === 'SIERRA' && tx.direction === 'out');

      // Transfer/Airdrop Investment: SIERRA in without USDC correlation
      if (sierraIn) {
        const sierraReceived = parseFloat(sierraIn.valueFormatted);
        // Use fallback price as cost basis (assume market price at time of receipt)
        const usdcAmount = sierraReceived * fallbackPrice;

        investments.push({
          hash,
          timestamp: sierraIn.timestamp,
          usdcAmount,
          sierraReceived,
          pricePerSierra: fallbackPrice,
          blockNumber: sierraIn.blockNumber,
        });

        console.log(`[PNLService] Found transfer investment: ${sierraReceived} SIERRA @ $${fallbackPrice.toFixed(4)} (fallback price)`);
      }

      // Transfer Withdrawal: SIERRA out without USDC correlation
      if (sierraOut) {
        const sierraAmount = parseFloat(sierraOut.valueFormatted);
        // Use fallback price for valuation
        const usdcReceived = sierraAmount * fallbackPrice;

        withdrawals.push({
          hash,
          timestamp: sierraOut.timestamp,
          sierraAmount,
          usdcReceived,
          pricePerSierra: fallbackPrice,
          blockNumber: sierraOut.blockNumber,
        });

        console.log(`[PNLService] Found transfer withdrawal: ${sierraAmount} SIERRA @ $${fallbackPrice.toFixed(4)} (fallback price)`);
      }
    }

    // Sort by timestamp (oldest first)
    investments.sort((a, b) => a.timestamp - b.timestamp);
    withdrawals.sort((a, b) => a.timestamp - b.timestamp);

    return { investments, withdrawals };
  }

  /**
   * Calculate weighted average entry price
   */
  private calculateWeightedAverage(investments: Investment[]): {
    averageEntryPrice: number;
    totalSierraPurchased: number;
    totalInvestedUsdc: number;
  } {
    let totalSierraPurchased = 0;
    let totalInvestedUsdc = 0;

    for (const inv of investments) {
      totalSierraPurchased += inv.sierraReceived;
      totalInvestedUsdc += inv.usdcAmount;
    }

    const averageEntryPrice = totalSierraPurchased > 0 ? totalInvestedUsdc / totalSierraPurchased : 0;

    return { averageEntryPrice, totalSierraPurchased, totalInvestedUsdc };
  }

  /**
   * Calculate withdrawal metrics including realized PNL
   */
  private calculateWithdrawalMetrics(
    withdrawals: Withdrawal[],
    averageEntryPrice: number
  ): {
    totalSierraSold: number;
    totalWithdrawnUsdc: number;
    realizedPnlUsdc: number;
  } {
    let totalSierraSold = 0;
    let totalWithdrawnUsdc = 0;
    let realizedPnlUsdc = 0;

    for (const wd of withdrawals) {
      totalSierraSold += wd.sierraAmount;
      totalWithdrawnUsdc += wd.usdcReceived;
      // Realized PNL = what we got - what we paid (at average entry)
      realizedPnlUsdc += wd.usdcReceived - wd.sierraAmount * averageEntryPrice;
    }

    return { totalSierraSold, totalWithdrawnUsdc, realizedPnlUsdc };
  }

  /**
   * Calculate accumulated yield based on APY over holding period
   * Uses simple interest approximation for short periods
   */
  private calculateAccumulatedYield(
    costBasis: number,
    holdingDays: number,
    apyDecimal: number
  ): number {
    if (costBasis === 0 || holdingDays === 0) return 0;

    // Daily rate from APY
    const dailyRate = apyDecimal / 365;

    // Simple yield calculation
    return costBasis * dailyRate * holdingDays;
  }

  /**
   * Get the timestamp of the most recent transaction
   */
  private getLastTransactionDate(
    investments: Investment[],
    withdrawals: Withdrawal[]
  ): number | null {
    const allDates = [
      ...investments.map((i) => i.timestamp),
      ...withdrawals.map((w) => w.timestamp),
    ];
    return allDates.length > 0 ? Math.max(...allDates) : null;
  }

  /**
   * Get current block number for a chain
   */
  private async getCurrentBlock(chainId: number): Promise<number> {
    const chain = chainId === 1 ? mainnet : avalanche;
    const rpcEnvKey = chainId === 1 ? 'QUICKNODE_ETH_RPC_URL' : 'QUICKNODE_AVAX_RPC_URL';
    const rpcUrl = process.env[rpcEnvKey];

    const client = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    const blockNumber = await client.getBlockNumber();
    return Number(blockNumber);
  }
}

// Export singleton instance
export const pnlService = new PNLService();
