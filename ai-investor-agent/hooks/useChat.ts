'use client';

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { Message, ChatResponse } from '@/types/chat';

const API_URL = '/api/chat';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address } = useAccount();

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      // Include full message history for context
      const allMessages = [...messages, userMessage];

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: allMessages,
          walletAddress: address, // Include wallet address for function calling
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = 'Erro ao processar sua mensagem.';

        if (response.status === 400) {
          errorMessage = 'Mensagem inválida. Por favor, tente novamente.';
        } else if (response.status === 401 || response.status === 403) {
          errorMessage = 'Sem autorização para acessar o serviço.';
        } else if (response.status === 429) {
          errorMessage = 'Muitas requisições. Por favor, aguarde um momento.';
        } else if (response.status >= 500) {
          errorMessage = 'Serviço temporariamente indisponível. Tente novamente em instantes.';
        }

        throw new Error(errorMessage);
      }

      const data: ChatResponse = await response.json();

      if (!data.response) {
        throw new Error('Resposta inválida do servidor.');
      }

      // Add assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        swapData: data.swapData, // Include swap data if present
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      let errorContent = 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.';

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorContent = 'A requisição demorou muito. Por favor, tente novamente.';
          setError('Timeout');
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          errorContent = 'Erro de conexão. Verifique sua internet e tente novamente.';
          setError('Network error');
        } else {
          errorContent = err.message;
          setError(err.message);
        }
      } else {
        setError('Erro desconhecido');
      }

      // Add error message to chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, address]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const notifySwapSuccess = useCallback(
    async (txHash: string, toAmount: string, fromToken: string, toToken: string) => {
      // Simply add a success message from the assistant without calling the API
      // This avoids the infinite loop issue
      const successMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `✅ Swap concluído com sucesso! Você recebeu ${toAmount} ${toToken}.`,
        timestamp: new Date(),
        txHash, // Store txHash for rendering link in UI
      };

      setMessages((prev) => [...prev, successMessage]);
    },
    []
  );

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    notifySwapSuccess,
  };
}
