import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { NgxEchartsDirective, NgxEchartsModule } from "ngx-echarts";
import { EChartsOption } from "echarts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Subject, Subscription, firstValueFrom } from "rxjs";
import { debounceTime, distinctUntilChanged } from "rxjs/operators";

import { AnalyticsService, AnalyticsQueryParams } from "../../analytics.service";
import { CompanyService } from "../../company.service";
import { EmployeeService } from "../../employee.service";
import { AuthService } from "../../auth.service";
import { AuditService } from "../../services/audit.service";
import {
  DashboardAnalyticsResponse,
  Departamento,
  Empleado,
  EmployeePoint,
  Empresa,
  LikertLevel,
  Usuario,
} from "../../types";
import { environment } from "../../../environments/environment";
import { tsMonoTheme } from "../../theme/theme-echarts";
import {
  LikertBucketEmployee,
  LikertBucketsComponent,
  LikertBucketsFilter,
} from "./likert-buckets/likert-buckets.component";

const TS_MONO_THEME = "tsMono";
let echartsReady = false;
const ensureEchartsTheme = async (): Promise<void> => {
  if (echartsReady) return;
  const echartsModule = await import("echarts");
  const echartsWithTheme = echartsModule as unknown as {
    registerTheme: (name: string, theme: unknown) => void;
    getTheme?: (name: string) => unknown;
  };
  if (!echartsWithTheme.getTheme?.(TS_MONO_THEME)) {
    try {
      echartsWithTheme.registerTheme(TS_MONO_THEME, tsMonoTheme);
    } catch {
      // ignore if already registered
    }
  }
  echartsReady = true;
};
void ensureEchartsTheme();

const TS_COLORS = {
  primary: "#3B82F6",
  positive: "#22C55E",
  warning: "#EAB308",
  danger: "#EF4444",
  text: "#1E293B",
  background: "#F8FAFC",
  gridLine: "rgba(148,163,184,0.3)",
};
const AREA_FILL = "rgba(59,130,246,0.15)";

interface KpiCard {
  label: string;
  value: string;
  suffix?: string;
  tooltip?: string;
}

@Component({
  standalone: true,
  selector: "app-dashboard-analytics",
  imports: [CommonModule, FormsModule, NgxEchartsModule, LikertBucketsComponent],
  templateUrl: "./dashboard-analytics.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardAnalyticsComponent implements OnInit, OnDestroy, AfterViewInit {
  private http = inject(HttpClient);
  private analyticsSvc = inject(AnalyticsService);
  private companySvc = inject(CompanyService);
  private employeeSvc = inject(EmployeeService);
  private auth = inject(AuthService);
  private auditSvc = inject(AuditService);
  private zone = inject(NgZone);

  @ViewChildren(NgxEchartsDirective) charts!: QueryList<NgxEchartsDirective>;

  private readonly role = this.auth.getRole();
  private readonly empresaId = this.auth.getEmpresaId();
  readonly isUser = this.role === "USUARIO";

  private analyticsSignal = signal<DashboardAnalyticsResponse | null>(null);
  private companiesSignal = signal<Empresa[]>([]);
  private departmentsSignal = signal<Departamento[]>([]);
  private employeesSignal = signal<Empleado[]>([]);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string>("");
  private infoSignal = signal<string>("");
  private exportingSignal = signal<boolean>(false);
  private exportingCsvSignal = signal<boolean>(false);
  private filterSignal = signal<AnalyticsQueryParams | null>(null);
  private likertLevelsSignal = signal<LikertLevel[]>([]);
  private filterUpdates$ = new Subject<AnalyticsQueryParams>();
  private analyticsCache = new Map<string, DashboardAnalyticsResponse>();

  analytics = this.analyticsSignal.asReadonly();
  companies = this.companiesSignal.asReadonly();
  departments = this.departmentsSignal.asReadonly();
  employees = this.employeesSignal.asReadonly();
  loading = this.loadingSignal.asReadonly();
  error = this.errorSignal.asReadonly();
  info = this.infoSignal.asReadonly();
  exporting = this.exportingSignal.asReadonly();
  exportingCsv = this.exportingCsvSignal.asReadonly();

  selectedCompanyId: number | null = null;
  selectedDepartmentId: number | null = null;
  selectedEmployeeId: number | null = null;
  selectedPillar: number | "ALL" = "ALL";
  dateFrom: string | null = null;
  dateTo: string | null = null;
  employeeSearch = "";
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private resizeScheduled = false;
  private rafId: number | null = null;
  private subscriptions: Subscription[] = [];
  private logoDataUrl: string | null = null;
  private currentUserName: string | null = null;
  private currentUserEmail: string | null = null;
  private userLoaded = false;
  readonly chartInitOpts = { renderer: "canvas" as const };

  readonly filteredEmployees = computed(() => {
    const search = this.employeeSearch.trim().toLowerCase();
    if (!search) return this.employees();
    return this.employees().filter((employee) => {
      const name = employee.nombre?.toLowerCase() ?? "";
      const lastName = employee.apellidos?.toLowerCase() ?? "";
      const email = employee.email?.toLowerCase() ?? "";
      const id = String(employee.id ?? "").toLowerCase();
      const rut = employee.rut?.toLowerCase() ?? "";
      return (
        name.includes(search) ||
        lastName.includes(search) ||
        email.includes(search) ||
        id.includes(search) ||
        rut.includes(search)
      );
    });
  });

  readonly likertBucketEmployees = computed<LikertBucketEmployee[]>(() => {
    const analyticsEmployees: EmployeePoint[] = this.analytics()?.employees ?? [];
    if (!analyticsEmployees.length) return [];
    const employeesMap = new Map(this.employees().map((employee) => [employee.id, employee]));
    return analyticsEmployees.map((point) => {
      const metadata = employeesMap.get(point.id);
      if (metadata) {
        return {
          id: point.id,
          level: point.level,
          nombre: metadata.nombre,
          apellidos: metadata.apellidos ?? null,
          rut: metadata.rut ?? null,
        };
      }
      const fallback = (point.name ?? "").trim();
      if (!fallback) {
        return {
          id: point.id,
          level: point.level,
          nombre: `Empleado ${point.id}`,
          apellidos: null,
          rut: null,
        };
      }
      const segments = fallback.split(/\s+/);
      const nombre = segments.shift() ?? fallback;
      const apellidos = segments.length ? segments.join(" ") : null;
      return {
        id: point.id,
        level: point.level,
        nombre,
        apellidos,
        rut: null,
      };
    });
  });

  readonly likertBucketsFilter = computed<LikertBucketsFilter>(() => {
    const filter = this.filterSignal();
    if (!filter?.companyId) {
      return { scope: "global" };
    }
    if (filter.employeeIds?.length) {
      return { scope: "employee" };
    }
    if (filter.departmentIds?.length) {
      return { scope: "department" };
    }
    return { scope: "company" };
  });

  readonly shouldShowFilterSummary = computed(() => this.likertBucketsFilter().scope === "employee");

  readonly kpiCards = computed<KpiCard[]>(() => {
    const data = this.analytics();
    const kpis = data?.kpis;
    if (!kpis) return [];
    const coverageAreas = (data?.coverage_by_department ?? []).filter((item) => item.total > 0);
    const lowestCoverage = coverageAreas.length
      ? [...coverageAreas].sort((a, b) => a.coverage_percent - b.coverage_percent)[0]
      : null;
    return [
      {
        label: "Promedio global",
        value: `${this.formatNumber(kpis.global_average)}%`,
      },
      kpis.strongest_pillar
        ? {
            label: "Pilar mas fuerte",
            value: `${kpis.strongest_pillar.name}`,
            suffix: `${this.formatNumber(kpis.strongest_pillar.value)}%`,
          }
        : ({ label: "Pilar mas fuerte", value: "--" } as KpiCard),
      kpis.weakest_pillar
        ? {
            label: "Pilar a reforzar",
            value: `${kpis.weakest_pillar.name}`,
            suffix: `${this.formatNumber(kpis.weakest_pillar.value)}%`,
          }
        : ({ label: "Pilar a reforzar", value: "--" } as KpiCard),
      {
        label: "Brecha entre pilares",
        value: `${this.formatNumber(kpis.pillar_gap)} pp`,
      },
      {
        label: "Cobertura",
        value: kpis.coverage_percent != null ? `${this.formatNumber(kpis.coverage_percent)}%` : "--",
        suffix: `(${kpis.coverage_respondents}/${kpis.coverage_total})`,
      },
      lowestCoverage
        ? {
            label: "Cobertura mas baja",
            value: lowestCoverage.department_name,
            suffix: `${this.formatNumber(lowestCoverage.coverage_percent)}%`,
            tooltip: `Respuestas: ${lowestCoverage.respondents}/${lowestCoverage.total}`,
          }
        : ({ label: "Cobertura mas baja", value: "--" } as KpiCard),
    ];
  });

  readonly rankingTop = computed(() => this.analytics()?.ranking.top ?? []);
  readonly rankingBottom = computed(() => this.analytics()?.ranking.bottom ?? []);
  readonly hasEmployeesDistribution = computed(() => (this.analytics()?.employees.length ?? 0) > 0);

  private readonly filterEffect = effect(() => {
    const filter = this.filterSignal();
    if (!filter) return;
    this.filterUpdates$.next(filter);
  });

  constructor() {
    const filterSub = this.filterUpdates$
      .pipe(
        debounceTime(200),
        distinctUntilChanged((prev, curr) => this.buildCacheKey(prev) === this.buildCacheKey(curr))
      )
      .subscribe((filter) => this.fetchAnalytics(filter));
    this.subscriptions.push(filterSub);
  }

  ngOnInit(): void {
    this.loadCompanies();
    if (this.empresaId != null) {
      this.selectedCompanyId = this.empresaId;
      this.updateFilter();
    }
  }

  ngAfterViewInit(): void {
    this.scheduleResize();
    const chartsChangesSub = this.charts.changes.subscribe(() => this.scheduleResize());
    this.subscriptions.push(chartsChangesSub);
  }

  ngOnDestroy(): void {
    this.filterEffect.destroy();
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.filterUpdates$.complete();
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
    if (this.rafId != null && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.resizeScheduled = false;
    this.zone.runOutsideAngular(() => {
      this.charts?.forEach((chart) => {
        try {
          (chart as any)?.dispose?.();
        } catch {
          // ignore chart dispose errors
        }
      });
    });
  }

  refreshCurrentFilter(): void {
    this.updateFilter();
  }

  onCompanyChange(companyId: number | null): void {
    this.selectedCompanyId = companyId;
    this.selectedDepartmentId = null;
    this.selectedEmployeeId = null;
    this.employeeSearch = "";
    if (companyId != null) {
      this.loadDepartments(companyId);
      this.loadEmployees(companyId, null);
    } else {
      this.departmentsSignal.set([]);
      this.employeesSignal.set([]);
    }
    this.updateFilter();
  }

  onDepartmentChange(departmentId: number | null): void {
    this.selectedDepartmentId = departmentId;
    if (this.selectedCompanyId != null) {
      this.loadEmployees(this.selectedCompanyId, departmentId ?? undefined);
    }
    this.updateFilter();
  }

  onPillarChange(selection: number | "ALL"): void {
    this.selectedPillar = selection;
    this.updateFilter();
  }

  onEmployeeChange(employeeId: number | null): void {
    this.selectedEmployeeId = employeeId;
    this.updateFilter();
  }

  onDateChange(): void {
    this.updateFilter();
  }

  onPillarBarClick(event: any): void {
    const pillarId = event?.data?.pillarId as number | undefined;
    if (pillarId == null) return;
    this.selectedPillar = this.selectedPillar === pillarId ? "ALL" : pillarId;
    this.updateFilter();
  }

  onHeatmapClick(event: any): void {
    const pillarId = event?.data?.pillarId as number | undefined;
    const departmentId = event?.data?.departmentId as number | undefined;
    if (pillarId == null && departmentId == null) return;
    if (pillarId != null) {
      this.selectedPillar = pillarId;
    }
    if (departmentId != null) {
      this.selectedDepartmentId = departmentId;
    }
    this.updateFilter();
  }

  onLikertEmployeeClick(employeeId: number): void {
    if (employeeId == null) return;
    this.onEmployeeChange(employeeId);
  }

  filterSummary(): string[] {
    const summary: string[] = [];
    const company = this.resolveCompanyName(this.selectedCompanyId ?? this.empresaId);
    summary.push(`Empresa: ${company}`);
    if (this.selectedDepartmentId != null) {
      summary.push(`Departamento: ${this.resolveDepartmentName(this.selectedDepartmentId)}`);
    }
    if (this.selectedEmployeeId != null) {
      summary.push(`Empleado: ${this.resolveEmployeeName(this.selectedEmployeeId)}`);
    }
    if (this.selectedPillar !== "ALL") {
      const pillar = this.analytics()?.pillars.find((p) => p.pillar_id === this.selectedPillar)?.pillar_name;
      summary.push(`Pilar: ${pillar ?? `#${this.selectedPillar}`}`);
    }
    if (this.dateFrom) summary.push(`Desde: ${this.dateFrom}`);
    if (this.dateTo) summary.push(`Hasta: ${this.dateTo}`);
    return summary;
  }

  pillarOptions() {
    return this.analytics()?.pillars ?? [];
  }

  barPillarOption(): EChartsOption {
    const pillars = [...(this.analytics()?.pillars ?? [])].sort((a, b) => b.percent - a.percent);
    if (!pillars.length) {
      return this.emptyChartOption("Sin informacion de pilares");
    }
    const categories = pillars.map((item) => item.pillar_name);
    const data = pillars.map((item) => ({ value: this.round(item.percent), pillarId: item.pillar_id }));
    const selected = this.selectedPillar;
    return {
      backgroundColor: TS_COLORS.background,
      animationDuration: 800,
      animationEasing: "cubicOut",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: any) => {
          const first = Array.isArray(params) ? params[0] : params;
          return `${first.name}: ${this.formatNumber(first.value)}%`;
        },
      },
      grid: { left: 0, right: 16, bottom: 32, top: 24, containLabel: true },
      color: [TS_COLORS.primary],
      xAxis: {
        type: "value",
        max: 100,
        axisLabel: { formatter: "{value}%", color: TS_COLORS.text },
        splitLine: { lineStyle: { color: TS_COLORS.gridLine } },
        axisLine: { lineStyle: { color: TS_COLORS.gridLine } },
      },
      yAxis: {
        type: "category",
        data: categories,
        axisLabel: { fontWeight: 600, color: TS_COLORS.text },
        axisLine: { lineStyle: { color: TS_COLORS.gridLine } },
      },
      series: [
        {
          type: "bar",
          data: data.map((item) => ({
            value: item.value,
            pillarId: item.pillarId,
            itemStyle: {
              color:
                selected !== "ALL" && item.pillarId === selected
                  ? TS_COLORS.primary
                  : "rgba(148,163,184,0.8)",
            },
          })),
          barWidth: 24,
          label: {
            show: true,
            position: "right",
            formatter: "{c}%",
            fontWeight: 600,
            color: TS_COLORS.text,
          },
        },
      ],
    };
  }

  radarBalanceOption(): EChartsOption {
    const pillars = this.analytics()?.pillars ?? [];
    if (!pillars.length) return this.emptyChartOption("Sin balance registrado", "radar");
    const formatLabel = (label?: string) => {
      const value = label ?? "";
      return value.length > 22 ? `${value.slice(0, 22)}…` : value;
    };
    return {
      backgroundColor: TS_COLORS.background,
      animationDuration: 900,
      animationEasing: "cubicOut",
      tooltip: {
        trigger: "item",
        textStyle: { color: "#FFFFFF", fontWeight: 500 },
        formatter: (params: any) => {
          const values = Array.isArray(params.value) ? params.value : [];
          return values
            .map((value: number, idx: number) => `${pillars[idx].pillar_name}: ${this.formatNumber(value)}%`)
            .join("<br/>");
        },
      },
      legend: {
        data: ["Promedio"],
        top: 0,
        left: "center",
        icon: "circle",
        textStyle: { color: TS_COLORS.text, fontWeight: 600 },
        formatter: formatLabel,
      },
      radar: {
        indicator: pillars.map((pillar) => ({ name: pillar.pillar_name, max: 100 })),
        radius: "70%",
        splitNumber: 4,
        splitLine: { lineStyle: { color: TS_COLORS.gridLine } },
        splitArea: { areaStyle: { color: [AREA_FILL, "rgba(59,130,246,0.05)"] } },
        axisName: {
          color: TS_COLORS.text,
          fontWeight: 600,
          fontSize: 12,
          backgroundColor: "rgba(255,255,255,0.9)",
          borderRadius: 6,
          padding: [3, 6],
          formatter: formatLabel,
        },
      },
      series: [
        {
          type: "radar",
          data: [
            {
              value: pillars.map((pillar) => this.round(pillar.percent)),
              name: "Promedio",
              areaStyle: { color: AREA_FILL },
              lineStyle: { color: TS_COLORS.primary, width: 2 },
              itemStyle: { color: TS_COLORS.primary },
            },
          ],
        },
      ],
    };
  }

  heatmapOption(): EChartsOption {
    const analytics = this.analytics();
    const rows = analytics?.heatmap ?? [];
    const pillars = analytics?.pillars ?? [];
    if (!rows.length || !pillars.length) return this.emptyChartOption("Sin combinaciones disponibles");
    const departments = [...rows].sort((a, b) => b.average - a.average);
    const pillarIndex = new Map(pillars.map((p, idx) => [p.pillar_id, idx] as const));
    const data = departments.flatMap((dept, yIdx) =>
      dept.values
        .map((cell) => {
          const xIdx = pillarIndex.get(cell.pillar_id);
          if (xIdx == null) return null;
          return {
            value: [xIdx, yIdx, this.round(cell.percent)],
            pillarId: cell.pillar_id,
            departmentId: dept.department_id ?? null,
          };
        })
        .filter((item): item is { value: [number, number, number]; pillarId: number; departmentId: number | null } => !!item)
    );
    return {
      backgroundColor: TS_COLORS.background,
      animationDuration: 800,
      animationEasing: "cubicOut",
      tooltip: {
        formatter: (params: any) => {
          const value = params.data?.value as [number, number, number];
          if (!value) return "";
          const dept = departments[value[1]];
          const pillar = pillars[value[0]];
          return `${dept?.department_name ?? "Departamento"} · ${pillar?.pillar_name ?? "Pilar"}: ${this.formatNumber(
            value[2]
          )}%`;
        },
      },
      grid: { left: 0, right: 16, top: 48, bottom: 80, containLabel: true },
      xAxis: {
        type: "category",
        data: pillars.map((p) => p.pillar_name),
        axisLabel: { interval: 0, rotate: 20, fontWeight: 600, color: TS_COLORS.text },
        axisLine: { lineStyle: { color: TS_COLORS.gridLine } },
      },
      yAxis: {
        type: "category",
        data: departments.map((d) => d.department_name),
        axisLabel: { fontWeight: 600, color: TS_COLORS.text },
        axisLine: { lineStyle: { color: TS_COLORS.gridLine } },
      },
      visualMap: {
        min: 0,
        max: 100,
        orient: "horizontal",
        left: "center",
        bottom: 10,
        textStyle: { color: TS_COLORS.text },
        inRange: { color: ["#E0F2FE", TS_COLORS.primary] },
      },
      series: [
        {
          type: "heatmap",
          data,
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.2)" } },
        },
      ],
    };
  }

  distributionOption(): EChartsOption {
    const distributions = [...(this.analytics()?.distribution.global ?? [])].sort(
      (a, b) => b.pct_ge4 - a.pct_ge4
    );
    if (!distributions.length) return this.emptyChartOption("Sin datos de distribucion");
    const categories = distributions.map((item) => item.pillar_name);
    const levelColors = [
      TS_COLORS.danger,
      TS_COLORS.warning,
      "#FACC15",
      TS_COLORS.positive,
      TS_COLORS.primary,
    ];
    const series = [1, 2, 3, 4, 5].map((level, idx) => {
      const levelIndex = level - 1;
      return {
        name: this.formatLikertLabel(level),
        type: "bar" as const,
        stack: "total",
        emphasis: { focus: "series" },
        barWidth: 32,
        itemStyle: { color: levelColors[idx] ?? "#94a3b8" },
        data: distributions.map((item) => {
          const value = this.round(item.levels[levelIndex]);
          return level >= 5
            ? { value, pctGe4: item.pct_ge4 }
            : { value };
        }),
      };
    });
    const topSeries = series[4];
    (topSeries as any).label = {
      show: true,
      position: "top",
      fontWeight: 600,
      formatter: (params: any) =>
        `${this.formatNumber(params?.data?.pctGe4 ?? params?.data?.value ?? 0)}% =4`,
    };
    return {
      backgroundColor: TS_COLORS.background,
      animationDuration: 900,
      animationEasing: "cubicOut",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: any) => {
          const lines = params.map(
            (item: any) => `${item.seriesName}: ${this.formatNumber(item.value)}%`
          );
          const label = params?.[0]?.name ?? "";
          return `${label}<br/>${lines.join("<br/>")}`;
        },
      },
      legend: {
        data: series.map((s) => s.name),
        top: 0,
        type: "scroll",
        left: 16,
        right: 16,
        orient: "horizontal",
        textStyle: { color: TS_COLORS.text },
      },
      grid: { left: 0, right: 16, bottom: 32, top: 80, containLabel: true },
      xAxis: {
        type: "category",
        data: categories,
        axisLabel: { interval: 0, rotate: 20, color: TS_COLORS.text },
        axisLine: { lineStyle: { color: TS_COLORS.gridLine } },
      },
      yAxis: {
        type: "value",
        max: 100,
        axisLabel: { formatter: "{value}%", color: TS_COLORS.text },
        splitLine: { lineStyle: { color: TS_COLORS.gridLine } },
      },
      series: series as unknown as EChartsOption["series"],
    };
  }

  coverageByDepartmentOption(): EChartsOption {
    const coverage = [...(this.analytics()?.coverage_by_department ?? [])].filter((item) => item.total > 0);
    if (!coverage.length) return this.emptyChartOption("Sin datos de cobertura");
    const topCoverage = coverage.sort((a, b) => b.coverage_percent - a.coverage_percent).slice(0, 15);
    const categories = topCoverage.map((item) => item.department_name);
    return {
      backgroundColor: TS_COLORS.background,
      animationDuration: 800,
      animationEasing: "cubicOut",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (raw: any) => {
          const params = Array.isArray(raw) ? raw[0] : raw;
          const dataIndex = params?.dataIndex ?? 0;
          const entry = topCoverage[dataIndex];
          if (!entry) return "";
          return `${entry.department_name}<br/>${this.formatNumber(entry.coverage_percent)}% (${entry.respondents}/${entry.total})`;
        },
      },
      grid: { left: 0, right: 24, bottom: 48, top: 56, containLabel: true },
      xAxis: {
        type: "category",
        data: categories,
        axisLabel: { interval: 0, rotate: 22, color: TS_COLORS.text, fontWeight: 500 },
        axisLine: { lineStyle: { color: TS_COLORS.gridLine } },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        axisLabel: { formatter: "{value}%", color: TS_COLORS.text },
        splitLine: { lineStyle: { color: TS_COLORS.gridLine } },
      },
      series: [
        {
          type: "bar",
          barWidth: 28,
          itemStyle: { color: TS_COLORS.primary, borderRadius: [6, 6, 0, 0] },
          data: topCoverage.map((item) => ({
            value: this.round(item.coverage_percent),
            respondents: item.respondents,
            total: item.total,
          })),
          label: {
            show: true,
            position: "top",
            formatter: (params: any) => `${this.formatNumber(params?.value ?? 0)}%`,
            color: TS_COLORS.text,
            fontWeight: 600,
          },
        },
      ],
    };
  }

  employeeScatterOption(): EChartsOption {
    const employees = this.analytics()?.employees ?? [];
    if (!employees.length) return this.emptyChartOption("Sin datos de empleados");
    const identityEntries = this.likertBucketEmployees();
    const identityMap = new Map(identityEntries.map((entry) => [entry.id, entry] as const));
    const categories = employees.map((emp) => {
      const identity = identityMap.get(emp.id) ?? { nombre: emp.name ?? `Empleado ${emp.id}` };
      return this.formatEmployeeIdentity(identity, emp.name);
    });
    const focusId = this.selectedEmployeeId;
    const focusIndex = focusId != null ? employees.findIndex((emp) => emp.id === focusId) : -1;
    const focusPoint = focusIndex >= 0 ? employees[focusIndex] : null;
    const baseData = employees.map((emp, index) => [index, this.round(emp.percent), index]);
    const buildTooltip = (emp: EmployeePoint | null) => {
      if (!emp) return "";
      const identity = identityMap.get(emp.id) ?? { nombre: emp.name ?? `Empleado ${emp.id}` };
      const label = this.formatLikertLabel(emp.level);
      return `${this.formatEmployeeIdentity(identity, emp.name)}<br/>${this.formatNumber(emp.percent)}% · ${label}`;
    };
    const dimmedData = focusPoint ? baseData.filter((item) => item[2] !== focusIndex) : baseData;
    return {
      backgroundColor: TS_COLORS.background,
      animationDuration: 800,
      animationEasing: "cubicOut",
      tooltip: {
        show: !focusPoint,
        formatter: (params: any) => {
          const data: number[] | undefined = params?.data;
          const idx = Array.isArray(data) ? data[2] : undefined;
          return buildTooltip(idx != null ? employees[idx] : null);
        },
      },
      xAxis: {
        type: "category",
        data: categories,
        show: false,
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        axisLabel: { formatter: "{value}%", color: TS_COLORS.text },
        splitLine: { lineStyle: { color: TS_COLORS.gridLine } },
        axisLine: { lineStyle: { color: TS_COLORS.gridLine } },
      },
      series: [
        {
          type: "scatter",
          name: "Equipo",
          symbolSize: focusPoint ? 10 : 14,
          data: dimmedData,
          itemStyle: {
            color: focusPoint ? "rgba(148,163,184,0.45)" : TS_COLORS.primary,
          },
          emphasis: { focus: focusPoint ? "none" : "series" },
          silent: !!focusPoint,
        },
        ...(focusPoint
          ? [
              {
                type: "scatter" as const,
                name: "Empleado seleccionado",
                symbolSize: 28,
                data: [[focusIndex, this.round(focusPoint.percent), focusIndex]],
                itemStyle: { color: TS_COLORS.primary },
                tooltip: {
                  formatter: () => buildTooltip(focusPoint),
                },
                label: {
                  show: true,
                  position: "top" as const,
                  formatter: () => `${this.formatNumber(focusPoint.percent)}%`,
                  color: TS_COLORS.text,
                  fontWeight: 600,
                },
                markLine: {
                  symbol: "none",
                  silent: true,
                  lineStyle: { color: TS_COLORS.gridLine, type: "dashed" as const },
                  data: [{ yAxis: this.round(focusPoint.percent) }],
                  label: {
                    formatter: () => `${this.formatNumber(focusPoint.percent)}%`,
                    color: TS_COLORS.text,
                    backgroundColor: "rgba(255,255,255,0.9)",
                    padding: [2, 6],
                    borderRadius: 4,
                  },
                },
              },
            ]
          : []),
      ],
    };
  }
  exportPdfUrlDisabled(): boolean {
    return this.loading() || this.exporting() || !this.analytics();
  }

  exportCsv(): void {
    if (this.exportingCsv()) return;
    const filter = this.filterSignal();
    if (!filter?.companyId) {
      this.errorSignal.set("Selecciona una empresa para exportar.");
      return;
    }
    this.exportingCsvSignal.set(true);
    this.analyticsSvc.exportResponsesCsv(filter).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `tacticsphere-respuestas-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error("Export CSV failed", err);
        this.errorSignal.set(err?.error?.detail ?? "No pudimos exportar el CSV. Intenta nuevamente.");
      },
      complete: () => {
        this.exportingCsvSignal.set(false);
      },
    });
  }

  async exportPdf(): Promise<void> {
    if (this.exporting()) return;
    const container = document.getElementById("analytics-export");
    if (!container) {
      this.errorSignal.set("No pudimos encontrar el contenido para exportar.");
      return;
    }
    try {
      this.errorSignal.set("");
      this.exportingSignal.set(true);
      this.resizeAllCharts();
      await new Promise((resolve) => setTimeout(resolve, 60));
      await this.ensureLogo();
      await this.ensureCurrentUser();
      const canvas = await html2canvas(container, { scale: 2, backgroundColor: "#FFFFFF" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const title = "TacticSphere - Informe analitico";
      if (this.logoDataUrl) {
        pdf.addImage(this.logoDataUrl, "PNG", 15, 12, 20, 20);
        pdf.setFontSize(16);
        pdf.text(title, 40, 24);
      } else {
        pdf.setFontSize(16);
        pdf.text(title, 15, 24);
      }
      const generatedAt = new Date();
      const metadataLines = this.buildMetadataLines(generatedAt);
      let metaY = this.logoDataUrl ? 36 : 30;
      pdf.setFontSize(11);
      metadataLines.forEach((line) => {
        pdf.text(line, 15, metaY);
        metaY += 5;
      });
      const contentTop = metaY + 4;
      const imgWidth = pageWidth - 30;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const maxHeight = pageHeight - contentTop - 15;
      let drawWidth = imgWidth;
      let drawHeight = imgHeight;
      if (maxHeight > 0 && drawHeight > maxHeight) {
        const scale = maxHeight / drawHeight;
        drawHeight *= scale;
        drawWidth *= scale;
      }
      pdf.addImage(imgData, "PNG", 15, contentTop, drawWidth, drawHeight);
      pdf.save("tacticsphere-analytics.pdf");
      try {
        await firstValueFrom(this.auditSvc.logReportExport("dashboard-analytics"));
      } catch {
        // ignore log errors
      }
    } catch (error) {
      console.error(error);
      this.errorSignal.set("No pudimos exportar el PDF. Intenta nuevamente.");
    } finally {
      this.exportingSignal.set(false);
    }
  }

  trackById(_: number, item: any) {
    return item?.id ?? item;
  }

  trackByIndex(index: number) {
    return index;
  }

  // ----------------------------------------
  // Private helpers
  // ----------------------------------------

  private fetchAnalytics(filter: AnalyticsQueryParams): void {
    if (!filter.companyId) {
      this.analyticsSignal.set(null);
      this.infoSignal.set("Selecciona una empresa para ver resultados");
      this.loadingSignal.set(false);
      this.scheduleResize();
      return;
    }
    const cacheKey = this.buildCacheKey(filter);
    if (this.analyticsCache.has(cacheKey)) {
      const cached = this.analyticsCache.get(cacheKey)!;
      this.analyticsSignal.set(cached);
      this.likertLevelsSignal.set(cached.likert_levels ?? []);
      this.loadingSignal.set(false);
       this.scheduleResize();
      return;
    }
    this.loadingSignal.set(true);
    this.errorSignal.set("");
    this.infoSignal.set("");
    const sub = this.analyticsSvc
      .getDashboardAnalytics(filter)
      .subscribe({
        next: (response) => {
          this.analyticsCache.set(cacheKey, response);
          this.analyticsSignal.set(response);
          this.likertLevelsSignal.set(response.likert_levels ?? []);
          this.loadingSignal.set(false);
          this.scheduleResize();
        },
        error: (err) => {
          console.error("Error loading analytics", err);
          this.analyticsSignal.set(null);
          this.loadingSignal.set(false);
          this.errorSignal.set(err?.error?.detail ?? "No pudimos cargar los resultados.");
          this.scheduleResize();
        },
      });
    this.subscriptions.push(sub);
  }

  private loadCompanies(): void {
    const sub = this.companySvc.list().subscribe({
      next: (rows) => {
        let companies = rows ?? [];
        if (this.isUser && this.empresaId != null) {
          companies = companies.filter((company) => company.id === this.empresaId);
          this.selectedCompanyId = this.empresaId;
          if (companies.length) {
            this.loadDepartments(this.empresaId);
            this.loadEmployees(this.empresaId, null);
          }
        }
        this.companiesSignal.set(companies);
        this.updateFilter();
      },
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

  private updateFilter(): void {
    const companyId = this.selectedCompanyId ?? this.empresaId ?? null;
    if (companyId == null) {
      this.infoSignal.set("Selecciona una empresa para ver resultados.");
      this.analyticsSignal.set(null);
      return;
    }
    this.infoSignal.set("");
    const filter: AnalyticsQueryParams = {
      companyId,
      dateFrom: this.dateFrom || undefined,
      dateTo: this.dateTo || undefined,
      departmentIds: this.selectedDepartmentId != null ? [this.selectedDepartmentId] : undefined,
      employeeIds: this.selectedEmployeeId != null ? [this.selectedEmployeeId] : undefined,
      pillarIds: this.selectedPillar !== "ALL" ? [this.selectedPillar] : undefined,
      includeTimeline: false,
    };
    this.filterSignal.set(filter);
  }

  private buildCacheKey(filter: AnalyticsQueryParams): string {
    return JSON.stringify({
      companyId: filter.companyId,
      dateFrom: filter.dateFrom ?? null,
      dateTo: filter.dateTo ?? null,
      departmentIds: filter.departmentIds ?? [],
      employeeIds: filter.employeeIds ?? [],
      pillarIds: filter.pillarIds ?? [],
      includeTimeline: filter.includeTimeline ?? true,
    });
  }

  private resolveCompanyName(id: number | null | undefined): string {
    if (id == null) return "Empresa";
    const company = this.companiesSignal().find((item) => item.id === id);
    return company ? company.nombre : `Empresa #${id}`;
  }

  private resolveDepartmentName(id: number | null | undefined): string {
    if (id == null) return "Todos";
    const department = this.departmentsSignal().find((item) => item.id === id);
    return department ? department.nombre : `Departamento #${id}`;
  }

  private resolveEmployeeName(id: number | null | undefined): string {
    if (id == null) return "Todos";
    const employee = this.employeesSignal().find((item) => item.id === id);
    return employee ? employee.nombre : `Empleado #${id}`;
  }

  private ensureLogo(): Promise<void> {
    if (this.logoDataUrl) return Promise.resolve();
    const logoElement = document.querySelector<HTMLImageElement>("header img");
    if (!logoElement?.src) return Promise.resolve();
    return fetch(logoElement.src)
      .then((response) => response.blob())
      .then((blob) =>
        new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(reader.error);
          reader.onload = () => {
            this.logoDataUrl = reader.result as string;
            resolve();
          };
          reader.readAsDataURL(blob);
        })
      )
      .catch(() => undefined);
  }

  private async ensureCurrentUser(): Promise<void> {
    if (this.userLoaded) return;
    try {
      const user = await firstValueFrom(this.http.get<Usuario>(`${environment.apiUrl}/me`));
      this.currentUserName = user?.nombre ?? null;
      this.currentUserEmail = user?.email ?? null;
    } catch {
      this.currentUserName = null;
      this.currentUserEmail = null;
    } finally {
      this.userLoaded = true;
    }
  }

  private buildMetadataLines(generatedAt: Date): string[] {
    const filter = this.filterSignal();
    return [
      `Generado: ${generatedAt.toLocaleString()}`,
      `Usuario: ${this.currentUserName ?? "--"} (${this.currentUserEmail ?? "--"})`,
      `Filtros: ${this.filterSummary().join(" · ")}`,
    ];
  }

  private resizeAllCharts(): void {
    this.zone.runOutsideAngular(() => {
      this.charts?.forEach((chart) => {
        try {
          chart.resize();
        } catch {
          // ignore resize issues
        }
      });
    });
  }

  private scheduleResize(): void {
    if (this.resizeScheduled) return;
    this.resizeScheduled = true;
    this.zone.runOutsideAngular(() => {
      if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
        this.rafId = window.requestAnimationFrame(() => {
          this.rafId = null;
          this.resizeScheduled = false;
          this.resizeAllCharts();
        });
      } else {
        setTimeout(() => {
          this.resizeScheduled = false;
          this.resizeAllCharts();
        }, 16);
      }
    });
  }

  @HostListener("window:resize")
  onWindowResize(): void {
    this.zone.runOutsideAngular(() => {
      if (this.resizeTimer) {
        clearTimeout(this.resizeTimer);
      }
      this.resizeTimer = setTimeout(() => this.scheduleResize(), 150);
    });
  }

  private formatNumber(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return "0";
    return Number(value).toFixed(1).replace(/\.0$/, "");
  }

  formatEmployeeIdentity(
    record: { nombre?: string | null; apellidos?: string | null; rut?: string | null },
    fallbackName?: string | null
  ): string {
    const trimmedFallback = fallbackName?.trim();
    const parts = [record?.nombre, record?.apellidos]
      .map((value) => value?.trim())
      .filter((value): value is string => !!value && value.length > 0);
    const displayName = parts.join(" ").trim() || trimmedFallback || "Empleado sin nombre";
    const rut = record?.rut?.trim();
    return rut ? `${displayName} - ${rut}` : displayName;
  }

  formatPercent(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return "--";
    return `${this.formatNumber(value)}%`;
  }

  private round(value: number | null | undefined): number {
    if (value == null || Number.isNaN(value)) return 0;
    return Math.round(value * 10) / 10;
  }

  private emptyChartOption(text: string, type: "cartesian" | "radar" = "cartesian"): EChartsOption {
    if (type === "radar") {
      return {
        title: { text, left: "center", top: "middle", textStyle: { color: "#9CA3AF", fontWeight: 500 } },
        radar: { indicator: [] },
        series: [],
      };
    }
    return {
      title: { text, left: "center", top: "middle", textStyle: { color: "#9CA3AF", fontWeight: 500 } },
      xAxis: { show: false },
      yAxis: { show: false },
      series: [],
    };
  }

  private formatLikertLabel(level: number): string {
    const levels = this.likertLevelsSignal();
    const match = levels.find((item) => item.valor === level);
    return match ? `${match.valor} - ${match.nombre}` : `Nivel ${level}`;
  }
}
