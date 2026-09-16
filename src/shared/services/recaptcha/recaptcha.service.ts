import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  RecaptchaVerificationResult,
  SiteVerifyResponse,
} from './interfaces/recaptcha.interface';

/**
 * Error codes Google returns when the token itself is the problem, as opposed to
 * our own credentials being wrong. These are the only ones a legitimate user can
 * trigger, so they map to a 400 rather than a 503.
 *
 * @see https://developers.google.com/recaptcha/docs/verify#error_code_reference
 */
const USER_RECOVERABLE_ERROR_CODES: ReadonlySet<string> = new Set([
  'missing-input-response',
  'invalid-input-response',
  'timeout-or-duplicate',
  'bad-request',
]);

const GENERIC_FAILURE_MESSAGE =
  'reCAPTCHA verification failed. Please try again.';

@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);
  private readonly enabled: boolean;
  private readonly secretKey?: string;
  private readonly verifyUrl: string;
  private readonly timeoutMs: number;
  private readonly allowedHostnames: readonly string[];

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get('recaptcha') || {};

    this.enabled = config.RECAPTCHA_ENABLED !== false;
    this.secretKey = config.RECAPTCHA_SECRET_KEY;
    this.verifyUrl =
      config.RECAPTCHA_VERIFY_URL ||
      'https://www.google.com/recaptcha/api/siteverify';
    this.timeoutMs = config.RECAPTCHA_TIMEOUT_MS || 10000;
    this.allowedHostnames = config.RECAPTCHA_ALLOWED_HOSTNAMES || [];

    if (this.enabled && !this.secretKey) {
      throw new Error(
        'RECAPTCHA_SECRET_KEY is required when reCAPTCHA is enabled. ' +
          'Set it in the environment, or set RECAPTCHA_ENABLED=false to ' +
          'disable verification for local development.',
      );
    }

    if (!this.enabled) {
      this.logger.warn(
        '⚠️  reCAPTCHA verification is DISABLED (RECAPTCHA_ENABLED=false). ' +
          'Endpoints protected by RecaptchaGuard accept any request.',
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Verify a reCAPTCHA token with Google and throw if it is not valid.
   *
   * Tokens are single-use: Google rejects a replayed token with
   * `timeout-or-duplicate`, so no local nonce store is needed.
   *
   * @throws BadRequestException when the token is missing, malformed, expired,
   *   replayed, or solved on an unexpected hostname.
   * @throws ServiceUnavailableException when Google cannot be reached or our own
   *   credentials are rejected - failing closed rather than letting the request
   *   through unverified.
   */
  async verify(token?: string, remoteIp?: string): Promise<void> {
    if (!this.enabled) {
      return;
    }

    if (!token || token.trim().length === 0) {
      throw new BadRequestException(
        'Please complete the reCAPTCHA verification',
      );
    }

    const result = await this.callSiteVerify(token, remoteIp);

    if (!result.success) {
      this.handleFailure(result);
    }

    this.assertAllowedHostname(result);
  }

  private async callSiteVerify(
    token: string,
    remoteIp?: string,
  ): Promise<RecaptchaVerificationResult> {
    const params = new URLSearchParams({
      secret: this.secretKey,
      response: token,
    });

    if (remoteIp) {
      params.append('remoteip', remoteIp);
    }

    try {
      const response = await axios.post<SiteVerifyResponse>(
        this.verifyUrl,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: this.timeoutMs,
        },
      );

      const data = response.data;

      return {
        success: data?.success === true,
        hostname: data?.hostname,
        challengeTs: data?.challenge_ts,
        errorCodes: data?.['error-codes'] ?? [],
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown transport error';

      this.logger.error(
        `reCAPTCHA siteverify request failed: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new ServiceUnavailableException(
        'Unable to verify reCAPTCHA at the moment. Please try again shortly.',
      );
    }
  }

  private handleFailure(result: RecaptchaVerificationResult): never {
    const errorCodes = result.errorCodes;
    const isUserRecoverable =
      errorCodes.length > 0 &&
      errorCodes.every((code) => USER_RECOVERABLE_ERROR_CODES.has(code));

    if (isUserRecoverable) {
      this.logger.warn(`reCAPTCHA rejected token: ${errorCodes.join(', ')}`);

      throw new BadRequestException(GENERIC_FAILURE_MESSAGE);
    }

    // invalid-input-secret / missing-input-secret mean OUR configuration is
    // wrong. Surfacing that as a 400 would blame the user for our outage, so it
    // is logged loudly and returned as a 503.
    this.logger.error(
      `reCAPTCHA misconfiguration - siteverify returned: ${
        errorCodes.join(', ') || 'no error codes'
      }`,
    );

    throw new ServiceUnavailableException(
      'Unable to verify reCAPTCHA at the moment. Please try again shortly.',
    );
  }

  private assertAllowedHostname(result: RecaptchaVerificationResult): void {
    if (this.allowedHostnames.length === 0) {
      return;
    }

    if (!result.hostname || !this.allowedHostnames.includes(result.hostname)) {
      this.logger.warn(
        `reCAPTCHA solved on unexpected hostname: ${
          result.hostname || 'unknown'
        }`,
      );

      throw new BadRequestException(GENERIC_FAILURE_MESSAGE);
    }
  }
}
