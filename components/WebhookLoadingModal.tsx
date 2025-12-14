'use client';

import { createPortal } from 'react-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface WebhookLoadingModalProps {
  isOpen: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  onContinue?: () => void;
}

export default function WebhookLoadingModal({
  isOpen,
  isError,
  errorMessage,
  onRetry,
  onContinue,
}: WebhookLoadingModalProps) {
  // Use lazy initialization to check if we're on the client
  const [mounted] = useState(() => typeof window !== 'undefined');

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop - non-clickable */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {!isError ? (
            <>
              {/* Loading State */}
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Saving Transaction
                  </h3>
                  <p className="text-sm text-gray-600">
                    Please wait while we record your swap...
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Error State */}
              <div className="flex flex-col items-center gap-4">
                <AlertCircle className="w-12 h-12 text-red-600" />
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Failed to Save Transaction
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {errorMessage ||
                      'We could not record your swap. Your transaction completed successfully, but the record was not saved.'}
                  </p>
                </div>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={onRetry}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={onContinue}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Continue Anyway
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
