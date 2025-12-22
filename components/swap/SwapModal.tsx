'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Settings,
  ArrowDown,
  RefreshCw,
  TrendingDown,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import TokenInput from './TokenInput';
import SwapButton from './SwapButton';
import WebhookLoadingModal from '@/components/WebhookLoadingModal';
import { useTokenList } from '@/hooks/useTokenList';
import { useSwapQuote } from '@/hooks/useSwapQuote';
import { useTokenApproval } from '@/hooks/useTokenApproval';
import { useSwapExecution } from '@/hooks/useSwapExecution';
import type { Token } from '@/types/swap';

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFromToken?: Token;
}

export default function SwapModal({ isOpen, onClose, defaultFromToken }: SwapModalProps) {
  const { isConnected, chain } = useAccount();
  const { tokens } = useTokenList();

  // State
  const [fromToken, setFromToken] = useState<Token | null>(defaultFromToken || tokens[1]); // Default USDC
  const [toToken, setToToken] = useState<Token | null>(tokens[0]); // Default AVAX
  const [fromAmount, setFromAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);

  // Hooks
  const {
    quote,
    isLoading: isQuoteLoading,
    refetch: refetchQuote,
  } = useSwapQuote({
    fromToken,
    toToken,
    amount: fromAmount,
    slippage,
    enabled: isOpen && !!fromToken && !!toToken && fromAmount !== '',
  });

  const {
    approvalStatus,
    isChecking: isCheckingApproval,
    isApproving,
    approve,
    checkApproval,
  } = useTokenApproval();

  const {
    swapState,
    isSwapping,
    executeSwap,
    resetSwap,
    webhookState,
    retryWebhook,
    continueWithoutWebhook,
  } = useSwapExecution();

  // Handle token swap (flip from/to)
  const handleFlipTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount('');
  };

  // Handle modal close
  const handleClose = () => {
    if (!isSwapping && !isApproving && !webhookState.isLoading) {
      resetSwap();
      setFromAmount('');
      onClose();
    }
  };

  // Check approval when quote is ready
  useEffect(() => {
    if (quote && fromToken && !fromToken.isNative && fromAmount) {
      checkApproval(fromToken, fromAmount);
    }
  }, [quote, fromToken, fromAmount, checkApproval]);

  // Wrong network check - support Ethereum and Avalanche
  const supportedChainIds = [1, 43114];
  if (isConnected && chain?.id && !supportedChainIds.includes(chain.id)) {
    return (
      <div className={`fixed inset-0 z-50 ${isOpen ? 'block' : 'hidden'}`}>
        <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md mx-4">
          <div className="bg-white rounded-2xl p-6">
            <p className="text-center text-gray-900">
              Please switch to Ethereum or Avalanche network to use the swap feature.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Swap Tokens</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={handleClose}
                disabled={isSwapping || isApproving}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="mb-2">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Slippage Tolerance
                </label>
                <div className="flex gap-2">
                  {[0.1, 0.5, 1.0].map((value) => (
                    <button
                      key={value}
                      onClick={() => setSlippage(value)}
                      className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
                        slippage === value
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {value}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="p-4 space-y-2">
            {/* From Token Input */}
            <TokenInput
              label="From"
              token={fromToken}
              amount={fromAmount}
              onAmountChange={setFromAmount}
              onTokenSelect={setFromToken}
              tokens={tokens.filter((t) => t.address !== toToken?.address)}
              disabled={isSwapping || isApproving}
            />

            {/* Flip Button */}
            <div className="flex justify-center -my-2 relative z-10">
              <button
                onClick={handleFlipTokens}
                disabled={isSwapping || isApproving}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                aria-label="Flip tokens"
              >
                <ArrowDown className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* To Token Input */}
            <TokenInput
              label="To (estimated)"
              token={toToken}
              amount={
                quote && quote.toAmount
                  ? (() => {
                      // Use decimals from the quote response (more accurate)
                      const decimals = quote.toToken?.decimals || toToken?.decimals || 18;
                      const amountFloat = parseFloat(quote.toAmount) / Math.pow(10, decimals);
                      return amountFloat.toFixed(6);
                    })()
                  : ''
              }
              onAmountChange={() => {}}
              onTokenSelect={setToToken}
              tokens={tokens.filter((t) => t.address !== fromToken?.address)}
              disabled={isSwapping || isApproving}
              readOnly
            />

            {/* Quote Display */}
            {quote && !isQuoteLoading && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Exchange Rate</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      1 {fromToken?.symbol} ≈ {parseFloat(quote.exchangeRate).toFixed(6)}{' '}
                      {toToken?.symbol}
                    </span>
                    <button
                      onClick={refetchQuote}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      aria-label="Refresh quote"
                    >
                      <RefreshCw className="w-4 h-4 text-purple-600" />
                    </button>
                  </div>
                </div>
                {parseFloat(quote.priceImpact) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Price Impact</span>
                    <span
                      className={`text-sm font-medium ${
                        parseFloat(quote.priceImpact) > 5 ? 'text-red-600' : 'text-gray-900'
                      }`}
                    >
                      <TrendingDown className="w-4 h-4 inline mr-1" />
                      {parseFloat(quote.priceImpact).toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Transaction Status */}
            {swapState.step === 'success' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900">Swap Completed!</span>
                </div>
                {swapState.txHash && (
                  <a
                    href={
                      chain?.id === 1
                        ? `https://etherscan.io/tx/${swapState.txHash}`
                        : `https://snowtrace.io/tx/${swapState.txHash}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                  >
                    View on {chain?.id === 1 ? 'Etherscan' : 'Snowtrace'}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}

            {swapState.step === 'error' && swapState.error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-900">Swap Error</span>
                </div>
                <p className="text-sm text-red-700">{swapState.error}</p>
              </div>
            )}
          </div>

          {/* Footer - Swap Button */}
          <div className="p-4 border-t border-gray-200">
            <SwapButton
              fromToken={fromToken}
              toToken={toToken}
              fromAmount={fromAmount}
              quote={quote}
              approvalStatus={approvalStatus}
              isQuoteLoading={isQuoteLoading}
              isCheckingApproval={isCheckingApproval}
              isApproving={isApproving}
              isSwapping={isSwapping}
              swapState={swapState}
              onApprove={() => fromToken && approve(fromToken, fromAmount)}
              onSwap={() =>
                fromToken && toToken && executeSwap(fromToken, toToken, fromAmount, slippage)
              }
            />
          </div>
        </div>
      </div>

      {/* Webhook Loading Modal */}
      <WebhookLoadingModal
        isOpen={webhookState.isLoading || webhookState.isError}
        isError={webhookState.isError}
        errorMessage={webhookState.errorMessage || undefined}
        onRetry={retryWebhook}
        onContinue={continueWithoutWebhook}
      />
    </div>
  );

  return createPortal(modalContent, document.body);
}
