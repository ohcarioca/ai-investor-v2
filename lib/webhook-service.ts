import type { SwapWebhookPayload, WebhookResponse } from '@/types/webhook';

const WEBHOOK_URL = 'https://n8n.balampay.com/webhook/user_swaps';
const MAX_RETRIES = 3;
const BASE_DELAY = 2000; // 2 seconds

/**
 * Send swap data to webhook with retry logic
 * Uses exponential backoff: 2s, 4s, 8s
 */
export async function sendSwapWebhook(payload: SwapWebhookPayload): Promise<WebhookResponse> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Webhook] Attempt ${attempt}/${MAX_RETRIES}:`, {
        id: payload.id,
        wallet: `${payload.wallet_address.slice(0, 6)}...${payload.wallet_address.slice(-4)}`,
        tx: payload.tx_hash.slice(0, 10),
      });

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Check for 200 response
      if (response.ok) {
        console.log('[Webhook] Sent successfully');
        return {
          success: true,
          attempts: attempt,
        };
      }

      // Non-200 response
      const errorText = await response.text();
      throw new Error(`Webhook returned ${response.status}: ${errorText}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`[Webhook] Attempt ${attempt} failed:`, lastError.message);

      // Don't wait after last attempt
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, attempt - 1);
        console.log(`[Webhook] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  return {
    success: false,
    error: lastError?.message || 'Failed to send webhook after all retries',
    attempts: MAX_RETRIES,
  };
}

// USDC addresses per chain
const USDC_ADDRESSES: Record<number, string> = {
  1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum USDC
  43114: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // Avalanche USDC
};

/**
 * Calculate USD price for the output token
 * Uses USDC as reference (6 decimals)
 */
export function calculatePriceOutUsd(
  fromToken: { address: string; decimals: number },
  toToken: { address: string; decimals: number },
  fromAmount: string, // Base units
  toAmount: string, // Base units
  chainId: number = 43114 // Default to Avalanche for backwards compatibility
): number | null {
  const USDC_ADDRESS = USDC_ADDRESSES[chainId] || USDC_ADDRESSES[43114];

  // Convert to human-readable amounts
  const fromAmountHuman = parseFloat(fromAmount) / Math.pow(10, fromToken.decimals);
  const toAmountHuman = parseFloat(toAmount) / Math.pow(10, toToken.decimals);

  // Avoid division by zero
  if (toAmountHuman === 0) {
    console.warn('[Webhook] Cannot calculate price: toAmount is zero');
    return null;
  }

  // If swapping FROM USDC to another token
  if (fromToken.address.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
    // price_out_usd = amount_in_usd / amount_out
    const price = fromAmountHuman / toAmountHuman;
    console.log('[Webhook] Price calculated from USDC input:', price);
    return price;
  }

  // If swapping TO USDC from another token
  if (toToken.address.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
    // price_out_usd = 1 (USDC is always $1)
    console.log('[Webhook] Price is 1.0 (output is USDC)');
    return 1.0;
  }

  // If neither is USDC, we cannot determine USD price
  console.warn('[Webhook] Cannot calculate USD price: neither token is USDC');
  return null;
}
