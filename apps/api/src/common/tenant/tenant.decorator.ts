import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

// Injects the resolved tenant id into a handler parameter.
// Throws if the request has no tenant (i.e. tenant-scoped route called without one).
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    if (!req.tenantId) {
      throw new BadRequestException(
        'Tenant could not be resolved. Use a tenant subdomain or the x-tenant-id header.',
      );
    }
    return req.tenantId;
  },
);
