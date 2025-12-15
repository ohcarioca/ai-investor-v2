'use client';

import { Loader2 } from 'lucide-react';
import { useAccount, useBalance } from 'wagmi';
import type { Token, ApprovalStatus, SwapQuote, SwapState } from '@/types/swap';

interface SwapButtonProps {
  fromToken: Token | null;
  toToken: Token | null;
  fromAmount: string;
  quote: SwapQuote | null;
  approvalStatus: ApprovalStatus | null;
  isQuoteLoading: boolean;
  isCheckingApproval: boolean;
  isApproving: boolean;
  isSwapping: boolean;
  swapState: SwapState;
  onApprove: () => void;
  onSwap: () => void;
}

export default function SwapButton({
  fromToken,
  toToken,
  fromAmount,
  quote,
  approvalStatus,
  isQuoteLoading,
  isCheckingApproval,
  isApproving,
  isSwapping,
  swapState,
  onApprove,
  onSwap,
}: SwapButtonProps) {
  const { isConnected, chain, address } = useAccount();

  // Get balance for validation
  const { data: balance } = useBalance({
    address,
    token: fromToken?.isNative
      ? undefined
      : (fromToken?.address as `0x${string}`),
    query: {
      enabled: !!address && !!fromToken,
    },
  });

  // Determine button state and text
  const getButtonState = () => {
    // Not connected
    if (!isConnected) {
      return {
        text: 'Connect Wallet',
        disabled: false,
        onClick: () => {},
      };
    }

    // Wrong network - check for supported chains (Ethereum and Avalanche)
    const supportedChainIds = [1, 43114];
    if (chain?.id && !supportedChainIds.includes(chain.id)) {
      return {
        text: 'Switch to Supported Network',
        disabled: true,
        onClick: () => {},
      };
    }

    // No tokens selected
    if (!fromToken || !toToken) {
      return {
        text: 'Select Tokens',
        disabled: true,
        onClick: () => {},
      };
    }

    // No amount entered
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      return {
        text: 'Enter Amount',
        disabled: true,
        onClick: () => {},
      };
    }

    // Insufficient balance
    if (balance && parseFloat(fromAmount) > parseFloat(balance.formatted)) {
      return {
        text: `Insufficient ${fromToken.symbol} Balance`,
        disabled: true,
        onClick: () => {},
      };
    }

    // Loading quote
    if (isQuoteLoading || isCheckingApproval) {
      return {
        text: 'Loading...',
        disabled: true,
        onClick: () => {},
        loading: true,
      };
    }

    // No quote
    if (!quote) {
      return {
        text: 'No Quote Available',
        disabled: true,
        onClick: () => {},
      };
    }

    // Approving
    if (isApproving) {
      return {
        text: 'Approving...',
        disabled: true,
        onClick: () => {},
        loading: true,
      };
    }

    // Needs approval
    if (
      !fromToken.isNative &&
      approvalStatus &&
      !approvalStatus.isApproved
    ) {
      return {
        text: `Approve ${fromToken.symbol}`,
        disabled: false,
        onClick: onApprove,
      };
    }

    // Swapping
    if (isSwapping || swapState.step === 'swapping') {
      return {
        text: 'Swapping...',
        disabled: true,
        onClick: () => {},
        loading: true,
      };
    }

    // Success
    if (swapState.step === 'success') {
      return {
        text: 'Swap Completed!',
        disabled: true,
        onClick: () => {},
      };
    }

    // Error
    if (swapState.step === 'error') {
      return {
        text: 'Try Again',
        disabled: false,
        onClick: onSwap,
      };
    }

    // Ready to swap
    return {
      text: 'Swap Tokens',
      disabled: false,
      onClick: onSwap,
    };
  };

  const buttonState = getButtonState();

  return (
    <button
      onClick={buttonState.onClick}
      disabled={buttonState.disabled}
      className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-semibold py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {buttonState.loading && <Loader2 className="w-5 h-5 animate-spin" />}
      {buttonState.text}
    </button>
  );
}
