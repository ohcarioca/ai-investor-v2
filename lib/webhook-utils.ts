import type { SwapWebhookPayload, SwapExtraInfo, SupportedBlockchain } from '@/types/webhook';
import type { Token, SwapQuote } from '@/types/swap';
import { calculatePriceOutUsd } from './webhook-service';

// Chain ID to blockchain name mapping
const CHAIN_TO_BLOCKCHAIN: Record<number, SupportedBlockchain> = {
  1: 'Ethereum',
  43114: 'Avalanche',
};

/**
 * Generate UUID v4
 * Uses crypto.randomUUID() if available, fallback for older browsers
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Build webhook payload from swap data
 * NOTE: fromAmount and toAmount are expected in BASE UNITS (wei/smallest unit)
 */
export function buildWebhookPayload(
  walletAddress: string,
  fromToken: Token,
  toToken: Token,
  fromAmount: string, // Base units (wei)
  toAmount: string, // Base units (wei)
  txHash: string,
  slippage: number,
  quote?: SwapQuote,
  chainId: number = 43114 // Default to Avalanche for backwards compatibility
): SwapWebhookPayload {
  // Parse amounts as base units first
  const fromAmountBase = parseFloat(fromAmount);
  const toAmountBase = parseFloat(toAmount);

  // Convert amounts from base units to decimal
  const amountInDecimal = fromAmountBase / Math.pow(10, fromToken.decimals);
  const amountOutDecimal = toAmountBase / Math.pow(10, toToken.decimals);

  // Calculate USD price (chain-aware)
  const priceOutUsd = calculatePriceOutUsd(
    { address: fromToken.address, decimals: fromToken.decimals },
    { address: toToken.address, decimals: toToken.decimals },
    fromAmount,
    toAmount,
    chainId
  );

  // Calculate cost basis
  const costBasisUsd = priceOutUsd !== null ? amountOutDecimal * priceOutUsd : null;

  // Build extra info
  const extraInfo: SwapExtraInfo = {
    slippage: slippage.toString(),
    estimatedGas: quote?.estimatedGas || '0',
    priceImpact: quote?.priceImpact || '0',
    exchangeRate: quote?.exchangeRate || '0',
    route: quote?.route || [],
  };

  // Get blockchain name from chainId
  const blockchain = CHAIN_TO_BLOCKCHAIN[chainId] || 'Avalanche';

  const payload: SwapWebhookPayload = {
    id: generateUUID(),
    wallet_address: walletAddress,
    token_in: fromToken.address,
    token_out: toToken.address,
    amount_in: amountInDecimal,
    amount_out: amountOutDecimal,
    price_out_usd: priceOutUsd,
    cost_basis_usd: costBasisUsd,
    provider: 'okx',
    tx_hash: txHash,
    blockchain,
    timestamp: new Date().toISOString(),
    status: 'SUCCESS',
    extra_info: extraInfo,
  };

  console.log('[Webhook] Payload built:', {
    id: payload.id,
    tokens: `${fromToken.symbol} → ${toToken.symbol}`,
    fromAmount_base: fromAmount,
    toAmount_base: toAmount,
    fromAmount_decimal: amountInDecimal,
    toAmount_decimal: amountOutDecimal,
    price_usd: priceOutUsd,
    cost_basis: costBasisUsd,
  });

  return payload;
}
