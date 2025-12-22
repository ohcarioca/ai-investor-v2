'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { useAppKitConnection } from '@reown/appkit-adapter-solana/react';
import type { Provider } from '@reown/appkit-adapter-solana/react';
import { Transaction } from '@solana/web3.js';
import type { SolanaSwapData } from '@/types/swap';
import type {
  SolanaInvestState,
  SolanaWebhookPayload,
  SolanaWebhookResponse,
} from '@/types/solana';

// Internationalization strings for error messages
const errorMessages = {
  en: {
    walletNotConnected: 'Wallet not connected. Connect your Solana wallet.',
    providerUnavailable: 'Solana provider unavailable. Reconnect your wallet.',
    connectionUnavailable: 'Solana connection unavailable.',
    transactionCancelled: 'Transaction cancelled by user',
    webhookFailed: 'Transaction confirmed, but failed to notify server',
    unknownError: 'Unknown error',
  },
  pt: {
    walletNotConnected: 'Carteira não conectada. Conecte sua carteira Solana.',
    providerUnavailable: 'Provider Solana não disponível. Reconecte sua carteira.',
    connectionUnavailable: 'Conexão Solana não disponível.',
    transactionCancelled: 'Transação cancelada pelo usuário',
    webhookFailed: 'Transação confirmada, mas falha ao notificar servidor',
    unknownError: 'Erro desconhecido',
  },
  es: {
    walletNotConnected: 'Billetera no conectada. Conecta tu billetera Solana.',
    providerUnavailable: 'Proveedor Solana no disponible. Reconecta tu billetera.',
    connectionUnavailable: 'Conexión Solana no disponible.',
    transactionCancelled: 'Transacción cancelada por el usuario',
    webhookFailed: 'Transacción confirmada, pero falló al notificar servidor',
    unknownError: 'Error desconocido',
  },
};

type Language = keyof typeof errorMessages;

function getUserLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('pt')) return 'pt';
  if (lang.startsWith('es')) return 'es';
  return 'en'; // Fallback to English
}

/**
 * Hook to manage Solana investment flow
 * Handles transaction signing, sending, confirmation, and webhook notification
 */
export function useSolanaInvest() {
  const { address, isConnected } = useAppKitAccount();
  const { connection } = useAppKitConnection();
  const { walletProvider } = useAppKitProvider<Provider>('solana');

  // Get localized error messages
  const t = useMemo(() => errorMessages[getUserLanguage()], []);

  const [state, setState] = useState<SolanaInvestState>({
    step: 'idle',
    error: null,
    txSignature: null,
  });

  const [webhookState, setWebhookState] = useState<{
    isLoading: boolean;
    isError: boolean;
    errorMessage: string | null;
  }>({
    isLoading: false,
    isError: false,
    errorMessage: null,
  });

  /**
   * Send webhook notification after successful transaction
   */
  const sendWebhook = useCallback(
    async (txSignature: string, solanaData: SolanaSwapData): Promise<boolean> => {
      if (!address) return false;

      setWebhookState({
        isLoading: true,
        isError: false,
        errorMessage: null,
      });

      try {
        const payload: SolanaWebhookPayload = {
          wallet_solana: address,
          wallet_target: solanaData.targetWallet,
          network_target: solanaData.targetNetwork,
          amount_usdc: parseFloat(solanaData.amount),
          tx_hash: txSignature,
          timestamp: new Date().toISOString(),
        };

        console.log('[useSolanaInvest] Sending webhook:', payload);

        const response = await fetch('/api/solana/webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const result: SolanaWebhookResponse = await response.json();

        if (result.success) {
          console.log('[useSolanaInvest] Webhook sent successfully');
          setWebhookState({
            isLoading: false,
            isError: false,
            errorMessage: null,
          });
          return true;
        } else {
          throw new Error(result.error || 'Failed to send webhook');
        }
      } catch (error) {
        console.error('[useSolanaInvest] Webhook error:', error);
        setWebhookState({
          isLoading: false,
          isError: true,
          errorMessage: error instanceof Error ? error.message : 'Failed to send webhook',
        });
        return false;
      }
    },
    [address]
  );

  /**
   * Execute the Solana investment transaction
   */
  const executeInvest = useCallback(
    async (solanaData: SolanaSwapData) => {
      // Validate connection
      if (!isConnected || !address) {
        setState({
          step: 'error',
          error: t.walletNotConnected,
          txSignature: null,
        });
        return;
      }

      if (!walletProvider) {
        setState({
          step: 'error',
          error: t.providerUnavailable,
          txSignature: null,
        });
        return;
      }

      if (!connection) {
        setState({
          step: 'error',
          error: t.connectionUnavailable,
          txSignature: null,
        });
        return;
      }

      setState({
        step: 'signing',
        error: null,
        txSignature: null,
      });

      try {
        // Deserialize transaction from base64
        console.log('[useSolanaInvest] Deserializing transaction...');
        const transactionBuffer = Buffer.from(solanaData.serializedTransaction, 'base64');
        const transaction = Transaction.from(transactionBuffer);

        console.log('[useSolanaInvest] Transaction deserialized:', {
          feePayer: transaction.feePayer?.toBase58(),
          recentBlockhash: transaction.recentBlockhash,
          instructions: transaction.instructions.length,
        });

        // Sign and send transaction
        console.log('[useSolanaInvest] Requesting wallet signature...');
        setState((prev) => ({ ...prev, step: 'signing' }));

        const signature = await walletProvider.sendTransaction(transaction, connection);

        console.log('[useSolanaInvest] Transaction sent:', signature);
        setState({
          step: 'confirming',
          error: null,
          txSignature: signature,
        });

        // Wait for confirmation
        console.log('[useSolanaInvest] Waiting for confirmation...');
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');

        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        console.log('[useSolanaInvest] Transaction confirmed!');

        // Send webhook
        setState((prev) => ({ ...prev, step: 'sending-webhook' }));
        const webhookSuccess = await sendWebhook(signature, solanaData);

        // Update final state
        setState({
          step: webhookSuccess ? 'success' : 'success', // Success even if webhook fails
          error: webhookSuccess ? null : t.webhookFailed,
          txSignature: signature,
        });

        // Dispatch event to refresh balance
        window.dispatchEvent(
          new CustomEvent('transaction-completed', {
            detail: { txHash: signature, type: 'solana-invest' },
          })
        );

        console.log('[useSolanaInvest] Investment complete!');
      } catch (error) {
        console.error('[useSolanaInvest] Error:', error);

        // Handle user rejection
        const errorMsg = error instanceof Error ? error.message : t.unknownError;
        const isUserRejection =
          errorMsg.includes('User rejected') ||
          errorMsg.includes('user rejected') ||
          errorMsg.includes('cancelled');

        setState({
          step: 'error',
          error: isUserRejection ? t.transactionCancelled : errorMsg,
          txSignature: null,
        });
      }
    },
    [isConnected, address, walletProvider, connection, sendWebhook, t]
  );

  /**
   * Reset state to initial
   */
  const reset = useCallback(() => {
    setState({
      step: 'idle',
      error: null,
      txSignature: null,
    });
    setWebhookState({
      isLoading: false,
      isError: false,
      errorMessage: null,
    });
  }, []);

  /**
   * Retry webhook sending
   */
  const retryWebhook = useCallback(
    async (solanaData: SolanaSwapData) => {
      if (!state.txSignature) return;
      await sendWebhook(state.txSignature, solanaData);
    },
    [state.txSignature, sendWebhook]
  );

  return {
    state,
    webhookState,
    executeInvest,
    reset,
    retryWebhook,
    isConnected,
  };
}
