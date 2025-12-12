/**
 * React Hook for Agent Configuration
 *
 * Provides easy access to agent configuration throughout the application
 */

import { useMemo } from 'react';
import {
  config,
  getConfig,
  isFeatureEnabled,
  getTokenConfig,
  getNetworkConfig,
  getDefaultNetwork,
  getEnabledTokens,
  isMaintenanceMode,
  getSystemPrompt,
  getWelcomeMessage,
  getDisclaimer,
  getErrorMessage,
  getConfirmationPrompt,
  validatePriceImpact,
  shouldShowDisclaimer,
  getRetryConfig,
  getTimeout,
  isCachingEnabled,
  getCacheDuration,
  type AgentConfig,
} from '@/lib/config';

/**
 * Hook to access agent configuration
 */
export function useAgentConfig() {
  return useMemo(
    () => ({
      // Full config
      config,

      // Getter functions
      getConfig,
      isFeatureEnabled,
      getTokenConfig,
      getNetworkConfig,
      getDefaultNetwork,
      getEnabledTokens,
      isMaintenanceMode,
      getSystemPrompt,
      getWelcomeMessage,
      getDisclaimer,
      getErrorMessage,
      getConfirmationPrompt,
      validatePriceImpact,
      shouldShowDisclaimer,
      getRetryConfig,
      getTimeout,
      isCachingEnabled,
      getCacheDuration,

      // Quick access to common config
      agent: config.agent,
      capabilities: config.capabilities,
      behavior: config.behavior,
      blockchain: config.blockchain,
      tokens: config.tokens,
      dex: config.dex,
      ui: config.ui,
      security: config.security,
      api: config.api,
      features: config.features,
      prompts: config.prompts,
      analytics: config.analytics,
      logging: config.logging,
      maintenance: config.maintenance,
    }),
    []
  );
}

/**
 * Hook to check if a specific feature is enabled
 */
export function useFeature(featurePath: string): boolean {
  return useMemo(() => isFeatureEnabled(featurePath), [featurePath]);
}

/**
 * Hook to get tokens for specific chain
 */
export function useTokens(chainId?: number) {
  return useMemo(() => getEnabledTokens(chainId), [chainId]);
}

/**
 * Hook to get network config
 */
export function useNetwork(chainId?: number) {
  return useMemo(() => {
    if (chainId) {
      return getNetworkConfig(chainId);
    }
    return getDefaultNetwork();
  }, [chainId]);
}

/**
 * Hook for transaction safety checks
 */
export function useTransactionSafety() {
  const safety = config.behavior.transaction_safety;

  return useMemo(
    () => ({
      requireConfirmation: safety.require_user_confirmation,
      showPreview: safety.show_transaction_preview,
      validateBalances: safety.validate_balances,
      checkNetwork: safety.check_network,
      warnHighPriceImpact: safety.warn_high_price_impact,
      priceImpactWarningThreshold: safety.price_impact_warning_threshold,
      priceImpactBlockThreshold: safety.price_impact_block_threshold,
      maxRetries: safety.max_retries,
      retryDelay: safety.retry_delay_ms,
      validatePriceImpact,
    }),
    [safety]
  );
}

/**
 * Hook for swap configuration
 */
export function useSwapConfig() {
  const swaps = config.capabilities.token_swaps;

  return useMemo(
    () => ({
      enabled: swaps.enabled,
      requireConfirmation: swaps.require_confirmation,
      showPreview: swaps.show_preview,
      defaultSlippage: swaps.default_slippage,
      maxSlippage: swaps.max_slippage,
      minSlippage: swaps.min_slippage,
    }),
    [swaps]
  );
}

/**
 * Hook for UI configuration
 */
export function useUIConfig() {
  const ui = config.ui;

  return useMemo(
    () => ({
      theme: ui.theme,
      onboarding: ui.onboarding,
      notifications: ui.notifications,
      loadingStates: ui.loading_states,
    }),
    [ui]
  );
}

/**
 * Hook for prompts
 */
export function usePrompts() {
  const prompts = config.prompts;

  return useMemo(
    () => ({
      systemPrompt: prompts.system_prompt,
      welcomeMessage: prompts.welcome_message,
      disclaimer: prompts.disclaimer,
      getErrorMessage,
      getConfirmationPrompt,
    }),
    [prompts]
  );
}

/**
 * Hook for API configuration
 */
export function useAPIConfig() {
  const api = config.api;

  return useMemo(
    () => ({
      rateLimiting: api.rate_limiting,
      caching: api.caching,
      timeouts: api.timeouts,
      retries: api.retries,
      getTimeout,
      isCachingEnabled,
      getCacheDuration,
      getRetryConfig,
    }),
    [api]
  );
}

export default useAgentConfig;
