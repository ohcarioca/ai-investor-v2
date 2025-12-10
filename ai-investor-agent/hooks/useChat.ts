'use client';

import { useState, useCallback } from 'react';
import { Message, ChatResponse } from '@/types/chat';

const WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBHOOK_URL || 'https://n8n.balampay.com/webhook/investor_agent';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content.trim(),
          timestamp: new Date().toISOString(),
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
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
}
