# Kira AI Investor Agent

A conversational AI agent interface for cryptocurrency investment assistance on the Avalanche blockchain. Built with Next.js 16, React 19, and TypeScript.

## Features

### AI-Powered Chat Interface

- **Real-time conversational chat** with OpenAI GPT-4o integration
- **Function calling** for executing blockchain operations
- **Multi-language support** (English, Portuguese, Spanish, French)
- **Message history** with auto-scroll

### DeFi Operations

- 💱 **Token Swaps** - Swap between USDC, SIERRA, and AVAX via OKX DEX Aggregator
- 💰 **Investments** - Convert USDC to SIERRA tokens
- 🏦 **Withdrawals** - Convert SIERRA back to USDC
- 📊 **Portfolio Charts** - Visual representation of holdings and performance

### Wallet Integration

- **RainbowKit** for seamless wallet connection
- **Wagmi** hooks for blockchain interactions
- **Multi-wallet support** (MetaMask, WalletConnect, Coinbase Wallet)
- **Avalanche C-Chain** network support

## Tech Stack

| Category  | Technology                    |
| --------- | ----------------------------- |
| Framework | Next.js 16.0.8 (App Router)   |
| UI        | React 19.2.1                  |
| Language  | TypeScript 5                  |
| Styling   | Tailwind CSS 4                |
| Web3      | Wagmi 2, Viem 2, RainbowKit 2 |
| AI        | OpenAI GPT-4o                 |
| DEX       | OKX DEX Aggregator SDK        |
| Testing   | Vitest, React Testing Library |
| Icons     | Lucide React                  |

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- A wallet with Avalanche C-Chain support

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/ai-investor-agent.git
cd ai-investor-agent

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your API keys
```

### Environment Variables

Create a `.env.local` file with:

```env
# OpenAI (Required)
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_MODEL=gpt-4o

# OKX DEX (Required for swaps)
OKX_API_KEY=your-okx-api-key
OKX_SECRET_KEY=your-okx-secret-key
OKX_API_PASSPHRASE=your-passphrase
OKX_PROJECT_ID=your-project-id

# WalletConnect (Required)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-wc-project-id

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Development

```bash
# Start development server with Turbopack
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
# Create optimized build
npm run build

# Start production server
npm start
```

## Available Scripts

| Script                  | Description               |
| ----------------------- | ------------------------- |
| `npm run dev`           | Start development server  |
| `npm run build`         | Create production build   |
| `npm start`             | Start production server   |
| `npm run lint`          | Run ESLint                |
| `npm run format`        | Format code with Prettier |
| `npm run format:check`  | Check code formatting     |
| `npm run test`          | Run tests in watch mode   |
| `npm run test:run`      | Run tests once            |
| `npm run test:ui`       | Open Vitest UI            |
| `npm run test:coverage` | Generate coverage report  |

## Project Structure

```
ai-investor-agent/
├── app/
│   ├── api/
│   │   ├── chat/           # AI chat endpoint
│   │   ├── swap/           # DEX swap endpoints
│   │   ├── wallet/         # Wallet balance endpoint
│   │   └── charts/         # Chart data endpoint
│   ├── page.tsx            # Main chat interface
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Global styles
├── components/
│   ├── charts/             # Chart components
│   ├── swap/               # Swap UI components
│   ├── Header.tsx
│   ├── ChatInput.tsx
│   ├── ChatMessage.tsx
│   ├── ChatHistory.tsx
│   ├── PortfolioOverview.tsx
│   └── WalletButton.tsx
├── hooks/
│   ├── useChat.ts          # Chat state management
│   ├── useWalletBalance.ts # Balance fetching
│   ├── useSwapExecution.ts # Swap execution
│   └── ...
├── lib/
│   ├── tools/              # AI agent tools
│   │   ├── base/           # Base classes and types
│   │   ├── implementations/ # Tool implementations
│   │   └── registry.ts     # Tool registry
│   ├── services/           # Shared services
│   │   ├── token/          # Token registry
│   │   └── transaction/    # Transaction building
│   ├── middleware/         # API middleware
│   ├── cache/              # Caching utilities
│   ├── config.ts           # Configuration loader
│   └── wallet-validation.ts
├── types/                  # TypeScript types
├── config/                 # Configuration files
├── tests/                  # Test setup
├── docs/                   # Documentation
└── .github/workflows/      # CI/CD pipelines
```

## Testing

We use **Vitest** with React Testing Library for testing.

### Quick Commands

```bash
# Run all tests
npm run test:run

# Watch mode (recommended for development)
npm run test

# Interactive UI
npm run test:ui

# Coverage report
npm run test:coverage
```

### Current Test Coverage

| Module                     | Coverage |
| -------------------------- | -------- |
| `lib/wallet-validation.ts` | 95%      |
| `lib/tools/registry.ts`    | 85%      |

📚 For detailed testing instructions, see [docs/TESTING.md](docs/TESTING.md).

## Architecture

### Modular Tool System

The AI agent uses a modular tool architecture:

```
ToolRegistry
├── Balance Tools
│   ├── get_wallet_balance
│   ├── get_investment_data
│   └── generate_chart
├── Investment Tools
│   ├── invest
│   ├── confirm_invest
│   ├── withdraw
│   └── confirm_withdraw
└── Swap Tools
    ├── swap_tokens
    └── confirm_swap
```

### Service Layer

Shared services eliminate code duplication:

- **TokenRegistry** - Token addresses and decimals
- **QuoteFetcher** - DEX quote fetching
- **TransactionBuilder** - Approval and swap transaction building

### Caching

In-memory caching for performance:

- **Quote cache** - 10 seconds TTL
- **Balance cache** - 30 seconds TTL
- **Price cache** - 60 seconds TTL

## API Endpoints

| Endpoint                 | Method | Description                   |
| ------------------------ | ------ | ----------------------------- |
| `/api/chat`              | POST   | AI chat with function calling |
| `/api/swap/quote`        | GET    | Get swap quote                |
| `/api/swap/build`        | POST   | Build swap transaction        |
| `/api/swap/approval`     | POST   | Check/build approval          |
| `/api/wallet/balance`    | POST   | Get wallet balances           |
| `/api/charts/historical` | GET    | Get chart data                |

## Security

### Implemented

- ✅ Wallet address validation
- ✅ Environment variable validation
- ✅ Rate limiting middleware
- ✅ Security scan CI/CD workflow

### Best Practices

- Never commit `.env.local` to version control
- Rotate API keys if exposed
- Use HTTPS in production
- Validate all user inputs

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

See [VERCEL_DEPLOY.md](VERCEL_DEPLOY.md) for detailed instructions.

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Documentation

| Document                                 | Description             |
| ---------------------------------------- | ----------------------- |
| [TESTING.md](docs/TESTING.md)            | Testing guide           |
| [VERCEL_DEPLOY.md](VERCEL_DEPLOY.md)     | Deployment guide        |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Common issues           |
| [API_CONTRACT.md](API_CONTRACT.md)       | API documentation       |
| [CONFIG_GUIDE.md](CONFIG_GUIDE.md)       | Configuration reference |

## License

Copyright © 2025 KiraFin. All rights reserved.
