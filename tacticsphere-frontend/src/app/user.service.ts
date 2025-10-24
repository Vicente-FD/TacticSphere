// src/app/user.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../environments/environment';
import {
  Usuario,
  UsuarioCreate,
  UsuarioUpdate,
} from './types';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  /**
   * Lista usuarios. Opcionalmente filtra por empresa.
   * GET /users?empresa_id=123
   */
  list(empresaId?: number | null): Observable<Usuario[]> {
    let params = new HttpParams();
    if (empresaId != null) params = params.set('empresa_id', String(empresaId));
    return this.http.get<Usuario[]>(`${this.base}/users`, { params });
  }

  /**
   * Crea un usuario.
   * POST /users
   */
  create(input: UsuarioCreate): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.base}/users`, input);
  }

  /**
   * Actualiza parcialmente un usuario.
   * PATCH /users/{id}
   */
  update(id: number, patch: UsuarioUpdate): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.base}/users/${id}`, patch);
  }

  /**
   * Borra un usuario.
   * DELETE /users/{id}
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/users/${id}`);
  }

  /** Alias por si prefieres remove() */
  remove(id: number): Observable<void> {
    return this.delete(id);
  }

  /**
   * Cambia la contraseña del usuario.
   * POST /users/{id}/password  { new_password }
   */
  setPassword(id: number, newPassword: string): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.base}/users/${id}/password`, {
      new_password: newPassword,
    });
  }

  /**
   * Helper: activar/desactivar usuario (toggle).
   */
  toggleActive(u: Usuario): Observable<Usuario> {
    return this.update(u.id, { activo: !u.activo });
  }
}