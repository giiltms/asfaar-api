import { AuditLogService } from '@modules/audit/audit.service';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const url = `${request.method} ${request.url}`;
    const resourceId =
      request?.params?.id || this.auditLogService.getFirstParam(request.params);
    const resourceType = this.auditLogService.getResourceType(request);
    const metadata = {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    };

    return next.handle().pipe(
      tap(async (response) => {
        const changes = this.auditLogService.getChanges(request, response);
        const action = this.auditLogService.determineAction(request);

        if (changes) {
          await this.auditLogService.log(
            user.id,
            action,
            url,
            resourceType,
            resourceId,
            { ...metadata, changes },
          );
        }
      }),
    );
  }
}
