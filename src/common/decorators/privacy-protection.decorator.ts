import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PrivacyService } from '../services/privacy.service';
import { SubmissionStatus } from '@prisma/client';

/**
 * Decorator that automatically applies privacy protection to query parameters
 * Usage: @PrivacyProtected() statusFilter: SubmissionStatus[]
 */
export const PrivacyProtected = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const statusFilter = request.query.status || request.body.status;

    if (statusFilter) {
      // Validate that no private statuses are requested
      PrivacyService.validateStatusRequest(
        Array.isArray(statusFilter) ? statusFilter : [statusFilter],
      );

      // Return filtered statuses
      return PrivacyService.filterPrivateStatuses(
        Array.isArray(statusFilter) ? statusFilter : [statusFilter],
      );
    }

    return undefined;
  },
);

/**
 * Decorator that creates a privacy-protected where clause
 * Usage: @PrivacyWhereClause() whereClause: any
 */
export const PrivacyWhereClause = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const statusFilter = request.query.status || request.body.status;

    return PrivacyService.createPrivacyProtectedWhereClause(
      statusFilter
        ? Array.isArray(statusFilter)
          ? statusFilter
          : [statusFilter]
        : undefined,
    );
  },
);
