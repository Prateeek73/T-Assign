// All carrier config
import { z } from 'zod';
import { ConfigurationError } from '../errors';

// UPS config
export const UPSConfigSchema = z.object({
  carrierId: z.literal('UPS').default('UPS'),
  carrierName: z.string().default('United Parcel Service'),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  accountNumber: z.string().min(1),
  baseUrl: z.string().url().default('https://onlinetools.ups.com'),
  tokenUrl: z.string().url().default('https://onlinetools.ups.com/security/v1/oauth/token'),
  timeoutMs: z.number().int().positive().default(30000),
  useSandbox: z.boolean().default(false),
  supportedCountries: z.array(z.string()).default([
    'US', 'CA', 'MX', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE',
    'AT', 'CH', 'AU', 'JP', 'CN', 'KR', 'SG', 'HK', 'TW', 'IN',
    'BR', 'AR', 'CL', 'CO', 'PE', 'ZA', 'AE', 'IL', 'PL', 'CZ',
    'HU', 'RO', 'NO', 'SE', 'DK', 'FI', 'IE', 'PT', 'GR', 'NZ',
  ]),
});


export type UPSConfig = z.infer<typeof UPSConfigSchema>;


// FedEx config (template for new carriers)
export const FedExConfigSchema = z.object({
  carrierId: z.literal('FEDEX').default('FEDEX'),
  carrierName: z.string().default('Federal Express'),
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1),
  accountNumber: z.string().min(1),
  meterNumber: z.string().min(1),
  baseUrl: z.string().url().default('https://api.fedex.com'),
  timeoutMs: z.number().int().positive().default(30000),
  useSandbox: z.boolean().default(false),
  supportedCountries: z.array(z.string()).default([
    'US', 'CA', 'MX', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE',
  ]),
});

export type FedExConfig = z.infer<typeof FedExConfigSchema>; // Use this for FedEx



// Service config
export const ServiceConfigSchema = z.object({
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  defaultTimeoutMs: z.number().int().positive().default(30000),
  enableRequestLogging: z.boolean().default(false),
});


export type ServiceConfig = z.infer<typeof ServiceConfigSchema>;

// Example configs


// App config
export type AppConfig = {
  service: ServiceConfig;
  ups: UPSConfig;
  // add fedex here
};


// Config loaders

export function loadUPSConfig(): UPSConfig {
  const useSandbox = process.env['UPS_USE_SANDBOX'] === 'true'; // sandbox flag
  const sandboxBaseUrl = 'https://wwwcie.ups.com'; // sandbox url
  const sandboxTokenUrl = 'https://wwwcie.ups.com/security/v1/oauth/token'; // sandbox token

  const rawConfig = {
    clientId: process.env['UPS_CLIENT_ID'],
    clientSecret: process.env['UPS_CLIENT_SECRET'],
    accountNumber: process.env['UPS_ACCOUNT_NUMBER'],
    baseUrl: useSandbox ? sandboxBaseUrl : process.env['UPS_BASE_URL'],
    tokenUrl: useSandbox ? sandboxTokenUrl : process.env['UPS_TOKEN_URL'],
    timeoutMs: process.env['UPS_TIMEOUT_MS'] ? parseInt(process.env['UPS_TIMEOUT_MS'], 10) : undefined,
    useSandbox,
  };

  const result = UPSConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    const missingFields = result.error.issues
      .filter(issue => issue.code === 'invalid_type')
      .map(issue => `UPS_${issue.path.join('_').toUpperCase()}`);

    throw new ConfigurationError(
      'Invalid UPS configuration. Please check your environment variables.',
      { carrier: 'UPS', missingFields: missingFields.length > 0 ? missingFields : undefined }
    );
  }

  return result.data;
}

export function loadServiceConfig(): ServiceConfig {
  const rawConfig = {
    environment: process.env['NODE_ENV'] ?? process.env['SERVICE_ENVIRONMENT'],
    logLevel: process.env['LOG_LEVEL'],
    defaultTimeoutMs: process.env['DEFAULT_TIMEOUT_MS']
      ? parseInt(process.env['DEFAULT_TIMEOUT_MS'], 10)
      : undefined,
    enableRequestLogging: process.env['ENABLE_REQUEST_LOGGING'] === 'true',
  };

  const result = ServiceConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    throw new ConfigurationError(
      'Invalid service configuration. Please check your environment variables.'
    );
  }


  return result.data;
}

// Main loader
export function loadConfig(): AppConfig {
  return {
    service: loadServiceConfig(),
    ups: loadUPSConfig(),
    // fedex: loadFedExConfig(), // if you add fedex above, add this too
  };
}

// Config cache
let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!cachedConfig)
    cachedConfig = loadConfig();
  return cachedConfig;
}

export function resetConfigCache(): void {
  cachedConfig = null;
}