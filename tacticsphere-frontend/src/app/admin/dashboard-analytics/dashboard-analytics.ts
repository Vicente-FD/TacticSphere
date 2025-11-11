import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  HostListener,
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
import * as echarts from "echarts";
import { EChartsOption } from "echarts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Subscription, firstValueFrom } from "rxjs";

import { AnalyticsService, AnalyticsQueryParams } from "../../analytics.service";
import { CompanyService } from "../../company.service";
import { EmployeeService } from "../../employee.service";
import { AuthService } from "../../auth.service";
import { AuditService } from "../../services/audit.service";
import {
  DashboardAnalyticsResponse,
  Departamento,
  Empleado,
  Empresa,
  LikertLevel,
  Usuario,
} from "../../types";
import { environment } from "../../../environments/environment";
import { tsMonoTheme } from "../../theme/theme-echarts";

const TS_MONO_THEME = "tsMono";
const echartsWithTheme = echarts as unknown as {
  registerTheme: (name: string, theme: unknown) => void;
  getTheme?: (name: string) => unknown;
};

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

if (!echartsWithTheme.getTheme?.(TS_MONO_THEME)) {
  try {
    echartsWithTheme.registerTheme(TS_MONO_THEME, tsMonoTheme);
  } catch {
    // ignore if already registered
  }
}

interface KpiCard {
  label: string;
  value: string;
  suffix?: string;
  tooltip?: string;
}

@Component({
  standalone: true,
  selector: "app-dashboard-analytics",
  imports: [CommonModule, FormsModule, NgxEchartsModule],
  templateUrl: "./dashboard-analytics.html",
})
export class DashboardAnalyticsComponent
  implements OnInit, OnDestroy, AfterViewInit, AfterViewChecked
{
  private http = inject(HttpClient);
  private analyticsSvc = inject(AnalyticsService);
  private companySvc = inject(CompanyService);
  private employeeSvc = inject(EmployeeService);
  private auth = inject(AuthService);
  private auditSvc = inject(AuditService);

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
  showFilters = false;
  private resizeTimer: any;
  private subscriptions: Subscription[] = [];
  private logoDataUrl: string | null = null;
  private currentUserName: string | null = null;
  private currentUserEmail: string | null = null;
  private userLoaded = false;

  readonly filteredEmployees = computed(() => {
    const search = this.employeeSearch.trim().toLowerCase();
    if (!search) return this.employees();
    return this.employees().filter((employee) => {
      const name = employee.nombre?.toLowerCase() ?? "";
      const email = employee.email?.toLowerCase() ?? "";
      const id = String(employee.id ?? "").toLowerCase();
      return name.includes(search) || email.includes(search) || id.includes(search);
    });
  });

  readonly kpiCards = computed<KpiCard[]>(() => {
    const data = this.analytics();
    const kpis = data?.kpis;
    if (!kpis) return [];
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
      {
        label: "Tendencia 30d",
        value: kpis.trend_30d != null ? `${this.formatSigned(kpis.trend_30d)}%` : "--",
      },
    ];
  });

  readonly rankingTop = computed(() => this.analytics()?.ranking.top ?? []);
  readonly rankingBottom = computed(() => this.analytics()?.ranking.bottom ?? []);
  readonly hasEmployeesDistribution = computed(() => (this.analytics()?.employees.length ?? 0) > 0);

  private readonly filterEffect = effect(() => {
    const filter = this.filterSignal();
    if (!filter) return;
    this.fetchAnalytics(filter);
  });

  ngOnInit(): void {
    this.loadCompanies();
    if (this.empresaId != null) {
      this.selectedCompanyId = this.empresaId;
      this.updateFilter();
    }
  }

  ngAfterViewInit(): void {
    this.resizeAllCharts();
  }

  ngAfterViewChecked(): void {
    this.resizeAllCharts();
  }

  ngOnDestroy(): void {
    this.filterEffect.destroy();
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
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
      grid: { left: 180, right: 48, bottom: 32, top: 32, containLabel: true },
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
    return {
      backgroundColor: TS_COLORS.background,
      animationDuration: 900,
      animationEasing: "cubicOut",
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          const values = Array.isArray(params.value) ? params.value : [];
          return values
            .map((value: number, idx: number) => `${pillars[idx].pillar_name}: ${this.formatNumber(value)}%`)
            .join("<br/>");
        },
      },
      radar: {
        indicator: pillars.map((pillar) => ({ name: pillar.pillar_name, max: 100 })),
        radius: "70%",
        splitNumber: 4,
        splitLine: { lineStyle: { color: TS_COLORS.gridLine } },
        splitArea: { areaStyle: { color: [AREA_FILL, "rgba(59,130,246,0.05)"] } },
        axisName: { color: TS_COLORS.text, fontWeight: 600 },
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
      grid: { left: 180, right: 32, top: 48, bottom: 80, containLabel: true },
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
        `${this.formatNumber(params?.data?.pctGe4 ?? params?.data?.value ?? 0)}% ≥4`,
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
      grid: { left: 140, right: 32, bottom: 32, top: 80, containLabel: true },
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

  timelineOption(): EChartsOption {
    const timeline = this.analytics()?.timeline ?? [];
    if (!timeline.length) return this.emptyChartOption("Sin historial disponible");
    const categories = timeline.map((item) => item.date);
    const globalSeries = timeline.map((item) => this.round(item.global_percent));
    const selectedPillar = this.selectedPillar;
    const pillarSeries = selectedPillar === "ALL"
      ? null
      : timeline.map((item) => {
          const value = item.pillars[selectedPillar as number];
          return value != null ? this.round(value) : null;
        });
    const series: any[] = [
      {
        name: "Global",
        type: "line",
        data: globalSeries,
        smooth: true,
        lineStyle: { width: 3, color: TS_COLORS.primary },
        areaStyle: { color: AREA_FILL },
      },
    ];
    if (pillarSeries) {
      series.push({
        name: "Pilar seleccionado",
        type: "line",
        data: pillarSeries,
        smooth: true,
        lineStyle: { width: 2, color: TS_COLORS.positive },
        connectNulls: true,
      });
    }
    return {
      backgroundColor: TS_COLORS.background,
      animationDuration: 900,
      animationEasing: "cubicOut",
      tooltip: { trigger: "axis" },
      legend: { data: series.map((item) => item.name), textStyle: { color: TS_COLORS.text } },
      grid: { left: 64, right: 32, bottom: 48, top: 48, containLabel: true },
      xAxis: {
        type: "category",
        data: categories,
        boundaryGap: false,
        axisLabel: { color: TS_COLORS.text },
        axisLine: { lineStyle: { color: TS_COLORS.gridLine } },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        axisLabel: { formatter: "{value}%", color: TS_COLORS.text },
        splitLine: { lineStyle: { color: TS_COLORS.gridLine } },
        axisLine: { lineStyle: { color: TS_COLORS.gridLine } },
      },
      series,
    };
  }

  employeeScatterOption(): EChartsOption {
    const employees = this.analytics()?.employees ?? [];
    if (!employees.length) return this.emptyChartOption("Sin datos de empleados");
    return {
      backgroundColor: TS_COLORS.background,
      animationDuration: 800,
      animationEasing: "cubicOut",
      tooltip: {
        formatter: (params: any) => {
          const point = employees[params.dataIndex];
          const label = this.formatLikertLabel(point.level);
          return `${point.name}<br/>${this.formatNumber(point.percent)}% · ${label}`;
        },
      },
      xAxis: { type: "category", data: employees.map((emp) => emp.name), show: false },
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
          symbolSize: 14,
          data: employees.map((emp) => this.round(emp.percent)),
          itemStyle: { color: TS_COLORS.primary },
        },
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
      return;
    }
    this.loadingSignal.set(true);
    this.errorSignal.set("");
    this.infoSignal.set("");
    const sub = this.analyticsSvc
      .getDashboardAnalytics(filter)
      .subscribe({
        next: (response) => {
          this.analyticsSignal.set(response);
          this.likertLevelsSignal.set(response.likert_levels ?? []);
          this.loadingSignal.set(false);
        },
        error: (err) => {
          console.error("Error loading analytics", err);
          this.analyticsSignal.set(null);
          this.loadingSignal.set(false);
          this.errorSignal.set(err?.error?.detail ?? "No pudimos cargar los resultados.");
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
    };
    this.filterSignal.set(filter);
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
    this.charts?.forEach((chart) => chart.resize());
  }

  @HostListener("window:resize")
  onWindowResize(): void {
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }
    this.resizeTimer = setTimeout(() => this.resizeAllCharts(), 120);
  }

  private formatNumber(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return "0";
    return Number(value).toFixed(1).replace(/\.0$/, "");
  }

  formatPercent(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return "--";
    return `${this.formatNumber(value)}%`;
  }

  private formatSigned(value: number): string {
    if (value > 0) return `+${this.formatNumber(value)}`;
    return this.formatNumber(value);
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
