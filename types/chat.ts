import { SwapData } from './swap';
import { ChartConfig } from '@/components/charts/ChartCard';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  swapData?: SwapData;
  txHash?: string; // Transaction hash for success messages
  chartData?: ChartConfig; // Chart data for visualization
}

export interface ChatResponse {
  response: string;
  swapData?: SwapData;
  chartData?: ChartConfig;
  [key: string]: unknown;
}
