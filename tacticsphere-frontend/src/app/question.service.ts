import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../environments/environment';
import { Pregunta, TipoPreguntaEnum } from './types';

@Injectable({ providedIn: 'root' })
export class QuestionService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  /**
   * Primero intenta /pillars/{id}/questions.
   * Si el backend no tiene ese alias (404), usa /questions?pilar_id=...
   */
  listByPilar(pilarId: number): Observable<Pregunta[]> {
    const aliasUrl = `${this.base}/pillars/${pilarId}/questions`;
    return this.http.get<Pregunta[]>(aliasUrl).pipe(
      catchError((err) => {
        if (err?.status === 404) {
          const qsUrl = `${this.base}/questions`;
          return this.http.get<Pregunta[]>(qsUrl, {
            params: { pilar_id: String(pilarId) },
          });
        }
        return throwError(() => err);
      })
    );
  }

  create(input: {
    pilar_id: number;
    enunciado: string;
    tipo: TipoPreguntaEnum; // 'LIKERT' | 'ABIERTA' | 'SI_NO'
    es_obligatoria: boolean;
    peso: number;
    respuesta_esperada?: string | null;
  }): Observable<Pregunta> {
    return this.http.post<Pregunta>(`${this.base}/questions`, input);
  }

  update(
    id: number,
    input: {
      enunciado: string;
      tipo: TipoPreguntaEnum;
      es_obligatoria: boolean;
      peso: number;
      respuesta_esperada?: string | null;
    }
  ): Observable<Pregunta> {
    return this.http.put<Pregunta>(`${this.base}/questions/${id}`, input);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/questions/${id}`);
  }

  // Alias por compatibilidad si tu código llamaba a remove()
  remove(id: number): Observable<void> {
    return this.delete(id);
  }
}
