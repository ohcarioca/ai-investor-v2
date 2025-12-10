import { OKXDexClient } from '@okx-dex/okx-dex-sdk';

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

// Chain ID mapping for OKX DEX
export const CHAIN_INDEX_MAP: Record<number, string> = {
  43114: '43114', // Avalanche C-Chain
  1: '1', // Ethereum
  8453: '8453', // Base
};

// Native token placeholder address (OKX convention)
export const NATIVE_TOKEN_ADDRESS =
  '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
