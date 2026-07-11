import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { canAccess, homeForRoles } from './rbac';

export const roleGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user();
  if (!user) return router.parseUrl('/login');
  const path = state.url.split('?')[0];
  if (canAccess(user.roles, path)) return true;
  return router.parseUrl(homeForRoles(user.roles));
};
