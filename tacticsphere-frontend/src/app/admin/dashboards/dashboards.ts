import {
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxEchartsModule } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import { AssignmentsService } from '../../assignments.service';
import { SurveyService } from '../../survey.service';
import { CompanyService } from '../../company.service';
import { EmployeeService } from '../../employee.service';

import {
  Asignacion,
  AssignmentProgress,
  Departamento,
  Empleado,
  Empresa,
  PillarProgress,
} from '../../types';

type DashboardScope = 'GLOBAL' | 'COMPANY' | 'DEPARTMENT' | 'EMPLOYEE';

interface DashboardFilter {
  scope: DashboardScope;
  companyId?: number;
  departmentId?: number;
  employeeId?: number;
}

interface AssignmentInsight {
  asignacion: Asignacion;
  progress: AssignmentProgress | null;
}

@Component({
  standalone: true,
  selector: 'app-dashboards',
  imports: [CommonModule, FormsModule, NgxEchartsModule],
  template: `
    <div class="ts-page">
      <div class="ts-container space-y-6">
        <section class="ts-card space-y-6">
          <div class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 class="ts-title">Resultados</h1>
              <p class="ts-subtitle">
                Visualiza el avance agregado de las encuestas por asignación y pilar.
              </p>
            </div>
            <div class="flex flex-wrap gap-2 text-sm">
              <div class="ts-chip">
                Total asignaciones:
                <span class="font-semibold text-ink">{{ totalAssignments() }}</span>
              </div>
              <div class="ts-chip">
                Promedio global:
                <span class="font-semibold text-accent">{{ averageProgress() }}%</span>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <div class="grid gap-3 md:grid-cols-4">
              <label class="block space-y-2">
                <span class="ts-label">Ámbito</span>
                <select class="ts-select" [(ngModel)]="scopeModel" (ngModelChange)="onScopeChange()">
                  <option value="GLOBAL">Global</option>
                  <option value="COMPANY">Por empresa</option>
                  <option value="DEPARTMENT">Por departamento</option>
                  <option value="EMPLOYEE">Por empleado</option>
                </select>
              </label>

              <label class="block space-y-2" *ngIf="requiresCompany()">
                <span class="ts-label">Empresa</span>
                <select
                  class="ts-select"
                  [(ngModel)]="selectedCompanyId"
                  (ngModelChange)="onCompanyChange($event)"
                >
                  <option [ngValue]="null">Selecciona empresa…</option>
                  <option *ngFor="let company of companies()" [ngValue]="company.id">
                    {{ company.nombre }}
                  </option>
                </select>
              </label>

              <label class="block space-y-2" *ngIf="requiresDepartment()">
                <span class="ts-label">Departamento</span>
                <select
                  class="ts-select"
                  [(ngModel)]="selectedDepartmentId"
                  (ngModelChange)="onDepartmentChange($event)"
                >
                  <option [ngValue]="null">Selecciona departamento…</option>
                  <option *ngFor="let dep of departments()" [ngValue]="dep.id">
                    {{ dep.nombre }}
                  </option>
                </select>
              </label>

              <label class="block space-y-2" *ngIf="scopeModel === 'EMPLOYEE'">
                <span class="ts-label">Empleado</span>
                <select
                  class="ts-select"
                  [(ngModel)]="selectedEmployeeId"
                  (ngModelChange)="onEmployeeChange($event)"
                >
                  <option [ngValue]="null">Selecciona empleado…</option>
                  <option *ngFor="let emp of employees()" [ngValue]="emp.id">
                    {{ emp.nombre }} (ID {{ emp.id }})
                  </option>
                </select>
              </label>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <button
                class="ts-btn ts-btn--secondary"
                type="button"
                (click)="refreshCurrentFilter()"
                [disabled]="loading()"
              >
                Actualizar datos
              </button>
              <button
                class="ts-btn"
                type="button"
                (click)="exportPdf()"
                [disabled]="loading() || exporting() || !insights().length"
              >
                {{ exporting() ? 'Generando PDF…' : 'Exportar PDF' }}
              </button>
            </div>

            <div *ngIf="infoMessage()" class="rounded-md border border-neutral-200 bg-neutral-100 px-4 py-3 text-sm text-neutral-500">
              {{ infoMessage() }}
            </div>

            <div *ngIf="error()" class="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
              {{ error() }}
            </div>
          </div>
        </section>

        <div id="dashboard-export" class="space-y-6">
          <div *ngIf="loading(); else dashboardsReady" class="space-y-4">
            <div class="ts-card">
              <div class="animate-pulse space-y-4">
                <div class="h-4 w-1/4 rounded bg-neutral-200"></div>
                <div class="h-64 rounded-lg bg-neutral-200"></div>
              </div>
            </div>
            <div class="ts-card">
              <div class="animate-pulse space-y-4">
                <div class="h-4 w-1/4 rounded bg-neutral-200"></div>
                <div class="h-64 rounded-lg bg-neutral-200"></div>
              </div>
            </div>
          </div>

          <ng-template #dashboardsReady>
            <ng-container *ngIf="insights().length; else emptyState">
              <div class="grid gap-6 xl:grid-cols-2">
                <div class="ts-card space-y-4">
                  <div>
                    <h2 class="text-lg font-semibold text-ink">Progreso por asignación</h2>
                    <p class="text-sm text-neutral-400">
                      Avance general comparado entre las asignaciones filtradas.
                    </p>
                  </div>
                  <echarts class="h-72 w-full" [options]="assignmentChartOption()"></echarts>
                </div>

                <div class="ts-card space-y-4">
                  <div>
                    <h2 class="text-lg font-semibold text-ink">Pilares destacados</h2>
                    <p class="text-sm text-neutral-400">
                      Promedio de avance por pilar considerando las asignaciones visibles.
                    </p>
                  </div>
                  <echarts class="h-72 w-full" [options]="pillarChartOption()"></echarts>
                </div>
              </div>

              <div class="ts-card space-y-5">
                <div class="flex items-center justify-between">
                  <div>
                    <h2 class="text-lg font-semibold text-ink">Detalle de asignaciones</h2>
                    <p class="text-sm text-neutral-400">
                      Vigencia y avance por pilares según el filtro aplicado.
                    </p>
                  </div>
                </div>

                <div class="overflow-x-auto">
                  <table class="ts-table min-w-[720px]">
                    <thead>
                      <tr>
                        <th>Asignación</th>
                        <th>Cuestionario</th>
                        <th>Alcance</th>
                        <th>Vigencia</th>
                        <th>Progreso</th>
                        <th>Pilares</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let insight of insights()">
                        <td class="align-top">
                          <div class="font-medium text-ink">#{{ insight.asignacion.id }}</div>
                          <div class="text-xs text-neutral-400">
                            {{ parseDate(insight.asignacion.fecha_inicio) | date: 'yyyy-MM-dd' }}
                          </div>
                        </td>
                        <td class="align-top text-sm text-neutral-500">
                          Cuestionario {{ insight.asignacion.cuestionario_id }}
                        </td>
                        <td class="align-top text-sm text-neutral-500">
                          {{ insight.asignacion.alcance_tipo }}
                          <span *ngIf="insight.asignacion.alcance_id">#{{ insight.asignacion.alcance_id }}</span>
                        </td>
                        <td class="align-top text-sm">
                          <div>
                            {{ parseDate(insight.asignacion.fecha_inicio) | date: 'yyyy-MM-dd HH:mm' }}
                          </div>
                          <div>
                            {{ parseDate(insight.asignacion.fecha_cierre) | date: 'yyyy-MM-dd HH:mm' }}
                          </div>
                          <span
                            class="mt-1 inline-flex items-center rounded-pill px-2 py-1 text-xs font-semibold"
                            [class.bg-success/20]="isActive(insight.asignacion)"
                            [class.text-success]="isActive(insight.asignacion)"
                            [class.bg-error/10]="!isActive(insight.asignacion)"
                            [class.text-error]="!isActive(insight.asignacion)"
                          >
                            {{ isActive(insight.asignacion) ? 'ACTIVA' : 'FUERA DE VIGENCIA' }}
                          </span>
                        </td>
                        <td class="align-top text-sm">
                          <div class="font-semibold text-ink">
                            {{ progressPercent(insight.progress) }}%
                          </div>
                          <div class="text-xs text-neutral-400">
                            {{ insight.progress?.respondidas ?? 0 }} / {{ insight.progress?.total ?? 0 }} resp.
                          </div>
                        </td>
                        <td class="align-top text-sm">
                          <div class="space-y-2">
                            <div
                              *ngFor="let pp of (insight.progress?.por_pilar ?? [])"
                              class="rounded-lg border border-neutral-200 px-3 py-2"
                            >
                              <div class="flex items-center justify-between text-xs text-neutral-400 uppercase tracking-[0.12em]">
                                <span>{{ pp.pilar_nombre }}</span>
                                <span>{{ (pp.progreso * 100) | number: '1.0-0' }}%</span>
                              </div>
                              <div class="mt-2 h-2 w-full rounded-full bg-neutral-200">
                                <div
                                  class="h-2 rounded-full bg-accent transition-all duration-160 ease-smooth"
                                  [style.width.%]="pp.progreso * 100"
                                ></div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </ng-container>

            <ng-template #emptyState>
              <div class="ts-card text-center text-sm text-neutral-400">
                No encontramos respuestas para el filtro seleccionado. Ajusta los criterios o lanza nuevas encuestas para ver resultados aquí.
              </div>
            </ng-template>
          </ng-template>
        </div>
      </div>
    </div>
  `,
})
export class DashboardsComponent implements OnInit {
  private assignmentsSvc = inject(AssignmentsService);
  private survey = inject(SurveyService);
  private companySvc = inject(CompanyService);
  private employeeSvc = inject(EmployeeService);

  private insightsSignal = signal<AssignmentInsight[]>([]);
  private loadingSignal = signal(true);
  private errorSignal = signal('');
  private infoSignal = signal('');
  private exportingSignal = signal(false);

  private filterSignal = signal<DashboardFilter>({ scope: 'GLOBAL' });

  private companiesSignal = signal<Empresa[]>([]);
  private departmentsSignal = signal<Departamento[]>([]);
  private employeesSignal = signal<Empleado[]>([]);

  insights = this.insightsSignal.asReadonly();
  loading = this.loadingSignal.asReadonly();
  error = this.errorSignal.asReadonly();
  infoMessage = this.infoSignal.asReadonly();
  exporting = this.exportingSignal.asReadonly();

  companies = this.companiesSignal.asReadonly();
  departments = this.departmentsSignal.asReadonly();
  employees = this.employeesSignal.asReadonly();

  scopeModel: DashboardScope = 'GLOBAL';
  selectedCompanyId: number | null = null;
  selectedDepartmentId: number | null = null;
  selectedEmployeeId: number | null = null;

  private logoDataUrl: string | null = null;

  constructor() {
    effect(() => {
      const filter = this.filterSignal();
      this.fetchInsights(filter);
    });
  }

  ngOnInit(): void {
    this.loadCompanies();
  }

  totalAssignments = computed(() => this.insights().length);

  averageProgress = computed(() => {
    const items = this.insights().filter((i) => i.progress);
    if (!items.length) return 0;
    const total = items.reduce((acc, item) => acc + (item.progress?.progreso ?? 0), 0);
    return Math.round((total / items.length) * 100);
  });

  assignmentChartOption = computed<EChartsOption>(() => {
    const assignments = this.insights();
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: ({ 0: param }: any) =>
          param ? `Asignación ${param.name}<br/>Avance: ${param.value}%` : '',
      },
      grid: { left: '6%', right: '3%', bottom: '8%', top: '12%' },
      xAxis: {
        type: 'category',
        data: assignments.map((a) => `#${a.asignacion.id}`),
        axisLabel: { color: '#8C8C8C' },
        axisTick: { alignWithLabel: true },
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { formatter: '{value}%', color: '#8C8C8C' },
        splitLine: { lineStyle: { color: '#EAEAEA' } },
      },
      series: [
        {
          type: 'bar',
          data: assignments.map((a) => this.progressPercent(a.progress)),
          itemStyle: {
            color: '#3A8FFF',
            borderRadius: [8, 8, 0, 0],
          },
          barWidth: '45%',
        },
      ],
    };
  });

  pillarChartOption = computed<EChartsOption>(() => {
    const stats = this.buildPillarStats();
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: ({ 0: param }: any) =>
          param ? `${param.name}: ${param.value}%` : '',
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'value',
        max: 100,
        axisLabel: { formatter: '{value}%', color: '#8C8C8C' },
        splitLine: { lineStyle: { color: '#EAEAEA' } },
      },
      yAxis: {
        type: 'category',
        data: stats.map((s) => s.name),
        axisLabel: { color: '#1F1F1F', fontWeight: 500 },
      },
      series: [
        {
          type: 'bar',
          data: stats.map((s) => Math.round(s.value)),
          itemStyle: {
            color: '#10B981',
            borderRadius: [0, 8, 8, 0],
          },
          label: {
            show: true,
            position: 'right',
            formatter: '{c}%',
            color: '#1F1F1F',
            fontWeight: 600,
          },
        },
      ],
    };
  });

  requiresCompany(): boolean {
    return this.scopeModel === 'COMPANY' || this.scopeModel === 'DEPARTMENT' || this.scopeModel === 'EMPLOYEE';
  }

  requiresDepartment(): boolean {
    return this.scopeModel === 'DEPARTMENT' || this.scopeModel === 'EMPLOYEE';
  }

  onScopeChange(): void {
    if (this.scopeModel === 'GLOBAL') {
      this.resetSelections();
      this.filterSignal.set({ scope: 'GLOBAL' });
      return;
    }
    if (this.scopeModel === 'COMPANY') {
      this.selectedDepartmentId = null;
      this.selectedEmployeeId = null;
    }
    if (this.scopeModel === 'DEPARTMENT') {
      this.selectedEmployeeId = null;
    }
    this.updateFilter();
  }

  onCompanyChange(companyId: number | null): void {
    this.selectedDepartmentId = null;
    this.selectedEmployeeId = null;
    if (companyId != null) {
      this.loadDepartments(companyId);
      if (this.scopeModel === 'EMPLOYEE') {
        this.loadEmployees(companyId, null);
      } else {
        this.employeesSignal.set([]);
      }
    } else {
      this.departmentsSignal.set([]);
      this.employeesSignal.set([]);
    }
    this.updateFilter();
  }

  onDepartmentChange(departmentId: number | null): void {
    if (this.scopeModel === 'EMPLOYEE' && this.selectedCompanyId != null) {
      this.loadEmployees(this.selectedCompanyId, departmentId ?? undefined);
    }
    this.updateFilter();
  }

  onEmployeeChange(_: number | null): void {
    this.updateFilter();
  }

  refreshCurrentFilter(): void {
    const current = this.filterSignal();
    this.filterSignal.set({ ...current });
  }

  progressPercent(progress: AssignmentProgress | null | undefined): number {
    if (!progress) return 0;
    return Math.round(progress.progreso * 100);
  }

  isActive(asignacion: Asignacion): boolean {
    const now = Date.now();
    const start = this.parseDate(asignacion.fecha_inicio).getTime();
    const end = this.parseDate(asignacion.fecha_cierre).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) return false;
    return start <= now && now <= end;
  }

  parseDate(value: string | Date | null | undefined): Date {
    if (!value) {
      return new Date(NaN);
    }
    if (value instanceof Date) {
      return value;
    }
    let normalized = value.trim();
    if (!normalized.includes('T')) {
      normalized = normalized.replace(' ', 'T');
    }
    if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized)) {
      normalized = `${normalized}Z`;
    }
    return new Date(normalized);
  }

  async exportPdf(): Promise<void> {
    const container = document.getElementById('dashboard-export');
    if (!container) return;
    try {
      this.exportingSignal.set(true);
      await this.ensureLogo();
      const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#FFFFFF' });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();

      if (this.logoDataUrl) {
        pdf.addImage(this.logoDataUrl, 'PNG', 15, 12, 18, 18);
        pdf.setFontSize(16);
        pdf.text('TacticSphere · Reporte de resultados', 40, 24);
      } else {
        pdf.setFontSize(16);
        pdf.text('TacticSphere · Reporte de resultados', 15, 24);
      }

      const marginTop = 32;
      const imgWidth = pageWidth - 30;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 15, marginTop, imgWidth, imgHeight);

      pdf.setFontSize(10);
      pdf.text(`Generado: ${new Date().toLocaleString()}`, 15, marginTop + imgHeight + 10);

      pdf.save('tacticsphere-dashboard.pdf');
    } catch (err) {
      console.error('Error exportando PDF', err);
      this.errorSignal.set('No pudimos generar el PDF. Intenta nuevamente.');
    } finally {
      this.exportingSignal.set(false);
    }
  }

  private loadCompanies(): void {
    this.companySvc.list().subscribe({
      next: (rows) => this.companiesSignal.set(rows ?? []),
      error: (err) => {
        console.error('Error cargando empresas', err);
        this.errorSignal.set('No pudimos cargar la lista de empresas.');
      },
    });
  }

  private loadDepartments(companyId: number): void {
    this.companySvc.listDepartments(companyId).subscribe({
      next: (rows) => this.departmentsSignal.set(rows ?? []),
      error: (err) => {
        console.error('Error cargando departamentos', err);
        this.errorSignal.set('No pudimos cargar los departamentos de la empresa seleccionada.');
        this.departmentsSignal.set([]);
      },
    });
  }

  private loadEmployees(companyId: number, departmentId?: number | null): void {
    this.employeeSvc.listByCompany(companyId, departmentId ?? undefined).subscribe({
      next: (rows) => this.employeesSignal.set(rows ?? []),
      error: (err) => {
        console.error('Error cargando empleados', err);
        this.errorSignal.set('No pudimos cargar los empleados de la empresa seleccionada.');
        this.employeesSignal.set([]);
      },
    });
  }

  private updateFilter(): void {
    const filter: DashboardFilter = { scope: this.scopeModel };
    if (this.selectedCompanyId != null) {
      filter.companyId = this.selectedCompanyId;
    }
    if (this.scopeModel === 'DEPARTMENT' || this.scopeModel === 'EMPLOYEE') {
      if (this.selectedDepartmentId != null) {
        filter.departmentId = this.selectedDepartmentId;
      }
    }
    if (this.scopeModel === 'EMPLOYEE' && this.selectedEmployeeId != null) {
      filter.employeeId = this.selectedEmployeeId;
    }
    this.filterSignal.set(filter);
  }

  private resetSelections(): void {
    this.selectedCompanyId = null;
    this.selectedDepartmentId = null;
    this.selectedEmployeeId = null;
    this.departmentsSignal.set([]);
    this.employeesSignal.set([]);
  }

  private fetchInsights(filter: DashboardFilter): void {
    this.loadingSignal.set(true);
    this.errorSignal.set('');
    this.infoSignal.set('');

    if (filter.scope === 'COMPANY' && filter.companyId == null) {
      this.loadingSignal.set(false);
      this.infoSignal.set('Selecciona una empresa para ver sus resultados.');
      this.insightsSignal.set([]);
      return;
    }

    if (filter.scope === 'DEPARTMENT') {
      if (filter.companyId == null) {
        this.loadingSignal.set(false);
        this.infoSignal.set('Selecciona una empresa para filtrar por departamento.');
        this.insightsSignal.set([]);
        return;
      }
      if (filter.departmentId == null) {
        this.loadingSignal.set(false);
        this.infoSignal.set('Selecciona un departamento para visualizar resultados.');
        this.insightsSignal.set([]);
        return;
      }
    }

    if (filter.scope === 'EMPLOYEE') {
      if (filter.companyId == null) {
        this.loadingSignal.set(false);
        this.infoSignal.set('Selecciona una empresa para filtrar por empleado.');
        this.insightsSignal.set([]);
        return;
      }
      if (filter.employeeId == null) {
        this.loadingSignal.set(false);
        this.infoSignal.set('Elige un empleado para ver sus resultados individuales.');
        this.insightsSignal.set([]);
        return;
      }
    }

    const companyParam = filter.companyId ?? undefined;
    this.assignmentsSvc
      .list(companyParam)
      .pipe(
        switchMap((assignments) => {
          if (!assignments.length) {
            return of<AssignmentInsight[]>([]);
          }
          const ordered = [...assignments].sort(
            (a, b) =>
              this.parseDate(b.fecha_inicio).getTime() -
              this.parseDate(a.fecha_inicio).getTime()
          );
          const toLoad = ordered.slice(0, 8);
          return this.buildInsightsForFilter(toLoad, filter);
        }),
        catchError((err) => {
          console.error('Error cargando dashboards', err);
          this.errorSignal.set(
            err?.error?.detail ??
              'No pudimos cargar los resultados. Intenta nuevamente más tarde.'
          );
          return of([]);
        })
      )
      .subscribe((insights) => {
        this.insightsSignal.set(insights);
        this.loadingSignal.set(false);
      });
  }

  private buildInsightsForFilter(
    assignments: Asignacion[],
    filter: DashboardFilter
  ) {
    if (filter.scope === 'DEPARTMENT' && filter.companyId && filter.departmentId != null) {
      return this.employeeSvc
        .listByCompany(filter.companyId, filter.departmentId)
        .pipe(
          switchMap((employees) => {
            if (!employees.length) {
              return of(
                assignments.map((asignacion) => ({
                  asignacion,
                  progress: null,
                }))
              );
            }
            const obs = assignments.map((asignacion) =>
              this.aggregateProgressForEmployees(asignacion, employees)
            );
            return forkJoin(obs);
          })
        );
    }

    if (filter.scope === 'EMPLOYEE' && filter.employeeId != null) {
      const obs = assignments.map((asignacion) =>
        this.survey.getProgress(asignacion.id, filter.employeeId).pipe(
          catchError(() => of(null)),
          map((progress) => ({
            asignacion,
            progress,
          }))
        )
      );
      return forkJoin(obs);
    }

    // Global or company scope.
    const obs = assignments.map((asignacion) =>
      this.survey.getProgress(asignacion.id).pipe(
        catchError(() => of(null)),
        map((progress) => ({
          asignacion,
          progress,
        }))
      )
    );
    return forkJoin(obs);
  }

  private aggregateProgressForEmployees(
    asignacion: Asignacion,
    employees: Empleado[]
  ) {
    const requests = employees.map((emp) =>
      this.survey.getProgress(asignacion.id, emp.id).pipe(catchError(() => of(null)))
    );
    return forkJoin(requests).pipe(
      map((results) => {
        const valid = results.filter((p): p is AssignmentProgress => !!p);
        const aggregated = valid.length ? this.combineProgress(valid) : null;
        return {
          asignacion,
          progress: aggregated,
        };
      })
    );
  }

  private combineProgress(progresses: AssignmentProgress[]): AssignmentProgress {
    const count = progresses.length || 1;
    const avgProgreso =
      progresses.reduce((acc, p) => acc + (p.progreso ?? 0), 0) / count;
    const avgRespondidas =
      progresses.reduce((acc, p) => acc + (p.respondidas ?? 0), 0) / count;
    const avgTotal =
      progresses.reduce((acc, p) => acc + (p.total ?? 0), 0) / count;

    const pillarMap = new Map<
      number,
      { sum: number; count: number; respondidas: number; total: number; nombre: string }
    >();

    progresses.forEach((progress) => {
      progress.por_pilar.forEach((p) => {
        const current = pillarMap.get(p.pilar_id) ?? {
          sum: 0,
          count: 0,
          respondidas: 0,
          total: 0,
          nombre: p.pilar_nombre,
        };
        current.sum += p.progreso ?? 0;
        current.respondidas += p.respondidas ?? 0;
        current.total += p.total ?? 0;
        current.count += 1;
        pillarMap.set(p.pilar_id, current);
      });
    });

    const por_pilar: PillarProgress[] = Array.from(pillarMap.entries()).map(
      ([id, data]) => ({
        pilar_id: id,
        pilar_nombre: data.nombre,
        respondidas: Math.round(data.respondidas / (data.count || 1)),
        total: Math.round(data.total / (data.count || 1)),
        progreso: data.sum / (data.count || 1),
      })
    );

    return {
      total: Math.round(avgTotal),
      respondidas: Math.round(avgRespondidas),
      progreso: avgProgreso,
      por_pilar,
    };
  }

  private buildPillarStats(): { name: string; value: number }[] {
    const accumulator = new Map<string, { sum: number; count: number }>();
    this.insights()
      .filter((i) => i.progress?.por_pilar?.length)
      .forEach((i) => {
        i.progress?.por_pilar?.forEach((p) => {
          const current = accumulator.get(p.pilar_nombre) ?? { sum: 0, count: 0 };
          current.sum += p.progreso ?? 0;
          current.count += 1;
          accumulator.set(p.pilar_nombre, current);
        });
      });

    return Array.from(accumulator.entries())
      .map(([name, { sum, count }]) => ({
        name,
        value: count ? (sum / count) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }

  private async ensureLogo(): Promise<void> {
    if (this.logoDataUrl) return;
    try {
      const response = await fetch('assets/logo_ts.png');
      const blob = await response.blob();
      const reader = new FileReader();
      this.logoDataUrl = await new Promise<string>((resolve, reject) => {
        reader.onerror = () => reject(reader.error);
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('No se pudo cargar el logo para el PDF', error);
    }
  }
}
