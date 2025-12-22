'use client';

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { wagmiConfig } from '@/lib/appkit';

// Import appkit to initialize it
import '@/lib/appkit';

const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <NetworkProvider>{children}</NetworkProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
