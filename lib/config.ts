/**
 * Agent Configuration System
 *
 * This module provides a type-safe configuration system for the AI Investor Agent.
 * Configuration can be loaded from JSON files and accessed throughout the application.
 */

import agentConfig from '@/config/agent.config.json';

// ============================================================================
// Types
// ============================================================================

export interface AgentConfig {
  version: string;
  lastUpdated: string;
  agent: {
    name: string;
    version: string;
    description: string;
    personality: {
      tone: 'professional' | 'professional-friendly' | 'casual' | 'formal';
      style: 'concise' | 'educational' | 'detailed' | 'minimalist';
      verbosity: 'minimal' | 'balanced' | 'verbose';
      emoji_usage: 'none' | 'minimal' | 'moderate' | 'frequent';
    };
  };
  capabilities: {
    natural_language: {
      enabled: boolean;
      model: string;
      temperature: number;
      max_tokens: number;
      context_window: number;
    };
    wallet_management: {
      enabled: boolean;
      auto_connect: boolean;
      show_balance: boolean;
      refresh_interval: number;
    };
    token_swaps: {
      enabled: boolean;
      require_confirmation: boolean;
      show_preview: boolean;
      default_slippage: number;
      max_slippage: number;
      min_slippage: number;
    };
    portfolio_tracking: {
      enabled: boolean;
      auto_refresh: boolean;
      refresh_interval: number;
      show_usd_values: boolean;
      show_24h_change: boolean;
    };
    market_analysis: {
      enabled: boolean;
      show_price_impact: boolean;
      show_liquidity_info: boolean;
      risk_warnings: boolean;
    };
  };
  behavior: {
    financial_advice: {
      can_recommend: boolean;
      can_predict_prices: boolean;
      must_show_disclaimer: boolean;
      disclaimer_frequency: 'never' | 'once' | 'per_session' | 'per_advice' | 'always';
      risk_level_disclosure: 'never' | 'on_request' | 'always';
    };
    transaction_safety: {
      require_user_confirmation: boolean;
      show_transaction_preview: boolean;
      validate_balances: boolean;
      check_network: boolean;
      warn_high_price_impact: boolean;
      price_impact_warning_threshold: number;
      price_impact_block_threshold: number;
      max_retries: number;
      retry_delay_ms: number;
    };
    error_handling: {
      show_technical_details: boolean;
      provide_solutions: boolean;
      auto_retry: boolean;
      log_errors: boolean;
      user_friendly_messages: boolean;
    };
    conversation: {
      max_history_length: number;
      clear_on_disconnect: boolean;
      persist_across_sessions: boolean;
      show_typing_indicator: boolean;
      response_delay_ms: number;
    };
  };
  blockchain: {
    networks: Array<{
      chain_id: number;
      name: string;
      native_currency: {
        name: string;
        symbol: string;
        decimals: number;
      };
      rpc_urls: string[];
      block_explorer: string;
      enabled: boolean;
      default: boolean;
    }>;
    default_network_id: number;
    require_network_validation: boolean;
    auto_switch_network: boolean;
  };
  tokens: {
    supported: Array<{
      symbol: string;
      name: string;
      address: string;
      decimals: number;
      is_native: boolean;
      chain_id: number;
      enabled: boolean;
      icon_url: string;
      coingecko_id: string;
    }>;
    default_from_token: string;
    default_to_token: string;
    show_token_prices: boolean;
    cache_prices: boolean;
    price_cache_duration: number;
  };
  dex: {
    provider: string;
    aggregator: {
      enabled: boolean;
      min_sources: number;
      timeout_ms: number;
    };
    routing: {
      max_hops: number;
      prefer_direct_routes: boolean;
      optimize_for: 'best_price' | 'lowest_gas' | 'fastest';
    };
  };
  gas: {
    optimization_enabled: boolean;
    margin_by_operation: {
      approval: number;
      simple_swap: number;
      standard_swap: number;
      complex_swap: number;
    };
    complex_tokens: string[];
    max_gas_price_gwei: Record<string, number>;
    approval_strategy: 'exact_with_margin' | 'unlimited';
    approval_margin_percent: number;
    show_fee_estimate: boolean;
    cache_duration_ms: number;
  };
  ui: {
    theme: {
      mode: 'light' | 'dark';
      primary_color: string;
      accent_color: string;
    };
    onboarding: {
      show_welcome_message: boolean;
      show_tutorial: boolean;
      auto_open_wallet_modal: boolean;
      highlight_features: boolean;
    };
    notifications: {
      enabled: boolean;
      position: string;
      duration_ms: number;
      show_success: boolean;
      show_errors: boolean;
      show_warnings: boolean;
      show_info: boolean;
    };
    loading_states: {
      show_spinners: boolean;
      show_progress_steps: boolean;
      show_estimated_time: boolean;
      minimum_display_time_ms: number;
    };
  };
  security: {
    validation: {
      validate_addresses: boolean;
      validate_amounts: boolean;
      check_contract_verified: boolean;
      warn_unverified_tokens: boolean;
    };
    limits: {
      max_transaction_amount_usd: number | null;
      min_transaction_amount_usd: number;
      daily_transaction_limit: number | null;
      require_approval_above_usd: number | null;
    };
    privacy: {
      store_wallet_address: boolean;
      store_transaction_history: boolean;
      analytics_enabled: boolean;
      share_anonymous_usage: boolean;
    };
  };
  api: {
    rate_limiting: {
      enabled: boolean;
      requests_per_minute: number;
      burst_size: number;
    };
    caching: {
      enabled: boolean;
      quote_cache_duration: number;
      balance_cache_duration: number;
      price_cache_duration: number;
    };
    timeouts: {
      chat_response_ms: number;
      quote_fetch_ms: number;
      transaction_submit_ms: number;
      balance_fetch_ms: number;
    };
    retries: {
      enabled: boolean;
      max_attempts: number;
      backoff_multiplier: number;
      initial_delay_ms: number;
    };
  };
  features: {
    experimental: Record<string, boolean>;
    beta: Record<string, boolean>;
    coming_soon: Record<string, boolean>;
  };
  prompts: {
    system_prompt: string;
    welcome_message: string;
    disclaimer: string;
    error_messages: Record<string, string>;
    confirmation_prompts: Record<string, string>;
  };
  analytics: {
    enabled: boolean;
    track_events: string[];
    track_errors: boolean;
    track_performance: boolean;
    anonymize_data: boolean;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    console_logging: boolean;
    file_logging: boolean;
    include_timestamps: boolean;
    include_stack_traces: boolean;
    log_api_calls: boolean;
    log_transactions: boolean;
    log_user_actions: boolean;
  };
  maintenance: {
    mode: boolean;
    message: string;
    allowed_ips: string[];
    estimated_duration_minutes: number;
  };
}

// ============================================================================
// Configuration Loading
// ============================================================================

/**
 * Load and validate agent configuration
 * This is loaded at build time from the JSON file
 */
export const config: AgentConfig = agentConfig as AgentConfig;

/**
 * Get a specific configuration value using dot notation
 * @example getConfig('capabilities.token_swaps.enabled')
 */
export function getConfig<T = unknown>(path: string): T {
  const keys = path.split('.');
  let value: unknown = config;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      throw new Error(`Configuration path not found: ${path}`);
    }
  }

  return value as T;
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(featurePath: string): boolean {
  try {
    return getConfig<boolean>(featurePath);
  } catch {
    return false;
  }
}

/**
 * Get token configuration by symbol
 */
export function getTokenConfig(symbol: string) {
  return config.tokens.supported.find(
    (token) => token.symbol.toLowerCase() === symbol.toLowerCase() && token.enabled
  );
}

/**
 * Get network configuration by chain ID
 */
export function getNetworkConfig(chainId: number) {
  return config.blockchain.networks.find(
    (network) => network.chain_id === chainId && network.enabled
  );
}

/**
 * Get the default network
 */
export function getDefaultNetwork() {
  return (
    config.blockchain.networks.find((network) => network.default) ||
    config.blockchain.networks.find((network) => network.enabled)
  );
}

/**
 * Get enabled tokens for a specific chain
 */
export function getEnabledTokens(chainId?: number) {
  const tokens = config.tokens.supported.filter((token) => token.enabled);

  if (chainId) {
    return tokens.filter((token) => token.chain_id === chainId);
  }

  return tokens;
}

/**
 * Check if agent is in maintenance mode
 */
export function isMaintenanceMode(): boolean {
  return config.maintenance.mode;
}

/**
 * Get maintenance message
 */
export function getMaintenanceMessage(): string {
  return config.maintenance.message;
}

/**
 * Get system prompt for AI
 */
export function getSystemPrompt(): string {
  return config.prompts.system_prompt;
}

/**
 * Get welcome message
 */
export function getWelcomeMessage(): string {
  return config.prompts.welcome_message;
}

/**
 * Get disclaimer text
 */
export function getDisclaimer(): string {
  return config.prompts.disclaimer;
}

/**
 * Get error message by key
 */
export function getErrorMessage(key: string, fallback?: string): string {
  return config.prompts.error_messages[key] || fallback || 'An error occurred';
}

/**
 * Get confirmation prompt by key with template replacement
 */
export function getConfirmationPrompt(key: string, variables?: Record<string, string>): string {
  let prompt = config.prompts.confirmation_prompts[key] || '';

  if (variables) {
    Object.entries(variables).forEach(([varKey, value]) => {
      prompt = prompt.replace(new RegExp(`{{${varKey}}}`, 'g'), value);
    });
  }

  return prompt;
}

/**
 * Validate price impact and return warning level
 */
export function validatePriceImpact(priceImpact: number): {
  level: 'safe' | 'warning' | 'danger';
  message: string | null;
  shouldBlock: boolean;
} {
  const warningThreshold = config.behavior.transaction_safety.price_impact_warning_threshold;
  const blockThreshold = config.behavior.transaction_safety.price_impact_block_threshold;

  if (priceImpact >= blockThreshold) {
    return {
      level: 'danger',
      message: getConfirmationPrompt('high_price_impact', { impact: priceImpact.toFixed(2) }),
      shouldBlock: true,
    };
  }

  if (priceImpact >= warningThreshold) {
    return {
      level: 'warning',
      message: `Price impact is ${priceImpact.toFixed(2)}%. This is higher than usual.`,
      shouldBlock: false,
    };
  }

  return {
    level: 'safe',
    message: null,
    shouldBlock: false,
  };
}

/**
 * Check if financial advice disclaimer should be shown
 */
export function shouldShowDisclaimer(context: 'session' | 'advice' | 'always' = 'advice'): boolean {
  const frequency = config.behavior.financial_advice.disclaimer_frequency;

  if (!config.behavior.financial_advice.must_show_disclaimer) {
    return false;
  }

  switch (frequency) {
    case 'never':
      return false;
    case 'always':
      return true;
    case 'per_session':
      return context === 'session';
    case 'per_advice':
      return context === 'advice';
    case 'once':
      // Would need session tracking to implement properly
      return context === 'session';
    default:
      return false;
  }
}

/**
 * Get retry configuration for failed requests
 */
export function getRetryConfig() {
  return {
    enabled: config.api.retries.enabled,
    maxAttempts: config.api.retries.max_attempts,
    backoffMultiplier: config.api.retries.backoff_multiplier,
    initialDelay: config.api.retries.initial_delay_ms,
  };
}

/**
 * Get gas optimization configuration
 */
export function getGasConfig() {
  return config.gas;
}

/**
 * Check if gas optimization is enabled
 */
export function isGasOptimizationEnabled(): boolean {
  return config.gas.optimization_enabled;
}

/**
 * Get gas margin for a specific operation type
 */
export function getGasMargin(
  operationType: 'approval' | 'simple_swap' | 'standard_swap' | 'complex_swap'
): number {
  return config.gas.margin_by_operation[operationType];
}

/**
 * Check if a token is considered complex (requires higher gas margins)
 */
export function isComplexToken(symbol: string): boolean {
  return config.gas.complex_tokens.some((token) => token.toLowerCase() === symbol.toLowerCase());
}

/**
 * Get max gas price for a specific chain
 */
export function getMaxGasPrice(chainId: number): number | undefined {
  return config.gas.max_gas_price_gwei[chainId.toString()];
}

/**
 * Get approval strategy configuration
 */
export function getApprovalStrategy(): {
  strategy: 'exact_with_margin' | 'unlimited';
  marginPercent: number;
} {
  return {
    strategy: config.gas.approval_strategy,
    marginPercent: config.gas.approval_margin_percent,
  };
}

/**
 * Get timeout for specific operation
 */
export function getTimeout(operation: keyof AgentConfig['api']['timeouts']): number {
  return config.api.timeouts[operation];
}

/**
 * Check if caching is enabled for specific resource
 */
export function isCachingEnabled(_resource?: 'quote' | 'balance' | 'price'): boolean {
  if (!config.api.caching.enabled) {
    return false;
  }

  // If no specific resource is provided, return general caching status
  return true;
}

/**
 * Get cache duration for specific resource
 */
export function getCacheDuration(resource: 'quote' | 'balance' | 'price'): number {
  const durations = {
    quote: config.api.caching.quote_cache_duration,
    balance: config.api.caching.balance_cache_duration,
    price: config.api.caching.price_cache_duration,
  };

  return durations[resource];
}

// ============================================================================
// Configuration Validation
// ============================================================================

/**
 * Validate that required configuration is present and valid
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!config.agent.name) {
    errors.push('Agent name is required');
  }

  if (!config.blockchain.networks.length) {
    errors.push('At least one network must be configured');
  }

  if (!config.tokens.supported.length) {
    errors.push('At least one token must be configured');
  }

  // Check that default network exists
  const defaultNetwork = getDefaultNetwork();
  if (!defaultNetwork) {
    errors.push('No default network configured');
  }

  // Check slippage values
  const slippage = config.capabilities.token_swaps;
  if (slippage.min_slippage > slippage.max_slippage) {
    errors.push('Min slippage cannot be greater than max slippage');
  }

  if (
    slippage.default_slippage < slippage.min_slippage ||
    slippage.default_slippage > slippage.max_slippage
  ) {
    errors.push('Default slippage must be between min and max slippage');
  }

  // Check price impact thresholds
  const safety = config.behavior.transaction_safety;
  if (safety.price_impact_warning_threshold > safety.price_impact_block_threshold) {
    errors.push('Warning threshold cannot be greater than block threshold');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Runtime Configuration Updates (if needed)
// ============================================================================

/**
 * Merge partial configuration updates
 * Note: This only works for runtime updates, not persisted
 */
export function updateConfig(updates: Partial<AgentConfig>): void {
  Object.assign(config, updates);
}

// ============================================================================
// Export default config
// ============================================================================

export default config;
