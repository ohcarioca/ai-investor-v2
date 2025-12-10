# AI Investor Agent - Specification Document

## Overview

The AI Investor Agent is an intelligent conversational assistant designed to help users manage their cryptocurrency investments on the Avalanche blockchain. The agent provides investment analysis, portfolio management, token swapping capabilities, and real-time market insights through a natural language interface.

## Core Purpose

To democratize cryptocurrency investment by providing an AI-powered assistant that:
- Analyzes investment opportunities
- Executes token swaps securely
- Provides portfolio insights
- Educates users about DeFi concepts
- Manages risk through intelligent recommendations

---

## Agent Capabilities

### 1. Natural Language Understanding

The agent can understand and respond to user queries in natural language, including:

#### Investment Queries
- "What's my current portfolio balance?"
- "Should I invest in SIERRA token?"
- "What are the best performing tokens today?"
- "Show me my investment history"

#### Swap Requests
- "Swap 10 USDC for SIERRA"
- "Exchange my AVAX to USDC"
- "What's the current price of SIERRA?"
- "How much USDC will I get for 5 SIERRA?"

#### Portfolio Management
- "How much SIERRA do I own?"
- "What's my total portfolio value in USD?"
- "Show me my token balances"
- "What's my profit/loss today?"

#### Educational Questions
- "What is impermanent loss?"
- "How does a DEX work?"
- "What are gas fees?"
- "Explain liquidity pools"

---

## Functional Requirements

### 1. Wallet Integration

#### Connection
- Support for Web3 wallet connection (MetaMask, WalletConnect)
- Automatic wallet detection
- Session persistence across page reloads
- Clear connection status indicators

#### Network Requirements
- **Primary Network:** Avalanche C-Chain (Chain ID: 43114)
- **Native Token:** AVAX
- Network switching prompts when user is on wrong chain
- Validation of network before transactions

#### Security
- Read-only access to wallet balances
- User approval required for all transactions
- Clear transaction preview before execution
- No storage of private keys or seed phrases
- All sensitive operations require wallet signature

### 2. Token Swap Functionality

#### Supported Operations
1. **Quote Generation**
   - Real-time price quotes from OKX DEX aggregator
   - Slippage tolerance configuration (default: 0.5%)
   - Price impact calculation
   - Route optimization across multiple DEXes

2. **Token Approval**
   - ERC-20 token approval flow
   - Spender address verification
   - Current allowance checking
   - Approval transaction confirmation

3. **Swap Execution**
   - Transaction building with optimal routes
   - Gas estimation
   - Transaction signing via wallet
   - Transaction status monitoring
   - Success/failure notifications

#### Swap Flow
```
1. User Request → Parse intent and extract parameters
2. Validation → Check wallet connection, balances, network
3. Quote Fetch → Get current exchange rate and routing
4. Display Quote → Show user expected amounts and fees
5. Approval Check → Verify token approval if needed
6. Execute Approval → Request approval if required
7. Build Transaction → Create swap transaction data
8. Sign & Submit → User signs via wallet
9. Monitor Status → Track transaction confirmation
10. Update Balance → Refresh portfolio after success
```

#### Safety Mechanisms
- Minimum received amount calculation (slippage protection)
- Maximum price impact warnings (>5% shows warning)
- Balance validation before transaction
- Gas limit verification
- Transaction timeout handling

### 3. Portfolio Management

#### Balance Tracking
- **Native Token (AVAX)**
  - Real-time balance via RPC
  - USD value conversion
  - Transaction history

- **ERC-20 Tokens**
  - Supported tokens: USDC, SIERRA
  - Contract-based balance queries
  - Multi-token portfolio aggregation

#### Portfolio Metrics
- Total portfolio value (USD)
- Individual token values
- Token allocation percentages
- 24h change tracking (when available)
- Last update timestamp

#### Display Requirements
- Clear, readable balance formatting
- Proper decimal handling
- USD conversion for all assets
- Visual indicators for changes
- Refresh capabilities with loading states

### 4. Conversational Interface

#### Interaction Patterns

**Greeting & Introduction**
```
User: "Hello"
Agent: "Welcome to AI Investor! I'm your cryptocurrency investment assistant.
I can help you analyze tokens, swap cryptocurrencies, and manage your
portfolio on Avalanche. What would you like to do today?"
```

**Investment Analysis**
```
User: "Should I invest in SIERRA?"
Agent: [Analyzes SIERRA token]
"Let me analyze SIERRA token for you:
- Current Price: $X.XX
- Market Cap: $XX,XXX
- Liquidity: High/Medium/Low
- Recent Performance: [data]

Based on current metrics, here are the key considerations:
[Provides balanced analysis with risks and opportunities]

Would you like to swap some tokens for SIERRA?"
```

**Swap Assistance**
```
User: "Swap 10 USDC for SIERRA"
Agent: "I'll help you swap 10 USDC for SIERRA. Let me get the current quote...

Quote Details:
- You pay: 10 USDC
- You receive: ~X.XX SIERRA
- Exchange rate: 1 USDC = X.XX SIERRA
- Price impact: X.XX%
- Estimated gas: ~$X.XX

Would you like to proceed with this swap?"
```

#### Response Guidelines

**Tone & Style**
- Professional yet friendly
- Clear and concise
- Educational when appropriate
- Risk-aware but not fear-inducing
- Encouraging but realistic

**Information Hierarchy**
1. Direct answer to user's question
2. Relevant context or explanation
3. Next steps or suggestions
4. Educational notes (when relevant)

**Error Handling**
- Clear explanation of what went wrong
- Suggestions for resolution
- Alternative actions when possible
- Support resources when needed

---

## Agent Rules & Constraints

### 1. Financial Advice Limitations

**What the Agent CAN Do:**
- Provide factual market data
- Explain DeFi concepts and mechanisms
- Show historical performance
- Calculate potential outcomes
- Present risk factors

**What the Agent CANNOT Do:**
- Guarantee returns or profits
- Make definitive "buy" or "sell" recommendations
- Predict future price movements with certainty
- Provide personalized financial advice
- Replace professional financial advisors

**Required Disclaimers:**
- "This is not financial advice. Always do your own research."
- "Cryptocurrency investments carry significant risk."
- "Past performance does not guarantee future results."
- "Only invest what you can afford to lose."

### 2. Transaction Safety Rules

#### Mandatory Validations
1. **Before Any Transaction:**
   - Verify wallet is connected
   - Confirm correct network (Avalanche)
   - Check sufficient balance (including gas)
   - Validate token addresses
   - Verify user intent

2. **Before Swaps:**
   - Display clear preview with all details
   - Show price impact if >1%
   - Warn if price impact >5%
   - Block if price impact >15% (require confirmation)
   - Confirm slippage tolerance

3. **During Execution:**
   - Never skip approval steps
   - Always show transaction in wallet
   - Monitor for reverts
   - Handle errors gracefully

#### User Confirmation Required For:
- All token swaps (no amount too small)
- Token approval transactions
- Network switching
- Any transaction writing to blockchain

### 3. Data Privacy Rules

**What Can Be Stored:**
- Wallet address (public data)
- Transaction history (on-chain, public)
- User preferences (UI settings)
- Connection status

**What MUST NOT Be Stored:**
- Private keys
- Seed phrases
- Passwords
- Off-chain personal information
- Conversation history with PII

**Data Usage:**
- Read blockchain data for display
- Cache public market data temporarily
- No selling of user data
- No tracking across sessions without consent

### 4. Operational Boundaries

#### Supported Operations
- Token swaps on Avalanche C-Chain
- Balance queries for AVAX, USDC, SIERRA
- Transaction status monitoring
- Market data display

#### Unsupported Operations
- Cross-chain transfers (other chains)
- NFT transactions
- Staking/unstaking
- Governance voting
- Lending/borrowing
- Advanced DeFi strategies (for now)

#### Rate Limits
- API calls: Respect OKX DEX rate limits
- RPC calls: Batch when possible
- User actions: No artificial delays
- Error retries: Max 3 attempts with exponential backoff

---

## Integration Points

### 1. OKX DEX Aggregator API

**Purpose:** Best execution for token swaps

**Endpoints Used:**
- `getQuote()` - Get swap quotes
- `getSwapData()` - Build swap transactions
- `getTokenList()` - Available tokens (future)

**Rate Limits:**
- Follow OKX DEX documentation
- Implement exponential backoff
- Cache quotes for 10 seconds

**Error Handling:**
- Network errors: Retry up to 3 times
- Invalid parameters: Show user-friendly message
- No liquidity: Suggest alternative tokens
- API down: Graceful degradation message

### 2. Wallet Connection (RainbowKit + Wagmi)

**Supported Wallets:**
- MetaMask
- WalletConnect-compatible wallets
- Coinbase Wallet
- Other injected wallets

**Connection Flow:**
```
1. User clicks "Connect Wallet"
2. Modal displays available wallets
3. User selects preferred wallet
4. Wallet prompts for connection approval
5. App receives wallet address and chain
6. Validate correct network
7. Fetch initial balances
8. Enable transaction capabilities
```

**Session Management:**
- Auto-reconnect on page load
- Handle disconnections gracefully
- Clear state on manual disconnect
- Network change detection

### 3. OpenAI GPT Integration

**Purpose:** Natural language understanding and generation

**Model:** GPT-4 (or configured model in env)

**System Prompt:** (See implementation in `/app/api/chat/route.ts`)

**Function Calling:**
Available functions for the agent:
- `get_wallet_balance` - Fetch user's portfolio
- `get_swap_quote` - Get token swap pricing
- `execute_swap` - Perform token swap (with confirmation)

**Context Management:**
- Maintain conversation history
- Include relevant wallet state
- Clear context on new session
- Max context window: 4096 tokens

**Response Format:**
```json
{
  "response": "Agent's natural language response",
  "action": "swap|quote|balance|info|null",
  "data": { /* relevant data */ }
}
```

### 4. Avalanche RPC

**Purpose:** Blockchain interaction

**RPC Methods Used:**
- `eth_getBalance` - Native token balance
- `eth_call` - Smart contract reads
- `eth_estimateGas` - Gas estimation
- `eth_sendTransaction` - Transaction submission
- `eth_getTransactionReceipt` - Status checking

**Providers:**
- Primary: Avalanche public RPC
- Fallback: Alternative RPC endpoints
- Private RPC: For production (recommended)

---

## User Experience Guidelines

### 1. Onboarding Flow

**First Visit:**
1. Welcome message explaining capabilities
2. Prompt to connect wallet
3. Tutorial or guided tour (optional)
4. Highlight key features

**Returning User:**
1. Auto-connect wallet if permitted
2. Display portfolio summary
3. Show recent activity
4. Resume previous context (optional)

### 2. Error Messages

**Guidelines:**
- Use plain language, avoid technical jargon
- Explain what happened and why
- Provide clear next steps
- Offer help or support links

**Examples:**

❌ Bad: "RPC error: -32000"
✅ Good: "Unable to connect to Avalanche network. Please check your internet connection and try again."

❌ Bad: "Insufficient allowance"
✅ Good: "You need to approve USDC spending first. This is a one-time approval for security. Would you like to approve now?"

❌ Bad: "Slippage exceeded"
✅ Good: "The price moved while preparing your swap. Would you like to retry with the new price?"

### 3. Loading States

**Types:**
- Fetching quotes: "Getting best price..."
- Checking approval: "Checking token approval..."
- Waiting for signature: "Please confirm in your wallet..."
- Transaction pending: "Swap in progress..." (with tx link)
- Refreshing data: Subtle indicator, don't block UI

**Best Practices:**
- Show spinner for >500ms operations
- Display progress steps for multi-step flows
- Provide cancel option when possible
- Update user on long operations

### 4. Success Feedback

**After Successful Swap:**
```
✅ Swap Successful!

You swapped 10 USDC for 45.23 SIERRA

Transaction: [link to explorer]
New Balance: 45.23 SIERRA ($453.20)

Would you like to:
- Make another swap
- View your portfolio
- Learn about SIERRA
```

**After Balance Update:**
- Highlight changed amounts
- Show USD value changes
- Brief success message
- Auto-dismiss after 3 seconds

---

## Performance Requirements

### Response Times
- Chat responses: < 2 seconds
- Balance queries: < 1 second
- Swap quotes: < 3 seconds
- Transaction submission: Dependent on wallet
- Page load: < 2 seconds

### Reliability
- Uptime target: 99.5%
- Graceful degradation on API failures
- Offline detection and messaging
- Automatic error recovery

### Scalability
- Support 100+ concurrent users
- Handle 1000+ daily transactions
- Cache static data appropriately
- Optimize RPC calls

---

## Security Considerations

### Smart Contract Interactions

**Validated Contracts:**
- USDC: `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E`
- SIERRA: `0x6E6080e15f8C0010d333D8CAeEaD29292ADb78f7`
- OKX Router: (from OKX DEX API response)

**Security Checks:**
- Verify contract addresses match known addresses
- Validate transaction data before signing
- Check spender addresses for approvals
- Simulate transactions when possible

### Frontend Security
- No private key handling in frontend
- Input sanitization for all user data
- XSS prevention
- CSRF protection on API routes
- Content Security Policy headers

### API Security
- Rate limiting on backend endpoints
- API key rotation
- Secure environment variable storage
- No sensitive data in logs
- HTTPS only

---

## Future Enhancements

### Phase 2 Features
1. **Multi-Chain Support**
   - Ethereum mainnet
   - Polygon
   - Arbitrum
   - Cross-chain bridges

2. **Advanced Trading**
   - Limit orders
   - DCA (Dollar Cost Averaging)
   - Portfolio rebalancing
   - Stop-loss orders

3. **Analytics**
   - Performance tracking over time
   - Profit/loss calculation
   - Tax reporting exports
   - Investment insights

4. **Social Features**
   - Share portfolios (privacy-controlled)
   - Follow top performers
   - Community insights
   - Educational content

### Phase 3 Features
1. **DeFi Integration**
   - Yield farming suggestions
   - Staking opportunities
   - Lending/borrowing
   - Liquidity provision

2. **AI Enhancements**
   - Predictive analytics
   - Personalized strategies
   - Risk assessment
   - Market sentiment analysis

3. **Mobile App**
   - Native iOS/Android
   - Push notifications
   - Biometric security
   - Offline mode

---

## Testing Requirements

### Unit Tests
- All utility functions
- API route handlers
- React hooks
- Type validations

### Integration Tests
- Wallet connection flow
- Swap complete flow
- Balance fetching
- Error scenarios

### E2E Tests
- Complete user journeys
- Multi-step transactions
- Error recovery
- Cross-browser compatibility

### Security Tests
- Smart contract interaction safety
- Input validation
- XSS/CSRF protection
- API security

---

## Monitoring & Analytics

### Key Metrics
- Active users (daily/monthly)
- Transaction volume
- Transaction success rate
- Average response time
- Error rates by type
- User retention

### Logging
- Transaction attempts and outcomes
- API errors
- Performance bottlenecks
- User feedback
- Security events

### Alerts
- High error rates (>5%)
- API downtime
- Slow response times (>5s)
- Failed transactions (>10%)
- Security incidents

---

## Compliance & Legal

### Disclaimers
**Required on all pages:**
"This application is provided for informational purposes only and does not constitute financial advice. Cryptocurrency investments are subject to market risk. Always conduct your own research before making investment decisions."

### Terms of Service
- No guarantee of profits
- User responsibility for decisions
- No liability for losses
- Age restrictions (18+)
- Geographic restrictions (if any)

### Privacy Policy
- Data collection disclosure
- Data usage explanation
- User rights (GDPR, CCPA)
- Cookie policy
- Third-party integrations

### Regulatory Compliance
- Not a registered investment advisor
- Not a money transmitter (non-custodial)
- AML/KYC not required (DEX aggregator)
- User retains custody of funds

---

## Support & Documentation

### User Documentation
- Getting started guide
- Wallet connection help
- How to swap tokens
- Understanding fees
- Security best practices
- FAQ

### Developer Documentation
- API documentation
- Smart contract addresses
- Integration guides
- Contribution guidelines
- Code style guide

### Support Channels
- In-app help
- Discord community
- Twitter support
- GitHub issues
- Email support (for critical issues)

---

## Version History

### v1.0.0 (Current)
- Initial release
- Wallet connection (Avalanche)
- Token swaps (AVAX, USDC, SIERRA)
- Portfolio tracking
- AI chat assistant
- Basic error handling

### Roadmap
- v1.1.0: Enhanced UI/UX, more tokens
- v1.2.0: Transaction history
- v2.0.0: Multi-chain support
- v3.0.0: Advanced DeFi features

---

## Contact & Maintenance

**Repository:** [GitHub URL]
**Lead Developer:** [Contact]
**Support:** [Support Email]
**Last Updated:** December 10, 2025

---

*This specification is a living document and will be updated as the AI Investor Agent evolves.*
