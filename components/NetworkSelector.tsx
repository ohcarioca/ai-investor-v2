'use client';

import { useSelectedNetwork, CHAIN_IDS, NETWORKS, type SupportedChainId } from '@/contexts/NetworkContext';

interface NetworkSelectorProps {
  disabled?: boolean;
  compact?: boolean;
}

export default function NetworkSelector({ disabled = false, compact = false }: NetworkSelectorProps) {
  const { selectedChainId, setSelectedChainId } = useSelectedNetwork();

  const networks: SupportedChainId[] = [CHAIN_IDS.ETHEREUM, CHAIN_IDS.AVALANCHE];

  if (compact) {
    return (
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        {networks.map((chainId) => {
          const network = NETWORKS[chainId];
          const isSelected = selectedChainId === chainId;
          return (
            <button
              key={chainId}
              onClick={() => setSelectedChainId(chainId)}
              disabled={disabled}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                isSelected
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {network.shortName}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {networks.map((chainId) => {
        const network = NETWORKS[chainId];
        const isSelected = selectedChainId === chainId;
        return (
          <button
            key={chainId}
            onClick={() => setSelectedChainId(chainId)}
            disabled={disabled}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isSelected
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <NetworkIcon chainId={chainId} />
            {network.name}
          </button>
        );
      })}
    </div>
  );
}

function NetworkIcon({ chainId }: { chainId: SupportedChainId }) {
  if (chainId === CHAIN_IDS.ETHEREUM) {
    return (
      <svg className="w-5 h-5" viewBox="0 0 32 32" fill="currentColor">
        <path d="M16 0l-0.3 1v21.2l0.3 0.3 9.7-5.7z" opacity="0.6"/>
        <path d="M16 0L6.3 16.8l9.7 5.7V0z"/>
        <path d="M16 24.4l-0.2 0.2v7.4l0.2 0.5 9.7-13.7z" opacity="0.6"/>
        <path d="M16 32.5v-8.1l-9.7-5.6z"/>
        <path d="M16 22.5l9.7-5.7-9.7-4.4z" opacity="0.2"/>
        <path d="M6.3 16.8l9.7 5.7v-10.1z" opacity="0.6"/>
      </svg>
    );
  }

  // Avalanche icon
  return (
    <svg className="w-5 h-5" viewBox="0 0 32 32" fill="currentColor">
      <path d="M20.7 21.2h4.5c0.5 0 0.8-0.1 1-0.4 0.2-0.3 0.2-0.6 0-1l-9.5-16.5c-0.2-0.4-0.5-0.6-0.9-0.6s-0.7 0.2-0.9 0.6l-2.8 4.9 5.5 9.5c0.6 1.1 1.4 2.1 2.4 2.9 0.2 0.2 0.4 0.4 0.7 0.6z"/>
      <path d="M5.8 21.2h6.6c-0.5-0.5-0.9-1-1.3-1.6l-3.9-6.8-3.4 5.9c-0.2 0.4-0.2 0.7 0 1 0.2 0.3 0.5 0.5 1 0.5z"/>
    </svg>
  );
}
