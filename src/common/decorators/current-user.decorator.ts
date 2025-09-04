import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export interface JwtUserPayload {
  id: string;
  email: string;
  roles: string[];
  firstName?: string;
  lastName?: string;
  phone?: string;
  _meta?: { token: string };
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtUserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
