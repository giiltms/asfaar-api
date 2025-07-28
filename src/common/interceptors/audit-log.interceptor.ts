import { AuditService } from '@modules/audit/audit.service';
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthenticatedRequest } from '../types/request.interface';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { method, url, user, ip, headers } = request;

    return next.handle().pipe(
      tap(() => {
        if (user) {
          this.auditService.createAuditLog({
            user,
            action: method,
            resource: 'HTTP',
            resourceId: url,
            url,
            ipAddress: ip || 'unknown',
            userAgent: headers['user-agent'] || 'unknown',
          });
        }
      }),
    );
  }
}
