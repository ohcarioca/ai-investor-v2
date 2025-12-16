/**
 * Wallet Validation Middleware
 * Centralized wallet address validation for API routes
 */

import { NextResponse } from 'next/server';
import { isValidAddress, isRealAddress } from '@/lib/wallet-validation';

export interface WalletValidationResult {
  valid: boolean;
  error?: string;
  response?: NextResponse;
}

/**
 * Validate wallet address for API routes
 * Returns a validation result with optional error response
 */
export function validateWalletAddress(
  userAddress: string | undefined | null,
  purpose: 'swap' | 'approval' | 'balance' | 'general' = 'general'
): WalletValidationResult {
  // Check if address is provided
  if (!userAddress) {
    const error = 'Wallet address is required';
    return {
      valid: false,
      error,
      response: NextResponse.json({ error }, { status: 400 }),
    };
  }

  // Check address format
  if (!isValidAddress(userAddress)) {
    const error = 'Invalid wallet address format. Please check your wallet connection.';
    return {
      valid: false,
      error,
      response: NextResponse.json({ error }, { status: 400 }),
    };
  }

  // Check if it's a real address (not a placeholder)
  if (!isRealAddress(userAddress)) {
    const messages: Record<string, string> = {
      swap: 'Cannot use placeholder or example addresses. This transaction must use your connected wallet.',
      approval: 'Cannot use placeholder or example addresses. Token approval must use your connected wallet.',
      balance: 'Cannot use placeholder or example addresses for balance queries.',
      general: 'Cannot use placeholder or example addresses.',
    };

    const error = messages[purpose];
    return {
      valid: false,
      error,
      response: NextResponse.json({ error }, { status: 400 }),
    };
  }

  return { valid: true };
}

/**
 * Validate chain ID
 * Returns a validation result with optional error response
 */
export function validateChainId(
  chainId: string | number | undefined | null,
  supportedChains: number[] = [1, 43114]
): WalletValidationResult {
  if (!chainId) {
    const error = 'Chain ID is required';
    return {
      valid: false,
      error,
      response: NextResponse.json({ error }, { status: 400 }),
    };
  }

  const chainIdNum = typeof chainId === 'string' ? parseInt(chainId) : chainId;

  if (isNaN(chainIdNum)) {
    const error = 'Invalid chain ID format';
    return {
      valid: false,
      error,
      response: NextResponse.json({ error }, { status: 400 }),
    };
  }

  if (!supportedChains.includes(chainIdNum)) {
    const error = `Unsupported chain: ${chainId}. Supported chains: ${supportedChains.join(', ')}`;
    return {
      valid: false,
      error,
      response: NextResponse.json({ error }, { status: 400 }),
    };
  }

  return { valid: true };
}

/**
 * Combined validation for swap routes
 * Validates wallet address, chain ID, and required parameters
 */
export function validateSwapRequest(params: {
  userAddress?: string;
  chainId?: string | number;
  fromToken?: string;
  toToken?: string;
  amount?: string;
}): WalletValidationResult {
  const { userAddress, chainId, fromToken, toToken, amount } = params;

  // Validate required parameters
  if (!chainId || !fromToken || !toToken || !amount || !userAddress) {
    const error = 'Missing required parameters. All swap parameters and wallet address are required.';
    return {
      valid: false,
      error,
      response: NextResponse.json({ error }, { status: 400 }),
    };
  }

  // Validate wallet address
  const walletValidation = validateWalletAddress(userAddress, 'swap');
  if (!walletValidation.valid) {
    return walletValidation;
  }

  // Validate chain ID
  const chainValidation = validateChainId(chainId);
  if (!chainValidation.valid) {
    return chainValidation;
  }

  return { valid: true };
}

/**
 * Combined validation for approval routes
 */
export function validateApprovalRequest(params: {
  userAddress?: string;
  chainId?: string | number;
  tokenAddress?: string;
  amount?: string;
}): WalletValidationResult {
  const { userAddress, chainId, tokenAddress, amount } = params;

  // Validate required parameters
  if (!chainId || !tokenAddress || !amount || !userAddress) {
    const error = 'Missing required parameters. All approval parameters and wallet address are required.';
    return {
      valid: false,
      error,
      response: NextResponse.json({ error }, { status: 400 }),
    };
  }

  // Validate wallet address
  const walletValidation = validateWalletAddress(userAddress, 'approval');
  if (!walletValidation.valid) {
    return walletValidation;
  }

  // Validate chain ID
  const chainValidation = validateChainId(chainId);
  if (!chainValidation.valid) {
    return chainValidation;
  }

  return { valid: true };
}
