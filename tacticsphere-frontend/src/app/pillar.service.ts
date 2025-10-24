import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../environments/environment';
import { Pilar } from './types';

@Injectable({ providedIn: 'root' })
export class PilarService {
  private http = inject(HttpClient);
  private base = environment.apiUrl; // p.ej. http://127.0.0.1:8000

  /**
   * Intenta /companies/{id}/pillars y, si no existe (404),
   * hace fallback a /pillars?empresa_id=...
   */
  listByEmpresa(empresaId: number): Observable<Pilar[]> {
    const aliasUrl = `${this.base}/companies/${empresaId}/pillars`;
    return this.http.get<Pilar[]>(aliasUrl).pipe(
      catchError((err) => {
        // Fallback solo si el alias no existe
        if (err && err.status === 404) {
          const url = `${this.base}/pillars`;
          return this.http.get<Pilar[]>(url, {
            params: { empresa_id: String(empresaId) },
          });
        }
        return throwError(() => err);
      })
    );
  }

  /** Alias para compatibilidad con código existente que usa `list()` */
  list(empresaId: number): Observable<Pilar[]> {
    return this.listByEmpresa(empresaId);
  }

  /**
   * POST /pillars
   * Saneamos descripcion: null -> undefined para evitar errores de tipos en el backend.
   */
  create(body: {
    empresa_id: number;
    nombre: string;
    descripcion?: string | null;
    peso?: number;
  }): Observable<Pilar> {
    const payload = {
      empresa_id: body.empresa_id,
      nombre: body.nombre,
      // si viene null, lo mandamos como undefined
      descripcion: body.descripcion ?? undefined,
      peso: body.peso ?? 1,
    };
    return this.http.post<Pilar>(`${this.base}/pillars`, payload);
  }

  /** DELETE /pillars/{id} (si el backend lo expone) */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/pillars/${id}`);
  }

  /** Alias por si tu código llamaba a remove() */
  remove(id: number): Observable<void> {
    return this.delete(id);
  }
}