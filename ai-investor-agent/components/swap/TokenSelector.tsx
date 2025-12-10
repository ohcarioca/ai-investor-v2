'use client';

import { useState } from 'react';
import { X, Search } from 'lucide-react';
import { useAccount, useBalance } from 'wagmi';
import type { Token } from '@/types/swap';

interface TokenSelectorProps {
  tokens: Token[];
  onSelect: (token: Token) => void;
  onClose: () => void;
}

export default function TokenSelector({
  tokens,
  onSelect,
  onClose,
}: TokenSelectorProps) {
  const { address } = useAccount();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter tokens based on search query
  const filteredTokens = tokens.filter(
    (token) =>
      token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">
            Select Token
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search token..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            />
          </div>
        </div>

        {/* Token List */}
        <div className="overflow-y-auto flex-1">
          {filteredTokens.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No tokens found
            </div>
          ) : (
            <div className="p-2">
              {filteredTokens.map((token) => (
                <TokenListItem
                  key={token.address}
                  token={token}
                  address={address}
                  onSelect={() => onSelect(token)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Token list item component
function TokenListItem({
  token,
  address,
  onSelect,
}: {
  token: Token;
  address: `0x${string}` | undefined;
  onSelect: () => void;
}) {
  const { data: balance } = useBalance({
    address,
    token: token.isNative ? undefined : (token.address as `0x${string}`),
    query: {
      enabled: !!address,
    },
  });

  const formattedBalance = balance
    ? parseFloat(balance.formatted).toFixed(6)
    : '0.00';

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors"
    >
      <div className="flex items-center gap-3">
        {/* Token icon placeholder */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
          <span className="text-white font-bold text-sm">
            {token.symbol.charAt(0)}
          </span>
        </div>

        <div className="text-left">
          <div className="font-semibold text-gray-900">{token.symbol}</div>
          <div className="text-sm text-gray-500">{token.name}</div>
        </div>
      </div>

      {address && (
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">
            {formattedBalance}
          </div>
        </div>
      )}
    </button>
  );
}
