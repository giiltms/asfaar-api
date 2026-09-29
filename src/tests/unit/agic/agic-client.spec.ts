import {
  AgicApiError,
  AgicClientService,
} from '@modules/agic/agic-client.service';
import { loadAgicConfig } from '@modules/agic/agic.config';

const config = () =>
  loadAgicConfig({
    AGIC_API_BASE_URL: 'https://agic.test',
    AGIC_CLIENT_ID: 'ASFAAR-BIOMETRIC',
    AGIC_CLIENT_SECRET: 'secret',
  });

const json = (
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

const tokenResponse = (token = 'tok-1', expiresIn = 900) =>
  json(200, {
    success: true,
    access_token: token,
    token_type: 'Bearer',
    expires_in: expiresIn,
  });

/** What production AGIC sends for a bad token: a redirect to its login page. */
const loginRedirect = () =>
  new Response(
    JSON.stringify({
      success: false,
      code: 'AUTH401',
      message: 'Authentication failed.',
    }),
    {
      status: 302,
      headers: { location: 'https://agic.test/Account/Login?ReturnUrl=%2Fapi' },
    },
  );

const appointment = () =>
  json(200, {
    success: true,
    code: '00',
    data: { appointmentNumber: 'AGIC-BIO-1' },
  });

function clientWith(responses: Array<Response | Error>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchFn = jest.fn(async (url: any, init: any) => {
    calls.push({ url: String(url), init });
    const next = responses.shift();
    if (!next) throw new Error(`unexpected request to ${url}`);
    if (next instanceof Error) throw next;
    return next;
  });
  return {
    client: new AgicClientService(fetchFn as any, config),
    calls,
    fetchFn,
  };
}

describe('AgicClientService', () => {
  it('fetches a token with the client credentials and sends it as a bearer', async () => {
    const { client, calls } = clientWith([tokenResponse(), appointment()]);

    await expect(client.getAppointment('AGIC-BIO-1')).resolves.toEqual({
      appointmentNumber: 'AGIC-BIO-1',
    });

    expect(calls[0].url).toBe('https://agic.test/api/v1/auth/token');
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      clientId: 'ASFAAR-BIOMETRIC',
      clientSecret: 'secret',
    });
    expect(calls[1].url).toBe(
      'https://agic.test/api/v1/biometrics/appointments/AGIC-BIO-1',
    );
    const headers = calls[1].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok-1');
    expect(headers['X-Request-Id']).toMatch(/^ASFAAR-LOOKUP-/);
  });

  it('never follows redirects, so a login page is not mistaken for data', async () => {
    const { client, calls } = clientWith([tokenResponse(), appointment()]);
    await client.getAppointment('AGIC-BIO-1');
    expect(calls.every((c) => c.init.redirect === 'manual')).toBe(true);
  });

  it('reuses the token across calls until it is near expiry', async () => {
    const { client, fetchFn } = clientWith([
      tokenResponse(),
      appointment(),
      appointment(),
    ]);
    await client.getAppointment('AGIC-BIO-1');
    await client.getAppointment('AGIC-BIO-1');
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('renews a token with under a minute left', async () => {
    const { client, calls } = clientWith([
      tokenResponse('short', 30),
      appointment(),
      tokenResponse('fresh'),
      appointment(),
    ]);
    await client.getAppointment('AGIC-BIO-1');
    await client.getAppointment('AGIC-BIO-1');
    expect((calls[3].init.headers as any).Authorization).toBe('Bearer fresh');
  });

  it('shares one token request between concurrent callers', async () => {
    const { client, calls } = clientWith([
      tokenResponse(),
      appointment(),
      appointment(),
    ]);
    await Promise.all([
      client.getAppointment('AGIC-BIO-1'),
      client.getAppointment('AGIC-BIO-1'),
    ]);
    expect(calls.filter((c) => c.url.endsWith('/auth/token'))).toHaveLength(1);
  });

  it('treats the login redirect as an expired token: renews once and retries', async () => {
    const { client, calls } = clientWith([
      tokenResponse('stale'),
      loginRedirect(),
      tokenResponse('fresh'),
      appointment(),
    ]);
    await expect(client.getAppointment('AGIC-BIO-1')).resolves.toBeTruthy();
    expect((calls[3].init.headers as any).Authorization).toBe('Bearer fresh');
  });

  it('gives up after one retry rather than looping', async () => {
    const { client } = clientWith([
      tokenResponse(),
      loginRedirect(),
      tokenResponse(),
      loginRedirect(),
    ]);
    await expect(client.getAppointment('AGIC-BIO-1')).rejects.toMatchObject({
      status: 401,
    });
  });

  it('reports rejected credentials as an authentication failure', async () => {
    const { client } = clientWith([
      new Response(
        JSON.stringify({
          success: false,
          code: 'AUTH401',
          message: 'Invalid client credentials.',
        }),
        {
          status: 302,
        },
      ),
    ]);
    await expect(client.getAppointment('AGIC-BIO-1')).rejects.toMatchObject({
      status: 401,
      message: 'Invalid client credentials.',
    });
  });

  it('passes on AGIC’s not-found with its code and request id', async () => {
    const { client } = clientWith([
      tokenResponse(),
      json(404, {
        success: false,
        code: 'BIO404',
        message: 'Appointment was not found.',
        requestId: 'r-9',
      }),
    ]);
    const error = (await client
      .getAppointment('AGIC-BIO-1')
      .catch((e) => e)) as AgicApiError;
    expect(error).toBeInstanceOf(AgicApiError);
    expect(error.isNotFound).toBe(true);
    expect(error.code).toBe('BIO404');
    expect(error.requestId).toBe('r-9');
  });

  it('reports an unreachable AGIC as transient', async () => {
    const { client } = clientWith([
      tokenResponse(),
      new TypeError('fetch failed'),
    ]);
    const error = (await client
      .getAppointment('AGIC-BIO-1')
      .catch((e) => e)) as AgicApiError;
    expect(error.status).toBe(0);
    expect(error.isTransient).toBe(true);
  });

  it('downloads the photo from AGIC with the bearer token', async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
    const { client, calls } = clientWith([
      tokenResponse(),
      new Response(jpeg, {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      }),
    ]);
    const photo = await client.getPhoto(
      '/api/v1/biometrics/appointments/AGIC-BIO-1/photo',
    );
    expect(photo.mimeType).toBe('image/jpeg');
    expect(photo.data.equals(jpeg)).toBe(true);
    expect(calls[1].url).toBe(
      'https://agic.test/api/v1/biometrics/appointments/AGIC-BIO-1/photo',
    );
  });

  it('will not send the bearer token to a photo URL on another host', async () => {
    const { client, fetchFn } = clientWith([tokenResponse()]);
    await expect(client.getPhoto('https://evil.test/steal')).rejects.toThrow(
      'AGIC photo URL points outside AGIC',
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('refuses a "photo" that is not an image', async () => {
    const { client } = clientWith([
      tokenResponse(),
      json(200, { not: 'an image' }),
    ]);
    await expect(client.getPhoto('/photo')).rejects.toThrow(
      /not a JPEG, PNG or WebP/,
    );
  });
});

describe('AgicClientService redirects', () => {
  it('reports a redirect elsewhere as a base URL problem, not bad credentials', async () => {
    const { client, fetchFn } = clientWith([
      new Response(null, {
        status: 301,
        headers: { location: 'https://www.agic.test/api/v1/auth/token' },
      }),
    ]);
    const error = (await client
      .getAppointment('AGIC-BIO-1')
      .catch((e) => e)) as AgicApiError;
    expect(error.code).toBe('REDIRECT');
    expect(error.status).not.toBe(401);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('does not renew the token for a redirect that is not to the login page', async () => {
    const { client, fetchFn } = clientWith([
      tokenResponse(),
      new Response(null, {
        status: 308,
        headers: { location: 'https://agic.test/elsewhere' },
      }),
    ]);
    const error = (await client
      .getAppointment('AGIC-BIO-1')
      .catch((e) => e)) as AgicApiError;
    expect(error.code).toBe('REDIRECT');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

describe('AgicClientService.postJson', () => {
  it('counts only an explicit success as delivered', async () => {
    const { client } = clientWith([
      tokenResponse(),
      json(200, { success: true, requestId: 'r-1' }),
    ]);
    await expect(
      client.postJson('/in', {}, { purpose: 'BIOMETRIC' }),
    ).resolves.toMatchObject({ requestId: 'r-1' });
  });

  it('does not take a 200 page without a success flag for a delivery', async () => {
    const { client } = clientWith([
      tokenResponse(),
      new Response('<html>Welcome to AGIC</html>', { status: 200 }),
    ]);
    const error = (await client
      .postJson('/wrong-path', {}, { purpose: 'BIOMETRIC' })
      .catch((e) => e)) as AgicApiError;
    expect(error).toBeInstanceOf(AgicApiError);
    expect(error.message).toMatch(/did not confirm receipt/);
    // Retried later rather than given up on.
    expect(error.isTransient).toBe(true);
  });
});

describe('loadAgicConfig', () => {
  it('names the missing settings', () => {
    expect(() => loadAgicConfig({})).toThrow(
      'AGIC integration is not configured: AGIC_API_BASE_URL, AGIC_CLIENT_ID, AGIC_CLIENT_SECRET',
    );
  });

  it('insists on HTTPS in production', () => {
    expect(() =>
      loadAgicConfig({
        NODE_ENV: 'production',
        AGIC_API_BASE_URL: 'http://agicltd.com',
        AGIC_CLIENT_ID: 'x',
        AGIC_CLIENT_SECRET: 'y',
      }),
    ).toThrow('HTTPS');
  });

  it('defaults to the AGIC agency account and keeps sending biometrics off', () => {
    const c = config();
    expect(c.agencyEmail).toBe('asfaar@agicltd.com');
    expect(c.biometricPushEnabled).toBe(false);
    expect(c.baseUrl).toBe('https://agic.test');
  });

  it('rejects a malformed center map instead of ignoring it', () => {
    expect(() =>
      loadAgicConfig({
        AGIC_API_BASE_URL: 'https://a',
        AGIC_CLIENT_ID: 'x',
        AGIC_CLIENT_SECRET: 'y',
        AGIC_CENTER_MAP: '{nope',
      }),
    ).toThrow('AGIC_CENTER_MAP must be a JSON object');
  });
});
