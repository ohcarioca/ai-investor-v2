import { OKXDexClient } from '@okx-dex/okx-dex-sdk';
import crypto from 'crypto';

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

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Direct REST API call to OKX DEX (same as OKX Web uses)
// This bypasses the SDK which uses a different swap method
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
  
  // Build query string
  const queryParams = new URLSearchParams({
    chainId: params.chainId,
    fromTokenAddress: params.fromTokenAddress,
    toTokenAddress: params.toTokenAddress,
    amount: params.amount,
    slippage: params.slippage,
    userWalletAddress: params.userWalletAddress,
  });
  
  const requestPath = `/api/v5/dex/aggregator/swap?${queryParams.toString()}`;
  
  // Create signature
  const preHash = timestamp + method + requestPath;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(preHash)
    .digest('base64');

  const response = await fetch(`https://www.okx.com${requestPath}`, {
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
  console.log('[OKX Direct API] Response:', JSON.stringify(data, null, 2));
  
  // Handle rate limiting with retry
  if (data.code === '50011' && retryCount < 3) {
    console.log(`[OKX Direct API] Rate limited, retrying in ${(retryCount + 1) * 1000}ms...`);
    await delay((retryCount + 1) * 1000);
    return getSwapDataDirect(params, retryCount + 1);
  }
  
  return data;
}

// Chain ID mapping for OKX DEX
export const CHAIN_INDEX_MAP: Record<number, string> = {
  43114: '43114', // Avalanche C-Chain
  1: '1', // Ethereum
  8453: '8453', // Base
};

// Native token placeholder address (OKX convention)
export const NATIVE_TOKEN_ADDRESS =
  '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
