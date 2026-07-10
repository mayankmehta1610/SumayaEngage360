import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authTenantInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  let headers = req.headers;
  if (auth.token) headers = headers.set('Authorization', `Bearer ${auth.token}`);
  if (auth.tenant) headers = headers.set('x-tenant-id', auth.tenant);
  return next(req.clone({ headers }));
};
