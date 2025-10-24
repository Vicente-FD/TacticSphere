import { Component, OnInit } from '@angular/core';
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
  RespuestaCreate,
  SurveyQuestionRead,
  Asignacion,
} from '../types';

import { SurveyService } from '../survey.service';
import { CompanyService } from '../company.service';
import { EmployeeService } from '../employee.service';
import { AssignmentsService } from '../assignments.service';

@Component({
  standalone: true,
  selector: 'app-survey',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ts-page">
      <div class="ts-container space-y-6">
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
              {{ progress.respondidas }} / {{ progress.total }} respondidas
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

        <div class="space-y-6">
          <div class="ts-card space-y-6">
            <div class="space-y-1">
              <h2 class="text-xl font-semibold text-ink">Datos del encuestado</h2>
              <p class="text-sm text-neutral-400">
                Selecciona la empresa, crea o edita colaboradores y define quien respondera la encuesta.
              </p>
            </div>

            <div class="grid gap-4 lg:grid-cols-12">
              <label class="block space-y-2 lg:col-span-6">
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

              <label class="block space-y-2 lg:col-span-6">
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

              <label class="block space-y-2 lg:col-span-6">
                <span class="ts-label">Nombre</span>
                <input class="ts-input" [(ngModel)]="formEmp.nombre" name="emp_nombre" />
              </label>

              <label class="block space-y-2 lg:col-span-6">
                <span class="ts-label">Email (opcional)</span>
                <input class="ts-input" [(ngModel)]="formEmp.email" name="emp_email" />
              </label>

              <label class="block space-y-2 lg:col-span-6">
                <span class="ts-label">Cargo (opcional)</span>
                <input class="ts-input" [(ngModel)]="formEmp.cargo" name="emp_cargo" />
              </label>

              <div class="lg:col-span-12 flex flex-wrap gap-3">
                <button
                  class="ts-btn"
                  (click)="crearEmpleado()"
                  [disabled]="creatingEmp || !formEmp.empresa_id || !formEmp.nombre"
                >
                  {{ creatingEmp ? 'Creando...' : 'Crear empleado' }}
                </button>
                <button
                  class="ts-btn ts-btn--secondary"
                  (click)="buscarEmpleados()"
                  [disabled]="loadingEmployees || !formEmp.empresa_id"
                >
                  {{ loadingEmployees ? 'Buscando...' : 'Buscar empleados' }}
                </button>
                <div
                  class="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-100/60 px-3 py-2 text-sm text-neutral-600"
                  *ngIf="empleadoId"
                >
                  <span>Empleado seleccionado:</span>
                  <span class="font-semibold text-ink">
                    #{{ empleadoId }}
                    <ng-container *ngIf="selectedEmployee">— {{ selectedEmployee.nombre }}</ng-container>
                  </span>
                  <button
                    type="button"
                    class="inline-flex items-center rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-500 transition hover:border-accent/40 hover:text-accent"
                    (click)="limpiarSeleccionEmpleado()"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="ts-card space-y-6">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <h2 class="text-xl font-semibold text-ink">Progreso general</h2>
                <div *ngIf="progress" class="ts-chip">
                  {{ progress.respondidas }} / {{ progress.total }} respondidas
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
                    [style.width.%]="pr.progreso * 100"
                  ></div>
                </div>
                <div class="grid gap-3 sm:grid-cols-3">
                  <div class="rounded-xl border border-neutral-200 bg-neutral-100/60 p-4 text-sm text-neutral-600">
                    <span class="mb-1 block text-xs uppercase tracking-[0.08em] text-neutral-400">Total</span>
                    <span class="text-lg font-semibold text-ink">{{ pr.total }}</span>
                  </div>
                  <div class="rounded-xl border border-neutral-200 bg-neutral-100/60 p-4 text-sm text-neutral-600">
                    <span class="mb-1 block text-xs uppercase tracking-[0.08em] text-neutral-400">Respondidas</span>
                    <span class="text-lg font-semibold text-ink">{{ pr.respondidas }}</span>
                  </div>
                  <div class="rounded-xl border border-neutral-200 bg-neutral-100/60 p-4 text-sm text-neutral-600">
                    <span class="mb-1 block text-xs uppercase tracking-[0.08em] text-neutral-400">Avance</span>
                    <span class="text-lg font-semibold text-ink">{{ (pr.progreso * 100) | number: '1.0-0' }}%</span>
                  </div>
                </div>
              </div>
            </ng-container>

            <ng-template #progressFallback>
              <div class="rounded-xl border border-dashed border-neutral-200 bg-neutral-100/60 p-6 text-sm text-neutral-500">
                Todavia no hay progreso registrado. Inicia la encuesta para ver el avance por pilar.
              </div>
            </ng-template>
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <div class="ts-card space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-ink">Resultados</h2>
              <span class="ts-chip">{{ employees.length }} encontrados</span>
            </div>

            <ng-container *ngIf="employees.length; else noEmployees">
              <div class="overflow-x-auto rounded-xl border border-neutral-200">
                <table class="ts-table min-w-[56rem]">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nombre</th>
                      <th>Email</th>
                      <th>Cargo</th>
                      <th>Depto</th>
                      <th class="text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      *ngFor="let emp of employees"
                      [ngClass]="{ 'bg-accent/5': selectedEmployee?.id === emp.id }"
                    >
                      <td class="font-medium text-ink">#{{ emp.id }}</td>
                      <td>
                        <ng-container *ngIf="editId !== emp.id; else editNombre">
                          {{ emp.nombre }}
                        </ng-container>
                        <ng-template #editNombre>
                          <input class="ts-input text-sm" [(ngModel)]="editBuffer.nombre" />
                        </ng-template>
                      </td>
                      <td>
                        <ng-container *ngIf="editId !== emp.id; else editEmail">
                          {{ emp.email || '--' }}
                        </ng-container>
                        <ng-template #editEmail>
                          <input class="ts-input text-sm" [(ngModel)]="editBuffer.email" />
                        </ng-template>
                      </td>
                      <td>
                        <ng-container *ngIf="editId !== emp.id; else editCargo">
                          {{ emp.cargo || '--' }}
                        </ng-container>
                        <ng-template #editCargo>
                          <input class="ts-input text-sm" [(ngModel)]="editBuffer.cargo" />
                        </ng-template>
                      </td>
                      <td>
                        <ng-container *ngIf="editId !== emp.id; else editDepto">
                          {{ emp.departamento_id || '--' }}
                        </ng-container>
                        <ng-template #editDepto>
                          <select class="ts-select text-sm" [(ngModel)]="editBuffer.departamento_id">
                            <option [ngValue]="null">Ninguno</option>
                            <option *ngFor="let d of departamentos" [ngValue]="d.id">{{ d.nombre }}</option>
                          </select>
                        </ng-template>
                      </td>
                      <td>
                        <div class="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            class="inline-flex items-center rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-accent/60"
                            (click)="seleccionarEmpleado(emp)"
                            [disabled]="selectedEmployee?.id === emp.id"
                            [attr.aria-pressed]="selectedEmployee?.id === emp.id"
                          >
                            {{
                              selectedEmployee?.id === emp.id
                                ? 'Seleccionado'
                                : 'Usar en encuesta'
                            }}
                          </button>
                          <button
                            *ngIf="editId !== emp.id"
                            class="inline-flex items-center rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:border-accent/40 hover:text-accent"
                            (click)="iniciarEdicion(emp)"
                          >
                            Editar
                          </button>
                          <button
                            *ngIf="editId === emp.id"
                            class="inline-flex items-center rounded-md bg-success px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-success/90"
                            (click)="guardarEdicion(emp)"
                          >
                            Guardar
                          </button>
                          <button
                            *ngIf="editId === emp.id"
                            class="inline-flex items-center rounded-md border border-neutral-200 bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-500 transition hover:text-neutral-700"
                            (click)="cancelarEdicion()"
                          >
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </ng-container>

            <ng-template #noEmployees>
              <div class="rounded-xl border border-dashed border-neutral-200 bg-neutral-100/60 p-6 text-sm text-neutral-500">
                Todavia no hay empleados listados para esta empresa. Busca o crea uno para continuar.
              </div>
            </ng-template>
          </div>

          <div class="ts-card space-y-6">
            <div class="space-y-1">
              <h2 class="text-xl font-semibold text-ink">Iniciar o continuar encuesta</h2>
              <p class="text-sm text-neutral-400">
                Selecciona una asignacion vigente y, si corresponde, indica el empleado que respondera.
              </p>
            </div>

            <div class="grid gap-4 md:grid-cols-[minmax(0,_0.6fr)_minmax(0,_0.4fr)]">
              <label class="block space-y-2">
                <span class="ts-label">Asignacion (vigentes)</span>
                <select
                  class="ts-select"
                  [(ngModel)]="asignacionId"
                  name="asignacionSelect"
                  (change)="onAssignmentChange()"
                  [disabled]="!activeAssignments.length"
                >
                  <option [ngValue]="null">Seleccionar...</option>
                  <option *ngFor="let a of activeAssignments" [ngValue]="a.id">
                    #{{ a.id }} - Cuest {{ a.cuestionario_id }} - {{ a.alcance_tipo }}
                  </option>
                </select>
                <span class="text-xs text-neutral-400" *ngIf="!activeAssignments.length">
                  No hay asignaciones vigentes para esta empresa.
                </span>
              </label>

              <label class="block space-y-2">
                <span class="ts-label">Empleado ID (opcional)</span>
                <input
                  class="ts-input"
                  type="number"
                  [(ngModel)]="empleadoId"
                  (ngModelChange)="onEmpleadoIdInput($event)"
                  name="empleadoId"
                />
              </label>
            </div>

            <div class="flex items-center justify-end">
              <button
                class="ts-btn w-full md:w-auto"
                (click)="begin()"
                [disabled]="loadingBegin || (!asignacionId && !formEmp.empresa_id)"
              >
                {{ loadingBegin ? 'Cargando...' : 'Iniciar / Continuar' }}
              </button>
            </div>

            <div
              *ngIf="selectedAssignment"
              class="rounded-xl border border-neutral-200 bg-neutral-100/60 p-4 text-sm text-neutral-600"
            >
              <div class="flex flex-wrap items-center gap-3">
                <span class="font-semibold text-ink">Asignacion #{{ selectedAssignment.id }}</span>
                <span
                  class="ts-badge"
                  [ngClass]="{
                    'bg-success/10 text-success': isActive(selectedAssignment),
                    'bg-error/10 text-error': !isActive(selectedAssignment)
                  }"
                >
                  {{ isActive(selectedAssignment) ? 'ACTIVA' : 'FUERA DE FECHA' }}
                </span>
              </div>
              <div class="mt-3 grid gap-2 text-sm">
                <span>Cuestionario: {{ selectedAssignment.cuestionario_id }}</span>
                <span>
                  Alcance:
                  {{ selectedAssignment.alcance_tipo
                  }}{{ selectedAssignment.alcance_id ? ' #' + selectedAssignment.alcance_id : '' }}
                </span>
                <span>Anonimato: {{ selectedAssignment.anonimo ? 'Si' : 'No' }}</span>
                <span>
                  Vigencia:
                  {{ selectedAssignment.fecha_inicio | date: 'yyyy-MM-dd HH:mm' }} ->
                  {{ selectedAssignment.fecha_cierre | date: 'yyyy-MM-dd HH:mm' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <ng-container *ngIf="progress as pr; else noProgress">
          <div class="ts-card space-y-6">
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div class="space-y-1">
                <h2 class="text-xl font-semibold text-ink">Preguntas por pilar</h2>
                <p class="text-sm text-neutral-400">
                  Selecciona un pilar y responde las preguntas pendientes.
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-3">
                <div class="ts-chip">{{ pr.respondidas }} / {{ pr.total }} respondidas</div>
                <button
                  class="ts-btn md:w-auto"
                  (click)="submitPilar()"
                  [disabled]="loadingSubmit || !hasQuestions"
                >
                  {{ loadingSubmit ? 'Guardando...' : 'Guardar respuestas' }}
                </button>
              </div>
            </div>

            <div class="grid gap-6 lg:grid-cols-[minmax(0,_0.3fr)_minmax(0,_1fr)]">
              <div class="space-y-3">
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
                        {{ progressMap[p.id]?.respondidas || 0 }} / {{ progressMap[p.id]?.total || 0 }}
                      </span>
                    </div>
                    <div class="mt-2 h-1.5 w-full rounded-full bg-neutral-200">
                      <div
                        class="h-full rounded-full bg-accent transition-all duration-160 ease-smooth"
                        [style.width.%]="(progressMap[p.id]?.progreso || 0) * 100"
                      ></div>
                    </div>
                  </button>
                </div>
              </div>

              <div class="space-y-4">
                <h3 class="text-xl font-semibold text-ink">
                  {{ questions?.pilar_nombre || 'Selecciona un pilar' }}
                </h3>

                <ng-container *ngIf="hasQuestions; else noPreguntas">
                  <div
                    *ngFor="let q of questions?.preguntas ?? []"
                    class="rounded-xl border border-neutral-200 p-4 space-y-3"
                  >
                    <div class="font-medium text-ink">{{ q.enunciado }}</div>
                    <ng-container [ngSwitch]="q.tipo">
                      <div *ngSwitchCase="'LIKERT'" class="flex flex-wrap gap-3">
                        <label
                          *ngFor="let v of likert"
                          class="inline-flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-600 transition hover:border-accent/40"
                        >
                          <input
                            type="radio"
                            class="h-4 w-4 text-accent focus:ring-accent/30"
                            [name]="'q' + q.id"
                            [value]="v"
                            [(ngModel)]="answers[q.id]"
                            required
                          />
                          <span>{{ v }}</span>
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
                          [required]="q.es_obligatoria"
                        ></textarea>
                      </div>
                    </ng-container>
                    <div class="text-xs text-neutral-400">
                      Tipo: {{ q.tipo }} - Obligatoria: {{ q.es_obligatoria ? 'Si' : 'No' }}
                    </div>
                  </div>
                </ng-container>

                <ng-template #noPreguntas>
                  <div class="rounded-xl border border-dashed border-neutral-200 bg-neutral-100/60 p-6 text-sm text-neutral-500">
                    Este pilar no contiene preguntas en la asignacion.
                  </div>
                </ng-template>
              </div>
            </div>
          </div>
        </ng-container>

        <ng-template #noProgress>
          <div class="ts-card-muted text-sm text-neutral-500">
            Selecciona una empresa, elige una asignacion vigente e inicia la encuesta para visualizar el progreso y las preguntas.
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
    `,
  ],
})
export class SurveyComponent implements OnInit {
  asignacionId: number | null = null;
  empleadoId: number | null = null;
  selectedEmployee: Empleado | null = null;

  progress: AssignmentProgress | null = null;
  progressMap: Partial<Record<number, PillarProgress>> = {};
  sidebarPillars: Pilar[] = [];
  currentPilar: PillarProgress | null = null;
  questions: PillarQuestionsResponse | null = null;
  answers: Record<number, string | null> = {};
  likert: string[] = ['1', '2', '3', '4', '5'];

  empresas: Empresa[] = [];
  departamentos: Departamento[] = [];
  employees: Empleado[] = [];
  loadingEmployees = false;
  formEmp: EmpleadoCreate = {
    empresa_id: 0,
    nombre: '',
    email: '',
    cargo: '',
    departamento_id: null,
  };
  creatingEmp = false;
  editId: number | null = null;
  editBuffer: Partial<Empleado> = {};

  assignments: Asignacion[] = [];
  activeAssignments: Asignacion[] = [];
  selectedAssignment: Asignacion | null = null;

  loadingBegin = false;
  loadingQuestions = false;
  loadingSubmit = false;

  message = '';
  error = '';

  private beginRetried = false;
  private ensuringAssignment = false;

  constructor(
    private survey: SurveyService,
    private company: CompanyService,
    private employee: EmployeeService,
    private assignmentsSvc: AssignmentsService
  ) {}

  ngOnInit(): void {
    this.company.list().subscribe({
      next: (rows) => (this.empresas = rows ?? []),
      error: () => {
        this.error = 'No se pudieron cargar las empresas.';
      },
    });
  }

  isActive(a: Asignacion): boolean {
    const now = new Date();
    const fi = new Date(a.fecha_inicio);
    const fc = new Date(a.fecha_cierre);
    return fi <= now && now <= fc;
  }

  onEmpresaChange(): void {
    this.resetCompanyState();

    if (!this.formEmp.empresa_id) {
      return;
    }

    const empresaId = this.formEmp.empresa_id;
    this.company.listDepartments(empresaId).subscribe({
      next: (deps) => (this.departamentos = deps ?? []),
      error: () => {
        this.departamentos = [];
      },
    });

    this.refreshAssignments(empresaId);
  }

  private resetCompanyState(): void {
    this.departamentos = [];
    this.employees = [];
    this.assignments = [];
    this.activeAssignments = [];
    this.selectedAssignment = null;
    this.asignacionId = null;
    this.empleadoId = null;
    this.selectedEmployee = null;
    this.progress = null;
    this.progressMap = {};
    this.sidebarPillars = [];
    this.currentPilar = null;
    this.questions = null;
    this.answers = {};
    this.message = '';
    this.error = '';
    this.beginRetried = false;
  }

  crearEmpleado(): void {
    if (!this.formEmp.empresa_id || !this.formEmp.nombre.trim()) {
      this.error = 'Empresa y nombre son obligatorios';
      return;
    }

    this.clearFeedback();
    this.creatingEmp = true;
    this.employee.create(this.formEmp.empresa_id, this.formEmp).subscribe({
      next: (emp) => {
        this.creatingEmp = false;
        this.empleadoId = emp.id;
        this.selectedEmployee = emp;
        this.message = `Empleado creado (#${emp.id})`;
      },
      error: (err) => {
        this.creatingEmp = false;
        this.error = err?.error?.detail ?? 'No se pudo crear el empleado';
      },
    });
  }

  buscarEmpleados(): void {
    if (!this.formEmp.empresa_id) {
      this.error = 'Selecciona una empresa para buscar empleados';
      return;
    }

    this.clearFeedback();
    this.loadingEmployees = true;
    this.employee
      .listByCompany(this.formEmp.empresa_id, this.formEmp.departamento_id ?? undefined)
      .subscribe({
        next: (list) => {
          this.employees = list ?? [];
          this.selectedEmployee =
            this.empleadoId != null ? this.employees.find((e) => e.id === this.empleadoId) ?? null : null;
          this.loadingEmployees = false;
        },
        error: (err) => {
          this.loadingEmployees = false;
          this.error = err?.error?.detail ?? 'No se pudieron listar empleados';
        },
      });
  }

  seleccionarEmpleado(emp: Empleado): void {
    this.clearFeedback();
    this.onEmpleadoIdInput(emp.id);
    const nombre = emp.nombre ? ` - ${emp.nombre}` : '';
    this.message = `Empleado seleccionado: #${emp.id}${nombre}`;
  }

  limpiarSeleccionEmpleado(): void {
    this.empleadoId = null;
    this.selectedEmployee = null;
    this.clearFeedback();
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

    const payload = {
      nombre: this.editBuffer.nombre ?? emp.nombre,
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
        this.cancelarEdicion();
        this.message = 'Empleado actualizado';
        this.error = '';
      },
      error: (err) => {
        this.error = err?.error?.detail ?? 'No se pudo actualizar el empleado';
      },
    });
  }

  onAssignmentChange(): void {
    this.selectedAssignment =
      this.asignacionId != null
        ? this.assignments.find((a) => a.id === this.asignacionId) ?? null
        : null;
  }

  begin(): void {
    if (this.loadingBegin) {
      return;
    }

    if (!this.asignacionId) {
      if (this.formEmp.empresa_id) {
        this.beginRetried = false;
        this.ensureAssignmentAndBegin();
      } else {
        this.error = 'Debes seleccionar una asignación';
      }
      return;
    }

    this.clearFeedback();
    this.loadingBegin = true;

    this.survey.begin(this.asignacionId, this.empleadoId).subscribe({
      next: () => {
        this.beginRetried = false;
        this.loadProgress(() => this.loadPillars(true));
      },
      error: (err) => {
        this.loadingBegin = false;
        if (err?.status === 403) {
          this.error = err?.error?.detail ?? 'Asignación fuera de vigencia';
          this.beginRetried = false;
        } else if (err?.status === 404 && !this.beginRetried) {
          this.beginRetried = true;
          this.ensureAssignmentAndBegin(true);
        } else if (err?.status === 400 && /empleado_id/i.test(err?.error?.detail ?? '')) {
          this.error = 'Esta asignación requiere Empleado ID. Selecciónalo o ingrésalo antes de continuar.';
          this.beginRetried = false;
        } else {
          this.error = err?.error?.detail ?? 'No se pudo iniciar la encuesta';
          this.beginRetried = false;
        }
      },
    });
  }

  private ensureAssignmentAndBegin(retry = false): void {
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
    const retryAttempt = retry || this.beginRetried;

    this.ensureAssignment(empresaId).subscribe({
      next: (assignmentId) => {
        this.ensuringAssignment = false;

        if (!assignmentId) {
          this.loadingBegin = false;
          this.beginRetried = false;
          this.error = 'No se pudo preparar una asignación activa para esta empresa.';
          return;
        }

        this.asignacionId = assignmentId;
        this.refreshAssignments(empresaId, assignmentId);
        this.loadingBegin = false;

        if (retryAttempt) {
          this.begin();
        }
      },
      error: (err) => {
        this.ensuringAssignment = false;
        this.loadingBegin = false;
        this.beginRetried = false;
        this.error = err?.error?.detail ?? 'No se pudo preparar la asignación';
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
        this.error = err?.error?.detail ?? 'Error al cargar progreso';
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
            empresa_id: 0,
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

    this.survey.getPillarQuestions(this.asignacionId, p.pilar_id, this.empleadoId).subscribe({
      next: (pq) => {
        this.questions = pq;
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
        this.error = err?.error?.detail ?? 'Error al cargar preguntas del pilar';
      },
    });
  }

  submitPilar(): void {
    if (!this.asignacionId || !this.questions) {
      return;
    }

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
      },
      error: (err) => {
        this.loadingSubmit = false;
        if (err?.status === 400 && /empleado_id/i.test(err?.error?.detail ?? '')) {
          this.error = 'Esta asignación requiere Empleado ID. Selecciónalo o ingrésalo antes de guardar.';
        } else if (err?.status === 403) {
          this.error = 'Asignación fuera de vigencia';
        } else {
          this.error = err?.error?.detail ?? 'No se pudo guardar';
        }
      },
    });
  }

  get hasQuestions(): boolean {
    return !!this.questions?.preguntas?.length;
  }

  private clearFeedback(): void {
    this.message = '';
    this.error = '';
  }
}
