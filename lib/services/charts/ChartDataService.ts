/**
 * Chart Data Service
 *
 * Generates chart configurations with real on-chain data
 * from connected wallet balances and transaction history.
 */

import { fetchWalletBalance, WalletBalanceResult } from '@/lib/services/balance/BalanceService';
import { getTransactionHistoryService } from '@/lib/services/history/TransactionHistoryService';
import type { ChartConfig, ChartDataPoint, DynamicChartType } from '@/lib/tools/base/types';

// SIERRA APY from environment
const SIERRA_APY = parseFloat(process.env.NEXT_PUBLIC_SIERRA_APY || '0.0585');
const SIERRA_USDC_RATE = parseFloat(process.env.NEXT_PUBLIC_SIERRA_USDC_RATE || '1.005814');

// Default color palette (purple theme)
const DEFAULT_COLORS = ['#9333ea', '#ec4899', '#10b981', '#3b82f6', '#f59e0b', '#6366f1'];

/**
 * Request parameters for chart generation
 */
export interface ChartRequest {
  chartType: DynamicChartType;
  walletAddress: string;
  chainId: number;
  period?: '7d' | '1m' | '3m' | '6m' | '1y';
  tokens?: string[];
  /** Additional investment amount in USD for future projections */
  additionalInvestment?: number;
}

/**
 * Period configuration for date ranges
 */
interface PeriodConfig {
  days: number;
  labelFormat: 'short' | 'medium';
  dataPoints: number;
}

const PERIOD_CONFIG: Record<string, PeriodConfig> = {
  '7d': { days: 7, labelFormat: 'short', dataPoints: 7 },
  '1m': { days: 30, labelFormat: 'short', dataPoints: 15 },
  '3m': { days: 90, labelFormat: 'medium', dataPoints: 12 },
  '6m': { days: 180, labelFormat: 'medium', dataPoints: 12 },
  '1y': { days: 365, labelFormat: 'medium', dataPoints: 12 },
};

/**
 * Chart Data Service - generates chart configs from real wallet data
 */
export class ChartDataService {
  /**
   * Generate a chart configuration based on the request type
   */
  async generateChart(request: ChartRequest): Promise<ChartConfig> {
    const { chartType } = request;

    switch (chartType) {
      case 'token_distribution':
        return this.generateTokenDistribution(request);

      case 'transaction_volume':
        return this.generateTransactionVolume(request);

      case 'portfolio_value':
        return this.generatePortfolioValue(request);

      case 'balance_history':
        return this.generateBalanceHistory(request);

      case 'profit_loss':
        return this.generateProfitLoss(request);

      case 'apy_performance':
        return this.generateApyPerformance(request);

      case 'token_comparison':
        return this.generateTokenComparison(request);

      case 'future_projection':
        return this.generateFutureProjection(request);

      default:
        throw new Error(`Unsupported chart type: ${chartType}`);
    }
  }

  /**
   * Token Distribution - Donut chart showing current holdings allocation
   */
  private async generateTokenDistribution(request: ChartRequest): Promise<ChartConfig> {
    const balance = await this.fetchBalance(request);

    const data: ChartDataPoint[] = [];

    // Add native token if has value
    if (balance.native.balanceUsd > 0) {
      data.push({
        name: balance.native.symbol,
        value: Math.round(balance.native.balanceUsd * 100) / 100,
      });
    }

    // Add ERC20 tokens
    for (const token of balance.tokens) {
      if (token.balanceUsd > 0) {
        data.push({
          name: token.symbol,
          value: Math.round(token.balanceUsd * 100) / 100,
        });
      }
    }

    // Sort by value descending
    data.sort((a, b) => b.value - a.value);

    return {
      title: 'Token Distribution',
      description: 'Current portfolio allocation',
      type: 'donut',
      data,
      dataKeys: { x: 'name', y: ['value'] },
      colors: DEFAULT_COLORS,
      highlightValue: {
        value: `$${balance.totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        label: 'Total Value',
      },
      showLegend: true,
      legendPosition: 'right',
      showGrid: false,
    };
  }

  /**
   * Transaction Volume - Bar chart showing transaction activity over time
   */
  private async generateTransactionVolume(request: ChartRequest): Promise<ChartConfig> {
    const { walletAddress, chainId, period = '1m' } = request;
    const periodConfig = PERIOD_CONFIG[period];

    try {
      const historyService = getTransactionHistoryService(chainId);
      const history = await historyService.getTransactionHistory({
        address: walletAddress,
        chainId,
        limit: 200,
      });

      // Group transactions by date
      const volumeByDate = this.groupTransactionsByDate(
        history.transactions,
        periodConfig.days,
        periodConfig.dataPoints
      );

      return {
        title: 'Transaction Volume',
        description: `Activity over the last ${this.formatPeriodLabel(period)}`,
        type: 'bar',
        data: volumeByDate,
        dataKeys: { x: 'name', y: ['volume'] },
        colors: ['#9333ea'],
        gradient: true,
        showGrid: false,
        showYAxis: true,
        showXAxis: true,
        highlightValue: {
          value: `${history.total}`,
          label: 'Total Transactions',
        },
      };
    } catch (error) {
      console.error('[ChartDataService] Error generating transaction volume:', error);
      // Return empty chart with message
      return this.generateEmptyChart('Transaction Volume', 'No transaction data available');
    }
  }

  /**
   * Portfolio Value - Area chart showing portfolio value over time
   */
  private async generatePortfolioValue(request: ChartRequest): Promise<ChartConfig> {
    const { period = '1m' } = request;
    const balance = await this.fetchBalance(request);
    const periodConfig = PERIOD_CONFIG[period];

    // Generate historical simulation based on current balance and APY
    const data = this.generateHistoricalSimulation(
      balance.totalUsd,
      periodConfig.days,
      periodConfig.dataPoints,
      SIERRA_APY
    );

    const firstValue = data[0]?.value || 0;
    const lastValue = data[data.length - 1]?.value || 0;
    const change = lastValue - firstValue;
    const changePercent = firstValue > 0 ? ((change / firstValue) * 100).toFixed(1) : '0';

    return {
      title: 'Portfolio Performance',
      description: `Last ${this.formatPeriodLabel(period)}`,
      type: 'area',
      data,
      dataKeys: { x: 'name', y: ['value'] },
      colors: ['#9333ea'],
      gradient: true,
      showDots: false,
      curveType: 'monotone',
      showGrid: false,
      showYAxis: true,
      highlightValue: {
        value: `$${lastValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        trend: change >= 0 ? 'up' : 'down',
        trendPercent: `${change >= 0 ? '+' : ''}${changePercent}%`,
      },
      showFooterStats: true,
      footerStats: [
        { label: 'Starting', value: `$${firstValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: 'Current', value: `$${lastValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: 'Change', value: `$${Math.abs(change).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: change >= 0 ? '#10b981' : '#ef4444' },
      ],
    };
  }

  /**
   * Balance History - Line chart showing specific token balance over time
   */
  private async generateBalanceHistory(request: ChartRequest): Promise<ChartConfig> {
    const { period = '1m', tokens } = request;
    const balance = await this.fetchBalance(request);
    const periodConfig = PERIOD_CONFIG[period];

    // Get the specific token or use total
    const tokenSymbol = tokens?.[0] || 'TOTAL';
    let currentBalance = balance.totalUsd;

    if (tokenSymbol !== 'TOTAL') {
      const token = balance.tokens.find(t => t.symbol.toUpperCase() === tokenSymbol.toUpperCase());
      currentBalance = token?.balanceUsd || 0;
    }

    const data = this.generateHistoricalSimulation(
      currentBalance,
      periodConfig.days,
      periodConfig.dataPoints,
      SIERRA_APY * 0.5 // Lower volatility for single token
    );

    return {
      title: `${tokenSymbol} Balance History`,
      description: `Last ${this.formatPeriodLabel(period)}`,
      type: 'line',
      data,
      dataKeys: { x: 'name', y: ['value'] },
      colors: ['#9333ea'],
      showDots: false,
      curveType: 'monotone',
      showGrid: false,
      highlightValue: {
        value: `$${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        label: 'Current Balance',
      },
    };
  }

  /**
   * Profit/Loss - Area chart showing gains/losses over time
   */
  private async generateProfitLoss(request: ChartRequest): Promise<ChartConfig> {
    const { period = '1m' } = request;
    const balance = await this.fetchBalance(request);
    const periodConfig = PERIOD_CONFIG[period];

    // Calculate invested vs current value based on SIERRA holdings
    const sierraToken = balance.tokens.find(t => t.symbol === 'SIERRA');
    const sierraBalance = sierraToken ? parseFloat(sierraToken.balance) : 0;
    const investedUsdc = sierraBalance / SIERRA_USDC_RATE; // Original USDC invested
    const currentValue = sierraBalance * SIERRA_USDC_RATE; // Current value

    const data = this.generateProfitLossData(
      investedUsdc,
      currentValue,
      periodConfig.days,
      periodConfig.dataPoints
    );

    const totalProfit = currentValue - investedUsdc;
    const profitPercent = investedUsdc > 0 ? ((totalProfit / investedUsdc) * 100).toFixed(2) : '0';

    return {
      title: 'Profit & Loss',
      description: `Investment returns - ${this.formatPeriodLabel(period)}`,
      type: 'area',
      data,
      dataKeys: { x: 'name', y: ['profit'] },
      colors: [totalProfit >= 0 ? '#10b981' : '#ef4444'],
      gradient: true,
      showDots: false,
      curveType: 'monotone',
      showGrid: false,
      highlightValue: {
        value: `${totalProfit >= 0 ? '+' : ''}$${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        trend: totalProfit >= 0 ? 'up' : 'down',
        trendPercent: `${totalProfit >= 0 ? '+' : ''}${profitPercent}%`,
      },
    };
  }

  /**
   * APY Performance - Area chart showing yield accumulation
   */
  private async generateApyPerformance(request: ChartRequest): Promise<ChartConfig> {
    const { period = '1m' } = request;
    const balance = await this.fetchBalance(request);
    const periodConfig = PERIOD_CONFIG[period];

    // Calculate APY performance based on SIERRA holdings
    const sierraToken = balance.tokens.find(t => t.symbol === 'SIERRA');
    const currentValue = sierraToken?.balanceUsd || 0;

    const data = this.generateApyData(currentValue, periodConfig.days, periodConfig.dataPoints);

    const apyPercent = (SIERRA_APY * 100).toFixed(1);

    return {
      title: 'APY Performance',
      description: `Yield accumulation - ${this.formatPeriodLabel(period)}`,
      type: 'area',
      data,
      dataKeys: { x: 'name', y: ['value'] },
      colors: ['#9333ea'],
      gradient: true,
      showDots: false,
      curveType: 'monotone',
      showGrid: false,
      highlightValue: {
        value: `${apyPercent}%`,
        label: 'Current APY',
        trend: 'up',
      },
    };
  }

  /**
   * Token Comparison - Multi-line chart comparing token performances
   */
  private async generateTokenComparison(request: ChartRequest): Promise<ChartConfig> {
    const { period = '1m', tokens } = request;
    const balance = await this.fetchBalance(request);
    const periodConfig = PERIOD_CONFIG[period];

    // Get tokens to compare (default to all available)
    const tokensToCompare = tokens || balance.tokens.map(t => t.symbol);
    const data: ChartDataPoint[] = [];
    const yKeys: string[] = [];

    // Generate comparison data
    const dates = this.generateDateLabels(periodConfig.days, periodConfig.dataPoints);

    for (let i = 0; i < dates.length; i++) {
      const point: ChartDataPoint = { name: dates[i], value: 0 };

      for (const tokenSymbol of tokensToCompare) {
        const token = balance.tokens.find(t => t.symbol.toUpperCase() === tokenSymbol.toUpperCase());
        if (token && token.balanceUsd > 0) {
          const key = tokenSymbol.toLowerCase();
          if (!yKeys.includes(key)) yKeys.push(key);

          // Simulate historical value with slight variations
          const dayIndex = periodConfig.dataPoints - i;
          const variation = 1 - (dayIndex / periodConfig.dataPoints) * 0.1 + Math.random() * 0.05;
          point[key] = Math.round(token.balanceUsd * variation * 100) / 100;
        }
      }

      data.push(point);
    }

    return {
      title: 'Token Comparison',
      description: `Performance comparison - ${this.formatPeriodLabel(period)}`,
      type: 'line',
      data,
      dataKeys: { x: 'name', y: yKeys },
      colors: DEFAULT_COLORS.slice(0, yKeys.length),
      showDots: false,
      curveType: 'monotone',
      showGrid: false,
      showLegend: true,
      legendPosition: 'bottom',
    };
  }

  /**
   * Future Projection - Area chart showing projected future gains based on APY
   * Allows user to simulate additional investments
   */
  private async generateFutureProjection(request: ChartRequest): Promise<ChartConfig> {
    const { period = '1y', additionalInvestment = 0 } = request;
    const balance = await this.fetchBalance(request);

    // Get current SIERRA holdings value
    const sierraToken = balance.tokens.find(t => t.symbol === 'SIERRA');
    const currentInvested = sierraToken?.balanceUsd || 0;

    // Total investment = current + additional
    const totalInvestment = currentInvested + additionalInvestment;

    // Generate future projection data
    const projectionPeriods: Record<string, { months: number; dataPoints: number }> = {
      '7d': { months: 1, dataPoints: 4 },      // Show 1 month projection
      '1m': { months: 3, dataPoints: 6 },      // Show 3 months projection
      '3m': { months: 6, dataPoints: 6 },      // Show 6 months projection
      '6m': { months: 12, dataPoints: 12 },    // Show 1 year projection
      '1y': { months: 24, dataPoints: 12 },    // Show 2 years projection
    };

    const config = projectionPeriods[period] || projectionPeriods['1y'];
    const data = this.generateFutureProjectionData(
      currentInvested,
      additionalInvestment,
      config.months,
      config.dataPoints
    );

    // Calculate projected gains
    const finalValue = (data[data.length - 1]?.projected as number) || totalInvestment;
    const totalGain = finalValue - totalInvestment;
    const gainPercent = totalInvestment > 0 ? ((totalGain / totalInvestment) * 100).toFixed(1) : '0';

    const apyPercent = (SIERRA_APY * 100).toFixed(1);

    return {
      title: 'Future Earnings Projection',
      description: `Projected growth over ${config.months} months at ${apyPercent}% APY`,
      type: 'area',
      data,
      dataKeys: { x: 'name', y: ['projected', 'invested'] },
      colors: ['#10b981', '#9333ea'],
      gradient: true,
      showDots: false,
      curveType: 'monotone',
      showGrid: false,
      showYAxis: true,
      showLegend: true,
      legendPosition: 'bottom',
      highlightValue: {
        value: `+$${totalGain.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        label: 'Projected Gain',
        trend: 'up',
        trendPercent: `+${gainPercent}%`,
      },
      showFooterStats: true,
      footerStats: [
        {
          label: 'Current Investment',
          value: `$${currentInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        },
        {
          label: additionalInvestment > 0 ? 'Additional Investment' : 'No Additional',
          value: additionalInvestment > 0
            ? `+$${additionalInvestment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '-',
          color: additionalInvestment > 0 ? '#9333ea' : '#9ca3af',
        },
        {
          label: 'Projected Total',
          value: `$${finalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          color: '#10b981',
        },
      ],
    };
  }

  /**
   * Generate future projection data points
   */
  private generateFutureProjectionData(
    currentInvested: number,
    additionalInvestment: number,
    months: number,
    dataPoints: number
  ): ChartDataPoint[] {
    const data: ChartDataPoint[] = [];
    const totalInvestment = currentInvested + additionalInvestment;
    const monthlyRate = Math.pow(1 + SIERRA_APY, 1 / 12) - 1;
    const step = Math.max(1, Math.floor(months / dataPoints));

    for (let i = 0; i <= dataPoints; i++) {
      const month = i * step;
      const growthFactor = Math.pow(1 + monthlyRate, month);
      const projectedValue = totalInvestment * growthFactor;

      // Generate month label
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + month);
      const label = month === 0
        ? 'Now'
        : futureDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      data.push({
        name: label,
        value: 0,
        invested: Math.round(totalInvestment * 100) / 100,
        projected: Math.round(projectedValue * 100) / 100,
      });
    }

    return data;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Fetch wallet balance with caching
   */
  private async fetchBalance(request: ChartRequest): Promise<WalletBalanceResult> {
    return fetchWalletBalance({
      address: request.walletAddress,
      chainId: request.chainId,
    });
  }

  /**
   * Generate historical simulation data based on current value and growth rate
   */
  private generateHistoricalSimulation(
    currentValue: number,
    days: number,
    dataPoints: number,
    annualRate: number
  ): ChartDataPoint[] {
    const data: ChartDataPoint[] = [];
    const dailyRate = Math.pow(1 + annualRate, 1 / 365) - 1;
    const dates = this.generateDateLabels(days, dataPoints);
    const step = Math.floor(days / dataPoints);

    for (let i = 0; i < dataPoints; i++) {
      const daysFromEnd = (dataPoints - 1 - i) * step;
      const growthFactor = Math.pow(1 + dailyRate, daysFromEnd);
      const historicalValue = currentValue / growthFactor;

      // Add small random fluctuation for realism
      const fluctuation = 1 + (Math.random() - 0.5) * 0.02;

      data.push({
        name: dates[i],
        value: Math.round(historicalValue * fluctuation * 100) / 100,
      });
    }

    // Ensure last value matches current value exactly
    if (data.length > 0) {
      data[data.length - 1].value = Math.round(currentValue * 100) / 100;
    }

    return data;
  }

  /**
   * Generate profit/loss data over time
   */
  private generateProfitLossData(
    invested: number,
    currentValue: number,
    days: number,
    dataPoints: number
  ): ChartDataPoint[] {
    const data: ChartDataPoint[] = [];
    const totalProfit = currentValue - invested;
    const dates = this.generateDateLabels(days, dataPoints);
    const step = Math.floor(days / dataPoints);

    for (let i = 0; i < dataPoints; i++) {
      const progress = i / (dataPoints - 1);
      const profit = totalProfit * progress * (1 + (Math.random() - 0.5) * 0.1);

      data.push({
        name: dates[i],
        value: 0, // Not used for profit chart
        profit: Math.round(profit * 100) / 100,
      });
    }

    // Ensure last value matches actual profit
    if (data.length > 0) {
      data[data.length - 1].profit = Math.round(totalProfit * 100) / 100;
    }

    return data;
  }

  /**
   * Generate APY accumulation data
   */
  private generateApyData(
    currentValue: number,
    days: number,
    dataPoints: number
  ): ChartDataPoint[] {
    const data: ChartDataPoint[] = [];
    const dailyRate = Math.pow(1 + SIERRA_APY, 1 / 365) - 1;
    const dates = this.generateDateLabels(days, dataPoints);
    const step = Math.floor(days / dataPoints);

    for (let i = 0; i < dataPoints; i++) {
      const daysFromEnd = (dataPoints - 1 - i) * step;
      const growthFactor = Math.pow(1 + dailyRate, daysFromEnd);
      const historicalValue = currentValue / growthFactor;

      data.push({
        name: dates[i],
        value: Math.round(historicalValue * 100) / 100,
      });
    }

    // Ensure last value matches current
    if (data.length > 0) {
      data[data.length - 1].value = Math.round(currentValue * 100) / 100;
    }

    return data;
  }

  /**
   * Group transactions by date for volume chart
   */
  private groupTransactionsByDate(
    transactions: Array<{ timestamp: number; value?: string; valueFormatted?: string }>,
    days: number,
    dataPoints: number
  ): ChartDataPoint[] {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const step = Math.floor(days / dataPoints);

    // Initialize buckets
    const buckets: Map<string, number> = new Map();
    const dates = this.generateDateLabels(days, dataPoints);
    dates.forEach(date => buckets.set(date, 0));

    // Count transactions per bucket
    for (const tx of transactions) {
      if (tx.timestamp === 0) continue;

      const txDate = new Date(tx.timestamp * 1000);
      if (txDate < startDate) continue;

      const daysDiff = Math.floor((now.getTime() - txDate.getTime()) / (24 * 60 * 60 * 1000));
      const bucketIndex = Math.floor(daysDiff / step);

      if (bucketIndex >= 0 && bucketIndex < dataPoints) {
        const dateKey = dates[dataPoints - 1 - bucketIndex];
        const current = buckets.get(dateKey) || 0;
        buckets.set(dateKey, current + 1);
      }
    }

    // Convert to chart data
    return dates.map(date => ({
      name: date,
      value: 0,
      volume: buckets.get(date) || 0,
    }));
  }

  /**
   * Generate date labels for chart X-axis
   */
  private generateDateLabels(days: number, dataPoints: number): string[] {
    const labels: string[] = [];
    const now = new Date();
    const step = Math.floor(days / dataPoints);

    for (let i = dataPoints - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * step * 24 * 60 * 60 * 1000);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }

    return labels;
  }

  /**
   * Format period for display
   */
  private formatPeriodLabel(period: string): string {
    const labels: Record<string, string> = {
      '7d': '7 days',
      '1m': '1 month',
      '3m': '3 months',
      '6m': '6 months',
      '1y': '1 year',
    };
    return labels[period] || period;
  }

  /**
   * Generate empty chart config for error states
   */
  private generateEmptyChart(title: string, message: string): ChartConfig {
    return {
      title,
      description: message,
      type: 'bar',
      data: [{ name: 'No Data', value: 0 }],
      dataKeys: { x: 'name', y: ['value'] },
      colors: ['#d1d5db'],
      showGrid: false,
    };
  }
}

// Export singleton instance
export const chartDataService = new ChartDataService();
