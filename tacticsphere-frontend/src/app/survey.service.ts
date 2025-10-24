// src/app/services/survey.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  AssignmentProgress,
  BulkAnswersRequest,
  BulkAnswersResponse,
  PillarQuestionsResponse,
  SurveyBeginRequest,
  SurveyBeginResponse,
  Pilar,
} from './types'; // ajusta a '../types' si tu estructura lo requiere
import { environment } from './../environments/environment';

@Injectable({ providedIn: 'root' })
export class SurveyService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * 🔹 MODO SIMPLE:
   * Garantiza cuestionario publicado + asignación vigente para la empresa dada.
   * Devuelve { asignacion_id } para continuar el flujo normal.
   */
  simpleBegin(empresaId: number, anonimo: boolean = false): Observable<SurveyBeginResponse> {
    const payload = { empresa_id: empresaId, anonimo };
    return this.http.post<SurveyBeginResponse>(`${this.api}/survey/simple/begin`, payload);
  }

  /**
   * Valida/inicia la sesión de respuesta para una asignación existente.
   * (No crea recursos; sólo valida permisos/alcance y vigencia)
   * - 403 "Asignación fuera de vigencia" si la ventana de fechas no aplica.
   */
  begin(asignacionId: number, empleadoId?: number | null): Observable<SurveyBeginResponse> {
    const payload: SurveyBeginRequest = {
      asignacion_id: asignacionId,
      ...(empleadoId != null ? { empleado_id: empleadoId } : {}),
    };
    return this.http.post<SurveyBeginResponse>(`${this.api}/survey/begin`, payload);
  }

  /**
   * Progreso global y por pilar de una asignación.
   * Si la asignación NO es anónima y no pasas empleadoId => 0 respondidas.
   */
  getProgress(asignacionId: number, empleadoId?: number | null): Observable<AssignmentProgress> {
    let params = new HttpParams();
    if (empleadoId != null) params = params.set('empleado_id', String(empleadoId));
    return this.http.get<AssignmentProgress>(`${this.api}/survey/${asignacionId}/progress`, { params });
  }

  /**
   * Lista los pilares realmente incluidos en el cuestionario de la asignación.
   * Útil para poblar el menú lateral antes de consultar preguntas por pilar.
   */
  getPillars(asignacionId: number): Observable<Pilar[]> {
    return this.http.get<Pilar[]>(`${this.api}/survey/${asignacionId}/pillars`);
  }

  /**
   * Preguntas de un pilar dentro de la asignación, incluyendo respuesta_actual si existe.
   * - Si la asignación NO es anónima y quieres ver respuestas del empleado, pasa empleadoId.
   */
  getPillarQuestions(
    asignacionId: number,
    pilarId: number,
    empleadoId?: number | null
  ): Observable<PillarQuestionsResponse> {
    let params = new HttpParams();
    if (empleadoId != null) params = params.set('empleado_id', String(empleadoId));
    return this.http.get<PillarQuestionsResponse>(
      `${this.api}/survey/${asignacionId}/pillars/${pilarId}`,
      { params }
    );
  }

  /**
   * Envío en bloque de respuestas del pilar.
   * - Para asignaciones anónimas, el backend ignora empleado_id.
   * - Para NO anónimas, el backend exige empleado_id (400 si falta).
   */
  submitAnswers(
    asignacionId: number,
    body: BulkAnswersRequest,
    empleadoId?: number | null
  ): Observable<BulkAnswersResponse> {
    let params = new HttpParams();
    if (empleadoId != null) params = params.set('empleado_id', String(empleadoId));
    return this.http.post<BulkAnswersResponse>(
      `${this.api}/survey/${asignacionId}/answers`,
      body,
      { params }
    );
  }
}