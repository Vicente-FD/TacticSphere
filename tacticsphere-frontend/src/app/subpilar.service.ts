import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../environments/environment';
import { Subpilar, SubpilarCreate, SubpilarUpdate } from './types';

@Injectable({ providedIn: 'root' })
export class SubpilarService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  /**
   * Lista todos los subpilares de un pilar
   */
  getSubpilares(pilarId: number): Observable<Subpilar[]> {
    return this.http
      .get<Subpilar[]>(`${this.base}/pillars/${pilarId}/subpilares`)
      .pipe(map((rows) => rows ?? []));
  }

  /**
   * Obtiene un subpilar por su ID
   */
  getSubpilar(subpilarId: number): Observable<Subpilar> {
    return this.http.get<Subpilar>(`${this.base}/subpilares/${subpilarId}`);
  }

  /**
   * Crea un nuevo subpilar
   */
  createSubpilar(pilarId: number, data: SubpilarCreate): Observable<Subpilar> {
    const payload: SubpilarCreate = {
      pilar_id: pilarId,
      nombre: data.nombre.trim(),
      descripcion: data.descripcion?.trim() || null,
      orden: data.orden ?? null,
    };
    return this.http.post<Subpilar>(`${this.base}/pillars/${pilarId}/subpilares`, payload);
  }

  /**
   * Actualiza un subpilar existente
   */
  updateSubpilar(id: number, data: SubpilarUpdate): Observable<Subpilar> {
    const payload: SubpilarUpdate = {};
    if (data.nombre !== undefined) {
      payload.nombre = data.nombre.trim();
    }
    if (data.descripcion !== undefined) {
      payload.descripcion = data.descripcion?.trim() || null;
    }
    if (data.orden !== undefined) {
      payload.orden = data.orden;
    }
    return this.http.patch<Subpilar>(`${this.base}/subpilares/${id}`, payload);
  }

  /**
   * Elimina un subpilar
   */
  deleteSubpilar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/subpilares/${id}`);
  }
}

