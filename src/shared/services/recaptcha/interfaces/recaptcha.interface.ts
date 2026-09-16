/**
 * Raw response returned by Google's reCAPTCHA siteverify endpoint.
 *
 * @see https://developers.google.com/recaptcha/docs/verify
 */
export interface SiteVerifyResponse {
  readonly success: boolean;
  readonly challenge_ts?: string;
  readonly hostname?: string;
  readonly 'error-codes'?: string[];
  /** Present for reCAPTCHA v3 only; the v2 checkbox widget omits it. */
  readonly score?: number;
  readonly action?: string;
}

/**
 * Normalised result of a verification attempt, safe to log.
 */
export interface RecaptchaVerificationResult {
  readonly success: boolean;
  readonly hostname?: string;
  readonly challengeTs?: string;
  readonly errorCodes: string[];
}
