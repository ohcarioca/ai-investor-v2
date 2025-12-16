/**
 * Retry Utilities
 * Centralized retry logic with exponential backoff
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Base delay in milliseconds (default: 1000) */
  baseDelay?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay?: number;
  /** Function to determine if retry should be attempted */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Callback called before each retry */
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
}

/**
 * Execute a function with retry logic and exponential backoff
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the function
 * @throws The last error if all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    backoffMultiplier = 2,
    maxDelay = 30000,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt < maxAttempts && shouldRetry(error, attempt)) {
        // Calculate delay with exponential backoff
        const delay = Math.min(
          baseDelay * Math.pow(backoffMultiplier, attempt - 1),
          maxDelay
        );

        // Call onRetry callback if provided
        if (onRetry) {
          onRetry(error, attempt, delay);
        }

        // Wait before retrying
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Helper function to sleep for a given duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a retry function with pre-configured options
 * Useful for creating specialized retry functions for different use cases
 */
export function createRetryFunction<T>(defaultOptions: RetryOptions) {
  return (fn: () => Promise<T>, overrideOptions?: RetryOptions): Promise<T> => {
    return retryWithBackoff(fn, { ...defaultOptions, ...overrideOptions });
  };
}

/**
 * Retry function specifically for API calls
 * Includes logging and rate limit detection
 */
export async function retryApiCall<T>(
  fn: () => Promise<T>,
  context: string,
  options: Omit<RetryOptions, 'onRetry'> = {}
): Promise<T> {
  return retryWithBackoff(fn, {
    ...options,
    onRetry: (error, attempt, delay) => {
      console.log(
        `[${context}] Attempt ${attempt} failed, retrying in ${delay}ms...`,
        error instanceof Error ? error.message : error
      );
    },
  });
}

/**
 * Check if an error is a rate limit error (common in DEX APIs)
 */
export function isRateLimitError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    // OKX rate limit code
    if (errorObj.code === '50011' || errorObj.code === 50011) {
      return true;
    }
    // HTTP 429
    if (errorObj.status === 429 || errorObj.statusCode === 429) {
      return true;
    }
  }
  return false;
}

/**
 * Retry function for rate-limited APIs
 * Uses longer delays for rate limit errors
 */
export async function retryWithRateLimitHandling<T>(
  fn: () => Promise<T>,
  context: string,
  options: Omit<RetryOptions, 'shouldRetry' | 'onRetry'> = {}
): Promise<T> {
  return retryWithBackoff(fn, {
    maxAttempts: 5,
    baseDelay: 2000,
    backoffMultiplier: 2,
    ...options,
    shouldRetry: (error) => {
      // Always retry rate limit errors
      if (isRateLimitError(error)) {
        return true;
      }
      // Don't retry other errors by default
      return false;
    },
    onRetry: (error, attempt, delay) => {
      const isRateLimit = isRateLimitError(error);
      console.log(
        `[${context}] ${isRateLimit ? 'Rate limited' : 'Error'}, ` +
        `attempt ${attempt}, retrying in ${delay}ms...`
      );
    },
  });
}
