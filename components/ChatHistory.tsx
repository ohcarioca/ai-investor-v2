'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/types/chat';
import ChatMessage from './ChatMessage';
import { Loader2 } from 'lucide-react';

interface ChatHistoryProps {
  messages: Message[];
  isLoading: boolean;
  onSwapSuccess?: (txHash: string, toAmount: string, fromToken: string, toToken: string) => void;
}

export default function ChatHistory({ messages, isLoading, onSwapSuccess }: ChatHistoryProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-8 pb-6">
      <div className="max-w-4xl mx-auto">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} onSwapSuccess={onSwapSuccess} />
        ))}

        {isLoading && (
          <div className="flex gap-4 justify-start mb-6">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
            <div className="max-w-2xl">
              <div className="rounded-2xl px-6 py-4 bg-white border border-gray-200">
                <div className="flex gap-2">
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
