import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../modules/audit/audit.service';

// Classify the calling device from its user-agent string.
export function deviceTypeFromUserAgent(ua?: string | null): string {
  if (!ua) return 'API';
  const s = ua.toLowerCase();
  if (/ipad|tablet|kindle|silk|playbook/.test(s)) return 'TABLET';
  if (/mobi|iphone|ipod|android.*mobile|windows phone|dart/.test(s)) return 'MOBILE';
  if (/mozilla|chrome|safari|firefox|edge|opera/.test(s)) return 'DESKTOP';
  return 'API';
}

// NFR-009: auto-audit mutating API calls — who, from where, and on which device.
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
    const userAgent = (req.headers?.['user-agent'] as string | undefined) ?? null;
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
          userAgent,
          deviceType: deviceTypeFromUserAgent(userAgent),
        });
      }),
    );
  }
}
