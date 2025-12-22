'use client';

import { useCallback, useMemo } from 'react';
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, Wallet } from 'lucide-react';
import { useSolanaInvest } from '@/hooks/useSolanaInvest';
import type { SolanaSwapData } from '@/types/swap';
import { getSolscanTxUrl } from '@/lib/constants/blockchain';
import WebhookLoadingModal from './WebhookLoadingModal';

// Internationalization strings
const i18n = {
  en: {
    title: 'Solana Investment',
    amount: 'Amount:',
    depositWallet: 'Deposit Wallet:',
    targetWallet: 'Target Wallet (EVM):',
    targetNetwork: 'Target Network:',
    networkFee: 'Network Fee (est.):',
    connectWallet: 'Connect your Solana wallet to continue',
    waitingSignature: 'Waiting for wallet signature...',
    waitingConfirmation: 'Waiting for network confirmation...',
    notifyingServer: 'Notifying server...',
    investmentSuccess: 'Investment completed successfully!',
    viewOnSolscan: 'View on Solscan',
    viewTransaction: 'View transaction on Solscan',
    transactionFailed: 'Transaction Failed',
    confirmInvestment: 'Confirm Investment',
    processing: 'Processing...',
    tryAgain: 'Try Again',
    walletNotConnected: 'Wallet not connected. Connect your Solana wallet.',
    providerUnavailable: 'Solana provider unavailable. Reconnect your wallet.',
    connectionUnavailable: 'Solana connection unavailable.',
    transactionCancelled: 'Transaction cancelled by user',
    webhookFailed: 'Transaction confirmed, but failed to notify server',
  },
  pt: {
    title: 'Investimento Solana',
    amount: 'Valor:',
    depositWallet: 'Carteira de Depósito:',
    targetWallet: 'Carteira Destino (EVM):',
    targetNetwork: 'Rede Destino:',
    networkFee: 'Taxa de Rede (est.):',
    connectWallet: 'Conecte sua carteira Solana para continuar',
    waitingSignature: 'Aguardando assinatura na carteira...',
    waitingConfirmation: 'Aguardando confirmação na rede...',
    notifyingServer: 'Notificando servidor...',
    investmentSuccess: 'Investimento realizado com sucesso!',
    viewOnSolscan: 'Ver no Solscan',
    viewTransaction: 'Ver transação no Solscan',
    transactionFailed: 'Falha na Transação',
    confirmInvestment: 'Confirmar Investimento',
    processing: 'Processando...',
    tryAgain: 'Tentar Novamente',
    walletNotConnected: 'Carteira não conectada. Conecte sua carteira Solana.',
    providerUnavailable: 'Provider Solana não disponível. Reconecte sua carteira.',
    connectionUnavailable: 'Conexão Solana não disponível.',
    transactionCancelled: 'Transação cancelada pelo usuário',
    webhookFailed: 'Transação confirmada, mas falha ao notificar servidor',
  },
  es: {
    title: 'Inversión Solana',
    amount: 'Monto:',
    depositWallet: 'Billetera de Depósito:',
    targetWallet: 'Billetera Destino (EVM):',
    targetNetwork: 'Red Destino:',
    networkFee: 'Tarifa de Red (est.):',
    connectWallet: 'Conecta tu billetera Solana para continuar',
    waitingSignature: 'Esperando firma en la billetera...',
    waitingConfirmation: 'Esperando confirmación en la red...',
    notifyingServer: 'Notificando al servidor...',
    investmentSuccess: '¡Inversión realizada con éxito!',
    viewOnSolscan: 'Ver en Solscan',
    viewTransaction: 'Ver transacción en Solscan',
    transactionFailed: 'Transacción Fallida',
    confirmInvestment: 'Confirmar Inversión',
    processing: 'Procesando...',
    tryAgain: 'Intentar de Nuevo',
    walletNotConnected: 'Billetera no conectada. Conecta tu billetera Solana.',
    providerUnavailable: 'Proveedor Solana no disponible. Reconecta tu billetera.',
    connectionUnavailable: 'Conexión Solana no disponible.',
    transactionCancelled: 'Transacción cancelada por el usuario',
    webhookFailed: 'Transacción confirmada, pero falló al notificar servidor',
  },
};

type Language = keyof typeof i18n;

function getUserLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('pt')) return 'pt';
  if (lang.startsWith('es')) return 'es';
  return 'en'; // Fallback to English
}

interface SolanaInvestCardProps {
  solanaData: SolanaSwapData;
  onSuccess?: (txSignature: string) => void;
}

export default function SolanaInvestCard({ solanaData, onSuccess }: SolanaInvestCardProps) {
  const { state, webhookState, executeInvest, reset, retryWebhook, isConnected } =
    useSolanaInvest();

  // Get localized strings based on user's browser language
  const t = useMemo(() => i18n[getUserLanguage()], []);

  const handleConfirm = useCallback(async () => {
    await executeInvest(solanaData);
  }, [executeInvest, solanaData]);

  const handleRetryWebhook = useCallback(() => {
    retryWebhook(solanaData);
  }, [retryWebhook, solanaData]);

  const handleContinueWithoutWebhook = useCallback(() => {
    // Mark as success even without webhook
    if (state.txSignature && onSuccess) {
      onSuccess(state.txSignature);
    }
  }, [state.txSignature, onSuccess]);

  // Call success callback when transaction completes
  if (state.step === 'success' && state.txSignature && onSuccess) {
    onSuccess(state.txSignature);
  }

  // Wallet not connected
  if (!isConnected) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4">
        <div className="flex items-center gap-2 text-orange-600">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">{t.connectWallet}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">☀️</span>
        <h3 className="text-lg font-bold text-gray-900">{t.title}</h3>
      </div>

      {/* Investment Details */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">{t.amount}</span>
          <span className="text-sm font-medium text-gray-900">{solanaData.amount} USDC</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">{t.depositWallet}</span>
          <span className="text-sm font-mono text-gray-900">
            {solanaData.depositWallet.slice(0, 6)}...
            {solanaData.depositWallet.slice(-4)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">{t.targetWallet}</span>
          <span className="text-sm font-mono text-gray-900">
            {solanaData.targetWallet.slice(0, 6)}...
            {solanaData.targetWallet.slice(-4)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">{t.targetNetwork}</span>
          <span className="text-sm font-medium text-gray-900">
            {solanaData.targetNetwork === 'ETH' ? 'Ethereum' : 'Avalanche'}
          </span>
        </div>

        {/* Network fee info */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <span className="text-sm text-gray-600">{t.networkFee}</span>
          <span className="text-sm text-gray-900">~0.000005 SOL</span>
        </div>
      </div>

      {/* Status Messages */}
      {state.step === 'signing' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="text-sm font-medium text-blue-900">{t.waitingSignature}</span>
          </div>
        </div>
      )}

      {state.step === 'confirming' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="text-sm font-medium text-blue-900">{t.waitingConfirmation}</span>
          </div>
          {state.txSignature && (
            <a
              href={getSolscanTxUrl(state.txSignature)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-2"
            >
              {t.viewOnSolscan}
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      )}

      {state.step === 'sending-webhook' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="text-sm font-medium text-blue-900">{t.notifyingServer}</span>
          </div>
        </div>
      )}

      {state.step === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">{t.investmentSuccess}</span>
          </div>
          {state.txSignature && (
            <a
              href={getSolscanTxUrl(state.txSignature)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1 mt-2"
            >
              {t.viewTransaction}
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {state.error && <p className="text-sm text-orange-600 mt-2">{state.error}</p>}
        </div>
      )}

      {state.step === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">{t.transactionFailed}</p>
              <p className="text-sm text-red-700 mt-1">{state.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {state.step === 'idle' && (
          <button
            onClick={handleConfirm}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Wallet className="w-5 h-5" />
            {t.confirmInvestment}
          </button>
        )}

        {(state.step === 'signing' ||
          state.step === 'confirming' ||
          state.step === 'sending-webhook') && (
          <button
            disabled
            className="flex-1 bg-gray-300 text-gray-500 font-medium py-3 px-4 rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Loader2 className="w-5 h-5 animate-spin" />
            {t.processing}
          </button>
        )}

        {state.step === 'error' && (
          <button
            onClick={reset}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {t.tryAgain}
          </button>
        )}
      </div>

      {/* Webhook Loading Modal */}
      <WebhookLoadingModal
        isOpen={webhookState.isLoading || webhookState.isError}
        isError={webhookState.isError}
        errorMessage={webhookState.errorMessage || undefined}
        onRetry={handleRetryWebhook}
        onContinue={handleContinueWithoutWebhook}
      />
    </div>
  );
}
