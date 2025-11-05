// src/app/role.guard.ts
import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { AuthService } from './auth.service';
import { RolEnum } from './types';

/**
 * Uso en rutas:
 *   canActivate: [roleGuard(['ADMIN_SISTEMA','ADMIN'])]
 */
export const roleGuard = (allowed: RolEnum[]): CanActivateFn => {
  return (
    _route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot
  ): boolean | UrlTree => {
    const router = inject(Router);
    const auth = inject(AuthService);

    if (!auth.isLoggedIn()) {
      return router.parseUrl('/login');
    }

    const rol = auth.getRole();
    if (!rol) {
      return router.parseUrl('/login');
    }

    if (rol === 'ADMIN' || rol === 'ADMIN_SISTEMA') {
      return true;
    }

    if (allowed.includes(rol)) {
      return true;
    }

    return router.parseUrl(auth.getDefaultRoute());
  };
};
