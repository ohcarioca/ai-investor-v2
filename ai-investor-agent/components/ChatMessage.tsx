import { Message } from '@/types/chat';
import { User, Bot } from 'lucide-react';
import SwapApprovalCard from './SwapApprovalCard';
import ChartCard from './charts/ChartCard';

interface ChatMessageProps {
  message: Message;
  onSwapSuccess?: (txHash: string, toAmount: string, fromToken: string, toToken: string) => void;
}

export default function ChatMessage({ message, onSwapSuccess }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Handler para swap success
  const handleSwapSuccess = (txHash: string, toAmount: string) => {
    if (message.swapData && onSwapSuccess) {
      onSwapSuccess(
        txHash,
        toAmount,
        message.swapData.fromToken,
        message.swapData.toToken
      );
    }
  };

  return (
    <div className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      {!isUser && (
        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}

      <div className={`max-w-2xl ${isUser ? 'order-first' : ''}`}>
        <div
          className={`rounded-2xl px-6 py-4 ${
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

        {/* Render SwapApprovalCard if swapData is present */}
        {!isUser && message.swapData && (
          <SwapApprovalCard
            swapData={message.swapData}
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
        <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-gray-600" />
        </div>
      )}
    </div>
  );
}
