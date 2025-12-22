/**
 * Wallet Validation Utilities
 *
 * This module provides validation functions to ensure wallet operations
 * always use the connected wallet and follow security best practices.
 *
 * CRITICAL: These functions enforce the rule that ALL operations must use
 * the connected wallet address from Web3 provider.
 */

import { getConfig } from './config';

// ============================================================================
// Types
// ============================================================================

export interface WalletContext {
  address: `0x${string}`;
  chainId: number;
  isConnected: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  errorCode?: WalletValidationError;
}

export enum WalletValidationError {
  NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  WRONG_NETWORK = 'WRONG_NETWORK',
  ADDRESS_MISMATCH = 'ADDRESS_MISMATCH',
  MISSING_ADDRESS = 'MISSING_ADDRESS',
}

// ============================================================================
// Configuration Helpers
// ============================================================================

/**
 * Check if wallet operations are required
 */
export function isWalletRequired(): boolean {
  try {
    return getConfig<boolean>('capabilities.wallet_management.require_wallet_for_operations');
  } catch {
    return true; // Default to required for safety
  }
}

/**
 * Check if connected wallet must always be used
 */
export function mustUseConnectedWallet(): boolean {
  try {
    return getConfig<boolean>('capabilities.wallet_management.always_use_connected_wallet');
  } catch {
    return true; // Default to true for safety
  }
}

/**
 * Get default network ID
 */
export function getDefaultNetworkId(): number {
  try {
    return getConfig<number>('blockchain.default_network_id');
  } catch {
    return 1; // Default to Ethereum
  }
}

/**
 * Get supported network IDs
 */
export function getSupportedNetworkIds(): number[] {
  try {
    const networkConfig = getConfig<{ networks: Array<{ chain_id: number; enabled: boolean }> }>(
      'blockchain'
    );
    return networkConfig.networks.filter((n) => n.enabled).map((n) => n.chain_id);
  } catch {
    return [1, 43114]; // Default to Ethereum and Avalanche
  }
}

// ============================================================================
// Address Validation
// ============================================================================

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address: string | undefined): address is `0x${string}` {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate that address matches expected format and is not a placeholder
 */
export function isRealAddress(address: string | undefined): boolean {
  if (!isValidAddress(address)) return false;

  // Check for common placeholder patterns
  const placeholders = [
    '0x0000000000000000000000000000000000000000', // Zero address
    '0x1111111111111111111111111111111111111111', // Example pattern
    '0x1234567890123456789012345678901234567890', // Example pattern
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // Native token placeholder
  ];

  return !placeholders.includes(address.toLowerCase());
}

// ============================================================================
// Wallet Connection Validation
// ============================================================================

/**
 * Validate wallet connection status
 */
export function validateWalletConnection(isConnected: boolean, address?: string): ValidationResult {
  // Check configuration
  if (!isWalletRequired()) {
    return { isValid: true };
  }

  // Check if connected
  if (!isConnected) {
    return {
      isValid: false,
      error: 'Wallet not connected. Please connect your wallet to continue.',
      errorCode: WalletValidationError.NOT_CONNECTED,
    };
  }

  // Check if address exists
  if (!address) {
    return {
      isValid: false,
      error: 'No wallet address available. Please reconnect your wallet.',
      errorCode: WalletValidationError.MISSING_ADDRESS,
    };
  }

  // Validate address format
  if (!isValidAddress(address)) {
    return {
      isValid: false,
      error: 'Invalid wallet address format.',
      errorCode: WalletValidationError.INVALID_ADDRESS,
    };
  }

  // Check if real address (not placeholder)
  if (!isRealAddress(address)) {
    return {
      isValid: false,
      error: 'Invalid wallet address. Please connect a real wallet.',
      errorCode: WalletValidationError.INVALID_ADDRESS,
    };
  }

  return { isValid: true };
}

/**
 * Validate network connection
 */
export function validateNetwork(chainId: number | undefined): ValidationResult {
  const supportedNetworkIds = getSupportedNetworkIds();

  if (!chainId || !supportedNetworkIds.includes(chainId)) {
    const networkNames = ['Ethereum', 'Avalanche'];
    return {
      isValid: false,
      error: `Wrong network. Please switch to ${networkNames.join(' or ')}.`,
      errorCode: WalletValidationError.WRONG_NETWORK,
    };
  }

  return { isValid: true };
}

/**
 * Validate complete wallet context
 */
export function validateWalletContext(context: {
  isConnected: boolean;
  address?: string;
  chainId?: number;
}): ValidationResult {
  // Validate connection
  const connectionResult = validateWalletConnection(context.isConnected, context.address);
  if (!connectionResult.isValid) {
    return connectionResult;
  }

  // Validate network
  if (context.chainId !== undefined) {
    const networkResult = validateNetwork(context.chainId);
    if (!networkResult.isValid) {
      return networkResult;
    }
  }

  return { isValid: true };
}

// ============================================================================
// Address Matching Validation
// ============================================================================

/**
 * Validate that provided address matches connected wallet
 *
 * Use this to ensure operations don't use a different address than
 * the connected wallet.
 */
export function validateAddressMatch(
  connectedAddress: string | undefined,
  providedAddress: string | undefined
): ValidationResult {
  if (!mustUseConnectedWallet()) {
    return { isValid: true };
  }

  if (!connectedAddress) {
    return {
      isValid: false,
      error: 'No wallet connected.',
      errorCode: WalletValidationError.NOT_CONNECTED,
    };
  }

  if (!providedAddress) {
    return {
      isValid: false,
      error: 'No address provided.',
      errorCode: WalletValidationError.MISSING_ADDRESS,
    };
  }

  // Normalize addresses for comparison (case-insensitive)
  const normalizedConnected = connectedAddress.toLowerCase();
  const normalizedProvided = providedAddress.toLowerCase();

  if (normalizedConnected !== normalizedProvided) {
    return {
      isValid: false,
      error: 'Address mismatch. Only the connected wallet address can be used.',
      errorCode: WalletValidationError.ADDRESS_MISMATCH,
    };
  }

  return { isValid: true };
}

// ============================================================================
// Assertion Functions
// ============================================================================

/**
 * Assert wallet is connected (throws error if not)
 */
export function assertWalletConnected(
  isConnected: boolean,
  address?: string
): asserts address is `0x${string}` {
  const result = validateWalletConnection(isConnected, address);
  if (!result.isValid) {
    throw new Error(result.error);
  }
}

/**
 * Assert network is correct (throws error if not)
 */
export function assertCorrectNetwork(chainId: number | undefined): asserts chainId is number {
  const result = validateNetwork(chainId);
  if (!result.isValid) {
    throw new Error(result.error);
  }
}

/**
 * Assert wallet context is valid (throws error if not)
 */
export function assertValidWalletContext(context: {
  isConnected: boolean;
  address?: string;
  chainId?: number;
}): asserts context is { isConnected: true; address: `0x${string}`; chainId: number } {
  const result = validateWalletContext(context);
  if (!result.isValid) {
    throw new Error(result.error);
  }
}

/**
 * Assert addresses match (throws error if not)
 */
export function assertAddressMatch(
  connectedAddress: string | undefined,
  providedAddress: string | undefined
): void {
  const result = validateAddressMatch(connectedAddress, providedAddress);
  if (!result.isValid) {
    throw new Error(result.error);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get user-friendly error message for validation error
 */
export function getValidationErrorMessage(errorCode: WalletValidationError): string {
  const messages: Record<WalletValidationError, string> = {
    [WalletValidationError.NOT_CONNECTED]: 'Please connect your wallet to continue.',
    [WalletValidationError.INVALID_ADDRESS]:
      'Invalid wallet address. Please check your wallet connection.',
    [WalletValidationError.WRONG_NETWORK]: 'Please switch to the correct network in your wallet.',
    [WalletValidationError.ADDRESS_MISMATCH]:
      'You can only use your connected wallet address for this operation.',
    [WalletValidationError.MISSING_ADDRESS]:
      'No wallet address available. Please reconnect your wallet.',
  };

  return messages[errorCode] || 'Wallet validation failed.';
}

/**
 * Check if operation is allowed without wallet
 */
export function isOperationAllowedWithoutWallet(operation: string): boolean {
  // Define operations that don't require wallet
  const allowedOperations = ['view_prices', 'view_tokens', 'learn', 'info', 'help'];

  return allowedOperations.includes(operation.toLowerCase());
}

/**
 * Sanitize address for logging (show first and last 6 chars)
 */
export function sanitizeAddress(address: string | undefined): string {
  if (!address || !isValidAddress(address)) {
    return '[Invalid Address]';
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ============================================================================
// React Hook Helpers
// ============================================================================

/**
 * Create wallet context from useAccount hook
 *
 * This ensures consistent wallet context structure across the app
 */
export function createWalletContext(account: {
  address?: `0x${string}`;
  isConnected: boolean;
  chain?: { id: number };
}): WalletContext | null {
  if (!account.isConnected || !account.address || !account.chain) {
    return null;
  }

  return {
    address: account.address,
    chainId: account.chain.id,
    isConnected: account.isConnected,
  };
}

/**
 * Validate wallet context from useAccount hook
 */
export function useWalletValidation(account: {
  address?: `0x${string}`;
  isConnected: boolean;
  chain?: { id: number };
}): ValidationResult {
  return validateWalletContext({
    isConnected: account.isConnected,
    address: account.address,
    chainId: account.chain?.id,
  });
}
