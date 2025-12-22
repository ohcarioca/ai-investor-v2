/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
// In production, consider using Redis for distributed rate limiting
const requestCounts = new Map<string, RateLimitRecord>();

// Configuration
const DEFAULT_WINDOW_MS = 60000; // 1 minute
const DEFAULT_MAX_REQUESTS = 60; // 60 requests per minute

interface RateLimitConfig {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: NextRequest) => string;
  skipFailedRequests?: boolean;
  message?: string;
}

/**
 * Get client identifier from request
 */
function getClientId(req: NextRequest): string {
  // Try to get the real IP from various headers
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');

  // Use the first IP from x-forwarded-for if available
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return cfConnectingIp || realIp || 'unknown';
}

/**
 * Clean up expired entries periodically
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(key);
    }
  }
}

// Clean up every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
}

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(clientId: string, config: RateLimitConfig = {}): RateLimitResult {
  const windowMs = config.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = config.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const now = Date.now();

  const record = requestCounts.get(clientId);

  // If no record or expired, create new one
  if (!record || now > record.resetTime) {
    requestCounts.set(clientId, {
      count: 1,
      resetTime: now + windowMs,
    });

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
      limit: maxRequests,
    };
  }

  // Check if limit exceeded
  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
      limit: maxRequests,
    };
  }

  // Increment count
  record.count++;

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime,
    limit: maxRequests,
  };
}

/**
 * Rate limiting middleware for Next.js API routes
 * Returns null if allowed, or a 429 response if rate limited
 */
export function rateLimit(req: NextRequest, config: RateLimitConfig = {}): NextResponse | null {
  const keyGenerator = config.keyGenerator ?? getClientId;
  const clientId = keyGenerator(req);
  const message = config.message ?? 'Too many requests. Please try again later.';

  const result = checkRateLimit(clientId, config);

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);

    return NextResponse.json(
      {
        error: message,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
        },
      }
    );
  }

  return null;
}

/**
 * Add rate limit headers to a successful response
 */
export function addRateLimitHeaders(response: NextResponse, result: RateLimitResult): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(result.limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));
  return response;
}

/**
 * Create a rate limiter with custom configuration
 * Usage:
 * const chatLimiter = createRateLimiter({ maxRequests: 30, windowMs: 60000 });
 * const result = chatLimiter(req);
 */
export function createRateLimiter(config: RateLimitConfig = {}) {
  return (req: NextRequest): NextResponse | null => rateLimit(req, config);
}

// Pre-configured limiters for different endpoints
export const chatRateLimiter = createRateLimiter({
  maxRequests: 30, // 30 requests per minute for chat
  windowMs: 60000,
  message: 'Chat rate limit exceeded. Please wait before sending more messages.',
});

export const swapRateLimiter = createRateLimiter({
  maxRequests: 20, // 20 requests per minute for swap operations
  windowMs: 60000,
  message: 'Swap rate limit exceeded. Please wait before making more swap requests.',
});

export const balanceRateLimiter = createRateLimiter({
  maxRequests: 60, // 60 requests per minute for balance checks
  windowMs: 60000,
  message: 'Balance check rate limit exceeded. Please wait before checking again.',
});
