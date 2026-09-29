/**
 * Settings for the AGIC integration, read from the environment.
 *
 * The client secret stays on this server - AGIC's guide is explicit that it
 * must never reach browser code - so every AGIC call goes through the API.
 */
export interface AgicConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  /** The AGIC travel agency account on ASFAAR that imported applicants join. */
  agencyEmail: string;
  /** Per-request timeout for calls to AGIC. */
  timeoutMs: number;
  /**
   * Optional JSON map of AGIC center id to ASFAAR center id or code, for when
   * the names differ, e.g. {"1":"ABJ-001"}.
   */
  centerMap: Record<string, string>;
  /**
   * Optional JSON map of AGIC visa to ASFAAR form id, keyed
   * "<visaCountryId>:<visaTypeId>" or "<visaCountryId>", for when no form can
   * be matched by country and visa type name.
   */
  formMap: Record<string, string>;
  /** Whether captured biometrics are sent to AGIC. */
  biometricPushEnabled: boolean;
  /** Path AGIC receives biometrics on; {appointmentNumber} is substituted. */
  biometricPushPath: string;
  /** Attempts before a send is left for manual retry. */
  biometricPushMaxAttempts: number;
}

export const DEFAULT_AGIC_AGENCY_EMAIL = 'asfaar@agicltd.com';
export const DEFAULT_AGIC_TIMEOUT_MS = 20_000;
export const DEFAULT_BIOMETRIC_PUSH_PATH =
  '/api/v1/biometrics/appointments/{appointmentNumber}/biometrics';
export const DEFAULT_BIOMETRIC_PUSH_MAX_ATTEMPTS = 12;

type Env = Record<string, string | undefined>;

function parseJsonMap(name: string, raw: string | undefined) {
  if (!raw || !raw.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${name} must be a JSON object`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${name} must be a JSON object`);
  }
  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [
      k,
      String(v),
    ]),
  );
}

function positiveInt(name: string, raw: string | undefined, fallback: number) {
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

/**
 * Reads the configuration. Throws when AGIC is not configured, so callers get
 * a clear error rather than a request to "undefined/api/v1/...".
 */
export function loadAgicConfig(env: Env = process.env): AgicConfig {
  const baseUrl = (env.AGIC_API_BASE_URL || '').trim().replace(/\/+$/, '');
  const clientId = (env.AGIC_CLIENT_ID || '').trim();
  const clientSecret = (env.AGIC_CLIENT_SECRET || '').trim();

  const missing = [
    !baseUrl && 'AGIC_API_BASE_URL',
    !clientId && 'AGIC_CLIENT_ID',
    !clientSecret && 'AGIC_CLIENT_SECRET',
  ].filter(Boolean);
  if (missing.length) {
    throw new Error(
      `AGIC integration is not configured: ${missing.join(', ')}`,
    );
  }
  if (!/^https:\/\//i.test(baseUrl) && env.NODE_ENV === 'production') {
    throw new Error('AGIC_API_BASE_URL must use HTTPS');
  }

  return {
    baseUrl,
    clientId,
    clientSecret,
    agencyEmail: (env.AGIC_AGENCY_EMAIL || DEFAULT_AGIC_AGENCY_EMAIL)
      .trim()
      .toLowerCase(),
    timeoutMs: positiveInt(
      'AGIC_TIMEOUT_MS',
      env.AGIC_TIMEOUT_MS,
      DEFAULT_AGIC_TIMEOUT_MS,
    ),
    centerMap: parseJsonMap('AGIC_CENTER_MAP', env.AGIC_CENTER_MAP),
    formMap: parseJsonMap('AGIC_FORM_MAP', env.AGIC_FORM_MAP),
    biometricPushEnabled:
      (env.AGIC_BIOMETRIC_PUSH_ENABLED || '').toLowerCase() === 'true',
    biometricPushPath:
      env.AGIC_BIOMETRIC_PUSH_PATH || DEFAULT_BIOMETRIC_PUSH_PATH,
    biometricPushMaxAttempts: positiveInt(
      'AGIC_BIOMETRIC_PUSH_MAX_ATTEMPTS',
      env.AGIC_BIOMETRIC_PUSH_MAX_ATTEMPTS,
      DEFAULT_BIOMETRIC_PUSH_MAX_ATTEMPTS,
    ),
  };
}
