import { ExecutionContext } from '@nestjs/common';
import { RecaptchaGuard } from '@modules/auth/guard/recaptcha.guard';
import { RecaptchaService } from '@shared/services/recaptcha/recaptcha.service';

function contextFor(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('RecaptchaGuard', () => {
  let verify: jest.Mock;
  let guard: RecaptchaGuard;

  beforeEach(() => {
    verify = jest.fn().mockResolvedValue(undefined);
    guard = new RecaptchaGuard({
      verify,
    } as unknown as RecaptchaService);
  });

  it('passes the token from the body to the service', async () => {
    const context = contextFor({
      body: { recaptchaToken: 'token-123' },
      headers: {},
      ip: '10.0.0.1',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verify).toHaveBeenCalledWith('token-123', '10.0.0.1');
  });

  it('prefers the first X-Forwarded-For entry over the socket address', async () => {
    const context = contextFor({
      body: { recaptchaToken: 'token-123' },
      headers: { 'x-forwarded-for': '102.89.1.2, 172.18.0.1' },
      ip: '172.18.0.1',
    });

    await guard.canActivate(context);

    expect(verify).toHaveBeenCalledWith('token-123', '102.89.1.2');
  });

  it('handles X-Forwarded-For arriving as an array', async () => {
    const context = contextFor({
      body: { recaptchaToken: 'token-123' },
      headers: { 'x-forwarded-for': ['102.89.1.2, 172.18.0.1'] },
      ip: '172.18.0.1',
    });

    await guard.canActivate(context);

    expect(verify).toHaveBeenCalledWith('token-123', '102.89.1.2');
  });

  it('passes undefined when the body carries no token', async () => {
    const context = contextFor({ body: {}, headers: {}, ip: '10.0.0.1' });

    await guard.canActivate(context);

    expect(verify).toHaveBeenCalledWith(undefined, '10.0.0.1');
  });

  it('tolerates a missing body', async () => {
    const context = contextFor({ headers: {}, ip: '10.0.0.1' });

    await guard.canActivate(context);

    expect(verify).toHaveBeenCalledWith(undefined, '10.0.0.1');
  });

  it('propagates the service rejection so the request is blocked', async () => {
    const failure = new Error('rejected');
    verify.mockRejectedValue(failure);

    const context = contextFor({
      body: { recaptchaToken: 'bad' },
      headers: {},
      ip: '10.0.0.1',
    });

    await expect(guard.canActivate(context)).rejects.toBe(failure);
  });
});
