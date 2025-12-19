'use client';

import { useEffect } from 'react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useAccount, useSwitchChain } from 'wagmi';
import { Wallet } from 'lucide-react';
import NetworkSelector from './NetworkSelector';
import { useSelectedNetwork, CHAIN_IDS } from '@/contexts/NetworkContext';

/**
 * Unified Wallet Button Component
 * Uses Reown AppKit for all networks (EVM + Solana)
 * Single modal for all wallet connections
 */
export default function UnifiedWalletButton() {
  const { open } = useAppKit();
  const { address, isConnected, caipAddress } = useAppKitAccount();
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

  // Format display address
  const displayAddress = address
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : '';

  // Check if connected to Solana (caipAddress starts with 'solana:')
  const isSolanaConnected = caipAddress?.startsWith('solana:');

  // Handle connect button click
  const handleConnect = () => {
    open();
  };

  // Handle account button click (shows account modal)
  const handleAccountClick = () => {
    open({ view: 'Account' });
  };

  // If connected, show address button
  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <NetworkSelector compact />
        <button
          type="button"
          onClick={handleAccountClick}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-colors"
        >
          {displayAddress}
        </button>
      </div>
    );
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
