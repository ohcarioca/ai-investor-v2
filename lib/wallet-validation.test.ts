import { describe, it, expect, vi } from 'vitest';
import {
  isValidAddress,
  isRealAddress,
  validateWalletConnection,
  validateAddressMatch,
  WalletValidationError,
  sanitizeAddress,
  isOperationAllowedWithoutWallet,
  createWalletContext,
} from './wallet-validation';

// Mock the config module
vi.mock('./config', () => ({
  getConfig: vi.fn((path: string) => {
    const configs: Record<string, unknown> = {
      'capabilities.wallet_management.require_wallet_for_operations': true,
      'capabilities.wallet_management.always_use_connected_wallet': true,
      'blockchain.default_network_id': 43114,
      'blockchain': {
        networks: [
          { chain_id: 43114, name: 'Avalanche C-Chain' },
          { chain_id: 1, name: 'Ethereum' },
        ],
      },
    };
    return configs[path];
  }),
}));

describe('wallet-validation', () => {
  describe('isValidAddress', () => {
    it('should return true for valid Ethereum addresses', () => {
      expect(isValidAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(true);
      expect(isValidAddress('0xABCDEF1234567890ABCDEF1234567890ABCDEF12')).toBe(true);
    });

    it('should return false for invalid addresses', () => {
      expect(isValidAddress('')).toBe(false);
      expect(isValidAddress(undefined)).toBe(false);
      expect(isValidAddress('0x123')).toBe(false); // Too short
      expect(isValidAddress('0x1234567890abcdef1234567890abcdef12345678extra')).toBe(false); // Too long
      expect(isValidAddress('1234567890abcdef1234567890abcdef12345678')).toBe(false); // Missing 0x
      expect(isValidAddress('0xGGGGGG7890abcdef1234567890abcdef12345678')).toBe(false); // Invalid chars
    });
  });

  describe('isRealAddress', () => {
    it('should return true for real addresses', () => {
      expect(isRealAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(true);
      expect(isRealAddress('0xdead567890abcdef1234567890abcdef12345678')).toBe(true);
    });

    it('should return false for placeholder addresses', () => {
      expect(isRealAddress('0x0000000000000000000000000000000000000000')).toBe(false);
      expect(isRealAddress('0x1111111111111111111111111111111111111111')).toBe(false);
      expect(isRealAddress('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')).toBe(false);
    });

    it('should return false for invalid addresses', () => {
      expect(isRealAddress('')).toBe(false);
      expect(isRealAddress(undefined)).toBe(false);
    });
  });

  describe('validateWalletConnection', () => {
    it('should return valid for connected wallet with valid address', () => {
      const result = validateWalletConnection(
        true,
        '0x1234567890abcdef1234567890abcdef12345678'
      );
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error for disconnected wallet', () => {
      const result = validateWalletConnection(false, undefined);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(WalletValidationError.NOT_CONNECTED);
    });

    it('should return error for connected wallet without address', () => {
      const result = validateWalletConnection(true, undefined);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(WalletValidationError.MISSING_ADDRESS);
    });

    it('should return error for invalid address format', () => {
      const result = validateWalletConnection(true, '0x123');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(WalletValidationError.INVALID_ADDRESS);
    });

    it('should return error for placeholder addresses', () => {
      const result = validateWalletConnection(
        true,
        '0x0000000000000000000000000000000000000000'
      );
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(WalletValidationError.INVALID_ADDRESS);
    });
  });

  describe('validateAddressMatch', () => {
    it('should return valid when addresses match', () => {
      const result = validateAddressMatch(
        '0x1234567890abcdef1234567890abcdef12345678',
        '0x1234567890abcdef1234567890abcdef12345678'
      );
      expect(result.isValid).toBe(true);
    });

    it('should return valid when addresses match with different case', () => {
      const result = validateAddressMatch(
        '0x1234567890ABCDEF1234567890abcdef12345678',
        '0x1234567890abcdef1234567890ABCDEF12345678'
      );
      expect(result.isValid).toBe(true);
    });

    it('should return error when addresses do not match', () => {
      const result = validateAddressMatch(
        '0x1234567890abcdef1234567890abcdef12345678',
        '0xABCDEF1234567890abcdef1234567890abcdef12'
      );
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(WalletValidationError.ADDRESS_MISMATCH);
    });

    it('should return error when connected address is missing', () => {
      const result = validateAddressMatch(
        undefined,
        '0x1234567890abcdef1234567890abcdef12345678'
      );
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(WalletValidationError.NOT_CONNECTED);
    });

    it('should return error when provided address is missing', () => {
      const result = validateAddressMatch(
        '0x1234567890abcdef1234567890abcdef12345678',
        undefined
      );
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(WalletValidationError.MISSING_ADDRESS);
    });
  });

  describe('sanitizeAddress', () => {
    it('should sanitize valid address', () => {
      const result = sanitizeAddress('0x1234567890abcdef1234567890abcdef12345678');
      expect(result).toBe('0x1234...5678');
    });

    it('should return invalid message for invalid address', () => {
      expect(sanitizeAddress('')).toBe('[Invalid Address]');
      expect(sanitizeAddress(undefined)).toBe('[Invalid Address]');
      expect(sanitizeAddress('0x123')).toBe('[Invalid Address]');
    });
  });

  describe('isOperationAllowedWithoutWallet', () => {
    it('should return true for allowed operations', () => {
      expect(isOperationAllowedWithoutWallet('view_prices')).toBe(true);
      expect(isOperationAllowedWithoutWallet('view_tokens')).toBe(true);
      expect(isOperationAllowedWithoutWallet('learn')).toBe(true);
      expect(isOperationAllowedWithoutWallet('info')).toBe(true);
      expect(isOperationAllowedWithoutWallet('help')).toBe(true);
    });

    it('should return false for restricted operations', () => {
      expect(isOperationAllowedWithoutWallet('swap')).toBe(false);
      expect(isOperationAllowedWithoutWallet('invest')).toBe(false);
      expect(isOperationAllowedWithoutWallet('withdraw')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isOperationAllowedWithoutWallet('VIEW_PRICES')).toBe(true);
      expect(isOperationAllowedWithoutWallet('Help')).toBe(true);
    });
  });

  describe('createWalletContext', () => {
    it('should create context for connected wallet', () => {
      const result = createWalletContext({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        isConnected: true,
        chain: { id: 43114 },
      });

      expect(result).toEqual({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        chainId: 43114,
        isConnected: true,
      });
    });

    it('should return null for disconnected wallet', () => {
      const result = createWalletContext({
        address: undefined,
        isConnected: false,
        chain: undefined,
      });

      expect(result).toBeNull();
    });

    it('should return null if address is missing', () => {
      const result = createWalletContext({
        address: undefined,
        isConnected: true,
        chain: { id: 43114 },
      });

      expect(result).toBeNull();
    });

    it('should return null if chain is missing', () => {
      const result = createWalletContext({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        isConnected: true,
        chain: undefined,
      });

      expect(result).toBeNull();
    });
  });
});
