import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { DashboardAnalyticsResponse } from './types';
import { environment } from './../environments/environment';

export interface AnalyticsQueryParams {
  companyId: number;
  dateFrom?: string | null;
  dateTo?: string | null;
  departmentIds?: number[];
  employeeIds?: number[];
  pillarIds?: number[];
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getDashboardAnalytics(params: AnalyticsQueryParams): Observable<DashboardAnalyticsResponse> {
    let httpParams = new HttpParams().set('empresa_id', params.companyId);
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

    return this.http.get<DashboardAnalyticsResponse>(`${this.api}/analytics/dashboard`, {
      params: httpParams,
    });
  }
}

