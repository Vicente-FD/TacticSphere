// src/app/services/company.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../environments/environment';
import { Empresa, Departamento, DepartamentoCreate } from './types';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  /** Lista todas las empresas */
  list(): Observable<Empresa[]> {
    return this.http.get<Empresa[]>(`${this.base}/companies`).pipe(
      map(rows =>
        (rows ?? []).map(r => ({
          ...r,
          activa: typeof r.activa === 'boolean' ? r.activa : true,
        }))
      )
    );
  }

  /** Crea una empresa con sus departamentos opcionales */
  create(body: {
    nombre: string;
    rut?: string;
    giro?: string;
    departamentos?: string[];
  }): Observable<Empresa> {
    return this.http.post<Empresa>(`${this.base}/companies`, body).pipe(
      map(r => ({
        ...r,
        activa: typeof r.activa === 'boolean' ? r.activa : true,
      }))
    );
  }

  /**
   * Actualiza una empresa.
   * PATCH /companies/{id}
   */
  update(
    id: number,
    body: {
      nombre?: string;
      rut?: string;
      giro?: string;
      departamentos?: string[];
    }
  ): Observable<Empresa> {
    return this.http.patch<Empresa>(`${this.base}/companies/${id}`, body).pipe(
      map((r) => ({
        ...r,
        activa: typeof r.activa === 'boolean' ? r.activa : true,
      }))
    );
  }

  /** Elimina una empresa */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/companies/${id}`);
  }

  /** Alias por si el código previo llamaba a remove() */
  remove(id: number): Observable<void> {
    return this.delete(id);
  }

  // =========================================================
  // NUEVO: DEPARTAMENTOS
  // =========================================================

  /**
   * Lista departamentos de una empresa
   * GET /companies/{empresa_id}/departments
   */
  listDepartments(empresaId: number): Observable<Departamento[]> {
    return this.http.get<Departamento[]>(`${this.base}/companies/${empresaId}/departments`);
  }

  /**
   * Crea un nuevo departamento en la empresa
   * POST /companies/{empresa_id}/departments
   */
  createDepartment(empresaId: number, body: DepartamentoCreate): Observable<Departamento> {
    return this.http.post<Departamento>(`${this.base}/companies/${empresaId}/departments`, body);
  }

  /**
   * Elimina un departamento por su ID
   * DELETE /departments/{dep_id}
   */
  deleteDepartment(depId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/departments/${depId}`);
  }
}