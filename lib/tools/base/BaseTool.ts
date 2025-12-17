/**
 * Abstract base class for all tools
 * Provides common validation and error handling
 */

import { isValidAddress, isRealAddress } from '@/lib/wallet-validation';
import {
  ITool,
  ToolContext,
  ToolResult,
  ToolDefinition,
  ValidationResult,
  ToolCategory,
  ToolErrorCode,
} from './types';

/**
 * Base class that all tools should extend
 * Eliminates duplicated wallet validation across 9 tools
 */
export abstract class BaseTool implements ITool {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly category: ToolCategory;
  abstract readonly requiresWallet: boolean;

  /**
   * Returns the OpenAI function definition for this tool
   * Each tool must implement this to define its parameters
   */
  abstract getDefinition(): ToolDefinition;

  /**
   * Template method pattern: validates then executes
   * Subclasses implement executeImpl for specific logic
   */
  async execute(
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    try {
      // 1. Common validation (wallet, address, etc.)
      const validation = this.validateParams(params, context);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          errorCode: validation.errorCode,
        };
      }

      // 2. Tool-specific validation
      const specificValidation = this.validateSpecificParams(params, context);
      if (!specificValidation.isValid) {
        return {
          success: false,
          error: specificValidation.error,
          errorCode: specificValidation.errorCode,
        };
      }

      // 3. Execute tool-specific logic
      const result = await this.executeImpl(params, context);

      // 4. Log execution for debugging
      console.log(`[${this.name}] Execution completed:`, {
        success: result.success,
        hasError: !!result.error,
      });

      return result;
    } catch (error) {
      console.error(`[${this.name}] Execution error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
        errorCode: 'TOOL_EXECUTION_ERROR' as ToolErrorCode,
      };
    }
  }

  /**
   * Common validation for all tools
   * Checks wallet connection if required
   */
  validateParams(
    params: Record<string, unknown>,
    context: ToolContext
  ): ValidationResult {
    // If tool requires wallet, validate connection
    if (this.requiresWallet) {
      return this.validateWalletContext(context);
    }

    return { isValid: true };
  }

  /**
   * Validates wallet context
   * Eliminates duplicated wallet validation code
   */
  protected validateWalletContext(context: ToolContext): ValidationResult {
    // Check if wallet is connected
    if (!context.isConnected || !context.walletAddress) {
      return {
        isValid: false,
        error: 'Wallet not connected. Please connect your wallet first.',
        errorCode: 'WALLET_NOT_CONNECTED',
      };
    }

    // Validate address format
    if (!isValidAddress(context.walletAddress)) {
      return {
        isValid: false,
        error: 'Invalid wallet address format. Please check your wallet connection.',
        errorCode: 'INVALID_ADDRESS',
      };
    }

    // Validate not a placeholder address
    if (!isRealAddress(context.walletAddress)) {
      return {
        isValid: false,
        error: 'Cannot use placeholder or example addresses. Please connect your real wallet.',
        errorCode: 'PLACEHOLDER_ADDRESS',
      };
    }

    return { isValid: true };
  }

  /**
   * Validates amount parameter
   * Used by swap, invest, withdraw tools
   */
  protected validateAmount(amount: unknown): ValidationResult {
    if (amount === undefined || amount === null || amount === '') {
      return {
        isValid: false,
        error: 'Amount is required',
        errorCode: 'INVALID_AMOUNT',
      };
    }

    const numAmount = parseFloat(String(amount));
    if (isNaN(numAmount) || numAmount <= 0) {
      return {
        isValid: false,
        error: 'Amount must be a positive number',
        errorCode: 'INVALID_AMOUNT',
      };
    }

    return { isValid: true };
  }

  /**
   * Tool-specific validation - override in subclasses
   * Default implementation does nothing
   */
  protected validateSpecificParams(
    _params: Record<string, unknown>,
    _context: ToolContext
  ): ValidationResult {
    return { isValid: true };
  }

  /**
   * Tool-specific execution logic
   * Each tool must implement this
   */
  protected abstract executeImpl(
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult>;

  /**
   * Helper to get base URL for API calls
   */
  protected getBaseUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }

  /**
   * Helper to log tool activity
   */
  protected log(message: string, data?: unknown): void {
    if (data) {
      console.log(`[${this.name}] ${message}`, data);
    } else {
      console.log(`[${this.name}] ${message}`);
    }
  }
}
