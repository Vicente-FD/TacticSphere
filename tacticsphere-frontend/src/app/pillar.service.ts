import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../environments/environment';
import { Pilar, PilarCreate, PilarUpdate } from './types';

type PilarCreatePayload = {
  nombre: string;
  peso: number;
  descripcion?: string | null;
};

type PilarUpdatePayload = {
  nombre?: string;
  peso?: number;
  descripcion?: string | null;
};

@Injectable({ providedIn: 'root' })
export class PilarService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  listAll(): Observable<Pilar[]> {
    return this.http.get<Pilar[]>(`${this.base}/pillars`).pipe(map((rows) => rows ?? []));
  }

  /**
   * Legacy signature kept for backward compatibility. Returns catálogo global + específico.
   */
  listByEmpresa(empresaId: number): Observable<Pilar[]> {
    return this.http
      .get<Pilar[]>(`${this.base}/pillars`, { params: { empresa_id: String(empresaId) } })
      .pipe(map((rows) => rows ?? []));
  }

  list(empresaId?: number | null): Observable<Pilar[]> {
    if (empresaId != null) {
      return this.listByEmpresa(empresaId);
    }
    return this.listAll();
  }

  create(body: PilarCreate): Observable<Pilar> {
    const payload: PilarCreatePayload = {
      nombre: body.nombre,
      peso: body.peso ?? 1,
    };

    if (body.descripcion !== undefined) {
      payload.descripcion = body.descripcion;
    }

    const options =
      body.empresa_id != null ? { params: { empresa_id: String(body.empresa_id) } } : {};

    return this.http.post<Pilar>(`${this.base}/pillars`, payload, options);
  }

  update(id: number, body: PilarUpdate): Observable<Pilar> {
    const payload: PilarUpdatePayload = {};

    if (body.nombre !== undefined) {
      payload.nombre = body.nombre;
    }
    if (body.peso !== undefined) {
      payload.peso = body.peso;
    }
    if (body.descripcion !== undefined) {
      payload.descripcion = body.descripcion;
    }

    return this.http.patch<Pilar>(`${this.base}/pillars/${id}`, payload);
  }

  delete(id: number, cascade = false): Observable<void> {
    const options = cascade ? { params: { cascade: 'true' } as Record<string, string> } : undefined;
    return this.http.delete<void>(`${this.base}/pillars/${id}`, options);
  }

  remove(id: number, cascade = false): Observable<void> {
    return this.delete(id, cascade);
  }
}
