import { registerAs } from '@nestjs/config';

/**
 * Google reCAPTCHA configuration.
 *
 * RECAPTCHA_SECRET_KEY is a server-side secret and must never be exposed to the
 * browser - in particular it must not be named with a NEXT_PUBLIC_ prefix.
 *
 * Verification can be turned off for local development and automated tests with
 * RECAPTCHA_ENABLED=false. It defaults to enabled so that a missing variable in
 * production fails closed rather than silently disabling the check.
 */
export default registerAs('recaptcha', () => ({
  RECAPTCHA_ENABLED: process.env.RECAPTCHA_ENABLED !== 'false',
  RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY,
  RECAPTCHA_VERIFY_URL:
    process.env.RECAPTCHA_VERIFY_URL ||
    'https://www.google.com/recaptcha/api/siteverify',
  RECAPTCHA_TIMEOUT_MS: parseInt(process.env.RECAPTCHA_TIMEOUT_MS, 10) || 10000,
  /**
   * Optional allow-list of hostnames the challenge may be solved on. Leave unset
   * to rely on the domain list configured in the reCAPTCHA admin console.
   */
  RECAPTCHA_ALLOWED_HOSTNAMES: (process.env.RECAPTCHA_ALLOWED_HOSTNAMES || '')
    .split(',')
    .map((hostname) => hostname.trim())
    .filter((hostname) => hostname.length > 0),
}));
