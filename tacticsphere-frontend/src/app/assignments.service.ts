// src/app/services/assignments.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../environments/environment';
import { Asignacion, AsignacionCreate } from './types';

@Injectable({ providedIn: 'root' })
export class AssignmentsService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  list(empresaId?: number | null): Observable<Asignacion[]> {
    let params = new HttpParams();
    if (empresaId != null) params = params.set('empresa_id', String(empresaId));
    return this.http.get<Asignacion[]>(`${this.api}/assignments`, { params });
  }

  get(id: number): Observable<Asignacion> {
    return this.http.get<Asignacion>(`${this.api}/assignments/${id}`);
  }

  create(body: AsignacionCreate): Observable<Asignacion> {
    return this.http.post<Asignacion>(`${this.api}/assignments`, body);
  }

  /** Obtener la asignación vigente para la empresa (NO crea si falta). */
  getActiveForCompany(empresaId: number): Observable<Asignacion | null> {
    const params = new HttpParams().set('create_if_missing', 'false');
    return this.http.get<Asignacion | null>(
      `${this.api}/companies/${empresaId}/assignments/active`,
      { params }
    );
  }

  /**
   * Garantiza que exista una asignación vigente para la empresa.
   * Si no existe y hay un cuestionario PUBLICADO, la crea con la ventana dada.
   */
  ensureActiveForCompany(
    empresaId: number,
    opts: { anonimo?: boolean; ventana_dias?: number } = {}
  ): Observable<Asignacion | null> {
    let params = new HttpParams()
      .set('create_if_missing', 'true')
      .set('anonimo', String(!!opts.anonimo))
      .set('ventana_dias', String(opts.ventana_dias ?? 30));

    return this.http.get<Asignacion | null>(
      `${this.api}/companies/${empresaId}/assignments/active`,
      { params }
    );
  }
}