'use client';

import { useEffect } from 'react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useAccount, useSwitchChain } from 'wagmi';
import { Wallet } from 'lucide-react';
import NetworkSelector from './NetworkSelector';
import { useSelectedNetwork } from '@/contexts/NetworkContext';

/**
 * Unified Wallet Button Component
 * Uses Reown AppKit for all networks (EVM + Solana)
 * Single modal for all wallet connections
 */
export default function UnifiedWalletButton() {
  const { open } = useAppKit();
  const { address, isConnected, caipAddress: _caipAddress } = useAppKitAccount();
  const { isConnected: isEvmConnected, chain: currentChain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { selectedChainId, isSolana } = useSelectedNetwork();

  // Auto-switch EVM chain when user selects a different network
  useEffect(() => {
    if (isEvmConnected && !isSolana && currentChain && switchChain) {
      const targetChainId = selectedChainId as 1 | 43114;
      if (currentChain.id !== targetChainId) {
        console.log('[UnifiedWalletButton] Auto-switching chain from', currentChain.id, 'to', targetChainId);
        switchChain({ chainId: targetChainId });
      }
    }
  }, [selectedChainId, isEvmConnected, isSolana, currentChain, switchChain]);

  // Save connection state
  useEffect(() => {
    if (isConnected) {
      localStorage.setItem('wallet_connected', 'true');
    }
  }, [isConnected]);

  // Handle connect button click
  const handleConnect = () => {
    open();
  };

  // If connected, show only network selector (settings icon opens modal)
  if (isConnected && address) {
    return <NetworkSelector compact />;
  }

  // Not connected - show connect button
  return (
    <div className="flex items-center gap-2">
      <NetworkSelector compact />
      <button
        type="button"
        onClick={handleConnect}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
      >
        <Wallet className="w-4 h-4" />
        Connect
      </button>
    </div>
  );
}

/**
 * Hook to open wallet modal
 * Can be used by other components (like Settings button)
 */
export function useWalletModal() {
  const { open } = useAppKit();
  const { isConnected } = useAppKitAccount();

  const openWalletModal = () => {
    if (isConnected) {
      open({ view: 'Account' });
    } else {
      open();
    }
  };

  return { openWalletModal, isConnected };
}
