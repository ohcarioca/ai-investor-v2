'use client';

import { useState } from 'react';
import { Paperclip, Send } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  sidebarWidth?: number;
  isLargeScreen?: boolean;
}

export default function ChatInput({ onSendMessage, isLoading, sidebarWidth = 384, isLargeScreen = false }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <div
      className="fixed bottom-0 left-0 bg-white border-t border-gray-200 p-3 sm:p-4 md:p-6 safe-area-inset-bottom"
      style={{ right: isLargeScreen ? sidebarWidth : 0 }}
    >
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center gap-2 sm:gap-3 bg-gray-50 rounded-full border border-gray-200 px-4 sm:px-6 py-2 sm:py-3 focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
            <button
              type="button"
              className="flex-shrink-0 p-1 hover:bg-gray-200 rounded-lg transition-colors hidden sm:block"
              disabled={isLoading}
              aria-label="Attach file"
            >
              <Paperclip className="w-5 h-5 text-gray-500" />
            </button>

            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message Kira..."
              disabled={isLoading}
              className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 disabled:opacity-50 text-sm sm:text-base"
            />

            <button
              type="submit"
              disabled={!message.trim() || isLoading}
              className="flex-shrink-0 p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-full transition-colors"
              aria-label="Send message"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
          </div>
        </form>

        <p className="text-xs text-center text-gray-500 mt-2 sm:mt-3 hidden sm:block">
          Kira can help you invest, transfer funds, and manage your portfolio
        </p>
      </div>
    </div>
  );
}
