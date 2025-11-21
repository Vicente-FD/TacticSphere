import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, switchMap, map } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { environment } from '../environments/environment';
import { RolEnum, Usuario } from './types';

interface TokenResponse {
  access_token: string;
  token_type: string;
}

interface ForgotPasswordResponse {
  ok: boolean;
}

type AuthStorage = {
  token?: string;
  rol?: RolEnum;
  empresa_id?: number | null;
  nombre_usuario?: string;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private readonly KEY = 'auth';

  // Login: guarda token y luego trae /me para guardar rol y empresa_id
  login(email: string, password: string): Observable<void> {
    return this.http
      .post<TokenResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((t) => this.writeAuth({ token: t.access_token })), // 1) guardo token
        switchMap(() =>
          this.http.get<Usuario>(`${environment.apiUrl}/me`).pipe(
            tap((me) => {
              const base = this.readAuth();
              this.writeAuth({
                ...base,
                rol: me.rol,
                empresa_id: me.empresa_id ?? null,
                nombre_usuario: me.nombre,
              });
            }),
            map(() => void 0)
          )
        )
      );
  }

  // Cierra sesión
  logout(): void {
    try {
      localStorage.removeItem(this.KEY);
    } catch {
      // noop
    }
  }

  // Relee /me y actualiza rol/empresa (útil si backend cambia el rol)
  ensureMe(): Observable<void> {
    const token = this.getToken();
    if (!token) return of(void 0);
    return this.http.get<Usuario>(`${environment.apiUrl}/me`).pipe(
      tap((me) => {
        const base = this.readAuth();
        this.writeAuth({
          ...base,
          rol: me.rol,
          empresa_id: me.empresa_id ?? null,
          nombre_usuario: me.nombre,
        });
      }),
      map(() => void 0)
    );
  }

  // Helpers públicos
  getToken(): string | null {
    return this.readAuth().token ?? null;
  }

  getRole(): RolEnum | null {
    return this.readAuth().rol ?? null;
  }

  getEmpresaId(): number | null {
    const v = this.readAuth().empresa_id;
    return typeof v === 'number' ? v : null;
  }

  getUserName(): string | null {
    return this.readAuth().nombre_usuario ?? null;
  }

  hasRole(roles: RolEnum[] | RolEnum): boolean {
    const current = this.getRole();
    const list = Array.isArray(roles) ? roles : [roles];
    return !!current && list.includes(current);
  }

  getDefaultRoute(): string {
    const role = this.getRole();
    switch (role) {
      case 'ADMIN_SISTEMA':
      case 'ADMIN':
        return '/results';
      case 'ANALISTA':
        return '/results';
      case 'USUARIO':
        return '/results';
      default:
        return '/home';
    }
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  forgotPassword(email: string) {
    return this.http.post<ForgotPasswordResponse>(`${environment.apiUrl}/auth/password/forgot`, {
      email,
    });
  }

  // Storage helpers
  private readAuth(): AuthStorage {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as AuthStorage;
      return parsed ?? {};
    } catch {
      return {};
    }
  }

  private writeAuth(data: AuthStorage): void {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(data ?? {}));
    } catch {
      // noop
    }
  }
}
