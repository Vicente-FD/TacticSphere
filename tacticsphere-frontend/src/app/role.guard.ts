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

    // debe estar logueado
    if (!auth.isLoggedIn()) {
      return router.parseUrl('/login');
    }

    const rol = auth.getRole(); // 'ADMIN_SISTEMA' | 'ADMIN' | 'ANALISTA' | 'USUARIO' | null
    if (!rol) {
      return router.parseUrl('/login');
    }

    // acceso directo si el rol está permitido
    if (allowed.includes(rol)) {
      return true;
    }

    // privilegio superior: ADMIN_SISTEMA puede pasar donde pidan ADMIN
    if (rol === 'ADMIN_SISTEMA' && allowed.includes('ADMIN')) {
      return true;
    }

    // si no cumple, lo mandamos al home
    return router.parseUrl('/');
  };
};