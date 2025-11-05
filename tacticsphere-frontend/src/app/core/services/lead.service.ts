import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Lead } from '../../types';

interface LeadPayload {
  company: string;
  email: string;
}

const STORAGE_KEY = 'ts_consulting_leads';

@Injectable({ providedIn: 'root' })
export class LeadService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = (environment?.apiUrl ?? '').trim();
  private memoryLeads: Lead[] = [];

  createLead(payload: LeadPayload): Observable<Lead> {
    if (!this.apiBase) {
      return of(this.persistLocal(payload));
    }

    return this.http
      .post<Lead>(`${this.apiBase}/consulting-leads`, payload)
      .pipe(
        catchError((error) => {
          if (error.status === 0) {
            return of(this.persistLocal(payload));
          }
          throw error;
        }),
      );
  }

  listLeads(): Observable<Lead[]> {
    if (!this.apiBase) {
      return of(this.readLocal());
    }

    return this.http
      .get<Lead[]>(`${this.apiBase}/consulting-leads`)
      .pipe(
        catchError((error) => {
          if (error.status === 0) {
            return of(this.readLocal());
          }
          throw error;
        }),
      );
  }

  private persistLocal(payload: LeadPayload): Lead {
    const now = new Date();
    const current = this.readLocal();
    const lead: Lead = {
      id: now.getTime(),
      company: payload.company,
      email: payload.email,
      created_at: now.toISOString(),
    };
    current.unshift(lead);
    const storage = this.getStorage();
    if (storage) {
      storage.setItem(STORAGE_KEY, JSON.stringify(current));
    } else {
      this.memoryLeads = current;
    }
    return lead;
  }

  private readLocal(): Lead[] {
    try {
      const storage = this.getStorage();
      const raw = storage?.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Lead[];
      if (Array.isArray(parsed)) {
        return parsed.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
      }
      return [];
    } catch {
      return [...this.memoryLeads];
    }
  }

  private getStorage(): Storage | null {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return null;
    }
    return window.localStorage;
  }
}
