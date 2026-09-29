import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AgicConfig, loadAgicConfig } from './agic.config';

/**
 * A failed call to AGIC. `status` is the HTTP status AGIC answered with, or 0
 * when it could not be reached.
 */
export class AgicApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly requestId?: string,
  ) {
    super(message);
  }

  get isNotFound() {
    return this.status === 404;
  }

  /** Worth trying again later: AGIC unreachable, overloaded or failing. */
  get isTransient() {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }
}

interface CachedToken {
  value: string;
  expiresAt: number;
}

export interface AgicPhoto {
  mimeType: string;
  data: Buffer;
}

/** Renew this long before expiry, as AGIC's guide recommends. */
const TOKEN_RENEW_MARGIN_MS = 60_000;
/** Stored on the user row as a data URI, so kept to a portrait's size. */
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type FetchFn = typeof fetch;

/**
 * Talks to the AGIC API.
 *
 * Authentication is a client-credentials token that lasts 15 minutes. It is
 * cached and shared by concurrent callers, renewed a minute before expiry,
 * and on an authentication failure renewed and the call retried once.
 *
 * AGIC's guide says a bad token gets a 401, but production answers with a
 * 302 to its /Account/Login page. Redirects are therefore never followed: a
 * redirect is treated as the authentication failure it is, rather than
 * followed to an HTML login page that would then fail to parse.
 */
@Injectable()
export class AgicClientService {
  private readonly logger = new Logger(AgicClientService.name);
  private token: CachedToken | null = null;
  private tokenRequest: Promise<string> | null = null;

  constructor(
    private readonly fetchFn: FetchFn = fetch,
    private readonly configLoader: () => AgicConfig = loadAgicConfig,
  ) {}

  get config(): AgicConfig {
    return this.configLoader();
  }

  /** The applicant booked under an AGIC appointment number. */
  async getAppointment(appointmentNumber: string): Promise<unknown> {
    const path = `/api/v1/biometrics/appointments/${encodeURIComponent(
      appointmentNumber,
    )}`;
    const response = await this.authorised(path, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      purpose: 'LOOKUP',
    });
    const body = await this.readJson(response, path);
    if (!response.ok || body?.success !== true) {
      throw this.errorFrom(response, body, 'AGIC appointment lookup failed');
    }
    return body.data;
  }

  /** The applicant photo AGIC holds, from the photoUrl in their record. */
  async getPhoto(photoUrl: string): Promise<AgicPhoto> {
    const path = this.relativeAgicPath(photoUrl);
    const response = await this.authorised(path, {
      method: 'GET',
      headers: { Accept: 'image/*' },
      purpose: 'PHOTO',
    });
    if (!response.ok) {
      const body = await this.readJson(response, path).catch(() => null);
      throw this.errorFrom(response, body, 'AGIC photo download failed');
    }
    const mimeType = (response.headers.get('content-type') || '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    if (!PHOTO_TYPES.includes(mimeType)) {
      throw new AgicApiError(
        `AGIC photo came back as "${
          mimeType || 'unknown'
        }", not a JPEG, PNG or WebP image`,
        response.status,
      );
    }
    const data = Buffer.from(await response.arrayBuffer());
    if (!data.length || data.length > MAX_PHOTO_BYTES) {
      throw new AgicApiError(
        `AGIC photo is ${data.length} bytes, outside the accepted size`,
        response.status,
      );
    }
    return { mimeType, data };
  }

  /**
   * Sends a JSON payload to AGIC. Returns AGIC's request id for the record.
   */
  async postJson(
    path: string,
    payload: unknown,
    options: { purpose: string; idempotencyKey?: string },
  ): Promise<{ requestId?: string; body: any }> {
    const response = await this.authorised(path, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.idempotencyKey
          ? { 'Idempotency-Key': options.idempotencyKey }
          : {}),
      },
      body: JSON.stringify(payload),
      purpose: options.purpose,
    });
    const body = await this.readJson(response, path).catch(() => null);
    if (!response.ok || body?.success === false) {
      throw this.errorFrom(response, body, `AGIC rejected ${path}`);
    }
    // Only an explicit success is a delivery. A 200 with an HTML page, an
    // empty body or no success flag - a wrong path answered by a catch-all -
    // must not mark biometrics sent that AGIC never took in.
    if (body?.success !== true) {
      throw new AgicApiError(
        `AGIC answered ${path} with HTTP ${response.status} but did not confirm receipt`,
        502,
        body?.code,
        body?.requestId || response.headers.get('x-request-id') || undefined,
      );
    }
    return { requestId: body?.requestId, body };
  }

  /** Forget the cached token, e.g. after the secret is rotated. */
  clearToken() {
    this.token = null;
  }

  private async authorised(
    path: string,
    init: RequestInit & { headers: Record<string, string>; purpose: string },
  ): Promise<Response> {
    const { purpose, ...request } = init;
    const send = async (token: string) =>
      this.send(path, {
        ...request,
        headers: {
          ...request.headers,
          Authorization: `Bearer ${token}`,
          'X-Request-Id': `ASFAAR-${purpose}-${randomUUID()}`,
        },
      });

    const first = await send(await this.accessToken());
    if (!(await this.isAuthFailure(first)))
      return this.notRedirected(first, path);

    // The token may have been revoked or expired early: renew once, retry once.
    this.logger.warn(`AGIC refused the access token for ${path}; renewing`);
    this.clearToken();
    const second = await send(await this.accessToken());
    if (await this.isAuthFailure(second)) {
      throw new AgicApiError(
        'AGIC refused a freshly issued access token',
        401,
        'AUTH401',
      );
    }
    return this.notRedirected(second, path);
  }

  private async accessToken(): Promise<string> {
    if (
      this.token &&
      this.token.expiresAt - TOKEN_RENEW_MARGIN_MS > Date.now()
    ) {
      return this.token.value;
    }
    // Concurrent callers share one token request instead of each making one.
    if (!this.tokenRequest) {
      this.tokenRequest = this.requestToken().finally(() => {
        this.tokenRequest = null;
      });
    }
    return this.tokenRequest;
  }

  private async requestToken(): Promise<string> {
    const { clientId, clientSecret } = this.config;
    const path = '/api/v1/auth/token';
    const response = await this.send(path, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ clientId, clientSecret }),
    });
    const body = await this.readJson(response, path).catch(() => null);

    if (this.isRedirect(response) && !this.isAuthResponse(response, body)) {
      throw this.redirectError(response, path);
    }
    if (
      !response.ok ||
      body?.success !== true ||
      typeof body.access_token !== 'string'
    ) {
      // The body names the problem ("Invalid client credentials.") and never
      // echoes the secret, so it is safe to pass on.
      throw this.errorFrom(
        response,
        body,
        'AGIC did not issue an access token',
      );
    }

    const lifetimeSeconds = Number(body.expires_in) || 900;
    this.token = {
      value: body.access_token,
      expiresAt: Date.now() + lifetimeSeconds * 1000,
    };
    return this.token.value;
  }

  private async send(path: string, init: RequestInit): Promise<Response> {
    const { baseUrl, timeoutMs } = this.config;
    try {
      return await this.fetchFn(`${baseUrl}${path}`, {
        ...init,
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error: any) {
      const reason =
        error?.name === 'TimeoutError'
          ? `timed out after ${timeoutMs}ms`
          : error?.message || 'network error';
      throw new AgicApiError(`Could not reach AGIC: ${reason}`, 0);
    }
  }

  private isRedirect(response: Response): boolean {
    return response.status >= 300 && response.status < 400;
  }

  /**
   * AGIC's way of refusing a token: a 401, a redirect to its login page, or
   * a redirect whose body carries its AUTH401 code. Any other redirect - say
   * http to https, or to www - is a misconfigured base URL, not bad
   * credentials, and is reported as that.
   */
  private isAuthResponse(response: Response, body?: any): boolean {
    return (
      response.status === 401 ||
      body?.code === 'AUTH401' ||
      (this.isRedirect(response) &&
        /\/account\/login/i.test(response.headers.get('location') || ''))
    );
  }

  private async isAuthFailure(response: Response): Promise<boolean> {
    if (this.isAuthResponse(response)) return true;
    if (!this.isRedirect(response)) return false;
    const text = await response
      .clone()
      .text()
      .catch(() => '');
    return /"code"\s*:\s*"AUTH401"/.test(text);
  }

  private notRedirected(response: Response, path: string): Response {
    if (this.isRedirect(response)) throw this.redirectError(response, path);
    return response;
  }

  private redirectError(response: Response, path: string): AgicApiError {
    const location = response.headers.get('location') || 'nowhere';
    this.logger.error(
      `AGIC redirected ${path} (HTTP ${response.status}) to ${location}; check AGIC_API_BASE_URL`,
    );
    return new AgicApiError(
      `AGIC redirected ${path} to ${location}`,
      502,
      'REDIRECT',
    );
  }

  private async readJson(response: Response, path: string): Promise<any> {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      this.logger.warn(
        `AGIC answered ${path} with ${response.status} and a non-JSON body`,
      );
      return null;
    }
  }

  private errorFrom(
    response: Response,
    body: any,
    fallback: string,
    statusOverride?: number,
  ): AgicApiError {
    const status =
      statusOverride ??
      (this.isAuthResponse(response, body) ? 401 : response.status);
    const requestId =
      body?.requestId || response.headers.get('x-request-id') || undefined;
    const error = new AgicApiError(
      body?.message || `${fallback} (HTTP ${response.status})`,
      status,
      body?.code,
      requestId,
    );
    this.logger.warn(
      `AGIC error: ${error.message} [status=${status} code=${
        error.code ?? '-'
      } requestId=${requestId ?? '-'}]`,
    );
    return error;
  }

  /**
   * photoUrl comes from AGIC's response. Only paths on AGIC itself are
   * followed, so a bad record cannot send our bearer token elsewhere.
   */
  private relativeAgicPath(photoUrl: string): string {
    const { baseUrl } = this.config;
    const url = new URL(photoUrl, `${baseUrl}/`);
    if (url.origin !== new URL(baseUrl).origin) {
      throw new AgicApiError('AGIC photo URL points outside AGIC', 400);
    }
    return `${url.pathname}${url.search}`;
  }
}
