/**
 * Error Handler Utilities
 * Centralized error handling patterns
 */

/**
 * Extract error message from unknown error type
 * Handles Error instances, strings, and unknown types
 */
export function getErrorMessage(error: unknown, defaultMessage: string = 'Unknown error'): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return defaultMessage;
}

/**
 * Extract error stack from unknown error type
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}

/**
 * Custom error class for swap-related errors
 */
export class SwapError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'SwapError';
  }
}

/**
 * Custom error class for API-related errors
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Custom error class for wallet validation errors
 */
export class WalletValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WalletValidationError';
  }
}

/**
 * Wrap an async function with standardized error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorMessage: string = 'Operation failed'
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw new Error(`${errorMessage}: ${getErrorMessage(error)}`);
  }
}

/**
 * Create a standardized error response for API routes
 */
export function createErrorResponse(
  error: unknown,
  defaultMessage: string = 'An error occurred'
): { error: string; code?: string } {
  if (error instanceof SwapError || error instanceof APIError) {
    return {
      error: error.message,
      code: error.code,
    };
  }

  return {
    error: getErrorMessage(error, defaultMessage),
  };
}

/**
 * Log error with consistent format
 */
export function logError(context: string, error: unknown): void {
  const message = getErrorMessage(error);
  const stack = getErrorStack(error);

  console.error(`[${context}] Error:`, message);
  if (stack) {
    console.error(`[${context}] Stack:`, stack);
  }
}
