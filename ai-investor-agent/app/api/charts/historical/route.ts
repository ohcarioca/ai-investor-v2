import { NextRequest, NextResponse } from 'next/server';

interface HistoricalDataPoint {
  date: string;
  value: number;
  invested: number;
}

// Mock function to generate historical investment data
// In production, this would fetch from a database or external API
function generateHistoricalData(walletAddress: string, period: string): HistoricalDataPoint[] {
  const now = new Date();
  const data: HistoricalDataPoint[] = [];

  let days = 30;
  if (period === '7d') days = 7;
  else if (period === '1m') days = 30;
  else if (period === '3m') days = 90;
  else if (period === '6m') days = 180;
  else if (period === '1y') days = 365;

  // Generate mock data with realistic growth
  const baseInvestment = 100;
  const apy = 0.0585; // 5.85% APY
  const dailyRate = Math.pow(1 + apy, 1 / 365) - 1;

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Calculate value with some random fluctuation
    const daysElapsed = days - i;
    const growthFactor = Math.pow(1 + dailyRate, daysElapsed);
    const randomFluctuation = 1 + (Math.random() - 0.5) * 0.02; // ±1% daily fluctuation

    const invested = baseInvestment + (daysElapsed * 5); // Simulating periodic investments
    const value = invested * growthFactor * randomFluctuation;

    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: parseFloat(value.toFixed(2)),
      invested: parseFloat(invested.toFixed(2)),
    });
  }

  return data;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get('wallet_address');
    const period = searchParams.get('period') || '1m';
    const chartType = searchParams.get('type') || 'portfolio';

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Validate period
    const validPeriods = ['7d', '1m', '3m', '6m', '1y'];
    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period. Valid periods: 7d, 1m, 3m, 6m, 1y' },
        { status: 400 }
      );
    }

    // Generate historical data
    const historicalData = generateHistoricalData(walletAddress, period);

    // Return chart configuration based on type
    if (chartType === 'portfolio') {
      return NextResponse.json({
        success: true,
        chartConfig: {
          title: 'Portfolio Performance',
          description: `Last ${period}`,
          type: 'area',
          data: historicalData.map(d => ({
            name: d.date,
            value: d.value,
            invested: d.invested,
          })),
          dataKeys: {
            x: 'name',
            y: ['value', 'invested'],
          },
          colors: ['#9333ea', '#ec4899'],
          yAxisLabel: 'Value (USD)',
          showLegend: true,
          showGrid: true,
        },
      });
    } else if (chartType === 'growth') {
      return NextResponse.json({
        success: true,
        chartConfig: {
          title: 'Investment Growth',
          description: `Comparing invested vs current value - ${period}`,
          type: 'line',
          data: historicalData.map(d => ({
            name: d.date,
            value: d.value,
            invested: d.invested,
          })),
          dataKeys: {
            x: 'name',
            y: ['value', 'invested'],
          },
          colors: ['#10b981', '#6b7280'],
          yAxisLabel: 'Amount (USD)',
          showLegend: true,
          showGrid: true,
        },
      });
    } else if (chartType === 'profit') {
      return NextResponse.json({
        success: true,
        chartConfig: {
          title: 'Profit Over Time',
          description: `Net profit - ${period}`,
          type: 'bar',
          data: historicalData.map(d => ({
            name: d.date,
            profit: parseFloat((d.value - d.invested).toFixed(2)),
          })),
          dataKeys: {
            x: 'name',
            y: ['profit'],
          },
          colors: ['#10b981'],
          yAxisLabel: 'Profit (USD)',
          showLegend: false,
          showGrid: true,
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid chart type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error generating historical data:', error);
    return NextResponse.json(
      { error: 'Failed to generate historical data' },
      { status: 500 }
    );
  }
}
