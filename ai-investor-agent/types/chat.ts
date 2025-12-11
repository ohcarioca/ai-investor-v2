import { SwapData } from './swap';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  swapData?: SwapData;
  txHash?: string; // Transaction hash for success messages
}

export interface ChatResponse {
  response: string;
  swapData?: SwapData;
  [key: string]: unknown;
}
