import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authTenantInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  let headers = req.headers;
  if (auth.token) headers = headers.set('Authorization', `Bearer ${auth.token}`);
  // Tenant scoping, strongest first:
  //  1. an explicit x-tenant-id already on the request (public pages whose
  //     URL names the company) is never overridden;
  //  2. a signed-in user is ALWAYS scoped to the company inside their login
  //     token — the server additionally rejects any mismatch;
  //  3. otherwise fall back to the tenant typed on the login screen.
  if (!headers.has('x-tenant-id')) {
    const jwtTenant = auth.user()?.tenantId;
    if (jwtTenant) headers = headers.set('x-tenant-id', jwtTenant);
    else if (auth.tenant) headers = headers.set('x-tenant-id', auth.tenant);
  }
  return next(req.clone({ headers }));
};
