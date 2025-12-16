import { OKXDexClient } from '@okx-dex/okx-dex-sdk';
import crypto from 'crypto';
import { sleep } from '@/lib/utils/retry';

// Re-export blockchain constants for backwards compatibility
export { CHAIN_INDEX_MAP, NATIVE_TOKEN_ADDRESS } from '@/lib/constants/blockchain';

// Singleton pattern for OKX client
let okxClient: OKXDexClient | null = null;

export function getOKXClient(): OKXDexClient {
  if (!okxClient) {
    // Validate environment variables
    if (
      !process.env.OKX_API_KEY ||
      !process.env.OKX_SECRET_KEY ||
      !process.env.OKX_API_PASSPHRASE ||
      !process.env.OKX_PROJECT_ID
    ) {
      throw new Error('Missing OKX API credentials in environment variables');
    }

    okxClient = new OKXDexClient({
      apiKey: process.env.OKX_API_KEY,
      secretKey: process.env.OKX_SECRET_KEY,
      apiPassphrase: process.env.OKX_API_PASSPHRASE,
      projectId: process.env.OKX_PROJECT_ID,
    });
  }
  return okxClient;
}

// Using centralized sleep function from retry utils

// Direct REST API call to OKX DEX v6 (same as OKX Web uses)
// Updated from v5 to v6 API which uses different swap methods
export async function getSwapDataDirect(params: {
  chainId: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  slippage: string;
  userWalletAddress: string;
}, retryCount = 0): Promise<Record<string, unknown>> {
  const apiKey = process.env.OKX_API_KEY!;
  const secretKey = process.env.OKX_SECRET_KEY!;
  const passphrase = process.env.OKX_API_PASSPHRASE!;
  const projectId = process.env.OKX_PROJECT_ID!;

  const timestamp = new Date().toISOString();
  const method = 'GET';

  // Build query string - v6 API uses chainIndex instead of chainId
  // and slippagePercent instead of slippage (as percentage, e.g., "0.5" for 0.5%)
  const slippagePercent = (parseFloat(params.slippage) * 100).toString();

  const queryParams = new URLSearchParams({
    chainIndex: params.chainId,
    fromTokenAddress: params.fromTokenAddress,
    toTokenAddress: params.toTokenAddress,
    amount: params.amount,
    slippagePercent: slippagePercent,
    userWalletAddress: params.userWalletAddress,
    // Required parameter for swap mode
    swapMode: 'exactIn',
    // Disable price impact protection for low liquidity tokens (100 = allow 100% impact)
    priceImpactProtectionPercent: '100',
  });

  // v6 API endpoint
  const requestPath = `/api/v6/dex/aggregator/swap?${queryParams.toString()}`;

  // Create signature
  const preHash = timestamp + method + requestPath;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(preHash)
    .digest('base64');

  console.log('[OKX v6 API] Calling:', `https://web3.okx.com${requestPath}`);

  const response = await fetch(`https://web3.okx.com${requestPath}`, {
    method: 'GET',
    headers: {
      'OK-ACCESS-KEY': apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': passphrase,
      'OK-ACCESS-PROJECT': projectId,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json() as Record<string, unknown>;
  console.log('[OKX v6 API] Response:', JSON.stringify(data, null, 2));

  // Handle rate limiting with retry
  if (data.code === '50011' && retryCount < 3) {
    console.log(`[OKX v6 API] Rate limited, retrying in ${(retryCount + 1) * 1000}ms...`);
    await sleep((retryCount + 1) * 1000);
    return getSwapDataDirect(params, retryCount + 1);
  }

  return data;
}

// Direct REST API call to OKX DEX v6 for quotes
export async function getQuoteDataDirect(params: {
  chainId: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  slippage: string;
}, retryCount = 0): Promise<Record<string, unknown>> {
  const apiKey = process.env.OKX_API_KEY!;
  const secretKey = process.env.OKX_SECRET_KEY!;
  const passphrase = process.env.OKX_API_PASSPHRASE!;
  const projectId = process.env.OKX_PROJECT_ID!;

  const timestamp = new Date().toISOString();
  const method = 'GET';

  // Convert slippage to percentage
  const slippagePercent = (parseFloat(params.slippage) * 100).toString();

  const queryParams = new URLSearchParams({
    chainIndex: params.chainId,
    fromTokenAddress: params.fromTokenAddress,
    toTokenAddress: params.toTokenAddress,
    amount: params.amount,
    slippagePercent: slippagePercent,
    // Use exact input mode for quotes
    swapMode: 'exactIn',
  });

  // v6 API quote endpoint
  const requestPath = `/api/v6/dex/aggregator/quote?${queryParams.toString()}`;

  // Create signature
  const preHash = timestamp + method + requestPath;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(preHash)
    .digest('base64');

  const response = await fetch(`https://web3.okx.com${requestPath}`, {
    method: 'GET',
    headers: {
      'OK-ACCESS-KEY': apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': passphrase,
      'OK-ACCESS-PROJECT': projectId,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json() as Record<string, unknown>;

  // Handle rate limiting with retry
  if (data.code === '50011' && retryCount < 3) {
    await sleep((retryCount + 1) * 1000);
    return getQuoteDataDirect(params, retryCount + 1);
  }

  return data;
}
