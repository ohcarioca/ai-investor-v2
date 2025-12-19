import { Message } from '@/types/chat';
import { User, Bot } from 'lucide-react';
import SwapApprovalCard from './SwapApprovalCard';
import SolanaInvestCard from './SolanaInvestCard';
import ChartCard from './charts/ChartCard';
import type { SolanaSwapData, EVMSwapData } from '@/types/swap';

interface ChatMessageProps {
  message: Message;
  onSwapSuccess?: (txHash: string, toAmount: string, fromToken: string, toToken: string) => void;
}

export default function ChatMessage({ message, onSwapSuccess }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Check if swapData is Solana type
  const isSolanaData = message.swapData && 'isSolana' in message.swapData && message.swapData.isSolana === true;

  // Handler para swap success (EVM only)
  const handleSwapSuccess = (txHash: string, toAmount: string) => {
    if (message.swapData && !isSolanaData && onSwapSuccess) {
      const evmData = message.swapData as EVMSwapData;
      onSwapSuccess(
        txHash,
        toAmount,
        evmData.fromToken,
        evmData.toToken
      );
    }
  };

  return (
    <div className={`flex gap-2 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'} mb-4 sm:mb-6`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full flex items-center justify-center">
          <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
      )}

      <div className={`max-w-full sm:max-w-2xl ${isUser ? 'order-first' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 sm:px-6 sm:py-4 ${
            isUser
              ? 'bg-purple-600 text-white'
              : 'bg-white border border-gray-200 text-gray-900'
          }`}
        >
          <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>

          {/* Render Snowtrace link if txHash is present */}
          {!isUser && message.txHash && (
            <a
              href={`https://snowtrace.io/tx/${message.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Ver no Snowtrace
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>

        {/* Render SolanaInvestCard for Solana transactions */}
        {!isUser && message.swapData && isSolanaData && (
          <SolanaInvestCard
            solanaData={message.swapData as SolanaSwapData}
          />
        )}

        {/* Render SwapApprovalCard for EVM swaps */}
        {!isUser && message.swapData && !isSolanaData && (
          <SwapApprovalCard
            swapData={message.swapData as EVMSwapData}
            onSwapSuccess={handleSwapSuccess}
          />
        )}

        {/* Render ChartCard if chartData is present */}
        {!isUser && message.chartData && (
          <div className="mt-4">
            <ChartCard config={message.chartData} />
          </div>
        )}

        <div className={`text-xs text-gray-400 mt-2 ${isUser ? 'text-right' : 'text-left'}`}>
          {message.timestamp.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
        </div>
      )}
    </div>
  );
}
