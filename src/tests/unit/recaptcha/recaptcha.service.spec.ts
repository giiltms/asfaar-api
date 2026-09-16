import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios from 'axios';
import { RecaptchaService } from '@shared/services/recaptcha/recaptcha.service';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

const BASE_CONFIG = {
  RECAPTCHA_ENABLED: true,
  RECAPTCHA_SECRET_KEY: 'test-secret',
  RECAPTCHA_VERIFY_URL: 'https://www.google.com/recaptcha/api/siteverify',
  RECAPTCHA_TIMEOUT_MS: 10000,
  RECAPTCHA_ALLOWED_HOSTNAMES: [] as string[],
};

async function buildService(
  overrides: Partial<typeof BASE_CONFIG> = {},
): Promise<RecaptchaService> {
  const config = { ...BASE_CONFIG, ...overrides };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      RecaptchaService,
      {
        provide: ConfigService,
        useValue: {
          get: jest.fn((key: string) =>
            key === 'recaptcha' ? config : undefined,
          ),
        },
      },
    ],
  }).compile();

  return module.get<RecaptchaService>(RecaptchaService);
}

function siteVerifyResponse(data: Record<string, unknown>) {
  return { data };
}

describe('RecaptchaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('construction', () => {
    it('throws when enabled without a secret key', async () => {
      await expect(
        buildService({ RECAPTCHA_SECRET_KEY: undefined }),
      ).rejects.toThrow(/RECAPTCHA_SECRET_KEY is required/);
    });

    it('starts without a secret key when explicitly disabled', async () => {
      const service = await buildService({
        RECAPTCHA_ENABLED: false,
        RECAPTCHA_SECRET_KEY: undefined,
      });

      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('verify - disabled', () => {
    it('skips verification entirely', async () => {
      const service = await buildService({
        RECAPTCHA_ENABLED: false,
        RECAPTCHA_SECRET_KEY: undefined,
      });

      await expect(service.verify(undefined)).resolves.toBeUndefined();
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('verify - missing token', () => {
    it.each([undefined, '', '   '])(
      'rejects %p without calling Google',
      async (token) => {
        const service = await buildService();

        await expect(service.verify(token)).rejects.toBeInstanceOf(
          BadRequestException,
        );
        expect(mockedAxios.post).not.toHaveBeenCalled();
      },
    );
  });

  describe('verify - success', () => {
    it('resolves when Google reports success', async () => {
      const service = await buildService();
      mockedAxios.post.mockResolvedValue(
        siteVerifyResponse({ success: true, hostname: 'asfaar.ng' }),
      );

      await expect(service.verify('valid-token')).resolves.toBeUndefined();
    });

    it('sends the secret, token and client IP as form-encoded data', async () => {
      const service = await buildService();
      mockedAxios.post.mockResolvedValue(siteVerifyResponse({ success: true }));

      await service.verify('valid-token', '102.89.1.2');

      const [url, body, options] = mockedAxios.post.mock.calls[0];
      const params = new URLSearchParams(body as string);

      expect(url).toBe(BASE_CONFIG.RECAPTCHA_VERIFY_URL);
      expect(params.get('secret')).toBe('test-secret');
      expect(params.get('response')).toBe('valid-token');
      expect(params.get('remoteip')).toBe('102.89.1.2');
      expect(options).toMatchObject({
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
      });
    });

    it('omits remoteip when the client IP is unknown', async () => {
      const service = await buildService();
      mockedAxios.post.mockResolvedValue(siteVerifyResponse({ success: true }));

      await service.verify('valid-token');

      const params = new URLSearchParams(
        mockedAxios.post.mock.calls[0][1] as string,
      );
      expect(params.has('remoteip')).toBe(false);
    });
  });

  describe('verify - user-recoverable failures', () => {
    it.each([
      ['invalid-input-response'],
      ['timeout-or-duplicate'],
      ['missing-input-response'],
      ['bad-request'],
    ])('maps %s to a 400', async (code) => {
      const service = await buildService();
      mockedAxios.post.mockResolvedValue(
        siteVerifyResponse({ success: false, 'error-codes': [code] }),
      );

      await expect(service.verify('token')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('does not leak Google error codes to the client', async () => {
      const service = await buildService();
      mockedAxios.post.mockResolvedValue(
        siteVerifyResponse({
          success: false,
          'error-codes': ['timeout-or-duplicate'],
        }),
      );

      await expect(service.verify('token')).rejects.toThrow(
        'reCAPTCHA verification failed. Please try again.',
      );
    });
  });

  describe('verify - our own misconfiguration', () => {
    it.each([['invalid-input-secret'], ['missing-input-secret']])(
      'maps %s to a 503 rather than blaming the user',
      async (code) => {
        const service = await buildService();
        mockedAxios.post.mockResolvedValue(
          siteVerifyResponse({ success: false, 'error-codes': [code] }),
        );

        await expect(service.verify('token')).rejects.toBeInstanceOf(
          ServiceUnavailableException,
        );
      },
    );

    it('maps an empty error-codes failure to a 503', async () => {
      const service = await buildService();
      mockedAxios.post.mockResolvedValue(
        siteVerifyResponse({ success: false }),
      );

      await expect(service.verify('token')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe('verify - transport failure', () => {
    it('fails closed when Google is unreachable', async () => {
      const service = await buildService();
      mockedAxios.post.mockRejectedValue(new Error('ETIMEDOUT'));

      await expect(service.verify('token')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe('verify - hostname allow-list', () => {
    it('accepts a hostname on the allow-list', async () => {
      const service = await buildService({
        RECAPTCHA_ALLOWED_HOSTNAMES: ['asfaar.ng'],
      });
      mockedAxios.post.mockResolvedValue(
        siteVerifyResponse({ success: true, hostname: 'asfaar.ng' }),
      );

      await expect(service.verify('token')).resolves.toBeUndefined();
    });

    it('rejects a hostname that is not on the allow-list', async () => {
      const service = await buildService({
        RECAPTCHA_ALLOWED_HOSTNAMES: ['asfaar.ng'],
      });
      mockedAxios.post.mockResolvedValue(
        siteVerifyResponse({ success: true, hostname: 'evil.example' }),
      );

      await expect(service.verify('token')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('ignores hostname when no allow-list is configured', async () => {
      const service = await buildService();
      mockedAxios.post.mockResolvedValue(
        siteVerifyResponse({ success: true, hostname: 'anything.example' }),
      );

      await expect(service.verify('token')).resolves.toBeUndefined();
    });
  });
});
