'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';

// Supported chain IDs
export const CHAIN_IDS = {
  ETHEREUM: 1,
  AVALANCHE: 43114,
  SOLANA: 101,
} as const;

export type SupportedChainId = (typeof CHAIN_IDS)[keyof typeof CHAIN_IDS];

// Network metadata
export const NETWORKS: Record<SupportedChainId, { name: string; shortName: string; icon: string }> =
  {
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
    [CHAIN_IDS.SOLANA]: {
      name: 'Solana',
      shortName: 'SOL',
      icon: '/icons/solana.svg',
    },
  };

interface NetworkContextType {
  selectedChainId: SupportedChainId;
  setSelectedChainId: (chainId: SupportedChainId) => void;
  networkName: string;
  networkShortName: string;
  isEthereum: boolean;
  isAvalanche: boolean;
  isSolana: boolean;
}

const NetworkContext = createContext<NetworkContextType | null>(null);

const STORAGE_KEY = 'preferred_network';

function getStoredChainId(): SupportedChainId {
  if (typeof window === 'undefined') return CHAIN_IDS.ETHEREUM;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = parseInt(stored);
    if (
      parsed === CHAIN_IDS.ETHEREUM ||
      parsed === CHAIN_IDS.AVALANCHE ||
      parsed === CHAIN_IDS.SOLANA
    ) {
      return parsed as SupportedChainId;
    }
  }
  return CHAIN_IDS.ETHEREUM;
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  // Start with default value for SSR
  const [selectedChainId, setSelectedChainIdState] = useState<SupportedChainId>(CHAIN_IDS.ETHEREUM);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage after mount
  useEffect(() => {
    const storedChainId = getStoredChainId();
    console.log('[NetworkContext] Loading from localStorage:', storedChainId);
    setSelectedChainIdState(storedChainId);
    setIsHydrated(true);
  }, []);

  // Save to localStorage when changed
  const setSelectedChainId = useCallback((chainId: SupportedChainId) => {
    console.log('[NetworkContext] setSelectedChainId called with:', chainId);
    setSelectedChainIdState(chainId);
    localStorage.setItem(STORAGE_KEY, chainId.toString());
    console.log('[NetworkContext] State updated and saved to localStorage');
  }, []);

  const network = NETWORKS[selectedChainId];

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<NetworkContextType>(() => {
    console.log('[NetworkContext] Creating context value with chainId:', selectedChainId);
    return {
      selectedChainId,
      setSelectedChainId,
      networkName: network.name,
      networkShortName: network.shortName,
      isEthereum: selectedChainId === CHAIN_IDS.ETHEREUM,
      isAvalanche: selectedChainId === CHAIN_IDS.AVALANCHE,
      isSolana: selectedChainId === CHAIN_IDS.SOLANA,
    };
  }, [selectedChainId, setSelectedChainId, network]);

  // Prevent hydration mismatch - render with default until hydrated
  if (!isHydrated) {
    return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
  }

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useSelectedNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useSelectedNetwork must be used within a NetworkProvider');
  }
  return context;
}
