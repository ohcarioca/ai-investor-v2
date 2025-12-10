// Token types
export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
  isNative?: boolean;
}

// Swap quote types
export interface SwapQuote {
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string;
  toAmountMin: string; // With slippage
  exchangeRate: string;
  priceImpact: string;
  estimatedGas: string;
  route: SwapRoute[];
}

export interface SwapRoute {
  protocol: string;
  percentage: number;
}

// Transaction types
export interface SwapTransaction {
  to: string;
  data: string;
  value: string;
  gasLimit: string;
}

// Approval types
export interface ApprovalStatus {
  isApproved: boolean;
  currentAllowance: string;
  requiredAllowance: string;
  spenderAddress: string;
}

export interface ApprovalTransaction {
  to: string;
  data: string;
  value: string;
}

// Swap state types
export type SwapStep =
  | 'input'
  | 'approval-required'
  | 'approving'
  | 'approval-confirmed'
  | 'swapping'
  | 'success'
  | 'error';

export interface SwapState {
  step: SwapStep;
  error: string | null;
  txHash: string | null;
}

// API response types
export interface QuoteResponse {
  quote: SwapQuote;
  timestamp: number;
}

export interface ApprovalCheckResponse {
  status: ApprovalStatus;
  transaction?: ApprovalTransaction;
}

export interface SwapBuildResponse {
  transaction: SwapTransaction;
  quote: SwapQuote;
}
