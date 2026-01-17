import { registerAs } from '@nestjs/config';

/**
 * Secrets Configuration
 *
 * Maps SECRETS_* environment variables to nested config.
 *
 * Provider options:
 * - 'env' (default): Read from process.env (works everywhere)
 * - 'aws': AWS Secrets Manager
 * - 'supabase': Supabase Vault
 */
export default registerAs('secrets', () => ({
  provider: process.env.SECRETS_PROVIDER || 'env',
  region: process.env.AWS_REGION,
  cacheTTLSeconds: Number.parseInt(process.env.SECRETS_CACHE_TTL || '300', 10),
}));
