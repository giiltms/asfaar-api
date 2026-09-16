import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { RecaptchaService } from '@shared/services/recaptcha/recaptcha.service';

interface RecaptchaRequestBody {
  recaptchaToken?: string;
}

/**
 * Verifies the `recaptchaToken` in the request body before the handler runs.
 *
 * Guards execute before the global ValidationPipe, so the body is still the raw
 * parsed JSON here. The token is also declared on the relevant DTOs because the
 * pipe runs with `forbidNonWhitelisted: true` and would otherwise reject it as
 * an unknown property.
 */
@Injectable()
export class RecaptchaGuard implements CanActivate {
  constructor(private readonly recaptchaService: RecaptchaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const body = (request.body || {}) as RecaptchaRequestBody;

    await this.recaptchaService.verify(
      body.recaptchaToken,
      this.resolveClientIp(request),
    );

    return true;
  }

  /**
   * The app runs behind Traefik, so the originating address is in
   * X-Forwarded-For; its first entry is the client. Falls back to the socket
   * address for direct requests.
   */
  private resolveClientIp(request: Request): string | undefined {
    const forwardedFor = request.headers['x-forwarded-for'];

    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
      return forwardedFor.split(',')[0].trim();
    }

    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
      return forwardedFor[0].split(',')[0].trim();
    }

    return request.ip;
  }
}
