import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export const adminSistemaGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.getRole() === 'ADMIN_SISTEMA') {
    return true;
  }

  if (auth.isLoggedIn()) {
    router.navigateByUrl(auth.getDefaultRoute());
  } else {
    router.navigateByUrl('/login');
  }
  return false;
};
