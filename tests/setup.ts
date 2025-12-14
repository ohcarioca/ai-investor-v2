/**
 * Vitest Test Setup
 * This file runs before each test file
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables for tests
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.OKX_API_KEY = 'test-okx-key';
process.env.OKX_SECRET_KEY = 'test-okx-secret';
process.env.OKX_API_PASSPHRASE = 'test-passphrase';
process.env.OKX_PROJECT_ID = 'test-project-id';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID = 'test-wc-id';

// Mock fetch globally
global.fetch = vi.fn();

// Mock console methods to keep test output clean
// Uncomment if you want to suppress console output in tests
// vi.spyOn(console, 'log').mockImplementation(() => {});
// vi.spyOn(console, 'warn').mockImplementation(() => {});
// vi.spyOn(console, 'error').mockImplementation(() => {});

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Cleanup after each test
afterEach(() => {
  vi.restoreAllMocks();
});
