'use client';

import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { mainnet, avalanche, solana, type AppKitNetwork } from '@reown/appkit/networks';

// Get project ID from environment
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// Metadata for the app
const metadata = {
  name: 'Kira AI Investor',
  description: 'AI-powered financial assistant for crypto investments',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://kira.ai',
  icons: ['https://kira.ai/icon.png'],
};

// Networks to support
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, avalanche, solana];

// Create Wagmi adapter for EVM chains
const wagmiAdapter = new WagmiAdapter({
  networks: [mainnet, avalanche],
  projectId,
  ssr: true,
});

// Create Solana adapter (uses default wallets: Phantom, Solflare, etc.)
const solanaAdapter = new SolanaAdapter({});

// Create the AppKit instance
export const appKit = createAppKit({
  adapters: [wagmiAdapter, solanaAdapter],
  networks,
  projectId,
  metadata,
  features: {
    analytics: false,
  },
  themeMode: 'light',
});

// Export wagmi config for use with WagmiProvider
export const wagmiConfig = wagmiAdapter.wagmiConfig;
