# 🎛️ AI Investor Agent - Configuration System

A comprehensive, dynamic configuration system that allows you to customize every aspect of the AI Investor Agent's behavior without touching the code.

## 🌟 Overview

The configuration system provides:

- ✅ **JSON-based configuration** - Easy to read and edit
- ✅ **Type-safe access** - Full TypeScript support
- ✅ **Schema validation** - Automatic validation with JSON Schema
- ✅ **Hot-reloadable** - Changes take effect on restart
- ✅ **Modular design** - Organized into logical sections
- ✅ **Documentation** - Extensive examples and guides

## 📁 File Structure

```
config/
├── agent.config.json          # Main configuration file (EDIT THIS)
├── agent.config.schema.json   # JSON Schema for validation
├── README.md                   # Complete configuration guide
└── EXAMPLES.md                 # Practical configuration examples

lib/
└── config.ts                   # Configuration loading & utilities

hooks/
└── useAgentConfig.ts          # React hooks for configuration
```

## 🚀 Quick Start

### 1. Edit Configuration

Open `config/agent.config.json` and modify any setting:

```json
{
  "agent": {
    "name": "My Custom Agent",
    "personality": {
      "tone": "casual",
      "emoji_usage": "frequent"
    }
  }
}
```

### 2. Restart Development Server

```bash
npm run dev
```

### 3. See Changes in Action

The agent will now use your new configuration!

## 🎯 What Can You Configure?

### 1. **Agent Personality**

- Tone (professional, casual, friendly)
- Communication style
- Verbosity level
- Emoji usage

### 2. **Trading Behavior**

- Default slippage tolerance
- Price impact thresholds
- Transaction safety checks
- Retry logic

### 3. **User Interface**

- Theme colors
- Onboarding flow
- Notification behavior
- Loading states

### 4. **Blockchain Settings**

- Supported networks
- Token lists
- RPC endpoints
- Default network

### 5. **AI Behavior**

- System prompt
- Response style
- Temperature & tokens
- Function calling

### 6. **Security & Privacy**

- Transaction limits
- Validation rules
- Privacy settings
- Data storage

### 7. **API Configuration**

- Timeouts
- Rate limiting
- Caching
- Retry policies

### 8. **Feature Flags**

- Enable/disable features
- Beta features
- Experimental features

## 📖 Usage Examples

### In React Components

```typescript
import { useAgentConfig } from '@/hooks/useAgentConfig';

function MyComponent() {
  const { config, getTokenConfig } = useAgentConfig();

  // Access configuration
  const agentName = config.agent.name;
  const slippage = config.capabilities.token_swaps.default_slippage;

  // Get token info
  const usdc = getTokenConfig('USDC');

  return <div>{agentName} - Default slippage: {slippage}%</div>;
}
```

### In API Routes

```typescript
import { getConfig, getSystemPrompt } from '@/lib/config';

export async function POST(request: Request) {
  // Get AI configuration
  const model = getConfig<string>('capabilities.natural_language.model');
  const temperature = getConfig<number>('capabilities.natural_language.temperature');

  // Get system prompt
  const systemPrompt = getSystemPrompt();

  // Use in API call
  const response = await openai.chat.completions.create({
    model,
    temperature,
    messages: [{ role: 'system', content: systemPrompt }],
  });
}
```

### Validation Helpers

```typescript
import { validatePriceImpact, shouldShowDisclaimer } from '@/lib/config';

// Check price impact
const impact = validatePriceImpact(7.5);
if (impact.shouldBlock) {
  alert(impact.message);
  return;
}

// Check if disclaimer should be shown
if (shouldShowDisclaimer('advice')) {
  showDisclaimer();
}
```

## 🎨 Common Scenarios

### Change Agent Personality to Casual

```json
{
  "agent": {
    "personality": {
      "tone": "casual",
      "style": "concise",
      "emoji_usage": "frequent"
    }
  },
  "prompts": {
    "welcome_message": "Hey! 👋 Ready to trade some crypto? Let's go! 🚀"
  }
}
```

### Make Trading More Conservative

```json
{
  "capabilities": {
    "token_swaps": {
      "default_slippage": 0.3,
      "max_slippage": 1.0
    }
  },
  "behavior": {
    "transaction_safety": {
      "price_impact_warning_threshold": 1.0,
      "price_impact_block_threshold": 5.0
    }
  }
}
```

### Add New Token

```json
{
  "tokens": {
    "supported": [
      {
        "symbol": "WAVAX",
        "name": "Wrapped AVAX",
        "address": "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
        "decimals": 18,
        "chain_id": 43114,
        "enabled": true
      }
    ]
  }
}
```

### Enable Beta Features

```json
{
  "features": {
    "beta": {
      "transaction_history": true,
      "advanced_charts": true
    }
  }
}
```

## 🔧 Configuration Helpers

### Available Functions

```typescript
// Get any config value
getConfig<T>(path: string): T

// Feature checks
isFeatureEnabled(path: string): boolean

// Token helpers
getTokenConfig(symbol: string)
getEnabledTokens(chainId?: number)

// Network helpers
getNetworkConfig(chainId: number)
getDefaultNetwork()

// Prompts
getSystemPrompt(): string
getWelcomeMessage(): string
getDisclaimer(): string
getErrorMessage(key: string): string
getConfirmationPrompt(key: string, vars?: object): string

// Validation
validatePriceImpact(impact: number)
shouldShowDisclaimer(context: string): boolean

// API config
getTimeout(operation: string): number
getRetryConfig()
getCacheDuration(resource: string): number
```

### React Hooks

```typescript
// Main hook
useAgentConfig()

// Specific hooks
useFeature(path: string): boolean
useTokens(chainId?: number)
useNetwork(chainId?: number)
useTransactionSafety()
useSwapConfig()
useUIConfig()
usePrompts()
useAPIConfig()
```

## 📚 Documentation

- **[README.md](config/README.md)** - Complete configuration reference
- **[EXAMPLES.md](config/EXAMPLES.md)** - 16 practical scenarios
- **[AGENT_SPECIFICATION.md](AGENT_SPECIFICATION.md)** - Agent behavior spec

## ⚠️ Important Notes

### Always Test Changes

- Test in development before production
- Validate JSON syntax
- Check for console errors
- Verify all features work

### Configuration Validation

The system validates configuration on load:

- Required fields present
- Valid value ranges
- Consistent settings
- Network/token integrity

### What Requires Restart

- Most configuration changes
- System prompt updates
- Feature flag changes
- API timeout changes

### What Doesn't Require Restart

- Runtime feature toggles (if implemented)
- Dynamic rate limits (if implemented)

## 🛡️ Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Review limits** - Set appropriate transaction limits
3. **Validate carefully** - Check all inputs
4. **Audit changes** - Track configuration changes in git
5. **Privacy first** - Default to privacy-preserving settings

## 🔍 Troubleshooting

### Configuration not loading

```bash
# Check JSON syntax
npm run build

# Restart dev server
npm run dev
```

### Type errors

```typescript
// Make sure imports are correct
import { useAgentConfig } from '@/hooks/useAgentConfig';

// Use type-safe getters
const value = getConfig<string>('path.to.value');
```

### Features not working

```bash
# Check feature is enabled
console.log(isFeatureEnabled('features.beta.my_feature'));

# Verify dependencies
# Some features require other features to be enabled
```

## 📝 Configuration Checklist

Before deploying to production:

- [ ] Review all security settings
- [ ] Set appropriate transaction limits
- [ ] Configure proper error messages
- [ ] Set production API timeouts
- [ ] Enable rate limiting
- [ ] Disable debug logging
- [ ] Review privacy settings
- [ ] Test all enabled features
- [ ] Validate slippage ranges
- [ ] Check network configurations
- [ ] Verify token addresses
- [ ] Test disclaimer display
- [ ] Review analytics settings

## 🎓 Learning Path

1. **Start here:** Read [config/README.md](config/README.md)
2. **See examples:** Browse [config/EXAMPLES.md](config/EXAMPLES.md)
3. **Understand behavior:** Read [AGENT_SPECIFICATION.md](AGENT_SPECIFICATION.md)
4. **Experiment:** Try different configurations
5. **Customize:** Create your own config setup

## 💡 Tips & Tricks

### Development Setup

```json
{
  "logging": { "level": "debug" },
  "api": { "rate_limiting": { "enabled": false } },
  "behavior": { "error_handling": { "show_technical_details": true } }
}
```

### Production Setup

```json
{
  "logging": { "level": "warn" },
  "api": { "rate_limiting": { "enabled": true } },
  "behavior": { "error_handling": { "show_technical_details": false } }
}
```

### Testing New Features

```json
{
  "features": {
    "experimental": {
      "my_new_feature": true
    }
  }
}
```

## 🤝 Contributing

When adding new configuration options:

1. Add to `agent.config.json`
2. Update `agent.config.schema.json`
3. Add TypeScript types in `lib/config.ts`
4. Document in `config/README.md`
5. Add examples in `config/EXAMPLES.md`
6. Create helper functions if needed

## 📞 Support

Need help with configuration?

1. Check the documentation first
2. Review example scenarios
3. Look at the code in `lib/config.ts`
4. Ask in GitHub issues

---

**Version:** 1.0.0
**Last Updated:** December 10, 2025
**License:** MIT

**Made with ❤️ for flexible, maintainable agent configuration**
