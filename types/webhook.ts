import type { SwapRoute } from './swap';

// Extra info for webhook payload
export interface SwapExtraInfo {
  slippage: string;
  estimatedGas: string;
  priceImpact: string;
  exchangeRate: string;
  route?: SwapRoute[];
}

// Supported blockchains
export type SupportedBlockchain = 'Ethereum' | 'Avalanche';

// Complete webhook payload structure
export interface SwapWebhookPayload {
  id: string; // UUID v4
  wallet_address: string;
  token_in: string; // Token address
  token_out: string; // Token address
  amount_in: number; // Converted from base units to decimal
  amount_out: number; // Converted from base units to decimal
  price_out_usd: number | null; // Calculated based on USDC or null
  cost_basis_usd: number | null; // amount_out × price_out_usd
  provider: 'okx';
  tx_hash: string;
  blockchain: SupportedBlockchain;
  timestamp: string; // ISO 8601
  status: 'SUCCESS';
  extra_info: SwapExtraInfo;
}

// Response from webhook sending function
export interface WebhookResponse {
  success: boolean;
  error?: string;
  attempts?: number;
}
