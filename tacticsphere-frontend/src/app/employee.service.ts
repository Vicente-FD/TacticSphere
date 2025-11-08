// src/app/services/employee.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../environments/environment';
import { Empleado, EmpleadoCreate, EmpleadoUpdate } from './types';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Lista empleados por empresa (opcionalmente filtrado por departamento).
   * GET /companies/{empresa_id}/employees?departamento_id=
   */
  listByCompany(
    empresaId: number,
    departamentoId?: number | null,
    search?: string
  ): Observable<Empleado[]> {
    let params = new HttpParams();
    if (departamentoId != null) {
      params = params.set('departamento_id', String(departamentoId));
    }
    if (search && search.trim().length) {
      params = params.set('search', search.trim());
    }
    return this.http.get<Empleado[]>(`${this.api}/companies/${empresaId}/employees`, { params });
    // El token se agrega automáticamente por el interceptor.
  }

  search(query: string, empresaId?: number | null): Observable<Empleado[]> {
    let params = new HttpParams().set('query', query);
    if (empresaId != null) {
      params = params.set('empresa_id', String(empresaId));
    }
    return this.http.get<Empleado[]>(`${this.api}/employees/search`, { params });
  }

  /**
   * Crea un empleado en una empresa.
   * POST /companies/{empresa_id}/employees
   */
  create(empresaId: number, payload: EmpleadoCreate): Observable<Empleado> {
    return this.http.post<Empleado>(`${this.api}/companies/${empresaId}/employees`, payload);
  }

  /**
   * Actualiza un empleado (nombre/email/cargo/departamento).
   * PATCH /employees/{empleado_id}
   */
  update(empleadoId: number, payload: EmpleadoUpdate): Observable<Empleado> {
    return this.http.patch<Empleado>(`${this.api}/employees/${empleadoId}`, payload);
  }
}
