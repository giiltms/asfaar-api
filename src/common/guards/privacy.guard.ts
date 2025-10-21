import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrivacyService } from '../services/privacy.service';
import { SubmissionStatus } from '@prisma/client';

/**
 * Guard that prevents access to private application statuses
 * Automatically blocks requests that try to access private data
 */
@Injectable()
export class PrivacyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const statusFilter = request.query.status || request.body.status;

    if (statusFilter) {
      const statuses = Array.isArray(statusFilter)
        ? statusFilter
        : [statusFilter];
      const privateStatuses = statuses.filter((status) =>
        PrivacyService.isPrivateStatus(status),
      );

      if (privateStatuses.length > 0) {
        throw new ForbiddenException(
          `Access denied: Private application statuses cannot be accessed: ${privateStatuses.join(
            ', ',
          )}`,
        );
      }
    }

    return true;
  }
}
