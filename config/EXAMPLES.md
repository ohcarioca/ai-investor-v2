# Configuration Examples

This document provides practical examples of how to configure the AI Investor Agent for different scenarios.

## 📋 Table of Contents

1. [Changing Agent Personality](#changing-agent-personality)
2. [Adjusting Trading Parameters](#adjusting-trading-parameters)
3. [Customizing Messages](#customizing-messages)
4. [Adding New Tokens](#adding-new-tokens)
5. [Multi-Network Setup](#multi-network-setup)
6. [Security Configurations](#security-configurations)
7. [Development vs Production](#development-vs-production)
8. [Feature Flags](#feature-flags)

---

## Changing Agent Personality

### Scenario 1: Professional Financial Advisor

Make the agent more formal and professional:

```json
{
  "agent": {
    "personality": {
      "tone": "professional",
      "style": "detailed",
      "verbosity": "verbose",
      "emoji_usage": "none"
    }
  },
  "prompts": {
    "system_prompt": "You are a professional cryptocurrency investment advisor with expertise in blockchain technology and digital assets. Provide comprehensive, data-driven analysis with a focus on risk management. Always maintain a professional demeanor and provide detailed explanations of complex concepts.",
    "welcome_message": "Welcome to AI Investor. I am your professional cryptocurrency investment advisor. How may I assist you with your investment strategy today?",
    "disclaimer": "Disclaimer: The information provided is for educational purposes only and should not be construed as financial advice. Consult with a licensed financial advisor before making investment decisions."
  }
}
```

### Scenario 2: Friendly Crypto Buddy

Make the agent casual and approachable:

```json
{
  "agent": {
    "personality": {
      "tone": "casual",
      "style": "concise",
      "verbosity": "minimal",
      "emoji_usage": "frequent"
    }
  },
  "prompts": {
    "system_prompt": "You're a friendly crypto enthusiast helping people navigate the world of DeFi! Keep it simple, fun, and educational. Use emojis to make things clearer and more engaging. You're knowledgeable but not preachy.",
    "welcome_message": "Hey there! 👋 Welcome to AI Investor! Ready to dive into some crypto action? 🚀 Let's make some smart moves together! 💪",
    "disclaimer": "⚠️ Hey, quick reminder: I'm here to help you learn, but I'm not a financial advisor! Always DYOR (Do Your Own Research) and only invest what you can afford to lose. Stay safe out there! 🛡️"
  }
}
```

### Scenario 3: Educational Mentor

Focus on teaching and explaining:

```json
{
  "agent": {
    "personality": {
      "tone": "professional-friendly",
      "style": "educational",
      "verbosity": "balanced",
      "emoji_usage": "minimal"
    }
  },
  "behavior": {
    "financial_advice": {
      "can_recommend": false,
      "can_predict_prices": false,
      "must_show_disclaimer": true,
      "disclaimer_frequency": "per_session",
      "risk_level_disclosure": "always"
    }
  },
  "prompts": {
    "system_prompt": "You are an educational guide for cryptocurrency and DeFi concepts. Your goal is to help users understand how things work, not just what to do. Always explain the 'why' behind suggestions. Use analogies and examples to make complex topics accessible.",
    "welcome_message": "Welcome! 📚 I'm here to help you understand cryptocurrency investing. Every question is a learning opportunity. What would you like to learn about today?"
  }
}
```

---

## Adjusting Trading Parameters

### Scenario 4: Conservative Trader

Low risk tolerance with strict safety measures:

```json
{
  "capabilities": {
    "token_swaps": {
      "enabled": true,
      "require_confirmation": true,
      "show_preview": true,
      "default_slippage": 0.3,
      "max_slippage": 1.0,
      "min_slippage": 0.1
    }
  },
  "behavior": {
    "transaction_safety": {
      "require_user_confirmation": true,
      "show_transaction_preview": true,
      "validate_balances": true,
      "check_network": true,
      "warn_high_price_impact": true,
      "price_impact_warning_threshold": 1.0,
      "price_impact_block_threshold": 5.0,
      "max_retries": 2,
      "retry_delay_ms": 2000
    }
  },
  "security": {
    "limits": {
      "max_transaction_amount_usd": 10000,
      "min_transaction_amount_usd": 1.0,
      "daily_transaction_limit": 50000
    }
  }
}
```

### Scenario 5: Active Trader

Higher risk tolerance with faster execution:

```json
{
  "capabilities": {
    "token_swaps": {
      "enabled": true,
      "require_confirmation": true,
      "show_preview": true,
      "default_slippage": 1.0,
      "max_slippage": 5.0,
      "min_slippage": 0.1
    }
  },
  "behavior": {
    "transaction_safety": {
      "require_user_confirmation": true,
      "show_transaction_preview": true,
      "validate_balances": true,
      "check_network": true,
      "warn_high_price_impact": true,
      "price_impact_warning_threshold": 5.0,
      "price_impact_block_threshold": 15.0,
      "max_retries": 3,
      "retry_delay_ms": 500
    }
  },
  "security": {
    "limits": {
      "max_transaction_amount_usd": null,
      "min_transaction_amount_usd": 0.01,
      "daily_transaction_limit": null
    }
  },
  "api": {
    "timeouts": {
      "quote_fetch_ms": 3000,
      "transaction_submit_ms": 30000
    }
  }
}
```

---

## Customizing Messages

### Scenario 6: Custom Error Messages

Provide clearer, branded error messages:

```json
{
  "prompts": {
    "error_messages": {
      "wallet_not_connected": "🔌 Oops! Your wallet isn't connected. Click the 'Connect Wallet' button in the top right to get started.",
      "wrong_network": "🌐 Wrong network detected! This app works on Avalanche C-Chain. Please switch networks in your wallet.",
      "insufficient_balance": "💰 Not enough funds! You need more {{token}} to complete this swap. Check your balance and try a smaller amount.",
      "transaction_failed": "❌ Transaction failed. This could be due to network congestion or insufficient gas. Try again in a few moments.",
      "api_error": "🔄 Having trouble connecting to our service. Check your internet connection and refresh the page.",
      "unknown_error": "😕 Something unexpected happened. Our team has been notified. Please try again or contact support if the issue persists."
    },
    "confirmation_prompts": {
      "swap": "📝 Review Your Swap:\n\nMake sure everything looks correct before proceeding. This transaction cannot be reversed!",
      "approval": "✅ Token Approval Required\n\nThis is a one-time approval that allows the DEX to swap your tokens. You'll need to confirm this in your wallet first.",
      "high_price_impact": "⚠️ HIGH PRICE IMPACT WARNING!\n\nThis swap will move the price by {{impact}}%! This is very high and you may get less tokens than expected. Consider:\n• Reducing your swap amount\n• Checking if there's enough liquidity\n• Waiting for better market conditions\n\nAre you absolutely sure you want to continue?",
      "network_switch": "🔄 Please switch to {{network}}\n\nThis app requires {{network}} network. Open your wallet and switch networks to continue."
    }
  }
}
```

---

## Adding New Tokens

### Scenario 7: Add WAVAX Token

```json
{
  "tokens": {
    "supported": [
      {
        "symbol": "AVAX",
        "name": "Avalanche",
        "address": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        "decimals": 18,
        "is_native": true,
        "chain_id": 43114,
        "enabled": true,
        "icon_url": "https://cryptologos.cc/logos/avalanche-avax-logo.png",
        "coingecko_id": "avalanche-2"
      },
      {
        "symbol": "WAVAX",
        "name": "Wrapped AVAX",
        "address": "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
        "decimals": 18,
        "is_native": false,
        "chain_id": 43114,
        "enabled": true,
        "icon_url": "https://cryptologos.cc/logos/avalanche-avax-logo.png",
        "coingecko_id": "wrapped-avax"
      },
      {
        "symbol": "USDC",
        "name": "USD Coin",
        "address": "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
        "decimals": 6,
        "is_native": false,
        "chain_id": 43114,
        "enabled": true,
        "icon_url": "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
        "coingecko_id": "usd-coin"
      }
    ],
    "default_from_token": "AVAX",
    "default_to_token": "USDC"
  }
}
```

### Scenario 8: Disable a Token

To temporarily disable a token without removing it:

```json
{
  "tokens": {
    "supported": [
      {
        "symbol": "SIERRA",
        "name": "Sierra Token",
        "address": "0x6E6080e15f8C0010d333D8CAeEaD29292ADb78f7",
        "decimals": 18,
        "is_native": false,
        "chain_id": 43114,
        "enabled": false, // Set to false to disable
        "icon_url": "",
        "coingecko_id": ""
      }
    ]
  }
}
```

---

## Multi-Network Setup

### Scenario 9: Add Ethereum Network

```json
{
  "blockchain": {
    "networks": [
      {
        "chain_id": 43114,
        "name": "Avalanche C-Chain",
        "native_currency": {
          "name": "AVAX",
          "symbol": "AVAX",
          "decimals": 18
        },
        "rpc_urls": ["https://api.avax.network/ext/bc/C/rpc"],
        "block_explorer": "https://snowtrace.io",
        "enabled": true,
        "default": true
      },
      {
        "chain_id": 1,
        "name": "Ethereum Mainnet",
        "native_currency": {
          "name": "Ether",
          "symbol": "ETH",
          "decimals": 18
        },
        "rpc_urls": ["https://eth.llamarpc.com", "https://rpc.ankr.com/eth"],
        "block_explorer": "https://etherscan.io",
        "enabled": true,
        "default": false
      }
    ],
    "default_network_id": 43114,
    "require_network_validation": true,
    "auto_switch_network": false
  }
}
```

Then add tokens for Ethereum:

```json
{
  "tokens": {
    "supported": [
      // Avalanche tokens...
      {
        "symbol": "ETH",
        "name": "Ether",
        "address": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        "decimals": 18,
        "is_native": true,
        "chain_id": 1,
        "enabled": true,
        "icon_url": "https://cryptologos.cc/logos/ethereum-eth-logo.png",
        "coingecko_id": "ethereum"
      },
      {
        "symbol": "USDC",
        "name": "USD Coin",
        "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "decimals": 6,
        "is_native": false,
        "chain_id": 1,
        "enabled": true,
        "icon_url": "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
        "coingecko_id": "usd-coin"
      }
    ]
  }
}
```

---

## Security Configurations

### Scenario 10: Maximum Security

```json
{
  "behavior": {
    "financial_advice": {
      "can_recommend": false,
      "can_predict_prices": false,
      "must_show_disclaimer": true,
      "disclaimer_frequency": "always",
      "risk_level_disclosure": "always"
    },
    "transaction_safety": {
      "require_user_confirmation": true,
      "show_transaction_preview": true,
      "validate_balances": true,
      "check_network": true,
      "warn_high_price_impact": true,
      "price_impact_warning_threshold": 1.0,
      "price_impact_block_threshold": 5.0,
      "max_retries": 1,
      "retry_delay_ms": 3000
    }
  },
  "security": {
    "validation": {
      "validate_addresses": true,
      "validate_amounts": true,
      "check_contract_verified": true,
      "warn_unverified_tokens": true
    },
    "limits": {
      "max_transaction_amount_usd": 5000,
      "min_transaction_amount_usd": 1.0,
      "daily_transaction_limit": 20000,
      "require_approval_above_usd": 1000
    },
    "privacy": {
      "store_wallet_address": false,
      "store_transaction_history": false,
      "analytics_enabled": false,
      "share_anonymous_usage": false
    }
  }
}
```

### Scenario 11: Privacy-Focused

```json
{
  "security": {
    "privacy": {
      "store_wallet_address": false,
      "store_transaction_history": false,
      "analytics_enabled": false,
      "share_anonymous_usage": false
    }
  },
  "analytics": {
    "enabled": false,
    "track_events": [],
    "track_errors": false,
    "track_performance": false,
    "anonymize_data": true
  },
  "logging": {
    "level": "warn",
    "console_logging": false,
    "file_logging": false,
    "log_api_calls": false,
    "log_transactions": false,
    "log_user_actions": false
  }
}
```

---

## Development vs Production

### Scenario 12: Development Mode

```json
{
  "behavior": {
    "error_handling": {
      "show_technical_details": true,
      "provide_solutions": true,
      "auto_retry": false,
      "log_errors": true,
      "user_friendly_messages": false
    }
  },
  "logging": {
    "level": "debug",
    "console_logging": true,
    "file_logging": true,
    "include_timestamps": true,
    "include_stack_traces": true,
    "log_api_calls": true,
    "log_transactions": true,
    "log_user_actions": true
  },
  "api": {
    "rate_limiting": {
      "enabled": false,
      "requests_per_minute": 1000
    },
    "timeouts": {
      "chat_response_ms": 60000,
      "quote_fetch_ms": 30000
    }
  }
}
```

### Scenario 13: Production Mode

```json
{
  "behavior": {
    "error_handling": {
      "show_technical_details": false,
      "provide_solutions": true,
      "auto_retry": true,
      "log_errors": true,
      "user_friendly_messages": true
    }
  },
  "logging": {
    "level": "warn",
    "console_logging": false,
    "file_logging": true,
    "include_timestamps": true,
    "include_stack_traces": false,
    "log_api_calls": false,
    "log_transactions": true,
    "log_user_actions": false
  },
  "api": {
    "rate_limiting": {
      "enabled": true,
      "requests_per_minute": 60,
      "burst_size": 10
    },
    "caching": {
      "enabled": true,
      "quote_cache_duration": 10000,
      "balance_cache_duration": 5000,
      "price_cache_duration": 30000
    },
    "timeouts": {
      "chat_response_ms": 30000,
      "quote_fetch_ms": 5000,
      "transaction_submit_ms": 60000,
      "balance_fetch_ms": 5000
    }
  },
  "security": {
    "privacy": {
      "analytics_enabled": true,
      "share_anonymous_usage": true
    }
  }
}
```

---

## Feature Flags

### Scenario 14: Enable Beta Features

```json
{
  "features": {
    "experimental": {
      "multi_chain_swaps": false,
      "limit_orders": false,
      "price_alerts": false,
      "portfolio_analytics": false
    },
    "beta": {
      "advanced_charts": true,
      "transaction_history": true,
      "export_reports": true
    },
    "coming_soon": {
      "staking": false,
      "lending": false,
      "yield_farming": false,
      "nft_support": false
    }
  }
}
```

### Scenario 15: Gradual Feature Rollout

Start with experimental off, enable features as they stabilize:

**Week 1: Testing**

```json
{
  "features": {
    "experimental": {
      "transaction_history": true
    },
    "beta": {},
    "coming_soon": {}
  }
}
```

**Week 2: Beta**

```json
{
  "features": {
    "experimental": {},
    "beta": {
      "transaction_history": true
    },
    "coming_soon": {}
  }
}
```

**Week 3: Production**

```json
{
  "capabilities": {
    "transaction_history": {
      "enabled": true,
      "max_items": 100,
      "cache_duration": 60000
    }
  }
}
```

---

## Putting It All Together

### Scenario 16: Complete Custom Configuration

Here's a complete example for a specific use case:

**Crypto Education Platform**

```json
{
  "agent": {
    "name": "Crypto Mentor",
    "personality": {
      "tone": "professional-friendly",
      "style": "educational",
      "verbosity": "balanced",
      "emoji_usage": "moderate"
    }
  },
  "capabilities": {
    "token_swaps": {
      "enabled": true,
      "require_confirmation": true,
      "default_slippage": 0.5,
      "max_slippage": 2.0
    },
    "portfolio_tracking": {
      "enabled": true,
      "auto_refresh": true,
      "show_usd_values": true,
      "show_24h_change": true
    },
    "market_analysis": {
      "enabled": true,
      "show_price_impact": true,
      "show_liquidity_info": true,
      "risk_warnings": true
    }
  },
  "behavior": {
    "financial_advice": {
      "can_recommend": false,
      "must_show_disclaimer": true,
      "disclaimer_frequency": "per_session",
      "risk_level_disclosure": "always"
    },
    "transaction_safety": {
      "price_impact_warning_threshold": 2.0,
      "price_impact_block_threshold": 8.0
    }
  },
  "prompts": {
    "system_prompt": "You are Crypto Mentor, an educational guide for cryptocurrency and DeFi. Your mission is to help users understand the technology and make informed decisions. Always explain concepts clearly, use real-world examples, and emphasize learning over quick profits. You are patient, thorough, and focused on building long-term understanding.",
    "welcome_message": "Welcome to Crypto Mentor! 📚\n\nI'm here to help you learn about cryptocurrency investing on Avalanche. Whether you're just starting out or looking to deepen your knowledge, I'll guide you through each step.\n\nWhat would you like to explore today?",
    "disclaimer": "🎓 Educational Notice: The information provided is for learning purposes. Always research thoroughly and consider consulting with a financial professional before making investment decisions."
  },
  "ui": {
    "onboarding": {
      "show_welcome_message": true,
      "show_tutorial": true,
      "highlight_features": true
    },
    "notifications": {
      "duration_ms": 6000
    }
  }
}
```

---

## Quick Reference

### Common Changes Cheat Sheet

```bash
# Change slippage default
"capabilities.token_swaps.default_slippage": 0.5

# Change agent tone
"agent.personality.tone": "professional-friendly"

# Enable feature
"features.beta.transaction_history": true

# Change price impact warning
"behavior.transaction_safety.price_impact_warning_threshold": 5.0

# Add new token
Add to "tokens.supported" array

# Disable analytics
"security.privacy.analytics_enabled": false

# Change log level
"logging.level": "debug"
```

---

**Remember:** Always test configuration changes in a development environment before deploying to production!
