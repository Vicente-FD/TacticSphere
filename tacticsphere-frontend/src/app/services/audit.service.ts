import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuditLog } from '../types';

type AuditFilters = Record<string, string | number | boolean | Date | null | undefined>;

@Injectable({ providedIn: 'root' })
export class AuditService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  list(filters: AuditFilters = {}): Observable<AuditLog[]> {
    const params = this.toParams(filters);
    return this.http.get<AuditLog[]>(`${this.base}/audit`, { params });
  }

  exportCsv(filters: AuditFilters = {}): Observable<Blob> {
    const params = this.toParams(filters);
    return this.http.get<Blob>(`${this.base}/audit/export`, {
      params,
      responseType: 'blob' as 'json',
    });
  }

  private toParams(filters: AuditFilters): HttpParams {
    let params = new HttpParams();
    Object.entries(filters ?? {}).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        return;
      }
      if (value instanceof Date) {
        params = params.set(key, value.toISOString());
      } else {
        params = params.set(key, String(value));
      }
    });
    return params;
  }
}
