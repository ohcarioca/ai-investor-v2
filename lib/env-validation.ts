/**
 * Environment Variable Validation
 * Validates that all required environment variables are set at startup
 */

interface EnvConfig {
  name: string;
  required: boolean;
  prefix?: 'NEXT_PUBLIC_' | '';
  description: string;
}

const envConfig: EnvConfig[] = [
  // OpenAI
  {
    name: 'OPENAI_API_KEY',
    required: true,
    description: 'OpenAI API key for chat functionality',
  },
  {
    name: 'OPENAI_MODEL',
    required: false,
    description: 'OpenAI model to use (defaults to gpt-4o)',
  },
  // OKX DEX
  {
    name: 'OKX_API_KEY',
    required: true,
    description: 'OKX DEX API key for swap functionality',
  },
  {
    name: 'OKX_SECRET_KEY',
    required: true,
    description: 'OKX DEX secret key',
  },
  {
    name: 'OKX_API_PASSPHRASE',
    required: true,
    description: 'OKX DEX API passphrase',
  },
  {
    name: 'OKX_PROJECT_ID',
    required: true,
    description: 'OKX DEX project ID',
  },
  // App Config
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: false,
    prefix: 'NEXT_PUBLIC_',
    description: 'Application URL for CORS and redirects',
  },
  {
    name: 'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
    required: true,
    prefix: 'NEXT_PUBLIC_',
    description: 'WalletConnect project ID for wallet connections',
  },
  {
    name: 'NEXT_PUBLIC_WEBHOOK_URL',
    required: false,
    prefix: 'NEXT_PUBLIC_',
    description: 'Webhook URL for transaction notifications',
  },
];

interface ValidationResult {
  isValid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Validates all required environment variables
 * @returns ValidationResult with missing and warning information
 */
export function validateEnv(): ValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const config of envConfig) {
    const value = process.env[config.name];

    if (config.required && !value) {
      missing.push(`${config.name} - ${config.description}`);
    } else if (!config.required && !value) {
      warnings.push(`${config.name} is not set (optional)`);
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Validates environment variables and throws if any required ones are missing
 * Use this at application startup
 */
export function validateEnvOrThrow(): void {
  const result = validateEnv();

  if (!result.isValid) {
    const errorMessage = [
      '❌ Missing required environment variables:',
      '',
      ...result.missing.map((m) => `  • ${m}`),
      '',
      'Please check your .env.local file or Vercel environment settings.',
      'See .env.example for required variables.',
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Log warnings in development
  if (process.env.NODE_ENV === 'development' && result.warnings.length > 0) {
    console.warn('⚠️ Optional environment variables not set:');
    result.warnings.forEach((w) => console.warn(`  • ${w}`));
  }
}

/**
 * Get a required environment variable or throw
 */
export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Get an optional environment variable with a default value
 */
export function getOptionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}
