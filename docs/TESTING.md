# Testing Guide

This document provides comprehensive instructions for testing the AI Investor Agent application.

## Table of Contents

- [Overview](#overview)
- [Test Stack](#test-stack)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Structure](#test-structure)
- [Mocking Guidelines](#mocking-guidelines)
- [Coverage Requirements](#coverage-requirements)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

---

## Overview

The AI Investor Agent uses **Vitest** as its primary testing framework, chosen for its:

- ⚡ Fast execution with native ES modules support
- 🔄 Watch mode with instant feedback
- 📊 Built-in coverage reporting
- 🎯 Jest-compatible API
- ⚛️ First-class React Testing Library integration

### Test Categories

| Type                  | Location                   | Purpose                               |
| --------------------- | -------------------------- | ------------------------------------- |
| **Unit Tests**        | `lib/**/*.test.ts`         | Test individual functions and classes |
| **Component Tests**   | `components/**/*.test.tsx` | Test React components in isolation    |
| **Hook Tests**        | `hooks/**/*.test.ts`       | Test custom React hooks               |
| **Integration Tests** | `app/api/**/*.test.ts`     | Test API routes end-to-end            |

---

## Test Stack

### Dependencies

```json
{
  "devDependencies": {
    "vitest": "^4.0.15",
    "@vitest/ui": "^4.0.15",
    "@vitest/coverage-v8": "^4.0.15",
    "@testing-library/react": "^16.3.0",
    "@testing-library/jest-dom": "^6.9.1",
    "jsdom": "^27.3.0"
  }
}
```

### Configuration Files

- **`vitest.config.ts`** - Main Vitest configuration
- **`tests/setup.ts`** - Global test setup and mocks
- **`tsconfig.json`** - TypeScript configuration with Vitest types

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Verify Test Setup

```bash
npm run test:run
```

You should see output similar to:

```
✓ lib/wallet-validation.test.ts (24 tests)
✓ lib/tools/registry.test.ts (16 tests)

Test Files  2 passed (2)
Tests       40 passed (40)
```

---

## Running Tests

### Available Commands

| Command                 | Description                           |
| ----------------------- | ------------------------------------- |
| `npm run test`          | Run tests in watch mode (development) |
| `npm run test:run`      | Run tests once and exit               |
| `npm run test:ui`       | Open Vitest UI in browser             |
| `npm run test:coverage` | Run tests with coverage report        |

### Watch Mode (Recommended for Development)

```bash
npm run test
```

Features:

- Automatically re-runs tests on file changes
- Press `f` to run only failed tests
- Press `a` to run all tests
- Press `q` to quit

### Visual UI Mode

```bash
npm run test:ui
```

Opens an interactive browser-based UI at `http://localhost:51204/__vitest__/` with:

- Test tree visualization
- Real-time test execution
- Coverage visualization
- Test filtering and search

### Coverage Report

```bash
npm run test:coverage
```

Generates reports in multiple formats:

- **Terminal** - Summary in console output
- **HTML** - Detailed report at `coverage/index.html`
- **LCOV** - Machine-readable format at `coverage/lcov.info`

---

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ModuleName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('functionName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = functionName(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Testing React Components

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Hello" />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const onClickMock = vi.fn();
    render(<MyComponent onClick={onClickMock} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onClickMock).toHaveBeenCalledTimes(1);
  });
});
```

### Testing Custom Hooks

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('should increment counter', () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });
});
```

### Testing Async Functions

```typescript
import { describe, it, expect, vi } from 'vitest';
import { fetchData } from './api';

describe('fetchData', () => {
  it('should fetch and return data', async () => {
    // Mock fetch
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: 'test' }),
    } as Response);

    const result = await fetchData();

    expect(result).toEqual({ data: 'test' });
  });

  it('should handle errors', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

    await expect(fetchData()).rejects.toThrow('Network error');
  });
});
```

---

## Test Structure

### Directory Layout

```
ai-investor-agent/
├── tests/
│   └── setup.ts              # Global test setup
├── lib/
│   ├── wallet-validation.ts
│   ├── wallet-validation.test.ts    # Unit tests co-located
│   ├── tools/
│   │   ├── registry.ts
│   │   └── registry.test.ts
│   └── services/
│       └── transaction/
│           ├── TransactionBuilder.ts
│           └── TransactionBuilder.test.ts
├── components/
│   ├── ChatInput.tsx
│   └── ChatInput.test.tsx
├── hooks/
│   ├── useChat.ts
│   └── useChat.test.ts
└── vitest.config.ts
```

### Naming Conventions

| Convention        | Example                     |
| ----------------- | --------------------------- |
| Test file suffix  | `*.test.ts` or `*.test.tsx` |
| Describe blocks   | Feature or module name      |
| Test descriptions | Start with "should"         |

---

## Mocking Guidelines

### Global Setup (tests/setup.ts)

The setup file pre-configures common mocks:

```typescript
// Environment variables
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.OKX_API_KEY = 'test-okx-key';
// ... more env vars

// Global fetch mock
global.fetch = vi.fn();

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

### Mocking Modules

```typescript
// Mock entire module
vi.mock('./config', () => ({
  getConfig: vi.fn((path: string) => {
    // Return mock config based on path
  }),
}));

// Mock specific exports
vi.mock('./api', async () => {
  const actual = await vi.importActual('./api');
  return {
    ...actual,
    fetchData: vi.fn(),
  };
});
```

### Mocking External APIs

```typescript
describe('API integration', () => {
  it('should call external API', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        code: '0',
        data: [{ fromToken: 'USDC', toToken: 'SIERRA' }],
      }),
    } as Response);

    const result = await getQuote('USDC', 'SIERRA', '100');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/swap/quote'),
      expect.any(Object)
    );
  });
});
```

### Mocking React Context

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Component with React Query', () => {
  it('should render with provider', () => {
    render(<MyComponent />, { wrapper: createWrapper() });
  });
});
```

---

## Coverage Requirements

### Current Thresholds

Defined in `vitest.config.ts`:

```typescript
coverage: {
  thresholds: {
    statements: 60,
    branches: 60,
    functions: 60,
    lines: 60,
  },
}
```

### Target Coverage by Module

| Module                     | Current | Target |
| -------------------------- | ------- | ------ |
| `lib/tools/`               | 85%     | 90%    |
| `lib/services/`            | 70%     | 85%    |
| `lib/wallet-validation.ts` | 95%     | 95%    |
| `components/`              | 40%     | 70%    |
| `hooks/`                   | 30%     | 70%    |

### Generating Coverage Report

```bash
npm run test:coverage
```

Then open `coverage/index.html` in your browser:

```bash
# macOS
open coverage/index.html

# Windows
start coverage/index.html

# Linux
xdg-open coverage/index.html
```

---

## CI/CD Integration

### GitHub Actions Workflow

Tests run automatically on:

- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`

Configuration in `.github/workflows/pr-checks.yml`:

```yaml
jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:run
      - run: npm run build
```

### Pre-commit Hooks (Optional)

To run tests before commits, set up Husky:

```bash
npm install -D husky lint-staged
npx husky init
echo "npm run test:run" > .husky/pre-commit
```

---

## Troubleshooting

### Common Issues

#### 1. "No test suite found in file"

**Cause:** Test file not properly importing Vitest functions.

**Solution:** Ensure `tsconfig.json` includes Vitest types:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

#### 2. Tests timing out

**Cause:** Async operations not completing.

**Solution:**

- Check for unresolved promises
- Increase timeout in `vitest.config.ts`:

```typescript
test: {
  testTimeout: 10000, // 10 seconds
}
```

#### 3. Mock not working

**Cause:** Module not properly mocked.

**Solution:**

- Ensure `vi.mock()` is called before imports
- Use `vi.mocked()` for type-safe mock access
- Check mock reset in `beforeEach`

#### 4. Import errors

**Cause:** Path aliases not resolved.

**Solution:** Verify `vitest.config.ts` has correct alias:

```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './'),
  },
},
```

### Debug Mode

Run tests with verbose output:

```bash
npx vitest --reporter=verbose
```

Run a single test file:

```bash
npx vitest lib/wallet-validation.test.ts
```

Run tests matching a pattern:

```bash
npx vitest --grep "should validate"
```

---

## Best Practices

### Do's ✅

- Write tests before or alongside code (TDD/BDD)
- Keep tests focused and independent
- Use descriptive test names
- Mock external dependencies
- Clean up after each test
- Test edge cases and error conditions

### Don'ts ❌

- Don't test implementation details
- Don't share state between tests
- Don't make tests dependent on order
- Don't ignore flaky tests
- Don't commit with failing tests

### Test Quality Checklist

- [ ] Tests are isolated (no shared state)
- [ ] Tests cover happy path and error cases
- [ ] Tests are readable and maintainable
- [ ] Mocks are realistic
- [ ] Assertions are specific
- [ ] No console.log statements

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
- [React Hooks Testing](https://react-hooks-testing-library.com/)

---

## Contributing

When adding new features:

1. Write tests for the new functionality
2. Ensure existing tests pass
3. Maintain or improve coverage
4. Update this documentation if needed

For questions or issues, open a GitHub issue or reach out to the team.
