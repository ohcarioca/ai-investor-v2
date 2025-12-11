import { SwapData } from './swap';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  swapData?: SwapData;
}

export interface ChatResponse {
  response: string;
  swapData?: SwapData;
  [key: string]: unknown;
}
