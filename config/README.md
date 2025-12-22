# Agent Configuration System

This directory contains the configuration system for the AI Investor Agent. The configuration allows you to customize the agent's behavior, features, and appearance without modifying code.

## 🚨 CRITICAL: Wallet Usage Rules

**The agent MUST ALWAYS use the connected wallet address. Never use hardcoded or example addresses.**

See [WALLET_RULES.md](WALLET_RULES.md) for complete details.

## 📁 Files

- **`agent.config.json`** - Main configuration file (edit this to change agent behavior)
- **`agent.config.schema.json`** - JSON schema for validation (provides IntelliSense in editors)
- **`WALLET_RULES.md`** - Critical wallet usage rules (READ THIS FIRST)

## 🚀 Quick Start

### 1. Edit Configuration

Open `agent.config.json` and modify the values you want to change:

```json
{
  "capabilities": {
    "token_swaps": {
      "enabled": true,
      "default_slippage": 0.5
    }
  }
}
```

### 2. Restart Application

After making changes, restart the development server:

```bash
npm run dev
```

The new configuration will be loaded automatically.

## 📖 Configuration Sections

### Agent Identity

```json
{
  "agent": {
    "name": "AI Investor",
    "personality": {
      "tone": "professional-friendly",
      "style": "educational",
      "verbosity": "balanced",
      "emoji_usage": "minimal"
    }
  }
}
```

**Options:**

- `tone`: `"professional"` | `"professional-friendly"` | `"casual"` | `"formal"`
- `style`: `"concise"` | `"educational"` | `"detailed"` | `"minimalist"`
- `verbosity`: `"minimal"` | `"balanced"` | `"verbose"`
- `emoji_usage`: `"none"` | `"minimal"` | `"moderate"` | `"frequent"`

### Capabilities

#### Natural Language

```json
{
  "capabilities": {
    "natural_language": {
      "enabled": true,
      "model": "gpt-4o",
      "temperature": 0.7,
      "max_tokens": 500
    }
  }
}
```

- `temperature`: 0.0 (precise) to 2.0 (creative)
- `max_tokens`: Maximum response length

#### Token Swaps

```json
{
  "capabilities": {
    "token_swaps": {
      "enabled": true,
      "require_confirmation": true,
      "default_slippage": 0.5,
      "max_slippage": 5.0,
      "min_slippage": 0.1
    }
  }
}
```

- `default_slippage`: Default slippage tolerance (%)
- `max_slippage`: Maximum allowed slippage (%)

#### Portfolio Tracking

```json
{
  "capabilities": {
    "portfolio_tracking": {
      "enabled": true,
      "auto_refresh": true,
      "refresh_interval": 30000,
      "show_usd_values": true
    }
  }
}
```

- `refresh_interval`: Auto-refresh interval in milliseconds

### Behavior

#### Financial Advice

```json
{
  "behavior": {
    "financial_advice": {
      "can_recommend": false,
      "can_predict_prices": false,
      "must_show_disclaimer": true,
      "disclaimer_frequency": "per_session"
    }
  }
}
```

⚠️ **Important:** Keep `can_recommend` and `can_predict_prices` as `false` for legal safety.

#### Transaction Safety

```json
{
  "behavior": {
    "transaction_safety": {
      "require_user_confirmation": true,
      "warn_high_price_impact": true,
      "price_impact_warning_threshold": 5.0,
      "price_impact_block_threshold": 15.0
    }
  }
}
```

- Transactions with price impact > `block_threshold` will be blocked
- Transactions with price impact > `warning_threshold` show warning

### Blockchain

#### Networks

```json
{
  "blockchain": {
    "networks": [
      {
        "chain_id": 43114,
        "name": "Avalanche C-Chain",
        "enabled": true,
        "default": true
      }
    ]
  }
}
```

To add a new network:

```json
{
  "chain_id": 1,
  "name": "Ethereum Mainnet",
  "native_currency": {
    "name": "Ether",
    "symbol": "ETH",
    "decimals": 18
  },
  "rpc_urls": ["https://eth.llamarpc.com"],
  "block_explorer": "https://etherscan.io",
  "enabled": true,
  "default": false
}
```

### Tokens

```json
{
  "tokens": {
    "supported": [
      {
        "symbol": "USDC",
        "name": "USD Coin",
        "address": "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
        "decimals": 6,
        "chain_id": 43114,
        "enabled": true
      }
    ]
  }
}
```

To add a new token:

1. Add token object to `supported` array
2. Set `enabled: true`
3. Provide correct contract address and decimals

### Prompts

Customize agent's messages:

```json
{
  "prompts": {
    "welcome_message": "👋 Welcome! I'm your crypto assistant.",
    "disclaimer": "⚠️ This is not financial advice.",
    "error_messages": {
      "wallet_not_connected": "Please connect your wallet.",
      "insufficient_balance": "Not enough balance."
    }
  }
}
```

#### System Prompt

The system prompt defines the agent's core behavior:

```json
{
  "prompts": {
    "system_prompt": "You are an AI cryptocurrency investment assistant..."
  }
}
```

**Tips for editing:**

- Keep it clear and concise
- Define specific capabilities
- Set clear limitations
- Emphasize safety and education

### UI Customization

```json
{
  "ui": {
    "theme": {
      "mode": "light",
      "primary_color": "#9333ea",
      "accent_color": "#ec4899"
    },
    "onboarding": {
      "show_welcome_message": true,
      "auto_open_wallet_modal": true
    },
    "notifications": {
      "enabled": true,
      "duration_ms": 5000
    }
  }
}
```

### Features

Enable/disable features:

```json
{
  "features": {
    "experimental": {
      "multi_chain_swaps": false,
      "limit_orders": false
    },
    "beta": {
      "transaction_history": false
    }
  }
}
```

Set to `true` to enable a feature.

### API Configuration

```json
{
  "api": {
    "rate_limiting": {
      "enabled": true,
      "requests_per_minute": 60
    },
    "timeouts": {
      "chat_response_ms": 30000,
      "quote_fetch_ms": 5000
    },
    "retries": {
      "enabled": true,
      "max_attempts": 3
    }
  }
}
```

### Security

```json
{
  "security": {
    "limits": {
      "max_transaction_amount_usd": null,
      "min_transaction_amount_usd": 0.01
    },
    "privacy": {
      "analytics_enabled": false,
      "store_wallet_address": false
    }
  }
}
```

### Maintenance Mode

Put the app in maintenance mode:

```json
{
  "maintenance": {
    "mode": true,
    "message": "System maintenance in progress. Back soon!",
    "estimated_duration_minutes": 30
  }
}
```

## 💻 Using Configuration in Code

### In React Components

```typescript
import { useAgentConfig } from '@/hooks/useAgentConfig';

function MyComponent() {
  const { config, isFeatureEnabled } = useAgentConfig();

  // Access specific config
  const slippage = config.capabilities.token_swaps.default_slippage;

  // Check feature flag
  if (isFeatureEnabled('features.beta.transaction_history')) {
    // Show transaction history
  }

  return <div>Default slippage: {slippage}%</div>;
}
```

### Specific Hooks

```typescript
import { useSwapConfig, useTransactionSafety } from '@/hooks/useAgentConfig';

function SwapComponent() {
  const swapConfig = useSwapConfig();
  const safety = useTransactionSafety();

  // Use configuration
  console.log('Default slippage:', swapConfig.defaultSlippage);
  console.log('Require confirmation:', safety.requireConfirmation);
}
```

### In API Routes

```typescript
import { getConfig, getSystemPrompt } from '@/lib/config';

export async function POST(request: Request) {
  // Get specific config
  const model = getConfig<string>('capabilities.natural_language.model');

  // Get system prompt
  const systemPrompt = getSystemPrompt();

  // Use in OpenAI call
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      // ...
    ],
  });
}
```

### Token and Network Helpers

```typescript
import { getTokenConfig, getNetworkConfig, getEnabledTokens } from '@/lib/config';

// Get specific token
const usdc = getTokenConfig('USDC');
console.log(usdc.address); // 0xB97E...

// Get network by chain ID
const avalanche = getNetworkConfig(43114);
console.log(avalanche.name); // "Avalanche C-Chain"

// Get all enabled tokens for a chain
const tokens = getEnabledTokens(43114);
```

### Error Messages and Prompts

```typescript
import { getErrorMessage, getConfirmationPrompt } from '@/lib/config';

// Get error message
const errorMsg = getErrorMessage('wallet_not_connected');

// Get confirmation prompt with variables
const confirmMsg = getConfirmationPrompt('high_price_impact', {
  impact: '8.5',
});
```

### Price Impact Validation

```typescript
import { validatePriceImpact } from '@/lib/config';

const priceImpact = 7.5; // 7.5%
const validation = validatePriceImpact(priceImpact);

if (validation.shouldBlock) {
  alert(validation.message);
  return;
}

if (validation.level === 'warning') {
  console.warn(validation.message);
}
```

## 🔍 Configuration Validation

The configuration is validated on load. To manually validate:

```typescript
import { validateConfig } from '@/lib/config';

const { valid, errors } = validateConfig();

if (!valid) {
  console.error('Configuration errors:', errors);
}
```

## 📝 Best Practices

1. **Always validate after editing** - Use a JSON validator or your editor's built-in validation
2. **Keep backups** - Save a copy before making major changes
3. **Test thoroughly** - Test all affected features after configuration changes
4. **Document changes** - Add comments explaining why you changed something
5. **Use version control** - Track configuration changes in git

## ⚠️ Important Notes

### Do Not Modify:

- Token contract addresses (unless adding new tokens)
- Network chain IDs
- Security-critical settings without understanding implications

### Safe to Modify:

- UI colors and themes
- Message text
- Feature flags
- Timeout values
- Slippage defaults (within reasonable limits)

### Requires Restart:

Most configuration changes require a server restart. Some changes may also require:

- Cache clearing
- Wallet reconnection
- Browser refresh

## 🐛 Troubleshooting

### Configuration not loading

- Check for JSON syntax errors
- Ensure file is in correct location
- Restart development server

### Features not working after change

- Verify the feature path is correct
- Check that dependent features are enabled
- Look for console errors

### Type errors in code

- Regenerate types: The configuration is typed automatically
- Ensure you're accessing valid config paths

## 📚 Examples

### Example 1: Make Agent More Casual

```json
{
  "agent": {
    "personality": {
      "tone": "casual",
      "verbosity": "balanced",
      "emoji_usage": "frequent"
    }
  },
  "prompts": {
    "welcome_message": "Hey! 👋 Ready to trade some crypto? Let's go! 🚀"
  }
}
```

### Example 2: Conservative Trading Mode

```json
{
  "capabilities": {
    "token_swaps": {
      "default_slippage": 0.3,
      "max_slippage": 2.0
    }
  },
  "behavior": {
    "transaction_safety": {
      "price_impact_warning_threshold": 3.0,
      "price_impact_block_threshold": 10.0
    }
  }
}
```

### Example 3: Developer Mode

```json
{
  "behavior": {
    "error_handling": {
      "show_technical_details": true,
      "user_friendly_messages": false
    }
  },
  "logging": {
    "level": "debug",
    "log_api_calls": true,
    "log_user_actions": true
  }
}
```

## 🔐 Security Considerations

- Never commit API keys or secrets in configuration
- Use environment variables for sensitive data
- Review privacy settings before production
- Keep transaction limits reasonable
- Always validate user input regardless of config

## 🆘 Support

If you need help with configuration:

1. Check this README
2. Review `agent.config.schema.json` for field descriptions
3. Look at code examples in `/lib/config.ts`
4. Check GitHub issues

---

**Last Updated:** December 10, 2025
**Configuration Version:** 1.0.0
