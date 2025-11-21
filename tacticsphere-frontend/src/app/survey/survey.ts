import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import {
  AssignmentProgress,
  BulkAnswersRequest,
  BulkAnswersResponse,
  Departamento,
  Empleado,
  EmpleadoCreate,
  Empresa,
  Pilar,
  PillarProgress,
  PillarQuestionsResponse,
  LikertLevel,
  RespuestaCreate,
  SurveyQuestionRead,
  Asignacion,
} from '../types';

import { SurveyService } from '../survey.service';
import { CompanyService } from '../company.service';
import { EmployeeService } from '../employee.service';
import { AssignmentsService } from '../assignments.service';
import { AuthService } from '../auth.service';

@Component({
  standalone: true,
  selector: 'app-survey',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ts-page pb-28" style="overflow: visible;">
      <div class="ts-container space-y-6 relative" style="overflow: visible;">
        <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div class="space-y-1">
            <h1 class="ts-title">Encuesta</h1>
            <p class="ts-subtitle">
              Gestiona colaboradores, asignaciones vigentes y respuestas por pilar.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <div *ngIf="selectedAssignment" class="ts-chip">
              <span class="font-medium text-ink">Asignacion</span>
              #{{ selectedAssignment.id }}
            </div>
            <div *ngIf="progress" class="ts-chip">
              {{ realtimeRespondidas }} / {{ totalQuestions }} respondidas
            </div>
          </div>
        </div>

        <div class="space-y-2" *ngIf="message || error">
          <div
            *ngIf="message"
            class="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent"
          >
            {{ message }}
          </div>
          <div
            *ngIf="error"
            class="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
          >
            {{ error }}
          </div>
        </div>

        <div class="space-y-6" style="overflow: visible;">
          <!-- Barra superior con botón y búsqueda -->
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              class="ts-btn ts-btn--positive w-full sm:w-auto px-6 py-3 text-base"
              (click)="toggleEmployeeForm()"
            >
              {{ showEmployeeForm ? 'Ocultar formulario' : 'Ingresar colaborador' }}
            </button>
            
            <div class="flex-1 sm:max-w-md">
              <div class="space-y-2">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <span class="ts-label">Buscar colaboradores</span>
                    <p class="text-xs text-neutral-500">
                      Busca por nombre, correo o RUT. Si no seleccionas empresa, usaremos tu alcance actual.
                    </p>
                  </div>
                    <span class="ts-chip" *ngIf="!selectedColaborador && employees.length">{{ employees.length }} coincidencias</span>
                    <span class="ts-chip" *ngIf="selectedColaborador">1 colaborador seleccionado</span>
                </div>
                <div class="relative">
                  <input
                    type="search"
                    class="ts-input pr-28"
                    [class.search-highlight]="highlightSearchBar"
                    placeholder="Ej: maria@empresa.com o 12.345.678-9"
                    [(ngModel)]="searchTerm"
                    (ngModelChange)="onSearchTermChange($event)"
                    (keyup.enter)="forceEmployeeSearch()"
                    (focus)="highlightSearchBar = false"
                  />
                  <button
                    type="button"
                    class="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-800"
                    (click)="forceEmployeeSearch()"
                  >
                    Buscar
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Card de datos del encuestado (plegable) -->
          <div class="ts-card space-y-6" *ngIf="showEmployeeForm">
            <div class="space-y-1">
              <h2 class="text-xl font-semibold text-ink">Datos del encuestado</h2>
              <p class="text-sm text-neutral-400">
                Ingresa colaboradores o buscalos por nombre, correo o RUT.
              </p>
            </div>

            <div class="grid gap-6 xl:grid-cols-[minmax(0,_0.6fr)_minmax(0,_0.4fr)]">
              <div class="space-y-4">
                <div class="grid gap-4 lg:grid-cols-2">
                  <label class="block space-y-2">
                    <span class="ts-label">Empresa</span>
                    <select
                      class="ts-select"
                      [(ngModel)]="formEmp.empresa_id"
                      name="empresa_id"
                      (change)="onEmpresaChange()"
                    >
                      <option [ngValue]="0">Seleccionar...</option>
                      <option *ngFor="let e of empresas" [ngValue]="e.id">{{ e.nombre }}</option>
                    </select>
                  </label>

                  <label class="block space-y-2">
                    <span class="ts-label">Departamento</span>
                    <select
                      class="ts-select"
                      [(ngModel)]="formEmp.departamento_id"
                      name="departamento_id"
                      [disabled]="!formEmp.empresa_id"
                    >
                      <option [ngValue]="null">Ninguno</option>
                      <option *ngFor="let d of departamentos" [ngValue]="d.id">{{ d.nombre }}</option>
                    </select>
                  </label>

                  <label class="block space-y-2">
                    <span class="ts-label">Nombre</span>
                    <input class="ts-input" [(ngModel)]="formEmp.nombre" name="emp_nombre" />
                  </label>

                  <label class="block space-y-2">
                    <span class="ts-label">Apellidos</span>
                    <input class="ts-input" [(ngModel)]="formEmp.apellidos" name="emp_apellidos" />
                  </label>

                  <label class="block space-y-2">
                    <span class="ts-label">RUT</span>
                    <input
                      class="ts-input"
                      [(ngModel)]="formEmp.rut"
                      name="emp_rut"
                      placeholder="12.345.678-9"
                      (blur)="formatRutField('formEmp')"
                    />
                  </label>

                  <label class="block space-y-2">
                    <span class="ts-label">Email (opcional)</span>
                    <input class="ts-input" [(ngModel)]="formEmp.email" name="emp_email" />
                  </label>

                  <label class="block space-y-2 lg:col-span-2">
                    <span class="ts-label">Cargo (opcional)</span>
                    <input class="ts-input" [(ngModel)]="formEmp.cargo" name="emp_cargo" />
                  </label>
                </div>

                <div class="flex flex-wrap gap-3">
                  <button
                    class="ts-btn ts-btn--positive w-full sm:w-auto px-6 py-3 text-base"
                    (click)="ingresarEmpleado()"
                    [disabled]="creatingEmp || !formEmp.empresa_id || !formEmp.nombre || !formEmp.apellidos"
                  >
                    {{ creatingEmp ? 'Ingresando...' : 'Ingresar colaborador' }}
                  </button>
                </div>

                <div
                  *ngIf="selectedEmployee as emp"
                  class="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600 shadow-sm"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">
                        Empleado seleccionado
                      </p>
                      <p class="text-lg font-semibold text-ink">
                        {{ emp.nombre }} {{ emp.apellidos || '' }}
                      </p>
                      <p class="text-xs text-neutral-500">
                        ID #{{ emp.id }} - RUT: {{ emp.rut || '--' }}
                      </p>
                      <p class="text-xs text-neutral-500">
                        {{ emp.email || 'Sin correo' }} - {{ emp.cargo || 'Sin cargo' }}
                      </p>
                    </div>
                    <button class="ts-btn ts-btn--ghost" type="button" (click)="limpiarSeleccionEmpleado()">
                      Quitar
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <!-- Resultados de búsqueda: alterna entre lista completa y colaborador seleccionado -->
          <div class="space-y-4" *ngIf="employees.length || hasEmployeeSearch || loadingEmployees || selectedColaborador">
            <ng-container *ngIf="!selectedColaborador; else colaboradorSeleccionado">
              <!-- Lista completa de resultados -->
              <ng-container *ngIf="employees.length; else searchState">
                <div class="space-y-3">
                  <div
                    class="rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-accent/40 hover:shadow-card"
                    *ngFor="let emp of employees"
                    [ngClass]="{ 'border-accent shadow-card': selectedEmployee?.id === emp.id }"
                  >
                  <div class="flex flex-wrap justify-between gap-3">
                    <div>
                      <p class="text-base font-semibold text-ink">
                        {{ emp.nombre }} {{ emp.apellidos || '' }}
                      </p>
                      <p class="text-sm text-neutral-500">
                        {{ emp.email || 'Sin correo registrado' }} - {{ emp.cargo || 'Sin cargo' }}
                      </p>
                    </div>
                    <div class="text-right text-sm text-neutral-500">
                      <p>ID #{{ emp.id }}</p>
                      <p>RUT: {{ emp.rut || '--' }}</p>
                    </div>
                  </div>

                  <div class="mt-3 flex flex-wrap gap-2">
                    <button
                      class="ts-btn ts-btn--secondary"
                      type="button"
                      (click)="usarEnEncuesta(emp)"
                      [disabled]="selectedEmployee?.id === emp.id"
                    >
                      {{ selectedEmployee?.id === emp.id ? 'Seleccionado' : 'Usar en encuesta' }}
                    </button>
                    <button
                      class="ts-btn ts-btn--ghost"
                      type="button"
                      *ngIf="editId !== emp.id"
                      (click)="iniciarEdicion(emp)"
                    >
                      Editar
                    </button>
                    <button
                      class="ts-btn ts-btn--ghost"
                      type="button"
                      *ngIf="editId === emp.id"
                      (click)="cancelarEdicion()"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div class="mt-4 grid gap-3 md:grid-cols-2" *ngIf="editId === emp.id">
                    <label class="block space-y-1 text-sm">
                      <span class="text-neutral-500">Nombre</span>
                      <input class="ts-input text-sm" [(ngModel)]="editBuffer.nombre" />
                    </label>
                    <label class="block space-y-1 text-sm">
                      <span class="text-neutral-500">Apellidos</span>
                      <input class="ts-input text-sm" [(ngModel)]="editBuffer.apellidos" />
                    </label>
                    <label class="block space-y-1 text-sm">
                      <span class="text-neutral-500">RUT</span>
                      <input
                        class="ts-input text-sm"
                        [(ngModel)]="editBuffer.rut"
                        (blur)="formatRutField('editBuffer')"
                      />
                    </label>
                    <label class="block space-y-1 text-sm">
                      <span class="text-neutral-500">Email</span>
                      <input class="ts-input text-sm" [(ngModel)]="editBuffer.email" />
                    </label>
                    <label class="block space-y-1 text-sm">
                      <span class="text-neutral-500">Cargo</span>
                      <input class="ts-input text-sm" [(ngModel)]="editBuffer.cargo" />
                    </label>
                    <label class="block space-y-1 text-sm">
                      <span class="text-neutral-500">Departamento</span>
                      <select class="ts-select text-sm" [(ngModel)]="editBuffer.departamento_id">
                        <option [ngValue]="null">Ninguno</option>
                        <option *ngFor="let d of departamentos" [ngValue]="d.id">{{ d.nombre }}</option>
                      </select>
                    </label>
                    <div class="md:col-span-2 flex flex-wrap gap-2">
                      <button class="ts-btn ts-btn--positive" type="button" (click)="guardarEdicion(emp)">
                        Guardar cambios
                      </button>
                    </div>
                  </div>
                  </div>
                </div>
              </ng-container>
            </ng-container>
            
            <!-- Tarjeta única del colaborador seleccionado -->
            <ng-template #colaboradorSeleccionado>
              <div class="space-y-3" *ngIf="selectedColaborador">
                <div
                  class="rounded-xl border border-accent bg-white p-4 shadow-card"
                >
                  <div class="flex flex-wrap justify-between gap-3">
                    <div>
                      <p class="text-base font-semibold text-ink">
                        {{ selectedColaborador.nombre }} {{ selectedColaborador.apellidos || '' }}
                      </p>
                      <p class="text-sm text-neutral-500">
                        {{ selectedColaborador.email || 'Sin correo registrado' }} - {{ selectedColaborador.cargo || 'Sin cargo' }}
                      </p>
                    </div>
                    <div class="text-right text-sm text-neutral-500">
                      <p>ID #{{ selectedColaborador.id }}</p>
                      <p>RUT: {{ selectedColaborador.rut || '--' }}</p>
                    </div>
                  </div>

                  <div class="mt-3 flex flex-wrap gap-2">
                    <button
                      class="ts-btn ts-btn--positive"
                      type="button"
                      disabled
                    >
                      Colaborador seleccionado
                    </button>
                    <button
                      class="ts-btn ts-btn--ghost"
                      type="button"
                      (click)="limpiarColaboradorSeleccionado()"
                    >
                      Cambiar colaborador
                    </button>
                  </div>
                </div>
              </div>
            </ng-template>
            
            <ng-template #searchState>
              <div class="rounded-xl border border-dashed border-neutral-200 bg-neutral-100/60 px-4 py-3 text-sm text-neutral-500">
                <ng-container *ngIf="loadingEmployees">Buscando colaboradores...</ng-container>
                <ng-container *ngIf="!loadingEmployees && hasEmployeeSearch">
                  No encontramos coincidencias para "{{ searchTerm }}".
                </ng-container>
                <ng-container *ngIf="!loadingEmployees && !hasEmployeeSearch">
                  Ingresa un termino para comenzar la busqueda.
                </ng-container>
              </div>
            </ng-template>
          </div>

          <div class="ts-card space-y-6 survey-sticky-progress" *ngIf="progress" id="progress-general-card">
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <h2 class="text-xl font-semibold text-ink">Progreso general</h2>
                <div class="ts-chip whitespace-nowrap">
                  {{ realtimeRespondidas }} / {{ totalQuestions }} respondidas
                </div>
              </div>
              <p class="text-sm text-neutral-400">
                Visualiza el estado global de la asignacion seleccionada.
              </p>
            </div>

            <ng-container *ngIf="progress as pr; else progressFallback">
              <div class="space-y-4">
                <div class="h-3 w-full overflow-hidden rounded-full bg-neutral-200">
                  <div
                    class="h-full rounded-full bg-success transition-all duration-160 ease-smooth"
                    [style.width.%]="realtimeAdvancePercent"
                  ></div>
                </div>
                <div class="grid gap-3 sm:grid-cols-3">
                  <div class="rounded-xl border border-neutral-200 bg-neutral-100/60 p-4 text-sm text-neutral-600">
                    <span class="mb-1 block text-xs uppercase tracking-[0.08em] text-neutral-400">Total</span>
                    <span class="text-lg font-semibold text-ink">{{ totalQuestions }}</span>
                  </div>
                  <div class="rounded-xl border border-neutral-200 bg-neutral-100/60 p-4 text-sm text-neutral-600">
                    <span class="mb-1 block text-xs uppercase tracking-[0.08em] text-neutral-400">Respondidas</span>
                    <span class="text-lg font-semibold text-ink">{{ realtimeRespondidas }}</span>
                  </div>
                  <div class="rounded-xl border border-neutral-200 bg-neutral-100/60 p-4 text-sm text-neutral-600">
                    <span class="mb-1 block text-xs uppercase tracking-[0.08em] text-neutral-400">Avance</span>
                    <span class="text-lg font-semibold text-ink">{{ realtimeAdvancePercent }}%</span>
                  </div>
                </div>
                <p class="text-xs text-neutral-500">
                  Pendientes: {{ realtimePending }}
                </p>
              </div>
            </ng-container>

            <ng-template #progressFallback>
              <div class="rounded-xl border border-dashed border-neutral-200 bg-neutral-100/60 p-6 text-sm text-neutral-500">
                Todavia no hay progreso registrado. Inicia la encuesta para ver el avance por pilar.
              </div>
            </ng-template>
          </div>
        </div>

        <ng-container *ngIf="progress as pr; else noProgress">
          <!-- Sección "Preguntas por pilar": referencia para scroll automático -->
          <section #preguntasPorPilarSection class="ts-card space-y-6" id="preguntas-por-pilar">
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div class="space-y-1">
                <h2 class="text-xl font-semibold text-ink">Preguntas por pilar</h2>
                <p class="text-sm text-neutral-400">
                  Selecciona un pilar y responde las preguntas pendientes.
                </p>
              </div>
              <div class="ts-chip">{{ realtimeRespondidas }} / {{ totalQuestions }} respondidas</div>
            </div>

            <div class="grid gap-6 lg:grid-cols-[minmax(0,_0.3fr)_minmax(0,_1fr)]">
              <div class="space-y-3 survey-sticky-pillars">
                <h3 class="text-lg font-semibold text-ink">Pilares</h3>
                <div class="space-y-2">
                  <button
                    type="button"
                    *ngFor="let p of sidebarPillars"
                    (click)="selectPilarById(p.id)"
                    class="w-full rounded-lg border border-neutral-200 px-4 py-3 text-left transition-all duration-120 ease-smooth hover:border-accent/40 hover:shadow-card"
                    [ngClass]="{
                      'border-accent bg-accent/5 shadow-card': currentPilar && currentPilar.pilar_id === p.id
                    }"
                  >
                    <div class="flex items-center justify-between text-sm font-medium text-ink">
                       <span>{{ p.nombre }}</span>
                       <span class="text-neutral-400">
                        {{ getPillarRespondidas(p.id) }} / {{ getPillarTotal(p.id) }}
                      </span>
                    </div>
                    <div class="mt-2 h-1.5 w-full rounded-full bg-neutral-200">
                      <div
                        class="h-full rounded-full bg-accent transition-all duration-160 ease-smooth"
                        [style.width.%]="getPillarPercent(p.id)"
                      ></div>
                    </div>
                  </button>
                </div>
              </div>

              <div class="space-y-4">
                <h3 class="text-xl font-semibold text-ink">
                  {{ questions?.pilar_nombre || 'Selecciona un pilar' }}
                </h3>
                <div *ngIf="likertLevels.length" class="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-sm font-semibold text-ink">Escala de madurez (1 = Inicial - 5 = Innovador)</p>
                      <p class="text-xs text-neutral-500">Aplica para todas las preguntas tipo Likert.</p>
                    </div>
                    <!-- =========================================================
                         BOTÓN +/- DEL BLOQUE DE CONFIGURACIÓN DEL PILAR
                         ========================================================= -->
                    <button class="ts-btn ts-btn--ghost toggle-icon-btn" type="button" (click)="toggleLikertInfo()" [attr.aria-label]="showLikertInfo ? 'Minimizar' : 'Mostrar'">
                      <span class="toggle-icon">{{ showLikertInfo ? '−' : '+' }}</span>
                    </button>
                  </div>
                  <div class="grid gap-3 md:grid-cols-2" *ngIf="showLikertInfo">
                    <div
                      *ngFor="let level of likertLevels"
                      class="rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-600"
                    >
                      <div class="flex items-center justify-between text-ink">
                        <span class="font-semibold">{{ level.valor }} - {{ level.nombre }}</span>
                        <span class="text-xs text-neutral-500">{{ level.etiqueta }}</span>
                      </div>
                      <p class="mt-2">{{ level.descripcion }}</p>
                      <p class="mt-1 text-xs text-neutral-500">
                        Caracteristicas: {{ level.caracteristicas }}
                      </p>
                      <p class="mt-1 text-xs text-neutral-500">
                        ITIL v4: {{ level.interpretacion_itil }}
                      </p>
                    </div>
                  </div>
                </div>

                <ng-container *ngIf="hasQuestions; else noPreguntas">
                  <div
                    *ngFor="let q of questions?.preguntas ?? []"
                    class="rounded-xl border border-neutral-200 p-4 space-y-3 transition-all duration-200"
                    [id]="'pregunta-' + q.id"
                    [class.question-incomplete]="isQuestionIncomplete(q)"
                    [class.question-error]="highlightedQuestionId === q.id"
                  >
                    <div class="font-medium text-ink">{{ q.enunciado }}</div>
                    
                    <!-- =========================================================
                         ACORDEÓN "RESPUESTA ESPERADA" EN CADA PREGUNTA
                         ========================================================= -->
                    <div *ngIf="canViewExpectedAnswer && q.respuesta_esperada" class="respuesta-esperada-container">
                      <button
                        type="button"
                        class="respuesta-esperada-header"
                        (click)="toggleExpectedAnswer(q.id)"
                      >
                        <span class="text-xs font-medium text-neutral-600">
                          Respuesta esperada
                        </span>
                        <span class="toggle-icon toggle-icon-small">
                          {{ expandedExpectedAnswers[q.id] ? '−' : '+' }}
                        </span>
                      </button>
                      <div
                        class="respuesta-esperada-body"
                        [class.respuesta-esperada-expanded]="expandedExpectedAnswers[q.id]"
                      >
                        <p class="text-xs text-accent">{{ q.respuesta_esperada }}</p>
                      </div>
                    </div>
                    <ng-container [ngSwitch]="q.tipo">
                      <div *ngSwitchCase="'LIKERT'" class="flex flex-wrap gap-3">
                        <label
                          *ngFor="let v of likert"
                          class="inline-flex items-start gap-3 rounded-md border border-neutral-200 px-3 py-2 text-left text-sm text-neutral-600 transition hover:border-accent/40"
                        >
                          <input
                            type="radio"
                            class="h-4 w-4 text-accent focus:ring-accent/30"
                            [name]="'q' + q.id"
                            [value]="v"
                            [(ngModel)]="answers[q.id]"
                            (change)="onAnswerChange(q.id)"
                            required
                          />
                          <span>
                            <span class="font-semibold text-ink">{{ formatLikertLabel(v) }}</span>
                            <span class="block text-xs text-neutral-500" *ngIf="formatLikertSubtitle(v)">
                              {{ formatLikertSubtitle(v) }}
                            </span>
                          </span>
                        </label>
                      </div>
                      <div *ngSwitchCase="'SI_NO'" class="flex flex-wrap gap-3">
                        <label
                          class="inline-flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-600 transition hover:border-accent/40"
                        >
                          <input
                            type="radio"
                            class="h-4 w-4 text-accent focus:ring-accent/30"
                            [name]="'q' + q.id"
                            value="SI"
                            [(ngModel)]="answers[q.id]"
                            (change)="onAnswerChange(q.id)"
                            required
                          />
                          SI
                        </label>
                        <label
                          class="inline-flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-600 transition hover:border-accent/40"
                        >
                          <input
                            type="radio"
                            class="h-4 w-4 text-accent focus:ring-accent/30"
                            [name]="'q' + q.id"
                            value="NO"
                            [(ngModel)]="answers[q.id]"
                            (change)="onAnswerChange(q.id)"
                            required
                          />
                          NO
                        </label>
                      </div>
                      <div *ngSwitchCase="'ABIERTA'">
                        <textarea
                          class="ts-input min-h-[7rem]"
                          rows="3"
                          [(ngModel)]="answers[q.id]"
                          [name]="'q' + q.id"
                          (blur)="onAnswerChange(q.id)"
                          [required]="q.es_obligatoria"
                        ></textarea>
                      </div>
                    </ng-container>
                    <div class="text-xs text-neutral-400">
                      Tipo: {{ q.tipo }} - Obligatoria: {{ q.es_obligatoria ? 'Si' : 'No' }}
                    </div>
                  </div>

                  <div class="mt-6 flex flex-wrap gap-3">
                    <button
                      class="ts-btn ts-btn--positive"
                      (click)="submitPilar()"
                      [disabled]="loadingSubmit || !hasQuestions"
                    >
                      {{ loadingSubmit ? 'Guardando...' : 'Guardar respuestas' }}
                    </button>
                    <button
                      class="ts-btn ts-btn--secondary"
                      (click)="submitFullSurvey()"
                      [disabled]="!canFinalize || loadingFinalSubmit"
                    >
                      {{ loadingFinalSubmit ? 'Enviando...' : 'Enviar encuesta' }}
                    </button>
                  </div>
                </ng-container>

                <ng-template #noPreguntas>
                  <div class="rounded-xl border border-dashed border-neutral-200 bg-neutral-100/60 p-6 text-sm text-neutral-500">
                    Este pilar no contiene preguntas en la asignacion.
                  </div>
                </ng-template>
              </div>
            </div>
          </section>
        </ng-container>

        <ng-template #noProgress>
          <div class="ts-card-muted text-sm text-neutral-500">
            Selecciona una empresa e ingresa o busca un colaborador. La encuesta se preparara automaticamente cuando exista una asignacion vigente.
          </div>
        </ng-template>
      </div>
    </div>

  `,
  styles: [
    `
      :host {
        display: block;
      }

      /* Asegurar que los contenedores padre no rompan el sticky */
      :host {
        overflow: visible !important;
      }

      :host ::ng-deep .ts-container,
      :host ::ng-deep .ts-page {
        overflow: visible !important;
      }

      /* Asegurar que el contenedor padre directo no tenga overflow */
      :host ::ng-deep .space-y-6 {
        overflow: visible !important;
      }

      /* Forzar sticky - debe estar en el nivel correcto */
      .survey-sticky-progress {
        position: -webkit-sticky !important; /* Safari */
        position: sticky !important;
        top: 1rem !important;
        z-index: 30 !important;
        background: white !important;
        align-self: flex-start !important;
        max-height: calc(100vh - 2rem);
        overflow-y: auto;
        will-change: transform;
        transition: box-shadow 0.2s ease-out;
        margin-bottom: 1rem;
      }

      .survey-sticky-pillars {
        position: -webkit-sticky !important; /* Safari */
        position: sticky !important;
        top: 1rem !important;
        z-index: 20 !important;
        background: white !important;
        align-self: flex-start !important;
        max-height: calc(100vh - 2rem);
        overflow-y: auto;
        will-change: transform;
        transition: box-shadow 0.2s ease-out;
      }

      .survey-sticky-progress:not(:hover) {
        scrollbar-width: thin;
        scrollbar-color: rgba(148, 163, 184, 0.3) transparent;
      }

      .survey-sticky-pillars:not(:hover) {
        scrollbar-width: thin;
        scrollbar-color: rgba(148, 163, 184, 0.3) transparent;
      }

      /* Sombra suave cuando están "pegados" */
      @supports (position: sticky) {
        .survey-sticky-progress,
        .survey-sticky-pillars {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
        }
      }

      /* Versión compacta/colapsable en pantallas pequeñas */
      @media (max-width: 1023px) {
        .survey-sticky-progress,
        .survey-sticky-pillars {
          position: static;
          top: auto;
          bottom: auto;
          max-height: none;
          overflow-y: visible;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.03);
        }

        /* Versión compacta del progreso general en móviles */
        .survey-sticky-progress {
          margin-bottom: 1rem;
        }

        .survey-sticky-progress .space-y-2 > div:first-child h2 {
          font-size: 1.125rem;
        }

        .survey-sticky-progress .space-y-2 > div:first-child p {
          font-size: 0.75rem;
        }

        .survey-sticky-progress .space-y-4 > .grid {
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
        }

        .survey-sticky-progress .space-y-4 > .grid > div {
          padding: 0.75rem 0.5rem;
        }

        .survey-sticky-progress .space-y-4 > .grid > div span:first-child {
          font-size: 0.625rem;
          line-height: 1.2;
        }

        .survey-sticky-progress .space-y-4 > .grid > div span:last-child {
          font-size: 0.875rem;
        }

        /* Versión compacta de pilares en móviles */
        .survey-sticky-pillars h3 {
          font-size: 1rem;
        }

        .survey-sticky-pillars .space-y-2 > button {
          padding: 0.5rem 0.75rem;
        }

        .survey-sticky-pillars .space-y-2 > button > div:first-child {
          font-size: 0.875rem;
        }

        .survey-sticky-pillars .space-y-2 > button > div:last-child {
          margin-top: 0.25rem;
          height: 0.125rem;
        }
      }

      /* Ajustes para tablets */
      @media (min-width: 768px) and (max-width: 1023px) {
        .survey-sticky-progress,
        .survey-sticky-pillars {
          position: -webkit-sticky;
          position: sticky;
          top: 1rem;
          max-height: calc(100vh - 2rem);
          overflow-y: auto;
        }
      }

      /* Evitar saltos visuales con contain */
      .survey-sticky-progress,
      .survey-sticky-pillars {
        contain: layout style paint;
      }

      /* Estilos para preguntas incompletas */
      .question-incomplete {
        border-color: rgba(239, 68, 68, 0.3);
      }

      .question-error {
        border-color: rgba(239, 68, 68, 0.6) !important;
        background-color: rgba(239, 68, 68, 0.05);
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
      }

      /* =========================================================
         ESTILOS PARA BOTÓN +/- DEL BLOQUE DE CONFIGURACIÓN DEL PILAR
         ========================================================= */
      .toggle-icon-btn {
        min-width: 2rem;
        padding: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .toggle-icon {
        font-size: 1.25rem;
        font-weight: 600;
        line-height: 1;
        color: rgb(31, 41, 55); /* text-neutral-800 - color más acorde al estilo de la página */
        user-select: none;
        transition: color 0.2s ease, transform 0.2s ease;
      }

      .toggle-icon-btn:hover .toggle-icon {
        color: rgb(17, 24, 39); /* text-neutral-900 - más oscuro en hover */
      }

      .toggle-icon-small {
        font-size: 1rem;
        margin-left: 0.5rem;
        color: rgb(75, 85, 99); /* text-neutral-600 - color más acorde al estilo de la página */
        transition: color 0.2s ease;
      }

      .respuesta-esperada-header:hover .toggle-icon-small {
        color: rgb(31, 41, 55); /* text-neutral-800 - más oscuro en hover */
      }

      /* =========================================================
         ESTILOS PARA ACORDEÓN "RESPUESTA ESPERADA"
         ========================================================= */
      .respuesta-esperada-container {
        border-top: 1px solid rgba(0, 0, 0, 0.05);
        padding-top: 0.75rem;
        margin-top: 0.75rem;
      }

      .respuesta-esperada-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 0.5rem 0;
        background: none;
        border: none;
        cursor: pointer;
        transition: opacity 0.2s ease;
      }

      .respuesta-esperada-header:hover {
        opacity: 0.8;
      }

      .respuesta-esperada-body {
        max-height: 0;
        overflow: hidden;
        opacity: 0;
        transition: max-height 0.3s ease, padding 0.3s ease, opacity 0.3s ease;
        padding: 0;
      }

      .respuesta-esperada-expanded {
        max-height: 500px; /* Suficiente para contenido largo */
        padding-top: 0.75rem;
        opacity: 1;
      }

      /* Animación de resaltado para la barra de búsqueda */
      .search-highlight {
        animation: searchPulse 1s ease-in-out infinite;
        border-color: rgb(59, 130, 246) !important;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
      }

      @keyframes searchPulse {
        0%, 100% {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
          border-color: rgb(59, 130, 246);
        }
        50% {
          box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.4);
          border-color: rgb(37, 99, 235);
        }
      }
    `,
  ],
})
export class SurveyComponent implements OnInit, OnDestroy {
  asignacionId: number | null = null;
  empleadoId: number | null = null;
  selectedEmployee: Empleado | null = null;
  
  // =========================================================
  // COLABORADOR SELECCIONADO PARA ENCUESTA
  // =========================================================
  selectedColaborador: Empleado | null = null;
  
  // =========================================================
  // RESALTADO DE LA BARRA DE BÚSQUEDA
  // =========================================================
  highlightSearchBar = false;
  
  // =========================================================
  // REFERENCIA A LA SECCIÓN "PREGUNTAS POR PILAR" PARA SCROLL
  // =========================================================
  @ViewChild('preguntasPorPilarSection') preguntasPorPilarSection?: ElementRef<HTMLElement>;

  progress: AssignmentProgress | null = null;
  progressMap: Partial<Record<number, PillarProgress>> = {};
  sidebarPillars: Pilar[] = [];
  currentPilar: PillarProgress | null = null;
  questions: PillarQuestionsResponse | null = null;
  answers: Record<number, string | null> = {};
  likert: string[] = ['1', '2', '3', '4', '5'];
  likertLevels: LikertLevel[] = [];
  private likertLevelsMap: Record<number, LikertLevel> = {};
  showLikertInfo = true;

  // =========================================================
  // ESTADO DE ACORDEÓN "RESPUESTA ESPERADA" POR PREGUNTA
  // =========================================================
  expandedExpectedAnswers: Record<number, boolean> = {};

  empresas: Empresa[] = [];
  departamentos: Departamento[] = [];
  employees: Empleado[] = [];
  searchTerm = '';
  hasEmployeeSearch = false;
  loadingEmployees = false;
  highlightedQuestionId: number | null = null;
  formEmp: EmpleadoCreate = {
    empresa_id: 0,
    nombre: '',
    apellidos: '',
    rut: '',
    email: '',
    cargo: '',
    departamento_id: null,
  };
  creatingEmp = false;
  showEmployeeForm = false; // Controla si el formulario está expandido
  editId: number | null = null;
  editBuffer: Partial<Empleado> = {};

  assignments: Asignacion[] = [];
  activeAssignments: Asignacion[] = [];
  selectedAssignment: Asignacion | null = null;

  loadingBegin = false;
  loadingQuestions = false;
  loadingSubmit = false;
  loadingFinalSubmit = false;

  message = '';
  error = '';

  private beginRetried = false;
  private ensuringAssignment = false;
  private autoBeginHandle: ReturnType<typeof setTimeout> | null = null;
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;
  readonly canViewExpectedAnswer: boolean;

  constructor(
    private survey: SurveyService,
    private company: CompanyService,
    private employee: EmployeeService,
    private assignmentsSvc: AssignmentsService,
    private auth: AuthService
  ) {
    this.canViewExpectedAnswer = this.auth.hasRole(['ADMIN_SISTEMA', 'ADMIN', 'ANALISTA']);
  }

  ngOnInit(): void {
    this.company.list().subscribe({
      next: (rows) => (this.empresas = rows ?? []),
      error: (err) => {
        this.error = this.formatError(err, 'No se pudieron cargar las empresas.');
      },
    });
  }

  ngOnDestroy(): void {
    this.cancelAutoBegin();
    this.cancelSearchDebounce();
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }
    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const trimmed = normalized.replace(/\.(\d{3})\d+$/, '.$1');
    const hasOffset = /[+-]\d{2}:?\d{2}$/.test(trimmed);
    const withZone = trimmed.endsWith('Z') || hasOffset ? trimmed : `${trimmed}Z`;
    const date = new Date(withZone);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  isActive(a: Asignacion): boolean {
    const now = new Date();
    const fi = this.parseDate(a.fecha_inicio);
    const fc = this.parseDate(a.fecha_cierre);
    if (!fi || !fc) {
      return false;
    }
    return fi <= now && now <= fc;
  }

  onEmpresaChange(): void {
    this.resetCompanyState();

    if (!this.formEmp.empresa_id) {
      return;
    }

    const empresaId = this.formEmp.empresa_id;
    this.loadDepartmentsForCompany(empresaId);
    this.refreshAssignments(empresaId);
  }

  private resetCompanyState(): void {
    this.departamentos = [];
    this.employees = [];
    this.searchTerm = '';
    this.hasEmployeeSearch = false;
    this.loadingEmployees = false;
    this.assignments = [];
    this.activeAssignments = [];
    this.selectedAssignment = null;
    this.asignacionId = null;
    this.empleadoId = null;
    this.selectedEmployee = null;
    this.cancelSearchDebounce();
    this.cancelAutoBegin();
    this.clearSurveyData();
    this.message = '';
    this.error = '';
    this.beginRetried = false;
  }

  ingresarEmpleado(): void {
    if (!this.formEmp.empresa_id || !this.formEmp.nombre.trim() || !this.formEmp.apellidos?.trim()) {
      this.error = 'Empresa, nombre y apellidos son obligatorios';
      return;
    }

    this.formEmp.nombre = this.formEmp.nombre.trim();
    this.formEmp.apellidos = (this.formEmp.apellidos ?? '').trim();
    if (this.formEmp.rut) {
      this.formEmp.rut = this.formatRUT(this.formEmp.rut);
    }

    this.clearFeedback();
    this.creatingEmp = true;
    this.employee.create(this.formEmp.empresa_id, this.formEmp).subscribe({
      next: (emp) => {
        this.creatingEmp = false;
        this.empleadoId = emp.id;
        this.selectedEmployee = emp;
        this.clearSurveyData();
        const fullName = [emp.nombre, emp.apellidos].filter((v) => !!v).join(' ');
        this.message = `Colaborador ingresado (#${emp.id})${fullName ? ` - ${fullName}` : ''}`;
        this.triggerAutoBeginIfReady();
        // Minimizar el formulario después de guardar exitosamente
        this.showEmployeeForm = false;
      },
      error: (err) => {
        this.creatingEmp = false;
        this.error = this.formatError(err, 'No se pudo crear el colaborador');
      },
    });
  }

  onSearchTermChange(value: string): void {
    this.searchTerm = value;
    this.cancelSearchDebounce();
    if (!value?.trim()) {
      this.employees = [];
      this.hasEmployeeSearch = false;
      return;
    }
    this.searchDebounce = setTimeout(() => {
      this.searchDebounce = null;
      this.buscarEmpleados();
    }, 400);
  }

  forceEmployeeSearch(): void {
    this.cancelSearchDebounce();
    this.buscarEmpleados(this.searchTerm, true);
  }

  buscarEmpleados(term?: string, manualTrigger = false): void {
    const rawValue = term ?? this.searchTerm;
    const query = rawValue?.trim() ?? '';

    // La búsqueda es independiente del formulario - solo usa el término de búsqueda
    if (!query) {
      if (manualTrigger) {
        this.error = 'Ingresa un término de búsqueda.';
      }
      this.employees = [];
      this.hasEmployeeSearch = false;
      this.loadingEmployees = false;
      return;
    }

    // Validar mínimo 2 caracteres
    if (query.length < 2) {
      if (manualTrigger) {
        this.error = 'Por favor escribe al menos 2 caracteres para buscar.';
      }
      this.employees = [];
      this.hasEmployeeSearch = false;
      this.loadingEmployees = false;
      return;
    }

    this.clearFeedback();
    this.hasEmployeeSearch = true;
    this.loadingEmployees = true;

    // Usar solo el método search que busca globalmente sin filtros del formulario
    this.employee.search(query).subscribe({
      next: (list) => {
        this.employees = list ?? [];
        if (this.empleadoId != null) {
          const match = this.employees.find((e) => e.id === this.empleadoId);
          this.selectedEmployee = match ?? this.selectedEmployee;
        }
        this.loadingEmployees = false;
      },
      error: (err) => {
        this.loadingEmployees = false;
        this.error = this.formatError(err, 'No se pudieron listar empleados');
      },
    });
  }

  // =========================================================
  // USAR COLABORADOR EN ENCUESTA: Selecciona colaborador y hace scroll a preguntas
  // =========================================================
  usarEnEncuesta(colaborador: Empleado): void {
    // Mantener la lógica actual de selección
    this.clearFeedback();
    const companyChanged = !this.formEmp.empresa_id || this.formEmp.empresa_id !== colaborador.empresa_id;
    if (companyChanged) {
      this.formEmp.empresa_id = colaborador.empresa_id;
      this.loadDepartmentsForCompany(colaborador.empresa_id);
      this.refreshAssignments(colaborador.empresa_id);
    }
    this.formEmp.departamento_id = colaborador.departamento_id ?? null;

    // Guardar colaborador seleccionado
    this.selectedEmployee = colaborador;
    this.selectedColaborador = colaborador;
    this.clearSurveyData();
    this.onEmpleadoIdInput(colaborador.id);
    const nombreCompleto = [colaborador.nombre, colaborador.apellidos].filter((v) => !!v).join(' ');
    const etiqueta = nombreCompleto ? ` - ${nombreCompleto}` : '';
    this.message = `Empleado seleccionado: #${colaborador.id}${etiqueta}`;
    this.triggerAutoBeginIfReady();
    
    // Hacer scroll suave hacia la sección "Preguntas por pilar" después de un delay
    // para asegurar que el DOM se haya actualizado y que la sección esté disponible
    // Intentar varias veces en caso de que la sección aún no esté renderizada
    this.scrollToPreguntasPorPilar();
  }

  // =========================================================
  // SELECCIONAR EMPLEADO: Método original (mantenido para compatibilidad)
  // =========================================================
  seleccionarEmpleado(emp: Empleado): void {
    // Redirigir al nuevo método
    this.usarEnEncuesta(emp);
  }

  // =========================================================
  // LIMPIAR COLABORADOR SELECCIONADO: Permite volver a la lista completa y cerrar la encuesta
  // =========================================================
  limpiarColaboradorSeleccionado(): void {
    this.selectedColaborador = null;
    // Vaciar la barra de búsqueda
    this.searchTerm = '';
    this.employees = [];
    this.hasEmployeeSearch = false;
    
    // Cerrar la encuesta: limpiar todo el estado relacionado
    this.empleadoId = null;
    this.selectedEmployee = null;
    this.clearSurveyData();
    this.cancelAutoBegin();
    this.clearFeedback();
    
    // Resaltar la barra de búsqueda para indicar que debe buscar un nuevo colaborador
    this.highlightSearchBar = true;
    
    // Quitar el resaltado después de 3 segundos
    setTimeout(() => {
      this.highlightSearchBar = false;
    }, 3000);
  }

  // =========================================================
  // SCROLL A PREGUNTAS POR PILAR: Hace scroll suave a la sección de preguntas
  // =========================================================
  private scrollToPreguntasPorPilar(attempt = 0): void {
    const maxAttempts = 10; // Intentar hasta 10 veces
    const delay = 100; // 100ms entre intentos

    if (attempt >= maxAttempts) {
      return; // No hacer nada si ya intentamos muchas veces
    }

    setTimeout(() => {
      if (this.preguntasPorPilarSection?.nativeElement) {
        // Si la sección está disponible, hacer scroll
        this.preguntasPorPilarSection.nativeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      } else if (this.progress) {
        // Si hay progreso pero la sección aún no está disponible, intentar de nuevo
        this.scrollToPreguntasPorPilar(attempt + 1);
      } else {
        // Si no hay progreso, intentar usar el ID del elemento directamente
        const section = document.getElementById('preguntas-por-pilar');
        if (section) {
          section.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        } else if (attempt < maxAttempts - 1) {
          // Intentar de nuevo si aún no encontramos la sección
          this.scrollToPreguntasPorPilar(attempt + 1);
        }
      }
    }, delay * (attempt + 1)); // Aumentar el delay con cada intento
  }

  limpiarSeleccionEmpleado(): void {
    this.empleadoId = null;
    this.selectedEmployee = null;
    this.selectedColaborador = null; // Limpiar también el colaborador seleccionado
    this.clearSurveyData();
    this.cancelAutoBegin();
    this.clearFeedback();
  }

  toggleEmployeeForm(): void {
    const wasHidden = !this.showEmployeeForm;
    this.showEmployeeForm = !this.showEmployeeForm;
    
    // Si se está mostrando el formulario (cambió de oculto a visible), limpiar los campos
    if (wasHidden && this.showEmployeeForm) {
      this.clearEmployeeForm();
    }
  }

  private clearEmployeeForm(): void {
    // Limpiar todos los campos del formulario
    this.formEmp = {
      empresa_id: 0,
      nombre: '',
      apellidos: '',
      rut: '',
      email: '',
      cargo: '',
      departamento_id: null,
    };
    // También limpiar el empleado seleccionado si existe
    this.selectedEmployee = null;
    this.empleadoId = null;
  }

  onEmpleadoIdInput(value: number | null): void {
    this.empleadoId = value;
    this.selectedEmployee =
      value != null ? this.employees.find((emp) => emp.id === value) ?? null : null;
  }

  iniciarEdicion(emp: Empleado): void {
    this.editId = emp.id;
    this.editBuffer = { ...emp };
  }

  cancelarEdicion(): void {
    this.editId = null;
    this.editBuffer = {};
  }

  guardarEdicion(emp: Empleado): void {
    if (this.editId !== emp.id) {
      return;
    }

    const rutValue = this.editBuffer.rut ?? emp.rut;
    const payload = {
      nombre: this.editBuffer.nombre ?? emp.nombre,
      apellidos: this.editBuffer.apellidos ?? emp.apellidos,
      rut: rutValue ? this.formatRUT(rutValue) : rutValue,
      email: this.editBuffer.email ?? emp.email,
      cargo: this.editBuffer.cargo ?? emp.cargo,
      departamento_id: this.editBuffer.departamento_id ?? emp.departamento_id,
    };

    this.employee.update(emp.id, payload).subscribe({
      next: (updated) => {
        const idx = this.employees.findIndex((e) => e.id === emp.id);
        if (idx >= 0) {
          this.employees[idx] = updated;
        }
        if (this.selectedEmployee?.id === emp.id) {
          this.selectedEmployee = updated;
        }
        this.cancelarEdicion();
        this.message = 'Empleado actualizado';
        this.error = '';
      },
      error: (err) => {
        this.error = this.formatError(err, 'No se pudo actualizar el empleado');
      },
    });
  }

  onAssignmentChange(): void {
    this.selectedAssignment =
      this.asignacionId != null
        ? this.assignments.find((a) => a.id === this.asignacionId) ?? null
        : null;
    this.triggerAutoBeginIfReady();
  }

  begin(autoTriggered = false): void {
    if (this.loadingBegin) {
      return;
    }

    if (!this.asignacionId) {
      if (this.formEmp.empresa_id) {
        this.beginRetried = false;
        this.ensureAssignmentAndBegin(false, autoTriggered);
      } else if (!autoTriggered) {
        this.error = 'Debes seleccionar una asignacion';
      }
      return;
    }

    if (autoTriggered) {
      this.error = '';
    } else {
      this.clearFeedback();
    }
    this.loadingBegin = true;

    this.survey.begin(this.asignacionId, this.empleadoId).subscribe({
      next: () => {
        this.beginRetried = false;
        this.loadProgress(() => this.loadPillars(true));
      },
      error: (err) => {
        this.loadingBegin = false;
        if (err?.status === 403) {
          this.error = err?.error?.detail ?? 'Asignacion fuera de vigencia';
          this.beginRetried = false;
        } else if (err?.status === 404 && !this.beginRetried) {
          this.beginRetried = true;
          this.ensureAssignmentAndBegin(true, autoTriggered);
        } else if (err?.status === 400 && /empleado_id/i.test(err?.error?.detail ?? '')) {
          this.error = 'Esta asignacion requiere Empleado ID. Seleccionalo o ingresalo antes de continuar.';
          this.beginRetried = false;
        } else {
          this.error = this.formatError(err, 'No se pudo iniciar la encuesta');
          this.beginRetried = false;
        }
      },
    });
  }

  private ensureAssignmentAndBegin(retry = false, autoTriggered = false): void {
    if (this.ensuringAssignment) {
      return;
    }

    const empresaId = this.formEmp.empresa_id || this.selectedAssignment?.empresa_id || null;
    if (!empresaId) {
      this.error = 'Selecciona una empresa para iniciar la encuesta';
      this.loadingBegin = false;
      this.beginRetried = false;
      return;
    }

    this.ensuringAssignment = true;
    const retryAttempt = retry || this.beginRetried || autoTriggered;

    this.ensureAssignment(empresaId).subscribe({
      next: (assignmentId) => {
        this.ensuringAssignment = false;

        if (!assignmentId) {
          this.loadingBegin = false;
          this.beginRetried = false;
          this.error = 'No se pudo preparar una asignacion activa para esta empresa.';
          return;
        }

        this.asignacionId = assignmentId;
        this.refreshAssignments(empresaId, assignmentId);
        this.loadingBegin = false;

        if (retryAttempt) {
          this.begin(autoTriggered);
        }
      },
      error: (err) => {
        this.ensuringAssignment = false;
        this.loadingBegin = false;
        this.beginRetried = false;
        this.error = err?.error?.detail ?? 'No se pudo preparar la asignacion';
      },
    });
  }

  private ensureAssignment(empresaId: number): Observable<number | null> {
    return this.survey.simpleBegin(empresaId).pipe(
      map((resp) => resp?.asignacion_id ?? null),
      catchError(() =>
        this.assignmentsSvc.ensureActiveForCompany(empresaId).pipe(
          map((asg) => asg?.id ?? null),
          catchError(() => of(null))
        )
      )
    );
  }

  private refreshAssignments(empresaId: number, selectId: number | null = null): void {
    this.assignmentsSvc.list(empresaId).subscribe({
      next: (list) => {
        this.assignments = list ?? [];
        this.activeAssignments = this.assignments.filter((a) => this.isActive(a));
        if (this.activeAssignments.length) {
          const desiredId =
            selectId ??
            (this.asignacionId && this.activeAssignments.some((a) => a.id === this.asignacionId)
              ? this.asignacionId
              : this.activeAssignments[0].id);
          this.asignacionId = desiredId;
          this.onAssignmentChange();
        } else {
          this.asignacionId = null;
          this.selectedAssignment = null;
        }
      },
      error: () => {
        this.assignments = [];
        this.activeAssignments = [];
      },
    });
  }

  private loadProgress(after?: () => void): void {
    if (!this.asignacionId) {
      return;
    }

    this.survey.getProgress(this.asignacionId, this.empleadoId).subscribe({
      next: (pr) => {
        this.progress = pr;
        this.loadingBegin = false;
        this.progressMap = {};
        pr.por_pilar.forEach((p) => (this.progressMap[p.pilar_id] = p));

        if (this.currentPilar) {
          const selected = pr.por_pilar.find((p) => p.pilar_id === this.currentPilar!.pilar_id) ?? null;
          this.currentPilar = selected;
          if (selected) {
            this.loadPilar(selected);
          }
        }

        if (after) {
          after();
        }
      },
      error: (err) => {
        this.loadingBegin = false;
        this.error = this.formatError(err, 'Error al cargar progreso');
      },
    });
  }

  private loadPillars(allowFallback = false): void {
    if (!this.asignacionId) {
      return;
    }

    this.survey.getPillars(this.asignacionId).subscribe({
      next: (pillars) => {
        this.sidebarPillars = pillars ?? [];
        if (!this.currentPilar && this.sidebarPillars.length) {
          this.selectPilarById(this.sidebarPillars[0].id);
        }
      },
      error: (err) => {
        if (allowFallback && err?.status === 404 && this.progress?.por_pilar?.length) {
          this.sidebarPillars = this.progress.por_pilar.map((pp) => ({
            id: pp.pilar_id,
            nombre: pp.pilar_nombre,
            descripcion: null,
            peso: 1,
          }));
          if (!this.currentPilar && this.sidebarPillars.length) {
            this.selectPilar(this.progress!.por_pilar[0]);
          }
        } else {
          this.sidebarPillars = [];
        }
      },
    });
  }

  private selectPilar(p: PillarProgress): void {
    this.currentPilar = p;
    this.loadPilar(p);
  }

  selectPilarById(pilarId: number): void {
    const fallback =
      this.progressMap[pilarId] ??
      ({
        pilar_id: pilarId,
        pilar_nombre:
          this.sidebarPillars.find((x) => x.id === pilarId)?.nombre ?? `Pilar ${pilarId}`,
        total: 0,
        respondidas: 0,
        progreso: 0,
      } as PillarProgress);
    this.selectPilar(fallback);
  }

  private loadPilar(p: PillarProgress): void {
    if (!this.asignacionId) {
      return;
    }

    this.loadingQuestions = true;
    this.questions = null;
    this.answers = {};
    this.highlightedQuestionId = null;

    this.survey.getPillarQuestions(this.asignacionId, p.pilar_id, this.empleadoId).subscribe({
      next: (pq) => {
        this.questions = pq;
        this.setLikertLevels(pq.likert_levels);
        const mapAnswers: Record<number, string | null> = {};
        pq.preguntas.forEach((q: SurveyQuestionRead) => {
          if (q.respuesta_actual != null) {
            mapAnswers[q.id] = q.respuesta_actual;
          }
        });
        this.answers = mapAnswers;
        this.loadingQuestions = false;
      },
      error: (err) => {
        this.loadingQuestions = false;
        this.error = this.formatError(err, 'Error al cargar preguntas del pilar');
      },
    });
  }

  submitPilar(): void {
    if (!this.asignacionId || !this.questions) {
      return;
    }

    this.clearFeedback();
    this.highlightedQuestionId = null;

    // Validar si todas las preguntas obligatorias están respondidas
    const incompleteQuestions = this.questions.preguntas.filter((q) => {
      if (!q.es_obligatoria) {
        return false; // Las no obligatorias no se validan
      }
      const answer = this.answers[q.id];
      return !this.hasAnswerValue(answer);
    });

    // Si hay preguntas incompletas, no guardar y resaltar la primera
    if (incompleteQuestions.length > 0) {
      const firstIncomplete = incompleteQuestions[0];
      this.highlightedQuestionId = firstIncomplete.id;
      this.error = `Faltan ${incompleteQuestions.length} pregunta${incompleteQuestions.length > 1 ? 's' : ''} por responder. Por favor completa todas las preguntas obligatorias.`;

      // Hacer scroll suave a la primera pregunta incompleta
      setTimeout(() => {
        const questionElement = document.getElementById(`pregunta-${firstIncomplete.id}`);
        if (questionElement) {
          questionElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }, 100);

      return;
    }

    // Si todas están respondidas, proceder a guardar
    const body: BulkAnswersRequest = {
      respuestas: this.questions.preguntas
        .filter((q) => this.answers[q.id] != null)
        .map((q) => {
          const r: RespuestaCreate = {
            asignacion_id: this.asignacionId!,
            pregunta_id: q.id,
            valor: String(this.answers[q.id]),
          };
          return r;
        }),
    };

    this.loadingSubmit = true;
    this.survey.submitAnswers(this.asignacionId, body, this.empleadoId).subscribe({
      next: (res: BulkAnswersResponse) => {
        this.loadingSubmit = false;
        this.message = `Respuestas guardadas. Creadas: ${res.creadas ?? 0}, actualizadas: ${res.actualizadas ?? 0}`;
        this.loadProgress();
        if (this.currentPilar) {
          this.loadPilar(this.currentPilar);
        }

        // Hacer scroll suave al inicio de "Preguntas por pilar"
        setTimeout(() => {
          const preguntasSection = document.getElementById('preguntas-por-pilar');
          if (preguntasSection) {
            preguntasSection.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });
          }
        }, 300);
      },
      error: (err) => {
        this.loadingSubmit = false;
        if (err?.status === 400 && /empleado_id/i.test(err?.error?.detail ?? '')) {
          this.error = 'Esta asignacion requiere Empleado ID. Seleccionalo o ingresalo antes de guardar.';
        } else if (err?.status === 403) {
          this.error = 'Asignación fuera de vigencia';
        } else {
          this.error = this.formatError(err, 'No se pudo guardar');
        }
      },
    });
  }

  submitFullSurvey(): void {
    if (!this.asignacionId || !this.canFinalize || this.loadingFinalSubmit) {
      return;
    }

    this.clearFeedback();
    const body: BulkAnswersRequest = { respuestas: [] };
    this.loadingFinalSubmit = true;

    this.survey.submitAnswers(this.asignacionId, body, this.empleadoId).subscribe({
      next: () => {
        this.loadingFinalSubmit = false;
        this.message = 'Formulario completo enviado.';
        this.loadProgress();
      },
      error: (err) => {
        this.loadingFinalSubmit = false;
        if (err?.status === 400 && /empleado_id/i.test(err?.error?.detail ?? '')) {
          this.error = 'Esta asignacion requiere Empleado ID. Seleccionalo o ingresalo antes de enviar.';
        } else if (err?.status === 403) {
          this.error = 'Asignación fuera de vigencia';
        } else {
          this.error = this.formatError(err, 'No se pudo enviar el formulario completo');
        }
      },
    });
  }

  get hasQuestions(): boolean {
    return !!this.questions?.preguntas?.length;
  }

  get canFinalize(): boolean {
    return this.allPillarsComplete && (this.progress?.total ?? 0) > 0;
  }

  get pendingQuestions(): number {
    return this.realtimePending;
  }

  get totalQuestions(): number {
    return Math.max(this.progress?.total ?? 0, 0);
  }

  get realtimeRespondidas(): number {
    if (!this.progress) {
      return 0;
    }
    const base = Math.max(this.progress.respondidas ?? 0, 0);
    const total = this.totalQuestions;
    if (!total) {
      return base;
    }
    const adjusted = Math.max(0, Math.min(total, base + this.computeLocalProgressDelta()));
    return adjusted;
  }

  get realtimeAdvancePercent(): number {
    const total = this.totalQuestions;
    if (!total) {
      return 0;
    }
    return Math.round((this.realtimeRespondidas / total) * 100);
  }

  get realtimePending(): number {
    const total = this.totalQuestions;
    if (!total) {
      return 0;
    }
    return Math.max(total - this.realtimeRespondidas, 0);
  }

  getPillarTotal(pilarId: number): number {
    return Math.max(this.progressMap[pilarId]?.total ?? 0, 0);
  }

  getPillarRespondidas(pilarId: number): number {
    const entry = this.progressMap[pilarId];
    if (!entry) {
      return 0;
    }
    return this.calculatePillarRespondidas(entry);
  }

  getPillarPercent(pilarId: number): number {
    const entry = this.progressMap[pilarId];
    if (!entry) {
      return 0;
    }
    return this.calculatePillarProgressPercent(entry);
  }

  private get allPillarsComplete(): boolean {
    if (!this.progress?.por_pilar?.length) {
      return false;
    }
    return this.progress.por_pilar.every((p) => p.total === 0 || p.respondidas >= p.total);
  }

  private clearFeedback(): void {
    this.message = '';
    this.error = '';
  }

  private clearSurveyData(): void {
    this.progress = null;
    this.progressMap = {};
    this.sidebarPillars = [];
    this.currentPilar = null;
    this.questions = null;
    this.answers = {};
    this.likertLevels = [];
    this.likertLevelsMap = {};
    this.showLikertInfo = true;
  }

  private loadDepartmentsForCompany(empresaId: number): void {
    this.company.listDepartments(empresaId).subscribe({
      next: (deps) => (this.departamentos = deps ?? []),
      error: () => {
        this.departamentos = [];
      },
    });
  }

  private setLikertLevels(levels: LikertLevel[] | undefined): void {
    if (!levels?.length) {
      this.likertLevels = [];
      this.likertLevelsMap = {};
      return;
    }
    this.likertLevels = levels;
    const map: Record<number, LikertLevel> = {};
    levels.forEach((lvl) => (map[lvl.valor] = lvl));
    this.likertLevelsMap = map;
  }

  formatLikertLabel(value: string): string {
    const lvl = this.likertLevelsMap[Number(value)];
    return lvl ? `${value} - ${lvl.nombre}` : value;
  }

  formatLikertSubtitle(value: string): string {
    const lvl = this.likertLevelsMap[Number(value)];
    return lvl?.etiqueta ?? '';
  }

  toggleLikertInfo(): void {
    this.showLikertInfo = !this.showLikertInfo;
  }

  // =========================================================
  // TOGGLE ACORDEÓN "RESPUESTA ESPERADA" POR PREGUNTA
  // =========================================================
  toggleExpectedAnswer(questionId: number): void {
    this.expandedExpectedAnswers[questionId] = !this.expandedExpectedAnswers[questionId];
  }

  private cancelSearchDebounce(): void {
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
      this.searchDebounce = null;
    }
  }

  private cancelAutoBegin(): void {
    if (this.autoBeginHandle) {
      clearTimeout(this.autoBeginHandle);
      this.autoBeginHandle = null;
    }
  }

  private triggerAutoBeginIfReady(): void {
    if (!this.shouldAutoBegin() || this.loadingBegin || this.ensuringAssignment) {
      return;
    }
    this.cancelAutoBegin();
    this.autoBeginHandle = setTimeout(() => {
      this.autoBeginHandle = null;
      this.begin(true);
    }, 300);
  }

  private shouldAutoBegin(): boolean {
    const empresaId = this.formEmp.empresa_id || this.selectedAssignment?.empresa_id || null;
    if (!empresaId) {
      return false;
    }
    if (this.selectedAssignment?.anonimo) {
      return !!(this.asignacionId || this.activeAssignments.length);
    }
    return this.empleadoId != null;
  }

  private computeLocalProgressDelta(): number {
    if (
      !this.currentPilar ||
      !this.questions ||
      this.questions.pilar_id !== this.currentPilar.pilar_id ||
      !this.questions.preguntas?.length
    ) {
      return 0;
    }
    return this.questions.preguntas.reduce((delta, question) => {
      const draftHasValue = this.hasAnswerValue(this.answers[question.id]);
      const savedHasValue = this.hasAnswerValue(question.respuesta_actual);
      if (draftHasValue && !savedHasValue) {
        return delta + 1;
      }
      if (!draftHasValue && savedHasValue) {
        return delta - 1;
      }
      return delta;
    }, 0);
  }

  private calculatePillarRespondidas(entry: PillarProgress): number {
    const total = Math.max(entry.total ?? 0, 0);
    if (!total) {
      return 0;
    }
    let responded = Math.max(entry.respondidas ?? 0, 0);
    if (this.currentPilar && entry.pilar_id === this.currentPilar.pilar_id) {
      responded = Math.max(0, Math.min(total, responded + this.computeLocalProgressDelta()));
    }
    return Math.min(total, responded);
  }

  private calculatePillarProgressPercent(entry: PillarProgress): number {
    const total = Math.max(entry.total ?? 0, 0);
    if (!total) {
      return 0;
    }
    const ratio = this.calculatePillarRespondidas(entry) / total;
    return Math.min(100, Math.max(0, ratio * 100));
  }

  onAnswerChange(questionId: number): void {
    // Limpiar el resaltado si la pregunta ahora está completa
    if (this.highlightedQuestionId === questionId && this.questions) {
      const question = this.questions.preguntas.find((q) => q.id === questionId);
      if (question) {
        const answer = this.answers[questionId];
        if (this.hasAnswerValue(answer)) {
          this.highlightedQuestionId = null;
          // Limpiar el mensaje de error si todas las preguntas están completas ahora
          const incompleteQuestions = this.questions.preguntas.filter((q) => {
            if (!q.es_obligatoria) {
              return false;
            }
            return !this.hasAnswerValue(this.answers[q.id]);
          });
          if (incompleteQuestions.length === 0) {
            this.error = '';
          }
        }
      }
    }
  }

  isQuestionIncomplete(question: SurveyQuestionRead): boolean {
    if (!question.es_obligatoria) {
      return false;
    }
    const answer = this.answers[question.id];
    return !this.hasAnswerValue(answer);
  }

  private hasAnswerValue(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    if (typeof value === 'number') {
      return !Number.isNaN(value);
    }
    return true;
  }

  formatRutField(source: 'formEmp' | 'editBuffer'): void {
    if (source === 'formEmp' && this.formEmp.rut) {
      this.formEmp.rut = this.formatRUT(this.formEmp.rut);
    } else if (source === 'editBuffer' && this.editBuffer.rut) {
      this.editBuffer.rut = this.formatRUT(this.editBuffer.rut);
    }
  }

  formatRUT(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    // Quitar puntos, guiones y espacios
    const cleaned = value.replace(/[.\s-]/g, '');

    if (!cleaned || cleaned.length < 2) {
      return cleaned;
    }

    // El último carácter es el dígito verificador
    const digitoVerificador = cleaned.slice(-1);
    const numero = cleaned.slice(0, -1);

    if (!numero) {
      return cleaned;
    }

    // Formatear el número con puntos como separadores de miles desde la derecha
    const numeroFormateado = numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    // Unir número y dígito verificador con guion
    return `${numeroFormateado}-${digitoVerificador}`;
  }

  private formatError(err: unknown, fallback: string): string {
    if (!err || typeof err !== 'object') {
      return fallback;
    }

    const errorObj = err as { error?: unknown; status?: number };
    const detail = errorObj.error;

    // Si detail es un string, usarlo directamente
    if (typeof detail === 'string') {
      return detail;
    }

    // Si detail es un objeto con una propiedad 'detail' que es string
    if (detail && typeof detail === 'object' && 'detail' in detail) {
      const innerDetail = (detail as { detail?: unknown }).detail;
      if (typeof innerDetail === 'string') {
        return innerDetail;
      }
      // Si detail es un array (errores de validación de FastAPI)
      if (Array.isArray(innerDetail)) {
        const messages = innerDetail
          .map((item) => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object' && 'msg' in item) {
              return String((item as { msg?: unknown }).msg ?? '');
            }
            return '';
          })
          .filter((msg) => msg.length > 0);
        return messages.length > 0 ? messages.join('. ') : fallback;
      }
    }

    // Si detail es un array directamente (errores de validación)
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object' && 'msg' in item) {
            return String((item as { msg?: unknown }).msg ?? '');
          }
          return '';
        })
        .filter((msg) => msg.length > 0);
      return messages.length > 0 ? messages.join('. ') : fallback;
    }

    // Si hay un mensaje genérico
    if (errorObj.status === 400) {
      return 'Error en la solicitud. Verifica que el término de búsqueda tenga al menos 2 caracteres.';
    }

    return fallback;
  }
}






