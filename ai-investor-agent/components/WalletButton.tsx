'use client';

import { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Wallet } from 'lucide-react';

export default function WalletButton() {
  const { isConnected } = useAccount();
  const [shouldAutoOpen, setShouldAutoOpen] = useState(false);

  useEffect(() => {
    // Auto-open modal on first visit
    const hasConnected = localStorage.getItem('wallet_connected');
    if (!isConnected && !hasConnected) {
      setShouldAutoOpen(true);
    }
  }, [isConnected]);

  useEffect(() => {
    if (isConnected) {
      localStorage.setItem('wallet_connected', 'true');
    }
  }, [isConnected]);

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openConnectModal,
        openAccountModal,
        mounted,
      }) => {
        const connected = mounted && account && chain;

        // Auto-open modal
        useEffect(() => {
          if (shouldAutoOpen && !connected && mounted) {
            openConnectModal();
            setShouldAutoOpen(false);
          }
        }, [shouldAutoOpen, connected, mounted]);

        if (!mounted) {
          return null;
        }

        if (!connected) {
          return (
            <button
              onClick={openConnectModal}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </button>
          );
        }

        // Wrong network warning
        if (chain.id !== 43114) {
          return (
            <button
              onClick={openAccountModal}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg font-medium text-red-700 transition-colors"
            >
              Wrong Network
            </button>
          );
        }

        return (
          <button
            onClick={openAccountModal}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-colors"
          >
            {account.displayName ||
              `${account.address.slice(0, 6)}...${account.address.slice(-4)}`}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
