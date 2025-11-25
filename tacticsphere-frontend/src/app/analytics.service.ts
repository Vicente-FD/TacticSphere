import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { DashboardAnalyticsResponse } from './types';
import { environment } from './../environments/environment';

export interface AnalyticsQueryParams {
  companyId?: number | null; // Opcional para vista global
  dateFrom?: string | null;
  dateTo?: string | null;
  departmentIds?: number[];
  employeeIds?: number[];
  pillarIds?: number[];
  includeTimeline?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getDashboardAnalytics(params: AnalyticsQueryParams): Observable<DashboardAnalyticsResponse> {
    let httpParams = new HttpParams();
    // MODO GLOBAL: Si companyId es undefined/null, no se envía empresa_id al backend.
    // El backend detecta esto y agrupa datos de todas las empresas (solo para ADMIN_SISTEMA).
    // MODO NORMAL: Si companyId es un número, se envía empresa_id para filtrar por esa empresa específica.
    if (params.companyId != null) {
      httpParams = httpParams.set('empresa_id', params.companyId);
    }
    if (params.dateFrom) {
      httpParams = httpParams.set('fecha_desde', params.dateFrom);
    }
    if (params.dateTo) {
      httpParams = httpParams.set('fecha_hasta', params.dateTo);
    }
    (params.departmentIds ?? []).forEach((id) => {
      httpParams = httpParams.append('departamento_ids', String(id));
    });
    (params.employeeIds ?? []).forEach((id) => {
      httpParams = httpParams.append('empleado_ids', String(id));
    });
    (params.pillarIds ?? []).forEach((id) => {
      httpParams = httpParams.append('pilar_ids', String(id));
    });
    if (params.includeTimeline === false) {
      httpParams = httpParams.set('include_timeline', 'false');
    }

    return this.http.get<DashboardAnalyticsResponse>(`${this.api}/analytics/dashboard`, {
      params: httpParams,
    });
  }

  exportResponsesCsv(params: AnalyticsQueryParams): Observable<Blob> {
    let httpParams = new HttpParams();
    // Solo incluir empresa_id si está definido (no incluir para vista global)
    if (params.companyId != null) {
      httpParams = httpParams.set('empresa_id', params.companyId);
    }
    if (params.dateFrom) {
      httpParams = httpParams.set('fecha_desde', params.dateFrom);
    }
    if (params.dateTo) {
      httpParams = httpParams.set('fecha_hasta', params.dateTo);
    }
    (params.departmentIds ?? []).forEach((id) => {
      httpParams = httpParams.append('departamento_ids', String(id));
    });
    (params.employeeIds ?? []).forEach((id) => {
      httpParams = httpParams.append('empleado_ids', String(id));
    });
    (params.pillarIds ?? []).forEach((id) => {
      httpParams = httpParams.append('pilar_ids', String(id));
    });

    return this.http.get(`${this.api}/analytics/responses/export`, {
      params: httpParams,
      responseType: 'blob',
    });
  }
}
