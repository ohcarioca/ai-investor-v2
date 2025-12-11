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
        const userLang = navigator.language.toLowerCase();
        let errorMessage = '';

        if (userLang.startsWith('pt')) {
          if (response.status === 400) {
            errorMessage = 'Mensagem inválida. Por favor, tente novamente.';
          } else if (response.status === 401 || response.status === 403) {
            errorMessage = 'Sem autorização para acessar o serviço.';
          } else if (response.status === 429) {
            errorMessage = 'Muitas requisições. Por favor, aguarde um momento.';
          } else if (response.status >= 500) {
            errorMessage = 'Serviço temporariamente indisponível. Tente novamente em instantes.';
          } else {
            errorMessage = 'Erro ao processar sua mensagem.';
          }
        } else if (userLang.startsWith('es')) {
          if (response.status === 400) {
            errorMessage = 'Mensaje inválido. Por favor, intente de nuevo.';
          } else if (response.status === 401 || response.status === 403) {
            errorMessage = 'Sin autorización para acceder al servicio.';
          } else if (response.status === 429) {
            errorMessage = 'Demasiadas solicitudes. Por favor, espere un momento.';
          } else if (response.status >= 500) {
            errorMessage = 'Servicio temporalmente no disponible. Intente de nuevo en unos momentos.';
          } else {
            errorMessage = 'Error al procesar su mensaje.';
          }
        } else {
          // Default to English
          if (response.status === 400) {
            errorMessage = 'Invalid message. Please try again.';
          } else if (response.status === 401 || response.status === 403) {
            errorMessage = 'Not authorized to access the service.';
          } else if (response.status === 429) {
            errorMessage = 'Too many requests. Please wait a moment.';
          } else if (response.status >= 500) {
            errorMessage = 'Service temporarily unavailable. Try again shortly.';
          } else {
            errorMessage = 'Error processing your message.';
          }
        }

        throw new Error(errorMessage);
      }

      const data: ChatResponse = await response.json();

      if (!data.response) {
        const userLang = navigator.language.toLowerCase();
        let errorMsg = 'Invalid server response.'; // Default English
        if (userLang.startsWith('pt')) {
          errorMsg = 'Resposta inválida do servidor.';
        } else if (userLang.startsWith('es')) {
          errorMsg = 'Respuesta inválida del servidor.';
        }
        throw new Error(errorMsg);
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
      const userLang = navigator.language.toLowerCase();
      let errorContent = '';

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          if (userLang.startsWith('pt')) {
            errorContent = 'A requisição demorou muito. Por favor, tente novamente.';
          } else if (userLang.startsWith('es')) {
            errorContent = 'La solicitud tardó demasiado. Por favor, intente de nuevo.';
          } else {
            errorContent = 'The request took too long. Please try again.';
          }
          setError('Timeout');
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          if (userLang.startsWith('pt')) {
            errorContent = 'Erro de conexão. Verifique sua internet e tente novamente.';
          } else if (userLang.startsWith('es')) {
            errorContent = 'Error de conexión. Verifique su internet e intente de nuevo.';
          } else {
            errorContent = 'Connection error. Check your internet and try again.';
          }
          setError('Network error');
        } else {
          errorContent = err.message;
          setError(err.message);
        }
      } else {
        if (userLang.startsWith('pt')) {
          errorContent = 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.';
          setError('Erro desconhecido');
        } else if (userLang.startsWith('es')) {
          errorContent = 'Lo sentimos, ocurrió un error al procesar su mensaje. Por favor, intente de nuevo.';
          setError('Error desconocido');
        } else {
          errorContent = 'Sorry, an error occurred while processing your message. Please try again.';
          setError('Unknown error');
        }
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
      // Detect user's browser language
      const userLang = navigator.language.toLowerCase();

      // Define messages in different languages
      let message = '';
      if (userLang.startsWith('pt')) {
        message = `✅ Swap concluído com sucesso! Você recebeu ${toAmount} ${toToken}.`;
      } else if (userLang.startsWith('es')) {
        message = `✅ ¡Swap completado con éxito! Has recibido ${toAmount} ${toToken}.`;
      } else if (userLang.startsWith('fr')) {
        message = `✅ Swap réussi ! Vous avez reçu ${toAmount} ${toToken}.`;
      } else {
        // Default to English
        message = `✅ Swap completed successfully! You received ${toAmount} ${toToken}.`;
      }

      const successMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: message,
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
