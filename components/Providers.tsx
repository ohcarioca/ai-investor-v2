'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config } from '@/lib/wagmi';
import { ReactNode } from 'react';
import { NetworkProvider } from '@/contexts/NetworkContext';

const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <NetworkProvider>
          <RainbowKitProvider modalSize="compact" locale="en">
            {children}
          </RainbowKitProvider>
        </NetworkProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
