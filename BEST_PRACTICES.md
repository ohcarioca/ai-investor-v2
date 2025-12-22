# Best Practices Guide - Kira AI Investor Agent

## Table of Contents

- [Language Requirements](#language-requirements)
- [Project Overview](#project-overview)
- [Code Style & Structure](#code-style--structure)
- [TypeScript Guidelines](#typescript-guidelines)
- [React & Next.js Best Practices](#react--nextjs-best-practices)
- [Component Development](#component-development)
- [State Management](#state-management)
- [API Integration](#api-integration)
- [Error Handling](#error-handling)
- [Accessibility](#accessibility)
- [Performance Optimization](#performance-optimization)
- [Security Guidelines](#security-guidelines)
- [Testing Strategy](#testing-strategy)
- [Git Workflow](#git-workflow)
- [Deployment](#deployment)

---

## Language Requirements

### ⚠️ MANDATORY: English Only

**ALL code, comments, documentation, and commit messages MUST be written in English.**

This is a **non-negotiable requirement** for this project.

#### What Must Be in English:

✅ **Code:**

```typescript
// ✅ CORRECT - English
function calculateTotalBalance(amount: number): number {
  return amount * 1.1;
}

// ❌ WRONG - Other languages
function calcularSaldoTotal(cantidad: number): number {
  return cantidad * 1.1;
}
```

✅ **Comments:**

```typescript
// ✅ CORRECT - English
// Calculate the user's total portfolio value
const total = calculatePortfolio();

// ❌ WRONG - Other languages
// Calcular o valor total do portfólio do usuário
const total = calculatePortfolio();
```

✅ **Variable & Function Names:**

```typescript
// ✅ CORRECT - English
const userBalance = 1000;
const errorMessage = 'Invalid input';

// ❌ WRONG - Other languages
const saldoUsuario = 1000;
const mensagemErro = 'Entrada inválida';
```

✅ **Type Definitions:**

```typescript
// ✅ CORRECT - English
interface UserProfile {
  name: string;
  balance: number;
  lastLogin: Date;
}

// ❌ WRONG - Other languages
interface PerfilUsuario {
  nome: string;
  saldo: number;
  ultimoAcesso: Date;
}
```

✅ **Commit Messages:**

```bash
# ✅ CORRECT - English
git commit -m "feat(chat): add message retry functionality"

# ❌ WRONG - Other languages
git commit -m "feat(chat): adicionar funcionalidade de tentar novamente"
```

✅ **Documentation:**

```markdown
<!-- ✅ CORRECT - English -->

# User Authentication

This component handles user login and session management.

<!-- ❌ WRONG - Other languages -->

# Autenticação de Usuário

Este componente gerencia login e sessões de usuário.
```

✅ **Error Messages (Developer-Facing):**

```typescript
// ✅ CORRECT - English (for developers)
throw new Error('Failed to connect to database');

// ❌ WRONG - Other languages
throw new Error('Falha ao conectar ao banco de dados');
```

#### User-Facing Content Exception:

**ONLY user-facing content** (UI text, customer error messages) may be in other languages:

```typescript
// ✅ ACCEPTABLE - User-facing content in Portuguese
const userMessage = {
  success: 'Mensagem enviada com sucesso!',
  error: 'Desculpe, ocorreu um erro.',
};

// But the code around it must be in English:
function displayUserMessage(type: 'success' | 'error'): void {
  const message = userMessage[type];
  showNotification(message);
}
```

#### Rationale:

1. **Collaboration**: English is the universal language for software development
2. **Code Review**: Easier for international team members and contributors
3. **Maintenance**: Future developers can understand and maintain the code
4. **Best Practices**: Industry standard for professional software projects
5. **Libraries & Frameworks**: All dependencies use English conventions

#### Enforcement:

- Code reviews will **reject** pull requests with non-English code
- Linters should be configured to flag non-English identifiers
- Documentation must be in English

---

## Project Overview

This project is a Web3-enabled AI financial assistant built with:

- **Next.js 16** (App Router + Turbopack for dev)
- **React 19**
- **TypeScript 5**
- **Tailwind CSS 4**
- **Wagmi + RainbowKit** for Web3 integration

---

## Code Style & Structure

### File Organization

```
ai-investor-agent/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with metadata
│   ├── page.tsx           # Main page component
│   └── globals.css        # Global styles
├── components/            # Reusable UI components
│   ├── Header.tsx
│   ├── ChatInput.tsx
│   └── ...
├── hooks/                 # Custom React hooks
│   └── useChat.ts
├── lib/                   # Utility functions & configurations
│   └── wagmi.ts
├── types/                 # TypeScript type definitions
│   ├── chat.ts
│   └── wallet.ts
└── public/                # Static assets
```

### Naming Conventions

- **Components**: PascalCase (e.g., `ChatInput.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useChat.ts`)
- **Types/Interfaces**: PascalCase (e.g., `Message`, `ChatResponse`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `WEBHOOK_URL`)
- **Functions**: camelCase (e.g., `sendMessage`, `handleSubmit`)

### Import Order

```typescript
// 1. React & Next.js
import { useState } from 'react';
import type { Metadata } from 'next';

// 2. Third-party libraries
import { useAccount } from 'wagmi';
import { Bell, Settings } from 'lucide-react';

// 3. Internal imports (absolute paths with @/)
import { useChat } from '@/hooks/useChat';
import ChatInput from '@/components/ChatInput';
import type { Message } from '@/types/chat';

// 4. Relative imports
import './styles.css';
```

---

## TypeScript Guidelines

### Type Safety

✅ **DO:**

```typescript
// Use explicit types for function parameters
function sendMessage(content: string): Promise<void> {
  // ...
}

// Use interfaces for object shapes
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Use union types for limited options
type Status = 'idle' | 'loading' | 'success' | 'error';
```

❌ **DON'T:**

```typescript
// Avoid using 'any' unless absolutely necessary
function processData(data: any) {} // Bad

// Don't use implicit any
const config = {}; // Implicit any

// Avoid type assertions unless necessary
const value = data as SomeType; // Use sparingly
```

### Type Exports

```typescript
// Export types alongside implementations
export interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  // ...
}
```

---

## React & Next.js Best Practices

### Client vs Server Components

```typescript
// Server Component (default in App Router)
// No 'use client' directive needed
export default function ServerComponent() {
  // Can directly access backend resources
  return <div>Server-rendered content</div>;
}

// Client Component (requires 'use client')
'use client';

import { useState } from 'react';

export default function ClientComponent() {
  const [state, setState] = useState(false);
  return <button onClick={() => setState(!state)}>Toggle</button>;
}
```

**When to use Client Components:**

- Need React hooks (useState, useEffect, etc.)
- Event handlers (onClick, onChange, etc.)
- Browser-only APIs (localStorage, window, etc.)
- Third-party libraries that use hooks

### Metadata Management

```typescript
// app/layout.tsx or app/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kira AI Investor Agent',
  description: 'AI-powered financial assistant for Web3',
  keywords: ['AI', 'Web3', 'DeFi'],
  openGraph: {
    title: 'Kira AI Investor Agent',
    description: 'Your Web3 financial assistant',
    type: 'website',
  },
};
```

---

## Component Development

### Component Structure

```typescript
'use client';

// 1. Imports
import { useState } from 'react';
import { Send } from 'lucide-react';

// 2. Type definitions
interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

// 3. Component
export default function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  // 3a. Hooks
  const [message, setMessage] = useState('');

  // 3b. Event handlers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('');
    }
  };

  // 3c. Render
  return (
    <form onSubmit={handleSubmit}>
      {/* JSX */}
    </form>
  );
}
```

### Responsive Design

Use Tailwind's responsive prefixes consistently:

```tsx
<div
  className="
  px-4 sm:px-6           // Padding
  text-sm sm:text-base   // Text size
  hidden lg:block        // Visibility
  grid grid-cols-1 md:grid-cols-2  // Layout
"
>
  {/* Content */}
</div>
```

**Breakpoints:**

- `sm`: 640px (mobile landscape)
- `md`: 768px (tablet)
- `lg`: 1024px (desktop)
- `xl`: 1280px (large desktop)

### Accessibility

Always include:

```tsx
// Semantic HTML
<button type="submit" aria-label="Send message">
  <Send />
</button>

// Alt text for images
<img src="/logo.png" alt="Kira AI Logo" />

// Form labels
<label htmlFor="message-input">Message</label>
<input id="message-input" type="text" />

// ARIA attributes where needed
<div role="status" aria-live="polite">
  {isLoading && "Loading..."}
</div>
```

---

## State Management

### Custom Hooks Pattern

```typescript
// hooks/useChat.ts
import { useState, useCallback } from 'react';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    // Implementation
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
  };
}
```

### When to Use useCallback

✅ **DO use:**

```typescript
// When passing functions to optimized child components
const handleClick = useCallback(() => {
  // Function passed to memoized component
}, [dependency]);

<MemoizedComponent onClick={handleClick} />
```

❌ **DON'T use unnecessarily:**

```typescript
// Not needed for simple event handlers
const handleClick = () => console.log('clicked'); // OK without useCallback
```

---

## API Integration

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_WEBHOOK_URL=https://api.example.com/webhook
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Private variables (server-side only)
API_SECRET_KEY=secret_value
```

**Rules:**

- Use `NEXT_PUBLIC_` prefix for client-accessible variables
- Never commit `.env.local` to git
- Provide `.env.example` with dummy values

### Fetch with Error Handling

```typescript
async function fetchData() {
  try {
    // Timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}
```

---

## Error Handling

### Error Boundaries

```typescript
// components/ErrorBoundary.tsx
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong</div>;
    }

    return this.props.children;
  }
}
```

### User-Friendly Error Messages

```typescript
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('Failed to fetch')) {
      return 'Network error. Please check your connection.';
    }
    // Timeout errors
    if (error.name === 'AbortError') {
      return 'Request timed out. Please try again.';
    }
    return error.message;
  }
  return 'An unexpected error occurred.';
}
```

---

## Accessibility

### WCAG 2.1 AA Compliance

**Color Contrast:**

- Normal text: 4.5:1 minimum
- Large text (18pt+): 3:1 minimum

**Keyboard Navigation:**

```tsx
// Ensure all interactive elements are keyboard accessible
<button onClick={handleClick} onKeyDown={(e) => e.key === 'Enter' && handleClick()} tabIndex={0}>
  Click me
</button>
```

**Focus Management:**

```tsx
// Show focus indicators
<button className="focus:ring-2 focus:ring-purple-500 focus:outline-none">Button</button>
```

**Screen Reader Support:**

```tsx
// Use semantic HTML
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/">Home</a></li>
  </ul>
</nav>

// Announce dynamic content
<div role="status" aria-live="polite">
  {isLoading && "Loading..."}
</div>
```

---

## Performance Optimization

### Code Splitting

```typescript
// Dynamic imports for heavy components
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false, // Disable SSR if not needed
});
```

### Image Optimization

```tsx
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={100}
  priority // For above-the-fold images
/>;
```

### Memoization

```typescript
import { memo, useMemo } from 'react';

// Memoize expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

// Memoize components
const MemoizedComponent = memo(function Component({ data }) {
  return <div>{data}</div>;
});
```

---

## Security Guidelines

### Input Validation

```typescript
// Sanitize user input
function sanitizeInput(input: string): string {
  return input.trim().slice(0, 1000); // Max length
}

// Validate before processing
if (!input || input.length > 1000) {
  throw new Error('Invalid input');
}
```

### XSS Prevention

```tsx
// React automatically escapes content
<div>{userInput}</div>; // Safe

// Be careful with dangerouslySetInnerHTML
// Only use with sanitized content
import DOMPurify from 'isomorphic-dompurify';

<div
  dangerouslySetInnerHTML={{
    __html: DOMPurify.sanitize(htmlContent),
  }}
/>;
```

### Environment Secrets

```typescript
// ❌ NEVER expose secrets in client code
const API_KEY = 'secret_key'; // Bad!

// ✅ Use server-side API routes
// app/api/secure/route.ts
export async function POST(request: Request) {
  const API_KEY = process.env.API_SECRET_KEY; // Server-side only
  // Use API_KEY here
}
```

---

## Testing Strategy

### Unit Tests (Recommended)

```typescript
// __tests__/hooks/useChat.test.ts
import { renderHook, act } from '@testing-library/react';
import { useChat } from '@/hooks/useChat';

describe('useChat', () => {
  it('should send a message', async () => {
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe('Hello');
  });
});
```

### Component Tests

```typescript
// __tests__/components/ChatInput.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import ChatInput from '@/components/ChatInput';

describe('ChatInput', () => {
  it('should call onSendMessage when form is submitted', () => {
    const mockSend = jest.fn();
    render(<ChatInput onSendMessage={mockSend} isLoading={false} />);

    const input = screen.getByPlaceholderText('Message Kira...');
    fireEvent.change(input, { target: { value: 'Test message' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    expect(mockSend).toHaveBeenCalledWith('Test message');
  });
});
```

---

## Git Workflow

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: <type>(<scope>): <subject>

feat(chat): add message retry functionality
fix(wallet): resolve connection timeout issue
docs(readme): update installation instructions
style(header): improve mobile responsiveness
refactor(hooks): simplify useChat error handling
test(chat): add unit tests for sendMessage
chore(deps): update dependencies to latest versions
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Branch Naming

```bash
feature/add-dark-mode
fix/wallet-connection-timeout
refactor/simplify-error-handling
docs/update-api-contract
```

---

## Deployment

### Build Configuration

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('pino-pretty', 'lokijs', 'encoding');
    }
    return config;
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
```

### Pre-Deployment Checklist

- [ ] Run `npm run build` successfully
- [ ] Test production build locally: `npm run start`
- [ ] Check for console errors/warnings
- [ ] Verify all environment variables are set
- [ ] Test on mobile devices
- [ ] Run accessibility audit (Lighthouse)
- [ ] Check performance metrics (Core Web Vitals)
- [ ] Update documentation
- [ ] Create git tag for release

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

**Environment Variables in Vercel:**

1. Go to Project Settings → Environment Variables
2. Add `NEXT_PUBLIC_*` variables for client-side
3. Add server-only variables without prefix

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Wagmi Documentation](https://wagmi.sh)
- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)

---

## Project-Specific Conventions

### Webhook Integration

```typescript
// Always use environment variable for webhook URL
const WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBHOOK_URL || 'fallback-url';

// Request format
{
  "message": "user message",
  "timestamp": "ISO 8601 timestamp"
}

// Expected response format
{
  "response": "assistant response"
}
```

### Web3 Integration

```typescript
// Always check wallet connection
const { isConnected, address } = useAccount();

if (!isConnected) {
  // Show connect wallet prompt
}

// Verify correct network (Avalanche)
if (chain?.id !== 43114) {
  // Show network switch prompt
}
```

### Color Palette

```css
/* Primary Colors */
--purple-600: #9333ea --pink-500: #ec4899 /* Gradients */ .gradient-primary
  {background: linear-gradient(to right, #9333ea, #ec4899) ;} /* Neutral Colors */
  --gray-50: #f9fafb --gray-900: #111827;
```

---

**Last Updated:** December 9, 2025
**Version:** 1.0.0
**Maintainer:** KiraFin Team
