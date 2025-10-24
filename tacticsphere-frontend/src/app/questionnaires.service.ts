import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../environments/environment';

export interface PublishCuestionarioBody { titulo?: string; version?: number; }
export interface Cuestionario { id: number; empresa_id: number; titulo: string; version: number; estado: string; }

@Injectable({ providedIn: 'root' })
export class QuestionnairesService {
  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}

  publish(empresaId: number, body: PublishCuestionarioBody = {}): Observable<Cuestionario> {
    return this.http.post<Cuestionario>(`${this.api}/companies/${empresaId}/questionnaires/publish`, body);
  }
}