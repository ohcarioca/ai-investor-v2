# 🔐 Critical Wallet Rules Configuration

## ⚠️ IMPORTANT: Wallet Data Source Policy

The AI Investor Agent has **strict rules** about wallet data usage to ensure security and prevent errors.

## 🚨 Mandatory Rules

### 1. **ALWAYS Use Connected Wallet**

```json
{
  "capabilities": {
    "wallet_management": {
      "always_use_connected_wallet": true,
      "require_wallet_for_operations": true
    }
  }
}
```

**What this means:**

- ✅ Agent MUST use the wallet address from Web3 connection
- ❌ Agent MUST NEVER use hardcoded addresses
- ❌ Agent MUST NEVER use example/placeholder addresses
- ❌ Agent MUST NEVER assume or guess wallet addresses

### 2. **Wallet Data Source Rules**

```json
{
  "capabilities": {
    "wallet_management": {
      "wallet_data_source": {
        "rules": [
          "Never use hardcoded or example wallet addresses",
          "All balance queries must use the connected wallet address",
          "All transactions must originate from the connected wallet",
          "If wallet is not connected, block operations and request connection",
          "Validate wallet connection before any blockchain operation",
          "Never assume or guess wallet addresses",
          "Use wallet context from Web3 provider only"
        ]
      }
    }
  }
}
```

### 3. **System Prompt Requirements**

The system prompt explicitly states:

```
IMPORTANT RULES:
1. ALWAYS use data from the connected wallet - never use hardcoded addresses or example data
2. ALL operations (swaps, balance checks, transactions) MUST use the connected wallet address
3. If no wallet is connected, prompt the user to connect their wallet before proceeding
4. Never make assumptions about wallet addresses - always verify the connection status
5. When fetching balances or executing transactions, use only the authenticated wallet context
```

## ✅ Correct Implementation

### Example 1: Balance Check

```typescript
// ✅ CORRECT - Uses connected wallet
import { useAccount } from 'wagmi';

function BalanceDisplay() {
  const { address, isConnected } = useAccount();

  if (!isConnected || !address) {
    return <div>Please connect your wallet</div>;
  }

  // Use the connected address
  const balance = await fetchBalance(address);
  return <div>Balance: {balance}</div>;
}
```

```typescript
// ❌ WRONG - Uses hardcoded address
function BalanceDisplay() {
  // NEVER DO THIS
  const address = "0x1234..."; // Hardcoded address
  const balance = await fetchBalance(address);
  return <div>Balance: {balance}</div>;
}
```

### Example 2: Token Swap

```typescript
// ✅ CORRECT - Validates connection first
import { useAccount } from 'wagmi';

async function executeSwap(params: SwapParams) {
  const { address, isConnected, chain } = useAccount();

  // Check wallet connection
  if (!isConnected || !address) {
    throw new Error('Wallet not connected');
  }

  // Check correct network
  if (chain?.id !== 43114) {
    throw new Error('Wrong network');
  }

  // Use connected wallet address
  return await buildSwapTransaction({
    ...params,
    userAddress: address, // From connected wallet
  });
}
```

```typescript
// ❌ WRONG - No validation, hardcoded address
async function executeSwap(params: SwapParams) {
  // NEVER DO THIS
  return await buildSwapTransaction({
    ...params,
    userAddress: '0x1234...', // Hardcoded!
  });
}
```

### Example 3: AI Function Calling

```typescript
// ✅ CORRECT - Pass connected wallet to AI
const functions = [
  {
    name: 'get_wallet_balance',
    description: 'Get balance for the CONNECTED wallet',
    parameters: {
      type: 'object',
      properties: {
        // Accept address parameter but validate it matches connected wallet
      },
    },
  },
];

// In the function implementation
async function getWalletBalance(args: { address?: string }) {
  const { address: connectedAddress, isConnected } = useAccount();

  // Validate wallet is connected
  if (!isConnected || !connectedAddress) {
    throw new Error('Wallet not connected');
  }

  // If address provided, verify it matches connected wallet
  if (args.address && args.address !== connectedAddress) {
    throw new Error('Address mismatch - must use connected wallet');
  }

  // Use connected wallet
  return await fetchBalance(connectedAddress);
}
```

## 🛡️ Validation Checklist

Before any blockchain operation:

```typescript
function validateWalletContext(): WalletContext {
  const { address, isConnected, chain } = useAccount();

  // 1. Check connection
  if (!isConnected) {
    throw new Error('Wallet not connected');
  }

  // 2. Check address exists
  if (!address) {
    throw new Error('No wallet address available');
  }

  // 3. Check network (if required)
  const requiredChainId = getConfig<number>('blockchain.default_network_id');
  if (chain?.id !== requiredChainId) {
    throw new Error(`Wrong network. Please switch to chain ${requiredChainId}`);
  }

  return { address, chain };
}
```

## 📋 Configuration Reference

### Full Wallet Management Config

```json
{
  "capabilities": {
    "wallet_management": {
      "enabled": true,
      "auto_connect": false,
      "show_balance": true,
      "refresh_interval": 30000,

      "always_use_connected_wallet": true,
      "require_wallet_for_operations": true,

      "wallet_data_source": {
        "description": "CRITICAL: Agent MUST ALWAYS use connected wallet data",
        "rules": [
          "Never use hardcoded or example wallet addresses",
          "All balance queries must use the connected wallet address",
          "All transactions must originate from the connected wallet",
          "If wallet is not connected, block operations and request connection",
          "Validate wallet connection before any blockchain operation",
          "Never assume or guess wallet addresses",
          "Use wallet context from Web3 provider only"
        ],
        "validation": {
          "check_connection_before_operations": true,
          "verify_address_format": true,
          "confirm_network_match": true
        }
      }
    }
  }
}
```

## 🎯 Implementation Guidelines

### For API Routes

```typescript
// app/api/wallet/balance/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Get address from query params (sent by frontend with connected wallet)
  const address = request.nextUrl.searchParams.get('address');

  // Validate address is provided
  if (!address) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
  }

  // Validate address format
  if (!address.startsWith('0x') || address.length !== 42) {
    return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 });
  }

  // Fetch balance using the provided address
  const balance = await fetchBalance(address);

  return NextResponse.json({ balance });
}
```

### For AI Chat Functions

```typescript
// app/api/chat/route.ts
const functions = [
  {
    name: 'get_wallet_balance',
    description: "Get balance for the user's CONNECTED wallet. Never use example addresses.",
    parameters: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'The connected wallet address from the Web3 provider (required)',
        },
      },
      required: ['address'],
    },
  },
];

// In function handler
if (functionName === 'get_wallet_balance') {
  const { address } = functionArgs;

  // Validate address format
  if (!address || !address.startsWith('0x')) {
    return {
      error: 'Invalid or missing wallet address. Please connect your wallet first.',
    };
  }

  // Fetch balance
  const balance = await fetch(`/api/wallet/balance?address=${address}`);
  return await balance.json();
}
```

### For Frontend Components

```typescript
// components/WalletOperations.tsx
import { useAccount } from 'wagmi';
import { useAgentConfig } from '@/hooks/useAgentConfig';

export function WalletOperations() {
  const { address, isConnected, chain } = useAccount();
  const { config } = useAgentConfig();

  // Check if wallet operations require connection
  const requireWallet = config.capabilities.wallet_management.require_wallet_for_operations;

  // Block operations if wallet not connected
  if (requireWallet && !isConnected) {
    return (
      <div className="warning">
        <p>Please connect your wallet to continue</p>
        <ConnectButton />
      </div>
    );
  }

  // Block if wrong network
  const defaultNetworkId = config.blockchain.default_network_id;
  if (chain?.id !== defaultNetworkId) {
    return (
      <div className="error">
        <p>Wrong network. Please switch to chain {defaultNetworkId}</p>
      </div>
    );
  }

  // Now safe to use address
  return (
    <div>
      <p>Connected: {address}</p>
      {/* Operations here use 'address' variable */}
    </div>
  );
}
```

## 🚫 Common Mistakes to Avoid

### Mistake 1: Using Example Addresses

```typescript
// ❌ NEVER DO THIS
const exampleAddress = '0x1234567890123456789012345678901234567890';
const balance = await fetchBalance(exampleAddress);
```

### Mistake 2: Not Checking Connection

```typescript
// ❌ WRONG - No validation
function MyComponent() {
  const { address } = useAccount();
  // Directly using address without checking if connected
  return <div>Balance: {fetchBalance(address)}</div>;
}

// ✅ CORRECT - Validate first
function MyComponent() {
  const { address, isConnected } = useAccount();

  if (!isConnected || !address) {
    return <div>Please connect wallet</div>;
  }

  return <div>Balance: {fetchBalance(address)}</div>;
}
```

### Mistake 3: Caching Wrong Address

```typescript
// ❌ WRONG - Caching initial address
const [walletAddress] = useState(address);
// Address won't update if user switches wallets

// ✅ CORRECT - Always use current address
const { address } = useAccount();
// Always reflects current connected wallet
```

### Mistake 4: Ignoring Network Changes

```typescript
// ❌ WRONG - No network validation
async function swap() {
  await executeSwap(address); // Might be on wrong network
}

// ✅ CORRECT - Validate network first
async function swap() {
  const { address, chain } = useAccount();

  if (chain?.id !== 43114) {
    alert('Please switch to Avalanche network');
    return;
  }

  await executeSwap(address);
}
```

## 📊 Testing Wallet Rules

### Test Checklist

- [ ] Operations blocked when wallet not connected
- [ ] Operations blocked on wrong network
- [ ] Address format validated before use
- [ ] No hardcoded addresses in codebase
- [ ] AI functions require wallet context
- [ ] Error messages prompt wallet connection
- [ ] Wallet switch detected and handled
- [ ] Address updates when user switches wallets

### Manual Testing

1. **Disconnect wallet** - Verify operations are blocked
2. **Connect wallet** - Verify operations become available
3. **Switch networks** - Verify network validation works
4. **Switch accounts** - Verify address updates correctly
5. **Try operations** - Verify correct address is used

## 🔍 Code Review Checklist

When reviewing code, check for:

- [ ] No hardcoded wallet addresses
- [ ] Wallet connection validated before operations
- [ ] Network validation implemented
- [ ] Address format validated
- [ ] Error handling for disconnected wallet
- [ ] Proper use of `useAccount()` hook
- [ ] No assumptions about wallet state
- [ ] Configuration rules followed

## 📚 Related Documentation

- [Configuration Guide](../CONFIG_GUIDE.md)
- [Agent Specification](../AGENT_SPECIFICATION.md)
- [Security Best Practices](../README.md#security)

## 🆘 Support

If you encounter issues with wallet integration:

1. Check wallet connection status
2. Verify network configuration
3. Review this document's examples
4. Check browser console for errors
5. Test with a fresh wallet connection

---

**Last Updated:** December 10, 2025
**Priority:** CRITICAL 🚨
**Category:** Security & Functionality

**Remember: ALWAYS use the connected wallet. NEVER use hardcoded addresses.**
