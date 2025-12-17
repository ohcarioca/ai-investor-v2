'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useSyncExternalStore } from 'react';

// Supported chain IDs
export const CHAIN_IDS = {
  ETHEREUM: 1,
  AVALANCHE: 43114,
} as const;

export type SupportedChainId = typeof CHAIN_IDS[keyof typeof CHAIN_IDS];

// Network metadata
export const NETWORKS: Record<SupportedChainId, { name: string; shortName: string; icon: string }> = {
  [CHAIN_IDS.ETHEREUM]: {
    name: 'Ethereum',
    shortName: 'ETH',
    icon: '/icons/ethereum.svg',
  },
  [CHAIN_IDS.AVALANCHE]: {
    name: 'Avalanche',
    shortName: 'AVAX',
    icon: '/icons/avalanche.svg',
  },
};

interface NetworkContextType {
  selectedChainId: SupportedChainId;
  setSelectedChainId: (chainId: SupportedChainId) => void;
  networkName: string;
  networkShortName: string;
  isEthereum: boolean;
  isAvalanche: boolean;
}

const NetworkContext = createContext<NetworkContextType | null>(null);

const STORAGE_KEY = 'preferred_network';

// Helper to detect hydration using useSyncExternalStore
const emptySubscribe = () => () => {};
const getServerSnapshot = () => false;
const getClientSnapshot = () => true;

export function NetworkProvider({ children }: { children: ReactNode }) {
  // Use useSyncExternalStore to detect hydration without causing cascading renders
  const isHydrated = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  // Initialize state from localStorage synchronously to avoid cascading renders
  const [selectedChainId, setSelectedChainIdState] = useState<SupportedChainId>(() => {
    if (typeof window === 'undefined') return CHAIN_IDS.ETHEREUM;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored);
      if (parsed === CHAIN_IDS.ETHEREUM || parsed === CHAIN_IDS.AVALANCHE) {
        return parsed;
      }
    }
    return CHAIN_IDS.ETHEREUM;
  });

  // Save to localStorage when changed
  const setSelectedChainId = useCallback((chainId: SupportedChainId) => {
    setSelectedChainIdState(chainId);
    localStorage.setItem(STORAGE_KEY, chainId.toString());
  }, []);

  const network = NETWORKS[selectedChainId];

  const value: NetworkContextType = {
    selectedChainId,
    setSelectedChainId,
    networkName: network.name,
    networkShortName: network.shortName,
    isEthereum: selectedChainId === CHAIN_IDS.ETHEREUM,
    isAvalanche: selectedChainId === CHAIN_IDS.AVALANCHE,
  };

  // Prevent hydration mismatch
  if (!isHydrated) {
    return null;
  }

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useSelectedNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useSelectedNetwork must be used within a NetworkProvider');
  }
  return context;
}
