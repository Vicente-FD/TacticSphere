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
    const normalized: LeadPayload = {
      company: payload.company.trim(),
      email: payload.email.trim().toLowerCase(),
    };
    if (!this.apiBase) {
      return of(this.persistLocal(normalized));
    }

    return this.http
      .post<Lead>(`${this.apiBase}/consulting-leads`, normalized)
      .pipe(
        catchError((error) => {
          if (error.status === 0) {
            return of(this.persistLocal(normalized));
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

  deleteLead(id: number): Observable<void> {
    if (!this.apiBase) {
      this.removeLocal(id);
      return of(void 0);
    }

    return this.http.delete<void>(`${this.apiBase}/consulting-leads/${id}`).pipe(
      catchError((error) => {
        if (error.status === 0) {
          this.removeLocal(id);
          return of(void 0);
        }
        throw error;
      }),
    );
  }

  clearLeads(): Observable<void> {
    if (!this.apiBase) {
      this.clearLocal();
      return of(void 0);
    }

    return this.http.delete<void>(`${this.apiBase}/consulting-leads`).pipe(
      catchError((error) => {
        if (error.status === 0) {
          this.clearLocal();
          return of(void 0);
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
    this.saveLocal(current);
    return lead;
  }

  private removeLocal(id: number): void {
    const current = this.readLocal().filter((lead) => lead.id !== id);
    this.saveLocal(current);
  }

  private clearLocal(): void {
    this.saveLocal([]);
  }

  private saveLocal(data: Lead[]): void {
    const storage = this.getStorage();
    if (storage) {
      storage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else {
      this.memoryLeads = data;
    }
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
