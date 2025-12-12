'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useBalance, useAccount } from 'wagmi';
import TokenSelector from './TokenSelector';
import type { Token } from '@/types/swap';

interface TokenInputProps {
  label: string;
  token: Token | null;
  amount: string;
  onAmountChange: (amount: string) => void;
  onTokenSelect: (token: Token) => void;
  tokens: Token[];
  disabled?: boolean;
  readOnly?: boolean;
}

export default function TokenInput({
  label,
  token,
  amount,
  onAmountChange,
  onTokenSelect,
  tokens,
  disabled = false,
  readOnly = false,
}: TokenInputProps) {
  const { address } = useAccount();
  const [showSelector, setShowSelector] = useState(false);

  // Fetch token balance
  const { data: balance } = useBalance({
    address,
    token: token?.isNative ? undefined : (token?.address as `0x${string}`),
    query: {
      enabled: !!address && !!token,
    },
  });

  const formattedBalance = balance
    ? parseFloat(balance.formatted).toFixed(6)
    : '0.00';

  const handleMaxClick = () => {
    if (balance && !readOnly) {
      onAmountChange(balance.formatted);
    }
  };

  return (
    <div className="bg-gray-50 rounded-xl p-4">
      {/* Label and Balance */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">{label}</span>
        {address && token && (
          <button
            onClick={handleMaxClick}
            disabled={disabled || readOnly}
            className="text-xs text-purple-600 hover:text-purple-700 disabled:opacity-50 transition-colors"
          >
            Balance: {formattedBalance} {token.symbol}
          </button>
        )}
      </div>

      {/* Input and Token Selector */}
      <div className="flex items-center gap-3">
        {/* Amount Input */}
        <input
          type="number"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="0.0"
          disabled={disabled}
          readOnly={readOnly}
          className="flex-1 bg-transparent text-2xl font-semibold text-gray-900 outline-none disabled:opacity-50 placeholder:text-gray-400"
          min="0"
          step="any"
        />

        {/* Token Selector Button */}
        <button
          onClick={() => setShowSelector(true)}
          disabled={disabled}
          className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
        >
          {token ? (
            <>
              <span className="font-semibold text-gray-900">
                {token.symbol}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </>
          ) : (
            <>
              <span className="text-gray-600">Select</span>
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </>
          )}
        </button>
      </div>

      {/* Token Selector Modal */}
      {showSelector && (
        <TokenSelector
          tokens={tokens}
          onSelect={(selectedToken) => {
            onTokenSelect(selectedToken);
            setShowSelector(false);
          }}
          onClose={() => setShowSelector(false)}
        />
      )}
    </div>
  );
}
