import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Roles } from '@prisma/client';
export interface JwtUserPayload {
  id: string;
  email: string;
  roles: Roles[];
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
