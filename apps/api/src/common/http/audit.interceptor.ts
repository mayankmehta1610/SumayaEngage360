import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../modules/audit/audit.service';

// NFR-009: auto-audit mutating API calls.
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest();
    const method = req.method as string;
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }
    const path = req.route?.path ?? req.url;
    if (path?.includes('/auth/login') || path?.includes('/health')) {
      return next.handle();
    }
    return next.handle().pipe(
      tap(() => {
        void this.audit.log({
          tenantId: req.tenantId,
          userId: req.user?.sub,
          action: method,
          entityType: 'API',
          entityId: path,
          metadata: { body: req.body ? Object.keys(req.body) : [] },
          ipAddress: req.ip,
        });
      }),
    );
  }
}
