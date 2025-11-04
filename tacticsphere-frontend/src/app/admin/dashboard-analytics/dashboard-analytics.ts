import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  AfterViewChecked,
  HostListener,
  QueryList,
  ViewChildren,
  inject,
  signal,
  computed,
  effect,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { NgxEchartsDirective, NgxEchartsModule } from "ngx-echarts";
import { EChartsOption } from "echarts";
import { forkJoin, of, Subscription } from "rxjs";
import { catchError, map, switchMap } from "rxjs/operators";

import { AssignmentsService } from "../../assignments.service";
import { CompanyService } from "../../company.service";
import { EmployeeService } from "../../employee.service";
import { SurveyService } from "../../survey.service";
import {
  Asignacion,
  AssignmentProgress,
  Departamento,
  Empleado,
  Empresa,
  PillarProgress,
} from "../../types";

type DashboardScope = "GLOBAL" | "COMPANY" | "DEPARTMENT" | "EMPLOYEE";

type FormatterParam = {
  dataIndex?: number;
  name?: string;
  value?: unknown;
  seriesName?: string;
  data?: unknown;
};

type FormatterParams = FormatterParam | FormatterParam[];

interface DashboardFilter {
  scope: DashboardScope;
  companyId?: number | null;
  departmentId?: number | null;
  employeeId?: number | null;
}

interface AssignmentInsight {
  asignacion: Asignacion;
  progress: AssignmentProgress | null;
}

interface PillarAggregate {
  id: number;
  name: string;
  values: number[];
  responded: number;
  total: number;
  scoreSum: number;
  scoreCount: number;
}

@Component({
  standalone: true,
  selector: "app-dashboard-analytics",
  imports: [
    CommonModule,
    FormsModule,
    NgxEchartsModule,
  ],
  templateUrl: "./dashboard-analytics.html",
})
export class DashboardAnalyticsComponent
  implements OnInit, OnDestroy, AfterViewInit, AfterViewChecked
{
  private assignmentsSvc = inject(AssignmentsService);
  private surveySvc = inject(SurveyService);
  private companySvc = inject(CompanyService);
  private employeeSvc = inject(EmployeeService);
  @ViewChildren(NgxEchartsDirective) charts!: QueryList<NgxEchartsDirective>;

  ///////////////////////////
  // State signals
  ///////////////////////////

  private insightsSignal = signal<AssignmentInsight[]>([]);
  private companiesSignal = signal<Empresa[]>([]);
  private departmentsSignal = signal<Departamento[]>([]);
  private employeesSignal = signal<Empleado[]>([]);
  private loadingSignal = signal<boolean>(true);
  private errorSignal = signal<string>("");
  private infoSignal = signal<string>("");

  private filterSignal = signal<DashboardFilter>({ scope: "GLOBAL" });
  private pillarSelectionSignal = signal<number | "ALL">("ALL");

  private readonly filterEffect = effect(
    () => {
      const filter = this.filterSignal();
      this.fetchInsights(filter);
    },
    { allowSignalWrites: true }
  );

  private subscriptions: Subscription[] = [];

  ///////////////////////////
  // Public getters for template
  ///////////////////////////

  insights = this.insightsSignal.asReadonly();
  loading = this.loadingSignal.asReadonly();
  error = this.errorSignal.asReadonly();
  info = this.infoSignal.asReadonly();

  companies = this.companiesSignal.asReadonly();
  departments = this.departmentsSignal.asReadonly();
  employees = this.employeesSignal.asReadonly();

  scopeModel: DashboardScope = "GLOBAL";
  selectedCompanyId: number | null = null;
  selectedDepartmentId: number | null = null;
  selectedEmployeeId: number | null = null;
  selectedPillar: number | "ALL" = "ALL";
  employeeSearch = "";
  private didInitialResize = false;

  ///////////////////////////
  // KPI cards
  ///////////////////////////

  kpiCards = computed(() => {
    const insights = this.insights();
    const totals = insights.reduce(
      (acc, item) => {
        if (!item.progress) return acc;
        const responded = Math.max(0, item.progress.respondidas ?? 0);
        const total = Math.max(0, item.progress.total ?? 0);
        acc.assignments += 1;
        if (total && responded >= total) acc.completed += 1;
        acc.responded += responded;
        acc.total += total;
        const score = Math.max(0, Math.min(1, item.progress.progreso ?? 0));
        acc.scoreSum += score * (total || 1);
        acc.scoreWeight += total || 1;
        return acc;
      },
      { assignments: 0, completed: 0, responded: 0, total: 0, scoreSum: 0, scoreWeight: 0 }
    );

    const averageScore = totals.scoreWeight
      ? this.clampPercent(Math.round((totals.scoreSum / totals.scoreWeight) * 100))
      : 0;
    const participation = totals.total
      ? this.clampPercent(Math.round((totals.responded / totals.total) * 100))
      : 0;

    return [
      { label: "Asignaciones analizadas", value: totals.assignments },
      { label: "Asignaciones completadas", value: totals.completed },
      { label: "Promedio global", value: averageScore, suffix: "%" },
      { label: "Tasa de participacion", value: participation, suffix: "%" },
    ];
  });

  ///////////////////////////
  // Chart options
  ///////////////////////////

  barPillarOption = computed<EChartsOption>(() => {
    const aggregates = this.buildPillarAggregates();
    if (!aggregates.length) {
      return this.emptyChartOption("Sin informacion de pilares");
    }

    const categories = aggregates.map((item) => item.name);
    const scores = aggregates.map((item) => item.scoreAvg);

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: FormatterParams) => {
          const list = this.asParamArray(params);
          const idx = list[0]?.dataIndex ?? 0;
          const label = categories[idx] ?? "";
          const score = scores[idx] ?? 0;
          return `${label}: ${score}%`;
        },
      },
      grid: { left: 200, right: 48, bottom: 48, top: 72, containLabel: true },
      xAxis: {
        type: "value",
        max: 100,
        axisLabel: { formatter: "{value}%", color: "#6B7280" },
        splitLine: { lineStyle: { color: "#E5E7EB", type: "dashed" } },
      },
      yAxis: {
        type: "category",
        data: categories,
        axisLabel: {
          color: "#1F2937",
          fontWeight: 600,
          interval: 0,
          width: 220,
          overflow: "break",
          lineHeight: 18,
        },
      },
      series: [
        {
          type: "bar",
          data: scores,
          barWidth: 24,
          itemStyle: { color: "#2563EB", borderRadius: [0, 12, 12, 0] },
          label: {
            show: true,
            position: "right",
            formatter: "{c}%",
            color: "#1F2937",
            fontWeight: 600,
          },
        },
      ],
    };
  });

  radarBalanceOption = computed<EChartsOption>(() => {
    const aggregates = this.buildPillarAggregates();
    if (!aggregates.length) {
      return this.emptyChartOption("Sin balance registrado", "radar");
    }

    const indicators = aggregates.map((item) => ({ name: item.name, max: 100 }));
    const values = aggregates.map((item) => item.scoreAvg);

    return {
      tooltip: {
        trigger: "item",
        formatter: (params: FormatterParams) => {
          const list = this.asParamArray(params);
          const data = list[0];
          const arr = (data?.value as number[]) ?? [];
          if (!arr.length) return "Sin datos";
          return arr
            .map((val, idx) => `${indicators[idx]?.name ?? ""}: ${this.clampPercent(val)}%`)
            .join("<br/>");
        },
      },
      radar: {
        indicator: indicators,
        radius: "70%",
        splitNumber: 4,
        splitLine: { lineStyle: { color: "#CBD5F5" } },
        splitArea: { areaStyle: { color: ["rgba(99,102,241,0.16)", "rgba(99,102,241,0.05)"] } },
        axisName: { color: "#1F2937", fontWeight: 600 },
      },
      series: [
        {
          type: "radar",
          data: [
            {
              value: values,
              name: "Promedio",
              areaStyle: { color: "rgba(59,130,246,0.28)" },
              lineStyle: { color: "#2563EB", width: 2 },
              itemStyle: { color: "#2563EB" },
            },
          ],
        },
      ],
    } as EChartsOption;
  });

  heatmapOption = computed<EChartsOption>(() => {
    const { departments, pillars, data } = this.buildHeatmapMatrix();
    if (!departments.length || !pillars.length) {
      return this.emptyChartOption("Sin combinaciones disponibles");
    }

    return {
      tooltip: {
        position: "top",
        formatter: (params: FormatterParams) => {
          const item = this.asParamArray(params)[0];
          if (!item) return "";
          const tuple = item.data as [number, number, number];
          const pillar = pillars[tuple[0]] ?? "";
          const dept = departments[tuple[1]] ?? "";
          return `${dept}<br/>${pillar}: ${tuple[2]}%`;
        },
      },
      grid: { left: 220, right: 48, bottom: 120, top: 64, containLabel: true },
      xAxis: {
        type: "category",
        data: pillars,
        axisLabel: {
          color: "#1F2937",
          fontWeight: 600,
          interval: 0,
          width: 160,
          overflow: "break",
          lineHeight: 16,
          margin: 16,
        },
      },
      yAxis: {
        type: "category",
        data: departments,
        axisLabel: {
          color: "#1F2937",
          fontWeight: 600,
          width: 220,
          overflow: "break",
          lineHeight: 18,
        },
      },
      visualMap: {
        min: 0,
        max: 100,
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 12,
      },
      series: [
        {
          type: "heatmap",
          data,
          label: { show: true, formatter: "{c}%", color: "#111827", fontWeight: 600 },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: "rgba(0,0,0,0.25)",
            },
          },
        },
      ],
    } as EChartsOption;
  });

  timelineOption = computed<EChartsOption>(() => {
    const timeline = this.buildTimeline();
    if (!timeline.length) {
      return this.emptyChartOption("Sin historial disponible");
    }

    const pillarIds = this.activePillarIds();
    const primaryPillar = pillarIds?.[0] ?? null;
    const pillarSeries = primaryPillar
      ? timeline.map((item) => item.pillarScores.get(primaryPillar) ?? null)
      : null;

    const series: any[] = [
      {
        name: "Promedio global",
        type: "line",
        data: timeline.map((item) => item.global),
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 3, color: "#3A8FFF" },
        areaStyle: { color: "rgba(59,130,246,0.12)" },
      },
    ];

    if (pillarSeries) {
      series.push({
        name: "Pilar seleccionado",
        type: "line",
        data: pillarSeries,
        smooth: true,
        connectNulls: true,
        showSymbol: false,
        lineStyle: { width: 2, color: "#F97316" },
      });
    }

    return {
      tooltip: { trigger: "axis" },
      legend: { data: series.map((item) => item.name) },
      grid: { left: 72, right: 32, bottom: 72, top: 48, containLabel: true },
      xAxis: {
        type: "category",
        data: timeline.map((item) => item.label),
        boundaryGap: false,
        axisLabel: {
          color: "#1F2937",
          fontWeight: 600,
          interval: 0,
           width: 120,
           overflow: "break",
          lineHeight: 16,
        },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        axisLabel: { formatter: "{value}%", color: "#6B7280" },
        splitLine: { lineStyle: { color: "#E5E7EB", type: "dashed" } },
      },
      series,
    } as EChartsOption;
  });

  departmentParticipationOption = computed<EChartsOption>(() => {
    const departments = this.collectDepartmentAggregates(this.activePillarIds());

    const rows = departments.length
      ? departments.map((dept) => ({
          label: dept.name,
          responded: Math.max(0, dept.responded),
          total: Math.max(0, dept.total),
        }))
      : this.insights()
          .filter((insight) => !!insight.progress)
          .map((insight) => {
            const progress = insight.progress!;
            const responded = Math.max(0, progress.respondidas ?? 0);
            const total = Math.max(0, progress.total ?? 0);
            return {
              label: `Asig. #${insight.asignacion.id}`,
              responded,
              total,
            };
          });

    if (!rows.length) {
      return this.emptyChartOption("Sin datos de participacion");
    }

    const categories = rows.map((row) => row.label);
    const respondedSeries = rows.map((row) => {
      if (!row.total) return 0;
      return this.clampPercent(Number(((row.responded / row.total) * 100).toFixed(1)));
    });
    const pendingSeries = rows.map((row, index) => {
      const responded = respondedSeries[index] ?? 0;
      return this.clampPercent(Number((100 - responded).toFixed(1)));
    });

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: FormatterParams) => {
          const list = this.asParamArray(params);
          const first = list[0];
          if (!first) return "";
          const idx = first.dataIndex ?? 0;
          const row = rows[idx];
          const responded = respondedSeries[idx] ?? 0;
          const pending = pendingSeries[idx] ?? 0;
          const total = row.total || 0;
          return `${row.label}<br/>Respondidas: ${responded}% (${row.responded}/${total})<br/>Pendientes: ${pending}%`;
        },
      },
      legend: { data: ["Respondidas", "Pendientes"] },
      grid: { left: 200, right: 32, bottom: 32, top: 48, containLabel: true },
      xAxis: {
        type: "value",
        max: 100,
        axisLabel: { formatter: "{value}%", color: "#6B7280" },
        splitLine: { lineStyle: { color: "#E5E7EB", type: "dashed" } },
      },
      yAxis: {
        type: "category",
        data: categories,
        axisLabel: {
          color: "#1F2937",
          fontWeight: 600,
          width: 240,
          overflow: "break",
          lineHeight: 18,
        },
      },
      series: [
        {
          name: "Respondidas",
          type: "bar",
          stack: "total",
          data: respondedSeries,
          barWidth: 26,
          itemStyle: { color: "#10B981", borderRadius: [0, 12, 12, 0] },
        },
        {
          name: "Pendientes",
          type: "bar",
          stack: "total",
          data: pendingSeries,
          barWidth: 26,
          itemStyle: { color: "#F59E0B", borderRadius: [12, 0, 0, 12] },
        },
      ],
    } as EChartsOption;
  });

  rankingOption = computed<EChartsOption>(() => {
    const rankings = this.buildRanking();
    if (!rankings.length) {
      return this.emptyChartOption("Sin ranking disponible");
    }

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: FormatterParams) => {
          const item = this.asParamArray(params)[0];
          if (!item) return "";
          const value = Number(item.value ?? 0) || 0;
          return `${item.name}: ${value}%`;
        },
      },
      grid: { left: 220, right: 32, bottom: 32, top: 32, containLabel: true },
      xAxis: {
        type: "value",
        max: 100,
        axisLabel: { formatter: "{value}%", color: "#6B7280" },
        splitLine: { lineStyle: { color: "#E5E7EB", type: "dashed" } },
      },
      yAxis: {
        type: "category",
        data: rankings.map((item) => item.label),
        axisLabel: {
          color: "#1F2937",
          fontWeight: 600,
          interval: 0,
          width: 220,
          overflow: "break",
          lineHeight: 18,
        },
      },
      series: [
        {
          type: "bar",
          data: rankings.map((item) => item.value),
          barWidth: 26,
          itemStyle: { color: "#6366F1", borderRadius: [0, 12, 12, 0] },
          label: {
            show: true,
            position: "right",
            formatter: "{c}%",
            color: "#1F2937",
            fontWeight: 600,
          },
        },
      ],
    } as EChartsOption;
  });

  ///////////////////////////
  // Filter helpers
  ///////////////////////////

  pillarOptions() {
    const options = new Map<number, string>();
    this.insights().forEach((insight) => {
      insight.progress?.por_pilar?.forEach((pillar) => {
        options.set(pillar.pilar_id, pillar.pilar_nombre);
      });
    });
    return Array.from(options.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  filteredEmployees = computed(() => {
    const term = this.employeeSearch.trim().toLowerCase();
    if (!term) return this.employees();
    return this.employees().filter((employee) => {
      const name = employee.nombre?.toLowerCase() ?? "";
      const email = employee.email?.toLowerCase() ?? "";
      const id = String(employee.id ?? "").toLowerCase();
      return name.includes(term) || email.includes(term) || id.includes(term);
    });
  });

  requiresCompany(): boolean {
    return this.scopeModel !== "GLOBAL";
  }

  requiresDepartment(): boolean {
    return this.scopeModel === "DEPARTMENT" || this.scopeModel === "EMPLOYEE";
  }

  trackById(_: number, item: any) {
    return item?.id ?? item;
  }

  onScopeChange(): void {
    if (this.scopeModel === "GLOBAL") {
      this.selectedCompanyId = null;
      this.selectedDepartmentId = null;
      this.selectedEmployeeId = null;
      this.departmentsSignal.set([]);
      this.employeesSignal.set([]);
    }
    if (this.scopeModel === "COMPANY") {
      this.selectedDepartmentId = null;
      this.selectedEmployeeId = null;
    }
    if (this.scopeModel === "DEPARTMENT") {
      this.selectedEmployeeId = null;
    }
    this.updateFilter();
  }

  onCompanyChange(companyId: number | null): void {
    this.selectedDepartmentId = null;
    this.selectedEmployeeId = null;
    this.employeeSearch = "";

    if (companyId != null) {
      this.loadDepartments(companyId);
      if (this.scopeModel === "EMPLOYEE") {
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
    if (this.scopeModel === "EMPLOYEE" && this.selectedCompanyId != null) {
      this.loadEmployees(this.selectedCompanyId, departmentId ?? undefined);
    }
    this.updateFilter();
  }

  onPillarChange(selection: number | "ALL"): void {
    this.selectedPillar = selection;
    this.pillarSelectionSignal.set(selection);
  }

  onEmployeeChange(_: number | null): void {
    this.updateFilter();
  }

  onEmployeeSearchChange(term: string): void {
    this.employeeSearch = term ?? "";
  }

  refreshCurrentFilter(): void {
    const current = this.filterSignal();
    this.filterSignal.set({ ...current });
  }

  @HostListener("window:resize")
  onWindowResize(): void {
    this.resizeAllCharts();
  }

  private resizeAllCharts(): void {
    if (!this.charts || this.charts.length === 0) {
      return;
    }
    this.charts.forEach((chart) => {
      try {
        chart.resize();
      } catch {
      }
    });
  }

  ///////////////////////////
  // Lifecycle
  ///////////////////////////

  ngAfterViewInit(): void {
    setTimeout(() => this.resizeAllCharts(), 0);
  }

  ngAfterViewChecked(): void {
    if (!this.didInitialResize) {
      this.didInitialResize = true;
      setTimeout(() => this.resizeAllCharts(), 0);
    }
  }

  ngOnInit(): void {
    this.loadCompanies();
    this.refreshCurrentFilter();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.filterEffect.destroy();
  }

  ///////////////////////////
  // Data loading
  ///////////////////////////

  private updateFilter(): void {
    const filter: DashboardFilter = { scope: this.scopeModel };
    if (this.selectedCompanyId != null) filter.companyId = this.selectedCompanyId;
    if (this.scopeModel === "DEPARTMENT" || this.scopeModel === "EMPLOYEE") {
      filter.departmentId = this.selectedDepartmentId ?? null;
    }
    if (this.scopeModel === "EMPLOYEE") {
      filter.employeeId = this.selectedEmployeeId ?? null;
    }
    this.filterSignal.set(filter);
  }

  private fetchInsights(filter: DashboardFilter): void {
    this.loadingSignal.set(true);
    this.errorSignal.set("");
    this.infoSignal.set("");

    if (filter.scope === "COMPANY" && filter.companyId == null) {
      this.loadingSignal.set(false);
      this.infoSignal.set("Selecciona una empresa para ver sus resultados.");
      this.insightsSignal.set([]);
      return;
    }
    if (filter.scope === "DEPARTMENT") {
      if (filter.companyId == null) {
        this.loadingSignal.set(false);
        this.infoSignal.set("Selecciona una empresa para filtrar por departamento.");
        this.insightsSignal.set([]);
        return;
      }
      if (filter.departmentId == null) {
        this.loadingSignal.set(false);
        this.infoSignal.set("Selecciona un departamento para visualizar resultados.");
        this.insightsSignal.set([]);
        return;
      }
    }
    if (filter.scope === "EMPLOYEE") {
      if (filter.companyId == null) {
        this.loadingSignal.set(false);
        this.infoSignal.set("Selecciona una empresa para filtrar por empleado.");
        this.insightsSignal.set([]);
        return;
      }
      if (filter.employeeId == null) {
        this.loadingSignal.set(false);
        this.infoSignal.set("Elige un empleado para ver sus resultados individuales.");
        this.insightsSignal.set([]);
        return;
      }
    }

    const companyParam = filter.companyId ?? undefined;
    const sub = this.assignmentsSvc
      .list(companyParam)
      .pipe(
        switchMap((assignments) => {
          if (!assignments.length) {
            return of<AssignmentInsight[]>([]);
          }
          const ordered = [...assignments].sort(
            (a, b) =>
              this.parseDate(b.fecha_inicio).getTime() - this.parseDate(a.fecha_inicio).getTime()
          );
          return this.buildInsightsForFilter(ordered, filter);
        }),
        catchError((err) => {
          console.error("Error cargando dashboards", err);
          this.errorSignal.set(
            err?.error?.detail ?? "No pudimos cargar los resultados. Intenta nuevamente mÃ¡s tarde."
          );
          return of<AssignmentInsight[]>([]);
        })
      )
      .subscribe((insights) => {
        this.insightsSignal.set(insights);
        this.loadingSignal.set(false);
      });

    this.subscriptions.push(sub);
  }

  private buildInsightsForFilter(assignments: Asignacion[], filter: DashboardFilter) {
    if (filter.scope === "DEPARTMENT" && filter.companyId && filter.departmentId != null) {
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

    if (filter.scope === "EMPLOYEE" && filter.employeeId != null) {
      const obs = assignments.map((asignacion) =>
        this.surveySvc.getProgress(asignacion.id, filter.employeeId).pipe(
          catchError(() => of(null)),
          map((progress) => ({
            asignacion,
            progress,
          }))
        )
      );
      return forkJoin(obs);
    }

    const obs = assignments.map((asignacion) =>
      this.surveySvc.getProgress(asignacion.id).pipe(
        catchError(() => of(null)),
        map((progress) => ({
          asignacion,
          progress,
        }))
      )
    );
    return forkJoin(obs);
  }

  private loadCompanies(): void {
    const sub = this.companySvc.list().subscribe({
      next: (rows) => this.companiesSignal.set(rows ?? []),
      error: () => {
        this.errorSignal.set("No pudimos cargar la lista de empresas.");
      },
    });
    this.subscriptions.push(sub);
  }

  private loadDepartments(companyId: number): void {
    const sub = this.companySvc.listDepartments(companyId).subscribe({
      next: (rows) => this.departmentsSignal.set(rows ?? []),
      error: () => {
        this.errorSignal.set("No pudimos cargar los departamentos de la empresa seleccionada.");
        this.departmentsSignal.set([]);
      },
    });
    this.subscriptions.push(sub);
  }

  private loadEmployees(companyId: number, departmentId?: number | null): void {
    const sub = this.employeeSvc.listByCompany(companyId, departmentId ?? undefined).subscribe({
      next: (rows) => this.employeesSignal.set(rows ?? []),
      error: () => {
        this.errorSignal.set("No pudimos cargar los empleados de la empresa seleccionada.");
        this.employeesSignal.set([]);
      },
    });
    this.subscriptions.push(sub);
  }

  ///////////////////////////
  // Aggregation helpers
  ///////////////////////////

  private buildPillarAggregates() {
    const map = this.collectPillarAggregates(this.activePillarIds());
    return Array.from(map.values()).map((aggregate) => ({
      id: aggregate.id,
      name: aggregate.name,
      scoreAvg: aggregate.scoreCount
        ? this.clampPercent(Number(((aggregate.scoreSum / aggregate.scoreCount) * 100).toFixed(1)))
        : 0,
      coverage: aggregate.total
        ? this.clampPercent(Number(((aggregate.responded / aggregate.total) * 100).toFixed(1)))
        : 0,
    }));
  }

  private buildHeatmapMatrix() {
    const departments = this.collectDepartmentAggregates(this.activePillarIds());
    const pillars = this.activePillarIds()
      ? this.pillarOptions().filter((p) => (this.activePillarIds() ?? []).includes(p.id))
      : this.pillarOptions();

    const departmentNames = departments.map((dept) => dept.name);
    const pillarNames = pillars.map((pillar) => pillar.name);
    const data: Array<[number, number, number]> = [];

    departments.forEach((dept, yIndex) => {
      pillars.forEach((pillar, xIndex) => {
        const stats = dept.pillarScores.get(pillar.id);
        const value =
          stats && stats.scoreCount
            ? this.clampPercent(Number(((stats.scoreSum / stats.scoreCount) * 100).toFixed(1)))
            : 0;
        data.push([xIndex, yIndex, value]);
      });
    });

    return { departments: departmentNames, pillars: pillarNames, data };
  }

  private buildTimeline() {
    return this.insights()
      .filter((insight) => !!insight.progress)
      .map((insight) => {
        const progress = insight.progress!;
        const end = this.parseDate(insight.asignacion.fecha_cierre);
        const start = this.parseDate(insight.asignacion.fecha_inicio);
        const date = Number.isNaN(end.getTime()) ? start : end;
        const timeValue = Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
        const label = this.formatDateLabel(date, insight.asignacion.id);
        const pillarScores = new Map<number, number>();
        progress?.por_pilar?.forEach((pillar) => {
          pillarScores.set(pillar.pilar_id, this.progressPercent(pillar));
        });
        return {
          time: timeValue,
          label,
          global: this.progressPercent(progress),
          pillarScores,
        };
      })
      .sort((a, b) => a.time - b.time);
  }

  private buildRanking() {
    const pillarIds = this.activePillarIds();
    const departments = this.collectDepartmentAggregates(pillarIds);
    if (departments.length) {
      return departments
        .map((dept) => {
          const totals = Array.from(dept.pillarScores.values()).reduce(
            (acc, item) => {
              acc.sum += item.scoreSum;
              acc.count += item.scoreCount;
              return acc;
            },
            { sum: 0, count: 0 }
          );
          const average = totals.count ? (totals.sum / totals.count) * 100 : 0;
          return { label: dept.name, value: average };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    }

    const employees = this.collectEmployeeAggregates(pillarIds);
    if (employees.length) {
      return employees
        .map((employee) => ({
          label: employee.name,
          value: employee.scoreCount ? (employee.scoreSum / employee.scoreCount) * 100 : 0,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    }

    return this.insights()
      .filter((insight) => !!insight.progress)
      .map((insight) => ({
        label: `${this.resolveCompanyName(insight.asignacion.empresa_id)} Â- Asig. #${insight.asignacion.id}`,
        value: this.progressPercent(insight.progress),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }

  private aggregateProgressForEmployees(
    asignacion: Asignacion,
    employees: Empleado[]
  ) {
    const requests = employees.map((emp) =>
      this.surveySvc.getProgress(asignacion.id, emp.id).pipe(catchError(() => of(null)))
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
    const totalRespondidas = progresses.reduce((acc, p) => acc + Math.max(0, p.respondidas ?? 0), 0);
    const totalPreguntas = progresses.reduce((acc, p) => acc + Math.max(0, p.total ?? 0), 0);

    let scoreSum = 0;
    let scoreWeight = 0;
    const pillarMap = new Map<
      number,
      { scoreSum: number; scoreCount: number; respondidas: number; total: number; nombre: string }
    >();

    progresses.forEach((progress) => {
      const responded = Math.max(0, progress.respondidas ?? 0);
      const total = Math.max(0, progress.total ?? 0);
      const weight = responded || total;
      if (weight) {
        scoreSum += (progress.progreso ?? 0) * weight;
        scoreWeight += weight;
      }

      progress.por_pilar.forEach((pillar) => {
        const current =
          pillarMap.get(pillar.pilar_id) ?? {
            scoreSum: 0,
            scoreCount: 0,
            respondidas: 0,
            total: 0,
            nombre: pillar.pilar_nombre,
          };
        const answered = Math.max(0, pillar.respondidas ?? 0);
        const totalPilar = Math.max(0, pillar.total ?? 0);
        if (answered > 0) {
          current.scoreSum += (pillar.progreso ?? 0) * answered;
          current.scoreCount += answered;
        }
        current.respondidas += answered;
        current.total += totalPilar;
        pillarMap.set(pillar.pilar_id, current);
      });
    });

    const por_pilar: PillarProgress[] = Array.from(pillarMap.entries()).map(
      ([id, data]) => ({
        pilar_id: id,
        pilar_nombre: data.nombre,
        respondidas: data.respondidas,
        total: data.total,
        progreso: data.scoreCount ? data.scoreSum / data.scoreCount : 0,
        completion: data.total ? data.respondidas / data.total : 0,
      })
    );

    const progreso = scoreWeight ? scoreSum / scoreWeight : 0;
    const completion = totalPreguntas ? totalRespondidas / totalPreguntas : 0;

    return {
      total: totalPreguntas,
      respondidas: totalRespondidas,
      progreso,
      completion,
      por_pilar,
    };
  }

  private collectPillarAggregates(activePillars?: number[] | null) {
    const selected = activePillars ?? this.activePillarIds();
    const aggregates = new Map<number, PillarAggregate>();

    this.insights().forEach((insight) => {
      insight.progress?.por_pilar?.forEach((pillar) => {
        if (selected && !selected.includes(pillar.pilar_id)) return;
        const current =
          aggregates.get(pillar.pilar_id) ??
          {
            id: pillar.pilar_id,
            name: pillar.pilar_nombre,
            values: [],
            responded: 0,
            total: 0,
            scoreSum: 0,
            scoreCount: 0,
          };
        const answered = Math.max(0, pillar.respondidas ?? 0);
        const total = Math.max(0, pillar.total ?? 0);
        const percent = this.progressPercent(pillar);
        current.values.push(percent);
        current.responded += answered;
        current.total += total;
        if (answered > 0) {
          current.scoreSum += (pillar.progreso ?? 0) * answered;
          current.scoreCount += answered;
        }
        aggregates.set(pillar.pilar_id, current);
      });
    });

    return aggregates;
  }

  private collectDepartmentAggregates(activePillars?: number[] | null) {
    const selected = activePillars ?? this.activePillarIds();
    const map = new Map<
      number,
      {
        id: number;
        name: string;
        responded: number;
        total: number;
        pillarScores: Map<
          number,
          { name: string; scoreSum: number; scoreCount: number; responded: number; total: number }
        >;
      }
    >();

    this.insights().forEach((insight) => {
      const asignacion = insight.asignacion;
      if (asignacion.alcance_tipo !== "DEPARTAMENTO" || asignacion.alcance_id == null) return;

      const deptId = asignacion.alcance_id;
      const current =
        map.get(deptId) ??
        {
          id: deptId,
          name: this.resolveDepartmentName(deptId, asignacion.empresa_id),
          responded: 0,
          total: 0,
          pillarScores: new Map<
            number,
            { name: string; scoreSum: number; scoreCount: number; responded: number; total: number }
          >(),
        };

      const progress = insight.progress;
      if (progress) {
        current.responded += Math.max(0, progress.respondidas ?? 0);
        current.total += Math.max(0, progress.total ?? 0);

        progress.por_pilar.forEach((pillar) => {
          if (selected && !selected.includes(pillar.pilar_id)) return;
          const stats =
            current.pillarScores.get(pillar.pilar_id) ?? {
              name: pillar.pilar_nombre,
              scoreSum: 0,
              scoreCount: 0,
              responded: 0,
              total: 0,
            };
          const answered = Math.max(0, pillar.respondidas ?? 0);
          const total = Math.max(0, pillar.total ?? 0);
          if (answered > 0) {
            stats.scoreSum += (pillar.progreso ?? 0) * answered;
            stats.scoreCount += answered;
          }
          stats.responded += answered;
          stats.total += total;
          current.pillarScores.set(pillar.pilar_id, stats);
        });
      }

      map.set(deptId, current);
    });

    return Array.from(map.values());
  }

  private collectEmployeeAggregates(activePillars?: number[] | null) {
    const selected = activePillars ?? this.activePillarIds();
    const map = new Map<
      number,
      { id: number; name: string; scoreSum: number; scoreCount: number }
    >();

    this.insights().forEach((insight) => {
      const asignacion = insight.asignacion;
      if (asignacion.alcance_tipo !== "EMPLEADO" || asignacion.alcance_id == null) return;
      const employeeId = asignacion.alcance_id;
      const current =
        map.get(employeeId) ??
        {
          id: employeeId,
          name: this.resolveEmployeeName(employeeId),
          scoreSum: 0,
          scoreCount: 0,
        };

      const progress = insight.progress;
      if (progress) {
        if (selected && selected.length) {
          progress.por_pilar.forEach((pillar) => {
            if (!selected.includes(pillar.pilar_id)) return;
            const answered = Math.max(0, pillar.respondidas ?? 0);
            if (answered > 0) {
              current.scoreSum += (pillar.progreso ?? 0) * answered;
              current.scoreCount += answered;
            }
          });
        } else {
          const answered = Math.max(0, progress.respondidas ?? 0);
          if (answered > 0) {
            current.scoreSum += (progress.progreso ?? 0) * answered;
            current.scoreCount += answered;
          }
        }
      }
      map.set(employeeId, current);
    });

    return Array.from(map.values());
  }

  ///////////////////////////
  // Utilities
  ///////////////////////////

  private activePillarIds(): number[] | null {
    const selection = this.pillarSelectionSignal();
    if (selection === "ALL") return null;
    return [selection];
  }

  private progressPercent(progress: AssignmentProgress | PillarProgress | null | undefined): number {
    if (!progress) return 0;
    const raw = Number(progress.progreso ?? 0) * 100;
    return this.clampPercent(Math.round(raw));
  }

  private completionPercent(progress: AssignmentProgress | null | undefined): number {
    if (!progress) return 0;
    if (typeof progress.completion === "number") {
      return this.clampPercent(Math.round(progress.completion * 100));
    }
    const total = Math.max(0, progress.total ?? 0);
    if (!total) return 0;
    const responded = Math.max(0, progress.respondidas ?? 0);
    return this.clampPercent(Math.round((responded / total) * 100));
  }

  private emptyChartOption(text: string, type: "cartesian" | "radar" = "cartesian"): EChartsOption {
    if (type === "radar") {
      return {
        title: {
          text,
          left: "center",
          top: "middle",
          textStyle: { color: "#9CA3AF", fontWeight: 500 },
        },
        radar: { indicator: [] },
        series: [],
      };
    }
    return {
      title: {
        text,
        left: "center",
        top: "middle",
        textStyle: { color: "#9CA3AF", fontWeight: 500 },
      },
      xAxis: { show: false },
      yAxis: { show: false },
      series: [],
    };
  }

  private clampPercent(value: number): number {
    if (!Number.isFinite(value)) return 0;
    if (value < 0) return 0;
    if (value > 100) return 100;
    return value;
  }

  private asParamArray(params: FormatterParams): FormatterParam[] {
    if (Array.isArray(params)) return params as FormatterParam[];
    return [params as FormatterParam];
  }

  private resolveCompanyName(id: number | null | undefined): string {
    if (id == null) return "Empresa";
    const companies = this.companiesSignal();
    const company = companies.find((item) => item.id === id);
    return company ? company.nombre : `Empresa #${id}`;
  }

  private resolveDepartmentName(id: number | null | undefined, companyId?: number | null): string {
    if (id == null) return "Departamento general";
    const departments = this.departmentsSignal();
    const found = departments.find((dept) => dept.id === id);
    if (found) return found.nombre;
    const companies = this.companiesSignal();
    if (companyId != null) {
      const company = companies.find((item) => item.id === companyId);
      const match = company?.departamentos?.find((dept) => dept.id === id);
      if (match) return match.nombre;
    }
    for (const company of companies) {
      const match = company.departamentos?.find((dept) => dept.id === id);
      if (match) return match.nombre;
    }
    return `Departamento #${id}`;
  }

  private resolveEmployeeName(id: number | null | undefined): string {
    if (id == null) return "Empleado sin asignar";
    const employees = this.employeesSignal();
    const employee = employees.find((item) => item.id === id);
    return employee ? employee.nombre : `Empleado #${id}`;
  }

  private parseDate(value: string | Date | null | undefined): Date {
    if (!value) return new Date(NaN);
    if (value instanceof Date) return value;
    let normalized = value.trim();
    if (!normalized.includes("T")) normalized = normalized.replace(" ", "T");
    if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized)) normalized = `${normalized}Z`;
    return new Date(normalized);
  }

  private formatDateLabel(date: Date, assignmentId: number): string {
    if (Number.isNaN(date.getTime())) return `Asignacion #${assignmentId}`;
    const year = date.getUTCFullYear();
    const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
    const day = `${date.getUTCDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}




