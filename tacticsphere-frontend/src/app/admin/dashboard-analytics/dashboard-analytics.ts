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
import JSZip from "jszip";
import { Subject, Subscription, firstValueFrom } from "rxjs";
import { debounceTime, distinctUntilChanged } from "rxjs/operators";

import { AnalyticsService, AnalyticsQueryParams } from "../../analytics.service";
import { CompanyService } from "../../company.service";
import { EmployeeService } from "../../employee.service";
import { AuthService } from "../../auth.service";
import { IconComponent } from "../../shared/ui/icon/icon.component";
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
import { ModalComponent } from "../../shared/ui/modal/modal.component";

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
  // Colores para comparación
  comparison: "#64748B", // Gris para serie comparativa
};
const AREA_FILL = "rgba(59,130,246,0.15)";
const AREA_FILL_COMPARISON = "rgba(100,116,139,0.15)"; // Gris para área comparativa
const PARTICIPATION_TARGET = 80; // Meta de participación por departamento (%)

// Paleta de colores compartida para niveles Likert
// Nivel 1 (Inicial) → Rojo, Nivel 2 (Básico) → Amarillo, Nivel 3 (Intermedio) → Azul,
// Nivel 4 (Avanzado) → Verde, Nivel 5 (Innovador) → Morado
const LIKERT_LEVEL_COLORS = [
  '#EF4444', // Nivel 1 - Inicial - Rojo
  '#FACC15', // Nivel 2 - Básico - Amarillo
  '#3B82F6', // Nivel 3 - Intermedio - Azul
  '#22C55E', // Nivel 4 - Avanzado - Verde
  '#A855F7', // Nivel 5 - Innovador - Morado
];

// Paleta de colores para pilares (colores únicos y consistentes)
// Usada en: Desempeño por pilar, Radar organizacional, Heatmap Pilar × Departamento, Matriz Impacto vs Desempeño
const PILLAR_COLORS = [
  '#3B82F6', // Azul
  '#22C55E', // Verde
  '#F59E0B', // Naranja
  '#EF4444', // Rojo
  '#8B5CF6', // Púrpura
  '#06B6D4', // Cyan
  '#F97316', // Naranja oscuro
  '#10B981', // Verde esmeralda
  '#6366F1', // Índigo
  '#EC4899', // Rosa
  '#14B8A6', // Turquesa
  '#F43F5E', // Rosa rojizo
];

interface KpiCard {
  label: string;
  value: string;
  suffix?: string;
  tooltip?: string;
  color?: string; // Para el color del estadio
}

@Component({
  standalone: true,
  selector: "app-dashboard-analytics",
  imports: [CommonModule, FormsModule, NgxEchartsModule, LikertBucketsComponent, ModalComponent, IconComponent],
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
  readonly isConsultor = this.role === "ANALISTA"; // CONSULTOR (internamente ANALISTA)
  readonly isAdminSistema = this.role === "ADMIN_SISTEMA";

  /**
   * Indica si estamos en modo vista global (todas las empresas).
   * Solo disponible para ADMIN_SISTEMA cuando selectedCompanyId es 'GLOBAL'.
   * En modo global, el filtro no incluye companyId (undefined) y el backend agrupa datos de todas las empresas.
   */
  readonly isGlobalView = computed(() => {
    return this.isAdminSistema && this.selectedCompanyIdSignal() === 'GLOBAL';
  });

  /**
   * Verifica si todos los departamentos alcanzaron el 100% de participación
   */
  readonly allDepartmentsAt100 = computed(() => {
    const coverage = this.analytics()?.coverage_by_department ?? [];
    if (!coverage.length) return false;
    return coverage.filter((item) => item.total > 0).every((item) => item.coverage_percent >= 100);
  });

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
  private filterUpdates$ = new Subject<AnalyticsQueryParams | null>();
  private analyticsCache = new Map<string, DashboardAnalyticsResponse>();

  // Report generation signals
  private reportModalOpenSignal = signal<boolean>(false);
  private receiptModalOpenSignal = signal<boolean>(false);
  private generatingReportsSignal = signal<boolean>(false);
  private reportErrorSignal = signal<string>("");
  private exportReceiptSignal = signal<{
    usuario: string;
    fechaHora: string;
    filtros: string[];
    formatos: string[];
  } | null>(null);

  // Comparación signals
  private comparisonAnalyticsSignal = signal<DashboardAnalyticsResponse | null>(null);
  private comparisonErrorSignal = signal<string>("");

  reportModalOpen = this.reportModalOpenSignal.asReadonly();
  receiptModalOpen = this.receiptModalOpenSignal.asReadonly();
  generatingReports = this.generatingReportsSignal.asReadonly();
  reportError = this.reportErrorSignal.asReadonly();
  exportReceipt = this.exportReceiptSignal.asReadonly();

  selectedFormats = {
    pdf: false,
    csv: false,
    json: false,
    xml: false,
    excel: false,
  };

  analytics = this.analyticsSignal.asReadonly();
  comparisonAnalytics = this.comparisonAnalyticsSignal.asReadonly();
  companies = this.companiesSignal.asReadonly();
  departments = this.departmentsSignal.asReadonly();
  employees = this.employeesSignal.asReadonly();
  loading = this.loadingSignal.asReadonly();
  error = this.errorSignal.asReadonly();
  info = this.infoSignal.asReadonly();
  exporting = this.exportingSignal.asReadonly();
  exportingCsv = this.exportingCsvSignal.asReadonly();
  comparisonError = this.comparisonErrorSignal.asReadonly();

  // Signals para los filtros (para que los computed se actualicen automáticamente)
  private selectedCompanyIdSignal = signal<number | 'GLOBAL' | null>(null);
  private selectedDepartmentIdSignal = signal<number | null>(null);
  private selectedPillarSignal = signal<number | "ALL">("ALL");
  private selectedEmployeeIdSignal = signal<number | null>(null);

  // Getters y setters para mantener compatibilidad con el código existente
  get selectedCompanyId(): number | 'GLOBAL' | null {
    return this.selectedCompanyIdSignal();
  }
  set selectedCompanyId(value: number | 'GLOBAL' | null) {
    this.selectedCompanyIdSignal.set(value);
  }

  get selectedDepartmentId(): number | null {
    return this.selectedDepartmentIdSignal();
  }
  set selectedDepartmentId(value: number | null) {
    this.selectedDepartmentIdSignal.set(value);
  }

  get selectedPillar(): number | "ALL" {
    return this.selectedPillarSignal();
  }
  set selectedPillar(value: number | "ALL") {
    this.selectedPillarSignal.set(value);
  }

  get selectedEmployeeId(): number | null {
    return this.selectedEmployeeIdSignal();
  }
  set selectedEmployeeId(value: number | null) {
    this.selectedEmployeeIdSignal.set(value);
  }
  
  // Comparación
  compareType: "DEPARTMENT" | "EMPLOYEE" | null = null;
  compareDepartmentId: number | null = null;
  compareEmployeeId: number | null = null;
  private comparisonSectionExpandedSignal = signal<boolean>(false);
  comparisonSectionExpanded = this.comparisonSectionExpandedSignal.asReadonly();
  
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
    // Filtro de empleados removido - ya no se usa búsqueda de empleados
    return this.employees();
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

  private getStageColor(level: number): string {
    const colors: Record<number, string> = {
      1: '#EF4444', // Inicial - rojo
      2: '#EAB308', // Básico - amarillo
      3: '#3B82F6', // Intermedio - azul
      4: '#22C55E', // Avanzado - verde
      5: '#0EA5E9', // Innovador - azul claro
    };
    return colors[level] ?? '#64748B';
  }

  private getStageColorByPercent(percent: number): string {
    // Rangos de estadios basados en porcentaje
    if (percent >= 0 && percent <= 20) {
      return '#EF4444'; // Inicial - rojo
    } else if (percent >= 21 && percent <= 40) {
      return '#FACC15'; // Básico - amarillo
    } else if (percent >= 41 && percent <= 60) {
      return '#3B82F6'; // Intermedio - azul
    } else if (percent >= 61 && percent <= 80) {
      return '#22C55E'; // Avanzado - verde
    } else if (percent >= 81 && percent <= 100) {
      return '#A855F7'; // Innovador - morado
    }
    return '#64748B'; // Default gris
  }

  /**
   * Mapea un porcentaje de desempeño (0-100) a un nivel Likert (1-5)
   * 0-20% → Nivel 1 (Inicial)
   * 20-40% → Nivel 2 (Básico)
   * 40-60% → Nivel 3 (Intermedio)
   * 60-80% → Nivel 4 (Avanzado)
   * 80-100% → Nivel 5 (Innovador)
   */
  private getLikertLevelFromPercent(percent: number): number {
    if (percent >= 0 && percent < 20) {
      return 1; // Inicial
    } else if (percent >= 20 && percent < 40) {
      return 2; // Básico
    } else if (percent >= 40 && percent < 60) {
      return 3; // Intermedio
    } else if (percent >= 60 && percent < 80) {
      return 4; // Avanzado
    } else if (percent >= 80 && percent <= 100) {
      return 5; // Innovador
    }
    return 1; // Default al nivel más bajo
  }

  private getTextColorForContrast(backgroundColor: string): string {
    // Determinar si usar texto negro o blanco según el contraste
    const rgb = this.hexToRgb(backgroundColor);
    if (!rgb) return '#1E293B'; // Default negro
    
    // Calcular luminosidad relativa
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5 ? '#1E293B' : '#FFFFFF'; // Negro si claro, blanco si oscuro
  }

  private calculatePredominantStage(): { level: number; name: string; color: string; count: number } | null {
    const employees = this.likertBucketEmployees();
    if (!employees.length) return null;

    // Contar empleados por nivel (1-5)
    const levelCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    employees.forEach((emp) => {
      if (emp.level >= 1 && emp.level <= 5) {
        levelCounts[emp.level] = (levelCounts[emp.level] || 0) + 1;
      }
    });

    // Encontrar el nivel con más empleados
    let maxLevel = 1;
    let maxCount = levelCounts[1];
    for (let level = 2; level <= 5; level++) {
      if (levelCounts[level] > maxCount) {
        maxCount = levelCounts[level];
        maxLevel = level;
      }
    }

    // Si no hay empleados en ningún nivel, retornar null
    if (maxCount === 0) return null;

    const levels = this.likertLevelsSignal();
    const match = levels.find((item) => item.valor === maxLevel);
    const name = match ? match.nombre : `Nivel ${maxLevel}`;
    const color = this.getStageColor(maxLevel);

    return { level: maxLevel, name, color, count: maxCount };
  }

  private calculateDepartmentMetrics(): {
    strongest: { name: string; average: number } | null;
    weakest: { name: string; average: number } | null;
  } {
    const data = this.analytics();
    const heatmapRows = data?.heatmap ?? [];
    if (!heatmapRows.length) {
      return { strongest: null, weakest: null };
    }

    // Filtrar departamentos válidos (con average > 0)
    const validDepartments = heatmapRows.filter((row) => row.average > 0);
    if (!validDepartments.length) {
      return { strongest: null, weakest: null };
    }

    // Ordenar por promedio
    const sorted = [...validDepartments].sort((a, b) => b.average - a.average);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];

    return {
      strongest: {
        name: strongest.department_name,
        average: strongest.average,
      },
      weakest: {
        name: weakest.department_name,
        average: weakest.average,
      },
    };
  }

  readonly kpiCards = computed<KpiCard[]>(() => {
    const data = this.analytics();
    const kpis = data?.kpis;
    if (!kpis) return [];
    const coverageAreas = (data?.coverage_by_department ?? []).filter((item) => item.total > 0);
    const lowestCoverage = coverageAreas.length
      ? [...coverageAreas].sort((a, b) => a.coverage_percent - b.coverage_percent)[0]
      : null;
    const predominantStage = this.calculatePredominantStage();
    const departmentMetrics = this.calculateDepartmentMetrics();
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
      predominantStage
        ? {
            label: "Estadio actual",
            value: predominantStage.name,
            suffix: "Calculado según las respuestas de los filtros seleccionados",
            color: predominantStage.color,
          }
        : ({ label: "Estadio actual", value: "Sin datos suficientes" } as KpiCard),
      departmentMetrics.strongest
        ? {
            label: "Departamento mas fuerte",
            value: departmentMetrics.strongest.name,
            suffix: `${this.formatNumber(departmentMetrics.strongest.average)}%`,
          }
        : ({ label: "Departamento mas fuerte", value: "Sin datos suficientes" } as KpiCard),
      departmentMetrics.weakest
        ? {
            label: "Departamento mas debil",
            value: departmentMetrics.weakest.name,
            suffix: `${this.formatNumber(departmentMetrics.weakest.average)}%`,
          }
        : ({ label: "Departamento mas debil", value: "Sin datos suficientes" } as KpiCard),
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
    // Enviar el filtro al stream siempre, incluso si es null
    // Esto asegura que todos los cambios se detecten correctamente
    this.filterUpdates$.next(filter);
  });

  constructor() {
    const filterSub = this.filterUpdates$
      .pipe(
        debounceTime(200),
        distinctUntilChanged((prev, curr) => {
          // Si ambos son null, son iguales
          if (!prev && !curr) return true;
          // Si uno es null y el otro no, son diferentes
          if (!prev || !curr) return false;
          // Si ambos existen, comparar por cache key
          return this.buildCacheKey(prev) === this.buildCacheKey(curr);
        })
      )
      .subscribe((filter) => {
        // MODO GLOBAL: Cuando selectedCompanyId es 'GLOBAL', el filtro tiene companyId = undefined.
        // Solo ADMIN_SISTEMA puede usar modo global. En este caso, el backend agrupa datos de todas las empresas.
        // MODO NORMAL: Cuando hay una empresa específica seleccionada, el filtro tiene companyId = número.
        // En este caso, el backend filtra por esa empresa específica.
        const isGlobalMode = filter && filter.companyId == null && this.isAdminSistema;
        const isNormalMode = filter && filter.companyId != null;
        const isValidFilter = isGlobalMode || isNormalMode;
        
        if (isValidFilter) {
          this.fetchAnalytics(filter);
        } else if (!filter) {
          // Si el filtro es null, limpiar los analytics
          this.analyticsSignal.set(null);
          this.loadingSignal.set(false);
        }
      });
    this.subscriptions.push(filterSub);
  }

  ngOnInit(): void {
    this.loadCompanies();
    if (this.empresaId != null) {
      this.selectedCompanyIdSignal.set(this.empresaId);
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

  clearFilters(): void {
    // Limpiar todos los filtros
    const previousCompanyId = this.selectedCompanyIdSignal();
    this.selectedCompanyIdSignal.set(this.isUser ? this.empresaId : null);
    this.selectedDepartmentIdSignal.set(null);
    this.selectedPillarSignal.set("ALL");
    this.selectedEmployeeIdSignal.set(null); // Limpiar también el filtro de empleado

    // Limpiar comparación también
    this.clearComparison();

    // Limpiar el error y info signals para un estado limpio
    this.errorSignal.set("");
    this.infoSignal.set("");

    // Resetear el filterSignal a null primero para forzar una actualización limpia
    this.filterSignal.set(null);

    // Si hay una empresa seleccionada, recargar departamentos y empleados
    if (this.selectedCompanyId != null && this.selectedCompanyId !== 'GLOBAL') {
      // Recargar departamentos y empleados para asegurar que los datos estén actualizados
      this.loadDepartments(this.selectedCompanyId);
      this.loadEmployees(this.selectedCompanyId, null);
    } else {
      this.departmentsSignal.set([]);
      this.employeesSignal.set([]);
    }

    // Recargar datos con filtros limpios
    // Usar un pequeño delay para asegurar que el signal se haya actualizado
    setTimeout(() => {
      this.updateFilter();
    }, 10);
  }

  refreshCurrentFilter(): void {
    this.updateFilter();
  }

  onCompanyChange(companyId: number | 'GLOBAL' | null): void {
    // MODO GLOBAL: Cuando companyId es 'GLOBAL', el backend agrupa datos de todas las empresas.
    // MODO NORMAL: Cuando companyId es un número, el backend filtra por esa empresa específica.
    
    this.selectedCompanyIdSignal.set(companyId);
    this.selectedDepartmentIdSignal.set(null); // Limpiar filtro de departamento al cambiar empresa
    this.selectedEmployeeIdSignal.set(null); // Limpiar filtro de empleado al cambiar empresa
    
    if (companyId != null && companyId !== 'GLOBAL') {
      // Modo normal: cargar departamentos y empleados de la empresa seleccionada
      this.loadDepartments(companyId);
      this.loadEmployees(companyId, null);
    } else {
      // Modo global o sin empresa: limpiar departamentos y empleados
      // En modo global, el backend carga todos los datos internamente
      this.departmentsSignal.set([]);
      this.employeesSignal.set([]);
    }
    
    // Limpiar el error signal antes de actualizar
    this.errorSignal.set("");
    // Actualizar el filtro - esto disparará el effect y la consulta al backend
    this.updateFilter();
  }

  onDepartmentChange(departmentId: number | null): void {
    this.selectedDepartmentIdSignal.set(departmentId);
    this.selectedEmployeeIdSignal.set(null); // Limpiar filtro de empleado al cambiar departamento
    const companyId = this.selectedCompanyIdSignal();
    if (companyId != null && companyId !== 'GLOBAL') {
      this.loadEmployees(companyId, departmentId ?? undefined);
    }
    this.updateFilter();
  }

  onPillarChange(selection: number | "ALL"): void {
    this.selectedPillarSignal.set(selection);
    this.selectedEmployeeIdSignal.set(null); // Limpiar filtro de empleado al cambiar pilar
    this.updateFilter();
  }

  onEmployeeChange(employeeId: number | null): void {
    // Método removido - ya no se usa filtro de empleados
    this.updateFilter();
  }

  // Métodos de comparación
  hasComparison(): boolean {
    return (
      (this.compareType === "DEPARTMENT" && this.compareDepartmentId != null) ||
      (this.compareType === "EMPLOYEE" && this.compareEmployeeId != null)
    );
  }

  onCompareTypeChange(type: "DEPARTMENT" | "EMPLOYEE" | null): void {
    this.compareType = type;
    this.compareDepartmentId = null;
    this.compareEmployeeId = null;
    this.comparisonAnalyticsSignal.set(null);
    this.comparisonErrorSignal.set("");
    if (type) {
      this.loadComparisonData();
    }
  }

  onCompareDepartmentChange(departmentId: number | null): void {
    this.compareDepartmentId = departmentId;
    this.comparisonErrorSignal.set("");
    if (departmentId != null) {
      this.validateAndLoadComparison();
    } else {
      this.comparisonAnalyticsSignal.set(null);
    }
  }

  onCompareEmployeeChange(employeeId: number | null): void {
    this.compareEmployeeId = employeeId;
    this.comparisonErrorSignal.set("");
    if (employeeId != null) {
      this.validateAndLoadComparison();
    } else {
      this.comparisonAnalyticsSignal.set(null);
    }
  }

  clearComparison(): void {
    this.compareType = null;
    this.compareDepartmentId = null;
    this.compareEmployeeId = null;
    this.comparisonAnalyticsSignal.set(null);
    this.comparisonErrorSignal.set("");
  }

  toggleComparisonSection(): void {
    this.comparisonSectionExpandedSignal.update((expanded) => !expanded);
  }

  private validateAndLoadComparison(): void {
    const companyId = this.selectedCompanyIdSignal() ?? this.empresaId;
    if (!companyId) {
      this.comparisonErrorSignal.set("Selecciona una empresa primero.");
      this.comparisonAnalyticsSignal.set(null);
      return;
    }

    if (this.compareType === "DEPARTMENT" && this.compareDepartmentId != null) {
      // Validar que el departamento de comparación sea diferente al principal
      if (this.compareDepartmentId === this.selectedDepartmentIdSignal()) {
        this.comparisonErrorSignal.set("El departamento de comparación debe ser diferente al principal.");
        this.comparisonAnalyticsSignal.set(null);
        return;
      }
      
      // Los departamentos ya están filtrados por empresa, así que si existe en la lista, pertenece a la empresa seleccionada
      const compareDept = this.departments().find((d) => d.id === this.compareDepartmentId);
      if (!compareDept) {
        this.comparisonErrorSignal.set("El departamento seleccionado no está disponible.");
        this.comparisonAnalyticsSignal.set(null);
        return;
      }
      
      this.comparisonErrorSignal.set("");
      this.loadComparisonData();
    } else if (this.compareType === "EMPLOYEE" && this.compareEmployeeId != null) {
      // Los empleados ya están filtrados por empresa/departamento, así que si existe en la lista, pertenece a la empresa seleccionada
      const compareEmp = this.employees().find((e) => e.id === this.compareEmployeeId);
      if (!compareEmp) {
        this.comparisonErrorSignal.set("El empleado seleccionado no está disponible.");
        this.comparisonAnalyticsSignal.set(null);
        return;
      }
      
      this.comparisonErrorSignal.set("");
      this.loadComparisonData();
    }
  }

  private loadComparisonData(): void {
    const selectedCompanyId = this.selectedCompanyIdSignal();
    const companyId = selectedCompanyId === 'GLOBAL' ? null : (selectedCompanyId ?? this.empresaId);
    if (!companyId) {
      this.comparisonErrorSignal.set("Selecciona una empresa primero.");
      this.comparisonAnalyticsSignal.set(null);
      this.loadingSignal.set(false);
      return;
    }

    const filter: AnalyticsQueryParams = {
      companyId: selectedCompanyId === 'GLOBAL' ? undefined : companyId,
      departmentIds: this.compareType === "DEPARTMENT" && this.compareDepartmentId
        ? [this.compareDepartmentId]
        : undefined,
      employeeIds: this.compareType === "EMPLOYEE" && this.compareEmployeeId
        ? [this.compareEmployeeId]
        : undefined,
      pillarIds: this.selectedPillarSignal() !== "ALL" ? [this.selectedPillarSignal() as number] : undefined,
    };

    this.loadingSignal.set(true);
    this.comparisonErrorSignal.set("");

    this.analyticsSvc.getDashboardAnalytics(filter).subscribe({
      next: (data) => {
        this.comparisonAnalyticsSignal.set(data);
        this.loadingSignal.set(false);
      },
      error: (err) => {
        console.error("Error loading comparison data", err);
        this.comparisonErrorSignal.set("Error al cargar los datos de comparación.");
        this.comparisonAnalyticsSignal.set(null);
        this.loadingSignal.set(false);
      },
    });
  }


  onPillarBarClick(event: any): void {
    const pillarId = event?.data?.pillarId as number | undefined;
    if (pillarId == null) return;
    const currentPillar = this.selectedPillarSignal();
    this.selectedPillarSignal.set(currentPillar === pillarId ? "ALL" : pillarId);
    this.updateFilter();
  }

  onHeatmapClick(event: any): void {
    const pillarId = event?.data?.pillarId as number | undefined;
    const departmentId = event?.data?.departmentId as number | undefined;
    if (pillarId == null && departmentId == null) return;
    if (pillarId != null) {
      this.selectedPillarSignal.set(pillarId);
    }
    if (departmentId != null) {
      this.selectedDepartmentIdSignal.set(departmentId);
    }
    this.updateFilter();
  }

  onLikertEmployeeClick(employeeId: number): void {
    if (employeeId == null) return;
    // Si el mismo empleado está seleccionado, deseleccionarlo
    if (this.selectedEmployeeIdSignal() === employeeId) {
      this.selectedEmployeeIdSignal.set(null);
    } else {
      this.selectedEmployeeIdSignal.set(employeeId);
    }
    this.updateFilter();
  }

  clearEmployeeFilter(): void {
    this.selectedEmployeeIdSignal.set(null);
    this.updateFilter();
  }

  filterSummary(): string[] {
    const summary: string[] = [];
    const selectedCompanyId = this.selectedCompanyIdSignal();
    const companyId = selectedCompanyId === 'GLOBAL' ? null : (selectedCompanyId ?? this.empresaId);
    const company = selectedCompanyId === 'GLOBAL' 
      ? 'Global (todas las empresas)'
      : this.resolveCompanyName(companyId);
    summary.push(`Empresa: ${company}`);
    const departmentId = this.selectedDepartmentIdSignal();
    if (departmentId != null) {
      summary.push(`Departamento: ${this.resolveDepartmentName(departmentId)}`);
    }
    const pillarId = this.selectedPillarSignal();
    if (pillarId !== "ALL") {
      const pillar = this.analytics()?.pillars.find((p) => p.pillar_id === pillarId)?.pillar_name;
      summary.push(`Pilar: ${pillar ?? `#${pillarId}`}`);
    }
    return summary;
  }

  // Computed para el resumen de filtros activos (para la columna derecha)
  // Ahora se actualiza automáticamente porque usa signals
  readonly activeFiltersSummary = computed(() => {
    const selectedCompanyId = this.selectedCompanyIdSignal();
    const companyId = selectedCompanyId === 'GLOBAL' ? null : (selectedCompanyId ?? this.empresaId);
    const departmentId = this.selectedDepartmentIdSignal();
    const pillarId = this.selectedPillarSignal();
    
    // Empresa
    const companyName = selectedCompanyId === 'GLOBAL'
      ? "Global (todas las empresas)"
      : (companyId 
        ? this.resolveCompanyName(companyId) 
        : "Sin empresa seleccionada");
    
    // Departamento
    const departmentName = departmentId != null 
      ? this.resolveDepartmentName(departmentId) 
      : "Todos los departamentos";
    
    // Pilar
    const pillarName = pillarId !== "ALL"
      ? (this.analytics()?.pillars.find((p) => p.pillar_id === pillarId)?.pillar_name ?? `Pilar #${pillarId}`)
      : "Todos los pilares";
    
    return {
      company: companyName,
      department: departmentName,
      pillar: pillarName,
    };
  });

  // Labels individuales para la vista rápida (computed para reactividad)
  readonly quickCompanyLabel = computed(() => {
    const selectedCompanyId = this.selectedCompanyIdSignal();
    if (selectedCompanyId === 'GLOBAL') {
      return '🌐 Global (todas las empresas)';
    }
    const companyId = selectedCompanyId ?? this.empresaId;
    return companyId 
      ? this.resolveCompanyName(companyId) 
      : "Sin empresa seleccionada";
  });

  readonly quickDepartmentLabel = computed(() => {
    const departmentId = this.selectedDepartmentIdSignal();
    return departmentId != null 
      ? this.resolveDepartmentName(departmentId) 
      : "Todos los departamentos";
  });

  readonly quickPillarLabel = computed(() => {
    const pillarId = this.selectedPillarSignal();
    return pillarId !== "ALL"
      ? (this.analytics()?.pillars.find((p) => p.pillar_id === pillarId)?.pillar_name ?? `Pilar #${pillarId}`)
      : "Todos los pilares";
  });

  // Computed para contar filtros activos
  readonly activeFiltersCount = computed(() => {
    let count = 0;
    // Solo contar empresa si no es usuario (usuarios siempre tienen empresa asignada)
    if (!this.isUser && (this.selectedCompanyIdSignal() != null || this.empresaId != null)) count++;
    if (this.selectedDepartmentIdSignal() != null) count++;
    if (this.selectedPillarSignal() !== "ALL") count++;
    return count;
  });

  // Método para obtener el nombre del empleado seleccionado
  getSelectedEmployeeName(): string | null {
    const employeeId = this.selectedEmployeeIdSignal();
    if (!employeeId) return null;
    const employee = this.employees().find((e) => e.id === employeeId);
    if (!employee) return null;
    return this.formatEmployeeIdentity(employee);
  }

  pillarOptions() {
    return this.analytics()?.pillars ?? [];
  }

  barPillarOption(): EChartsOption {
    const pillars = [...(this.analytics()?.pillars ?? [])].sort((a, b) => b.percent - a.percent);
    if (!pillars.length) {
      return this.emptyChartOption("Sin informacion de pilares");
    }
    const comparisonPillars = this.comparisonAnalytics()?.pillars ?? [];
    const hasComparison = this.hasComparison() && comparisonPillars.length > 0;
    const comparisonMap = hasComparison ? new Map(comparisonPillars.map((p) => [p.pillar_id, p.percent])) : null;
    
    const categories = pillars.map((item) => item.pillar_name);
    const data = pillars.map((item) => ({ value: this.round(item.percent), pillarId: item.pillar_id }));
    const selected = this.selectedPillar;
    
    const mainSeriesName = this.getMainFilterName();
    const comparisonSeriesName = this.getComparisonFilterName();
    
    const mainSeries = {
      type: "bar" as const,
      name: mainSeriesName,
      data: data.map((item) => {
        const barColor = this.getStageColorByPercent(item.value);
        const textColor = this.getTextColorForContrast(barColor);
        const isSelected = selected !== "ALL" && item.pillarId === selected;
        return {
          value: item.value,
          pillarId: item.pillarId,
          itemStyle: {
            color: isSelected ? barColor : barColor,
            opacity: isSelected ? 1 : 0.9,
            borderColor: barColor,
            borderWidth: isSelected ? 2 : 1,
          },
          label: {
            show: true,
            position: "right" as const,
            formatter: "{c}%",
            fontWeight: 600,
            color: textColor,
          },
        };
      }),
      barWidth: 24,
      z: 1, // Capa principal encima
    };

    const series: any[] = [mainSeries];

    // Agregar serie de comparación con color distinto (gris)
    if (hasComparison && comparisonMap) {
      const comparisonData = pillars.map((item) => {
        const compareValue = comparisonMap.get(item.pillar_id) ?? 0;
        return {
          value: this.round(compareValue),
          pillarId: item.pillar_id,
          itemStyle: {
            color: TS_COLORS.comparison, // Color gris para comparación
            opacity: 1, // Color sólido
            borderColor: TS_COLORS.comparison,
            borderWidth: 1,
          },
          label: {
            show: true, // Mostrar etiquetas en la comparación
            position: "right" as const,
            formatter: "{c}%",
            fontWeight: 600,
            color: TS_COLORS.comparison,
          },
        };
      });
      
      series.push({
        type: "bar" as const,
        name: comparisonSeriesName,
        data: comparisonData,
        barWidth: 24,
        z: 0, // Detrás de la capa principal
      });
    }

    const legendData = hasComparison 
      ? [mainSeriesName, comparisonSeriesName]
      : [mainSeriesName];

    return {
      backgroundColor: TS_COLORS.background,
      animationDuration: 800,
      animationEasing: "cubicOut",
      tooltip: {
        trigger: "axis" as const,
        axisPointer: { type: "shadow" as const },
        formatter: (params: any) => {
          if (Array.isArray(params)) {
            return params.map((p: any) => 
              `<strong>${p.seriesName}</strong><br/>${p.name}: ${this.formatNumber(p.value)}%`
            ).join("<br/><br/>");
          }
          return `${params.seriesName}<br/>${params.name}: ${this.formatNumber(params.value)}%`;
        },
      },
      legend: {
        data: legendData,
        top: 0,
        left: "center",
        icon: "rect",
        textStyle: { color: TS_COLORS.text, fontWeight: 600 },
        selectedMode: true, // Permitir mostrar/ocultar series
        itemGap: 20,
        // ECharts automáticamente usará los colores de las series para los iconos
      },
      grid: { left: 0, right: 16, bottom: 32, top: hasComparison ? 50 : 24, containLabel: true },
      xAxis: {
        type: "value" as const,
        max: 100,
        axisLabel: { formatter: "{value}%", color: TS_COLORS.text },
        splitLine: { lineStyle: { color: TS_COLORS.gridLine } },
        axisLine: { lineStyle: { color: TS_COLORS.gridLine } },
      },
      yAxis: {
        type: "category" as const,
        data: categories,
        axisLabel: { fontWeight: 600, color: TS_COLORS.text },
        axisLine: { lineStyle: { color: TS_COLORS.gridLine } },
      },
      series,
    };
  }

  private barPillarOptionOld(): EChartsOption {
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
          data: data.map((item) => {
            const barColor = this.getStageColorByPercent(item.value);
            const textColor = this.getTextColorForContrast(barColor);
            // Si hay un pilar seleccionado, destacar ese con opacidad mayor
            const isSelected = selected !== "ALL" && item.pillarId === selected;
            return {
              value: item.value,
              pillarId: item.pillarId,
              itemStyle: {
                color: isSelected ? barColor : barColor,
                opacity: isSelected ? 1 : 0.9,
                borderColor: barColor,
                borderWidth: isSelected ? 2 : 1,
              },
              label: {
                show: true,
                position: "right",
                formatter: "{c}%",
                fontWeight: 600,
                color: textColor,
              },
            };
          }),
          barWidth: 24,
        },
      ],
    };
  }

  radarBalanceOption(): EChartsOption {
    const pillars = this.analytics()?.pillars ?? [];
    if (!pillars.length) return this.emptyChartOption("Sin balance registrado", "radar");
    const comparisonPillars = this.comparisonAnalytics()?.pillars ?? [];
    const hasComparison = this.hasComparison() && comparisonPillars.length > 0;
    
    const formatLabel = (label?: string) => {
      const value = label ?? "";
      return value.length > 22 ? `${value.slice(0, 22)}…` : value;
    };
    
    const mainSeriesName = this.getMainFilterName();
    const comparisonSeriesName = this.getComparisonFilterName();
    
    const seriesData: any[] = [
      {
        value: pillars.map((pillar) => this.round(pillar.percent)),
        name: mainSeriesName,
        areaStyle: { color: AREA_FILL },
        lineStyle: { color: TS_COLORS.primary, width: 2 },
        itemStyle: { color: TS_COLORS.primary },
      },
    ];

    // Agregar serie de comparación con color distinto (gris)
    if (hasComparison) {
      const comparisonMap = new Map(comparisonPillars.map((p) => [p.pillar_id, p.percent]));
      seriesData.push({
        value: pillars.map((pillar) => {
          const compareValue = comparisonMap.get(pillar.pillar_id) ?? 0;
          return this.round(compareValue);
        }),
        name: comparisonSeriesName,
        areaStyle: { 
          color: AREA_FILL_COMPARISON, // Color gris para área comparativa
        },
        lineStyle: { 
          color: TS_COLORS.comparison, // Color gris para línea comparativa
          width: 2,
        },
        itemStyle: { 
          color: TS_COLORS.comparison, // Color gris para puntos comparativos
        },
        z: 0, // Detrás de la capa principal
      });
    }

    const legendData = hasComparison 
      ? [mainSeriesName, comparisonSeriesName]
      : [mainSeriesName];

    return {
      backgroundColor: TS_COLORS.background,
      animationDuration: 900,
      animationEasing: "cubicOut",
      tooltip: {
        trigger: "item",
        textStyle: { color: "#FFFFFF", fontWeight: 500 },
        formatter: (params: any) => {
          const values = Array.isArray(params.value) ? params.value : [];
          const seriesName = params.seriesName || "";
          return `<strong>${seriesName}</strong><br/>` +
            values
              .map((value: number, idx: number) => `${pillars[idx].pillar_name}: ${this.formatNumber(value)}%`)
              .join("<br/>");
        },
      },
      legend: {
        data: legendData,
        top: 0,
        left: "center",
        icon: "circle",
        textStyle: { color: TS_COLORS.text, fontWeight: 600 },
        formatter: (name: string) => formatLabel(name),
        selectedMode: true, // Permitir mostrar/ocultar series
        itemGap: 20,
        // ECharts automáticamente usará los colores de las series para los iconos
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
          data: seriesData,
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
    // Usar la paleta compartida de colores Likert
    const levelColors = LIKERT_LEVEL_COLORS;
    const series = [1, 2, 3, 4, 5].map((level, idx) => {
      const levelIndex = level - 1;
      const isTopLevel = level === 5;
      return {
        name: this.formatLikertLabel(level),
        type: "bar" as const,
        stack: "total",
        emphasis: { focus: "series" },
        barWidth: 32,
        barGap: 0,
        itemStyle: {
          color: levelColors[idx] ?? "#94a3b8",
          borderWidth: 0,
          borderRadius: isTopLevel ? [6, 6, 0, 0] : 0,
        },
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

  // Reemplazado por departmentParticipationOption() - mantener para compatibilidad con exportaciones
  coverageByDepartmentOption(): EChartsOption {
    return this.departmentParticipationOption();
  }


  departmentParticipationOption(): EChartsOption {
    const coverage = [...(this.analytics()?.coverage_by_department ?? [])].filter((item) => item.total > 0);
    if (!coverage.length) return this.emptyChartOption("Sin datos de participación");
    
    // Verificar si todos están al 100%
    const allAt100 = coverage.every((item) => item.coverage_percent >= 100);
    
    // Ordenar: si todos están al 100%, ordenar alfabéticamente; si no, por porcentaje descendente
    const sortedCoverage = [...coverage].sort((a, b) => {
      if (allAt100) {
        return a.department_name.localeCompare(b.department_name);
      }
      return b.coverage_percent - a.coverage_percent;
    });
    const categories = sortedCoverage.map((item) => item.department_name);

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
          const entry = sortedCoverage[dataIndex];
          if (!entry) return "";
          return `${entry.department_name}<br/>Participación: ${entry.respondents}/${entry.total}<br/>${this.formatNumber(entry.coverage_percent)}%`;
        },
      },
      grid: { left: 180, right: 120, bottom: 40, top: 40, containLabel: false },
      xAxis: {
        type: "value",
        min: 0,
        max: 100,
        axisLabel: { formatter: "{value}%", color: TS_COLORS.text },
        splitLine: { 
          lineStyle: { color: TS_COLORS.gridLine },
          show: true,
        },
        axisLine: { lineStyle: { color: TS_COLORS.gridLine } },
      },
      yAxis: {
        type: "category",
        data: categories,
        axisLabel: { color: TS_COLORS.text, fontWeight: 500 },
        axisLine: { lineStyle: { color: TS_COLORS.gridLine } },
      },
      series: [
        {
          type: "bar",
          barWidth: 32,
          itemStyle: {
            color: (params: any) => {
              const entry = sortedCoverage[params.dataIndex];
              if (!entry || entry.respondents === 0) return "#E2E8F0"; // Gris claro para 0 respuestas
              // Si todos están al 100%, mantener verde sin resaltar
              if (allAt100) return "#22C55E";
              // Resaltar departamentos bajo la meta (80%) con color más intenso
              if (entry.coverage_percent < PARTICIPATION_TARGET) return "#DC2626"; // Rojo más intenso para bajo la meta
              if (entry.coverage_percent >= PARTICIPATION_TARGET) return "#22C55E"; // Verde para meta cumplida
              return "#EAB308"; // Amarillo intermedio
            },
            borderRadius: [0, 8, 8, 0],
          },
          emphasis: {
            itemStyle: {
              // Resaltar aún más en hover los departamentos bajo la meta
              borderWidth: 2,
              borderColor: "#DC2626",
            },
          },
          data: sortedCoverage.map((item, index) => ({
            value: this.round(item.coverage_percent),
            respondents: item.respondents,
            total: item.total,
            itemStyle: !allAt100 && item.coverage_percent < PARTICIPATION_TARGET ? {
              // Resaltar visualmente con borde en los datos
              borderWidth: 2,
              borderColor: "#DC2626",
            } : undefined,
          })),
          label: {
            show: true,
            position: "right",
            formatter: (params: any) => {
              const entry = sortedCoverage[params.dataIndex];
              if (!entry) return "";
              return `${entry.respondents}/${entry.total} - ${this.formatNumber(entry.coverage_percent)}%`;
            },
            color: TS_COLORS.text,
            fontWeight: 600,
            fontSize: 12,
          },
          // Línea de referencia vertical para la meta de participación (80%)
          markLine: !allAt100 ? {
            silent: true,
            symbol: "none",
            lineStyle: {
              color: "#EF4444",
              type: "dashed",
              width: 2,
            },
            label: {
              show: true,
              formatter: `Meta: ${PARTICIPATION_TARGET}%`,
              position: "end",
              color: "#EF4444",
              fontWeight: 600,
              fontSize: 12,
            },
            data: [
              {
                xAxis: PARTICIPATION_TARGET,
                name: `Meta ${PARTICIPATION_TARGET}%`,
              },
            ],
          } : undefined,
        },
      ],
    };
  }

  // =========================================================
  // NUEVOS GRÁFICOS ADICIONALES
  // =========================================================

  /**
   * Treemap organizacional: Empresa → Departamento → Colaborador.
   * - value[0] = tamaño (colaboradores)
   * - value[1] = desempeño (para visualMap)
   */
  organizationalTreemapOption(): EChartsOption {
    const analytics = this.analytics();
    if (!analytics) return this.emptyChartOption("Sin datos");

    const coverage = (analytics.coverage_by_department ?? []).filter((dept) => (dept.total ?? 0) > 0);
    const heatmapRows = analytics.heatmap ?? [];
    const employees = analytics.employees ?? [];
    const isGlobal = this.isGlobalView();

    type TreemapNode = {
      name: string;
      value: [number, number]; // [tamaño, desempeño]
      children?: TreemapNode[];
      itemStyle?: { color: string };
    };

    if (!coverage.length || !heatmapRows.length) {
      return this.emptyChartOption("No hay información disponible para el mapa organizacional con los filtros actuales.");
    }

    const heatmapByDept = new Map<number | null, number>();
    heatmapRows.forEach((row) => {
      heatmapByDept.set(row.department_id, row.average ?? 0);
    });

    const performanceSamples: number[] = [];
    const deptNodes: TreemapNode[] = [];

    coverage.forEach((dept, index) => {
      const avgPerformance = heatmapByDept.get(dept.department_id) ?? 0;
      performanceSamples.push(avgPerformance);

      // Aproximación simple: asociar hasta 5 colaboradores al departamento
      const approxEmployees = employees.slice(index * 5, index * 5 + 5);
      approxEmployees.forEach((emp) => performanceSamples.push(emp.percent));

      const children: TreemapNode[] = approxEmployees.map((emp) => {
        const empPerformance = Math.max(0, Math.min(100, emp.percent ?? avgPerformance));
        const empLevel = this.getLikertLevelFromPercent(empPerformance);
        return {
          name: emp.name.length > 20 ? `${emp.name.substring(0, 20)}…` : emp.name,
          value: [1, empPerformance],
          itemStyle: {
            color: LIKERT_LEVEL_COLORS[empLevel - 1] ?? LIKERT_LEVEL_COLORS[0],
          },
        };
      });

      const deptLevel = this.getLikertLevelFromPercent(avgPerformance);
      deptNodes.push({
        name: dept.department_name,
        value: [dept.total || children.length || 1, avgPerformance],
        children,
        itemStyle: {
          color: LIKERT_LEVEL_COLORS[deptLevel - 1] ?? LIKERT_LEVEL_COLORS[0],
        },
      });
    });

    const hasDepartments = deptNodes.some((node) => (node.value?.[0] ?? 0) > 0);
    if (!hasDepartments) {
      return this.emptyChartOption("No hay información disponible para el mapa organizacional con los filtros actuales.");
    }

    const totalEmployees = deptNodes.reduce((sum, node) => sum + (node.value?.[0] ?? 0), 0);
    const totalPerformance =
      performanceSamples.length > 0
        ? performanceSamples.reduce((sum, val) => sum + (val ?? 0), 0) / performanceSamples.length
        : 0;

    const rootLevel = this.getLikertLevelFromPercent(totalPerformance);
    const rootNode: TreemapNode = {
      name: isGlobal ? "Todas las empresas" : "Organización",
      value: [Math.max(totalEmployees, 1), totalPerformance],
      children: deptNodes,
      itemStyle: {
        color: LIKERT_LEVEL_COLORS[rootLevel - 1] ?? LIKERT_LEVEL_COLORS[0],
      },
    };

    console.log("Treemap data", rootNode);

    return {
      backgroundColor: TS_COLORS.background,
      animationDuration: 800,
      animationEasing: "cubicOut",
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          const [collaborators, performance] = params.value as [number, number];
          const depth = params.treePathInfo?.length ?? 0;

          if (depth > 2) {
            return `<strong>${params.name}</strong><br/>Desempeño: ${this.formatNumber(performance)}%`;
          }

          if (depth === 2) {
            return `<strong>${params.name}</strong><br/>Colaboradores: ${collaborators}<br/>Desempeño promedio: ${this.formatNumber(
              performance
            )}%`;
          }

          return `<strong>${params.name}</strong><br/>Colaboradores: ${collaborators}<br/>Desempeño global: ${this.formatNumber(
            performance
          )}%`;
        },
      },
      visualMap: {
        type: "continuous",
        min: 0,
        max: 100,
        calculable: true,
        inRange: { color: LIKERT_LEVEL_COLORS }, // Usar la misma paleta Likert: Rojo → Amarillo → Azul → Verde → Morado
        right: 10,
        top: "middle",
        orient: "vertical",
        text: ["Alto desempeño", "Bajo desempeño"],
        textStyle: { color: TS_COLORS.text },
        // El visualMap se muestra como referencia visual, pero los itemStyle.color de los nodos tienen prioridad
      },
      legend: {
        data: [1, 2, 3, 4, 5].map((level) => this.formatLikertLabel(level)),
        top: 0,
        type: "scroll",
        left: 16,
        right: 16,
        orient: "horizontal",
        textStyle: { 
          color: TS_COLORS.text,
          rich: {
            color1: { color: LIKERT_LEVEL_COLORS[0], fontSize: 14, padding: [0, 4, 0, 0] },
            color2: { color: LIKERT_LEVEL_COLORS[1], fontSize: 14, padding: [0, 4, 0, 0] },
            color3: { color: LIKERT_LEVEL_COLORS[2], fontSize: 14, padding: [0, 4, 0, 0] },
            color4: { color: LIKERT_LEVEL_COLORS[3], fontSize: 14, padding: [0, 4, 0, 0] },
            color5: { color: LIKERT_LEVEL_COLORS[4], fontSize: 14, padding: [0, 4, 0, 0] },
          },
        },
        formatter: (name: string) => {
          // Extraer el número del nivel desde el formato "1 - Inicial"
          const levelMatch = name.match(/^(\d+)\s*-/);
          if (levelMatch) {
            const level = parseInt(levelMatch[1], 10);
            return `{color${level}|●} ${name}`;
          }
          return name;
        },
      },
      series: [
        {
          type: "treemap",
          data: [rootNode],
          roam: false,
          nodeClick: "zoomToNode",
          breadcrumb: { show: true, height: 22 },
          leafDepth: 1,
          label: {
            show: true,
            formatter: (params: any) => {
              const performance = (params.value as [number, number])?.[1] ?? 0;
              const text = params.name.length > 18 ? `${params.name.substring(0, 18)}…` : params.name;
              return `${text}\n${this.formatNumber(performance)}%`;
            },
            color: TS_COLORS.text,
            fontWeight: 600,
            fontSize: 11,
          },
          upperLabel: {
            show: true,
            height: 25,
            color: TS_COLORS.text,
            fontSize: 12,
            fontWeight: 600,
          },
          itemStyle: {
            borderColor: "#fff",
            borderWidth: 2,
            gapWidth: 2,
          },
          emphasis: {
            itemStyle: {
              borderColor: TS_COLORS.primary,
              borderWidth: 3,
            },
          },
          // No usar visualDimension para que los itemStyle.color tengan prioridad
          levels: [
            {
              itemStyle: {
                borderWidth: 3,
                borderColor: "#fff",
                gapWidth: 3,
              },
            },
            {
              itemStyle: {
                borderWidth: 2,
                gapWidth: 2,
                borderColor: "#fff",
              },
            },
            {
              itemStyle: {
                borderWidth: 1,
                gapWidth: 1,
                borderColor: "#fff",
              },
            },
          ],
        },
      ],
    };
  }

  /**
   * Matriz Impacto vs Desempeño: Scatter plot con cuadrantes
   * X = Desempeño (promedio del pilar), Y = Importancia (peso del pilar)
   */
  impactPerformanceMatrixOption(): EChartsOption {
    const analytics = this.analytics();
    if (!analytics?.pillars.length) return this.emptyChartOption("Sin datos de pilares");

    const pillars = analytics.pillars;
    
    // Calcular promedios para las líneas de referencia
    const avgPerformance = pillars.reduce((sum, p) => sum + p.percent, 0) / pillars.length;
    const avgImportance = pillars.reduce((sum, p) => sum + p.pct_ge4, 0) / pillars.length;

    // Calcular número de respuestas por pilar (suma de todos los niveles) para tamaño de burbuja
    const scatterData = pillars.map((p, index) => {
      const totalResponses = p.levels.reduce((sum, count) => sum + (count || 0), 0);
      // Aplicar jitter muy suave para evitar superposición (máximo 2% de desviación)
      const jitterX = (Math.random() - 0.5) * 2; // -1 a +1
      const jitterY = (Math.random() - 0.5) * 2; // -1 a +1
      return {
        name: p.pillar_name,
        pillarId: p.pillar_id,
        value: [
          Math.max(0, Math.min(100, p.percent + jitterX)), // Desempeño con jitter
          Math.max(0, Math.min(100, p.pct_ge4 + jitterY)), // Importancia con jitter
        ],
        originalValue: [p.percent, p.pct_ge4], // Valores originales para tooltip
        responseCount: totalResponses,
        pillarIndex: index,
        avgPerformance: p.percent, // Promedio del pilar para tooltip
      };
    });

    // Calcular límites de ejes basados en los datos (con margen del 10%)
    const performances = scatterData.map(d => d.originalValue[0]);
    const importances = scatterData.map(d => d.originalValue[1]);
    const minPerf = Math.max(0, Math.min(...performances) - 5);
    const maxPerf = Math.min(100, Math.max(...performances) + 5);
    const minImp = Math.max(0, Math.min(...importances) - 5);
    const maxImp = Math.min(100, Math.max(...importances) + 5);

    // Calcular tamaño máximo de burbuja
    const maxResponses = Math.max(...scatterData.map(d => d.responseCount), 1);
    const minSize = 30;
    const maxSize = 80;

    return {
      backgroundColor: TS_COLORS.background,
      animationDuration: 800,
      animationEasing: "cubicOut",
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderColor: TS_COLORS.gridLine,
        borderWidth: 1,
        textStyle: { color: TS_COLORS.text },
        formatter: (params: any) => {
          const data = params.value as number[];
          const originalData = (params.data as any)?.originalValue || data;
          const responseCount = (params.data as any)?.responseCount || 0;
          const avgPerf = (params.data as any)?.avgPerformance || originalData[0];
          return `<div style="padding: 4px 0;">
            <strong style="font-size: 13px; color: ${TS_COLORS.text};">${params.name}</strong><br/>
            <span style="color: ${TS_COLORS.text};">Desempeño: <strong>${this.formatNumber(originalData[0])}%</strong></span><br/>
            <span style="color: ${TS_COLORS.text};">Importancia: <strong>${this.formatNumber(originalData[1])}%</strong></span><br/>
            <span style="color: ${TS_COLORS.text};">Promedio del pilar: <strong>${this.formatNumber(avgPerf)}%</strong></span>
          </div>`;
        },
      },
      grid: { left: 80, right: 40, bottom: 60, top: 60, containLabel: true },
      xAxis: {
        type: "value",
        name: "Desempeño",
        nameLocation: "middle",
        nameGap: 30,
        min: minPerf,
        max: maxPerf,
        axisLabel: { formatter: "{value}%", color: TS_COLORS.text },
        splitLine: { lineStyle: { color: TS_COLORS.gridLine } },
        axisLine: { lineStyle: { color: TS_COLORS.gridLine } },
      },
      yAxis: {
        type: "value",
        name: "Importancia",
        nameLocation: "middle",
        nameGap: 50,
        min: minImp,
        max: maxImp,
        axisLabel: { color: TS_COLORS.text },
        splitLine: { lineStyle: { color: TS_COLORS.gridLine } },
        axisLine: { lineStyle: { color: TS_COLORS.gridLine } },
      },
      series: [
        {
          type: "scatter",
          data: scatterData.map((d) => {
            const color = PILLAR_COLORS[d.pillarIndex % PILLAR_COLORS.length];
            return {
              name: d.name,
              value: d.value,
              originalValue: d.originalValue,
              responseCount: d.responseCount,
              pillarIndex: d.pillarIndex,
              avgPerformance: d.avgPerformance,
              itemStyle: {
                color: color,
                opacity: 0.75, // Reducir transparencia para ver burbujas detrás
                borderColor: color,
                borderWidth: 2,
              },
            };
          }),
          // Tamaño de burbuja según número de respuestas
          symbolSize: (data: any, params: any) => {
            const responseCount = params?.data?.responseCount || data?.responseCount || 1;
            if (maxResponses === 0) return minSize;
            const scale = (responseCount / maxResponses) * (maxSize - minSize) + minSize;
            return Math.max(minSize, Math.min(maxSize, scale));
          },
          // Etiquetas con fondo semitransparente
          label: {
            show: true,
            position: "right",
            formatter: "{b}",
            color: TS_COLORS.text,
            fontSize: 11,
            fontWeight: 600,
            backgroundColor: "rgba(255, 255, 255, 0.85)",
            borderColor: TS_COLORS.gridLine,
            borderWidth: 1,
            borderRadius: 4,
            padding: [4, 6],
          },
          // Líneas de referencia suavizadas
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: {
              color: "rgba(200, 0, 0, 0.4)",
              type: "dashed",
              width: 1,
            },
            label: {
              show: false,
            },
            data: [
              {
                xAxis: avgPerformance,
                name: `Promedio desempeño: ${this.formatNumber(avgPerformance)}%`,
              },
              {
                yAxis: avgImportance,
                name: `Promedio importancia: ${this.formatNumber(avgImportance)}%`,
              },
            ],
          },
        },
      ],
    };
  }

  /**
   * Correlación entre pilares: Heatmap de correlación
   */
  pillarCorrelationOption(): EChartsOption {
    const analytics = this.analytics();
    if (!analytics?.pillars.length) return this.emptyChartOption("Sin datos de pilares");

    const pillars = analytics.pillars;
    const heatmap = analytics.heatmap;

    // Calcular correlación basada en comportamiento en departamentos
    // La correlación se calcula comparando cómo los pilares varían juntos por departamento
    const correlationMatrix: number[][] = [];
    const pillarNames = pillars.map((p) => p.pillar_name);

    // Agrupar por departamento
    const deptPillarMap = new Map<number | null, Map<number, number>>();
    heatmap.forEach((row) => {
      if (!deptPillarMap.has(row.department_id)) {
        deptPillarMap.set(row.department_id, new Map());
      }
      const deptMap = deptPillarMap.get(row.department_id)!;
      row.values.forEach((cell) => {
        deptMap.set(cell.pillar_id, cell.percent);
      });
    });

    // Calcular correlación de Pearson entre pares de pilares
    for (let i = 0; i < pillars.length; i++) {
      correlationMatrix[i] = [];
      for (let j = 0; j < pillars.length; j++) {
        if (i === j) {
          correlationMatrix[i][j] = 1.0;
        } else {
          const valuesI: number[] = [];
          const valuesJ: number[] = [];
          
          deptPillarMap.forEach((deptMap) => {
            const valI = deptMap.get(pillars[i].pillar_id);
            const valJ = deptMap.get(pillars[j].pillar_id);
            if (valI != null && valJ != null) {
              valuesI.push(valI);
              valuesJ.push(valJ);
            }
          });

          if (valuesI.length > 1) {
            correlationMatrix[i][j] = this.calculatePearsonCorrelation(valuesI, valuesJ);
          } else {
            correlationMatrix[i][j] = 0;
          }
        }
      }
    }

    // Convertir a formato ECharts heatmap
    const data: number[][] = [];
    for (let i = 0; i < pillars.length; i++) {
      for (let j = 0; j < pillars.length; j++) {
        data.push([j, i, this.round(correlationMatrix[i][j] * 100) / 100]);
      }
    }

    return {
      backgroundColor: TS_COLORS.background,
      animationDuration: 800,
      animationEasing: "cubicOut",
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          const data = params.value as number[];
          const pillarA = pillarNames[data[1]];
          const pillarB = pillarNames[data[0]];
          const corr = data[2];
          
          // Interpretación de la correlación
          let interpretation = "";
          if (Math.abs(corr) >= 0.7) {
            interpretation = "Alta correlación";
          } else if (Math.abs(corr) >= 0.4) {
            interpretation = "Correlación media";
          } else {
            interpretation = "Baja correlación";
          }
          
          // Si es la diagonal (mismo pilar), no mostrar interpretación
          if (Math.abs(corr - 1.0) < 0.001 && pillarA === pillarB) {
            return `Correlación entre ${pillarA} y ${pillarB}: —<br/>(Mismo pilar)`;
          }
          
          const corrText = this.formatNumber(corr);
          const interpretationText = corr > 0 
            ? "Cuando mejora uno, suele mejorar el otro." 
            : corr < 0 
              ? "Cuando mejora uno, suele empeorar el otro." 
              : "No hay relación clara.";
          
          return `Correlación entre ${pillarA} y ${pillarB}: ${corrText}<br/>` +
            `Interpretación: ${interpretation}. ${interpretationText}`;
        },
      },
      grid: { left: 120, right: 40, bottom: 120, top: 40, containLabel: false },
      xAxis: {
        type: "category",
        data: pillarNames,
        axisLabel: { 
          rotate: 45, 
          color: TS_COLORS.text, 
          fontWeight: 500,
          interval: 0,
          formatter: (value: string) => value.length > 15 ? value.substring(0, 15) + '...' : value,
        },
        axisLine: { lineStyle: { color: TS_COLORS.gridLine } },
      },
      yAxis: {
        type: "category",
        data: pillarNames,
        axisLabel: { 
          color: TS_COLORS.text, 
          fontWeight: 500,
          formatter: (value: string) => value.length > 20 ? value.substring(0, 20) + '...' : value,
        },
        axisLine: { lineStyle: { color: TS_COLORS.gridLine } },
      },
      visualMap: {
        min: -1,
        max: 1,
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 10,
        // Escala divergente: rojo (baja/negativa) → blanco/gris (0) → verde (alta positiva)
        inRange: {
          color: ["#EF4444", "#FCA5A5", "#E2E8F0", "#86EFAC", "#22C55E"], // Rojo → Rojo claro → Gris → Verde claro → Verde
        },
        text: ["+1", "0", "-1"],
        textStyle: { color: TS_COLORS.text },
      },
      series: [
        {
          type: "heatmap",
          data: data,
          label: {
            show: true,
            formatter: (params: any) => {
              const value = params.value[2];
              const row = params.value[1];
              const col = params.value[0];
              // Diagonal principal (pilar vs mismo pilar): mostrar "—" en lugar de "1.0"
              if (row === col && Math.abs(value - 1.0) < 0.001) {
                return "—";
              }
              return this.formatNumber(value);
            },
            color: TS_COLORS.text,
            fontWeight: 600,
          },
          // El color se maneja automáticamente por visualMap
          // La diagonal se resalta solo en el label (mostrando "—")
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
        },
      ],
    };
  }

  // Funciones auxiliares para los nuevos gráficos
  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;
    return numerator / denominator;
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
    const baseData = employees.map((emp, index) => [index, this.round(emp.percent), index]);
    const buildTooltip = (emp: EmployeePoint | null) => {
      if (!emp) return "";
      const identity = identityMap.get(emp.id) ?? { nombre: emp.name ?? `Empleado ${emp.id}` };
      const label = this.formatLikertLabel(emp.level);
      return `${this.formatEmployeeIdentity(identity, emp.name)}<br/>${this.formatNumber(emp.percent)}% · ${label}`;
    };
    const dimmedData = baseData;
    
    // Calcular regresión lineal para la línea de tendencia
    const calculateLinearRegression = (data: number[][]): { slope: number; intercept: number } => {
      const n = data.length;
      if (n === 0) return { slope: 0, intercept: 0 };
      if (n === 1) {
        // Si solo hay un punto, la línea es horizontal en ese valor
        return { slope: 0, intercept: data[0][1] };
      }
      
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumX2 = 0;
      
      for (const point of data) {
        const x = point[0];
        const y = point[1];
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
      }
      
      const denominator = n * sumX2 - sumX * sumX;
      if (Math.abs(denominator) < 1e-10) {
        // Si el denominador es muy pequeño, usar el promedio de Y como línea horizontal
        return { slope: 0, intercept: sumY / n };
      }
      
      const slope = (n * sumXY - sumX * sumY) / denominator;
      const intercept = (sumY - slope * sumX) / n;
      
      return { slope, intercept };
    };
    
    const regression = calculateLinearRegression(baseData);
    const trendLineData = employees.map((_, index) => [
      index,
      this.round(regression.slope * index + regression.intercept),
    ]);
    
    return {
      backgroundColor: TS_COLORS.background,
      animationDuration: 800,
      animationEasing: "cubicOut",
      tooltip: {
        show: true,
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
          symbolSize: 14,
          data: dimmedData,
          itemStyle: {
            color: TS_COLORS.primary,
          },
          emphasis: { focus: "series" },
          silent: false,
        },
        {
          type: "line",
          name: "Línea de tendencia",
          data: trendLineData,
          symbol: "none",
          lineStyle: {
            color: "#64748B",
            width: 2.5,
            type: "dashed",
            dashOffset: 5,
          },
          tooltip: {
            show: false,
          },
          z: 1,
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
    // MODO GLOBAL: Si companyId es undefined/null y el usuario es ADMIN_SISTEMA, 
    // permitir la carga (vista global de todas las empresas).
    // En este caso, el backend agrupa datos de todas las empresas sin filtrar por empresa_id.
    const isGlobalView = filter.companyId == null && this.isAdminSistema;
    
    if (!filter.companyId && !isGlobalView) {
      // Modo normal: requiere companyId
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
          this.selectedCompanyIdSignal.set(this.empresaId);
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
    const selectedCompanyId = this.selectedCompanyIdSignal();
    const companyId = selectedCompanyId === 'GLOBAL' ? null : (selectedCompanyId ?? this.empresaId ?? null);
    
    // MODO GLOBAL: Si selectedCompanyId es 'GLOBAL', el filtro tendrá companyId = undefined.
    // Esto permite que el backend agrupe datos de todas las empresas sin filtrar por empresa_id.
    // Solo ADMIN_SISTEMA puede usar este modo.
    // MODO NORMAL: Si hay una empresa seleccionada, el filtro tendrá companyId = número.
    // Esto permite que el backend filtre por esa empresa específica.
    
    if (companyId == null && selectedCompanyId !== 'GLOBAL') {
      // No es modo global y no hay empresa seleccionada - mostrar mensaje
      this.infoSignal.set("Selecciona una empresa para ver resultados.");
      this.analyticsSignal.set(null);
      this.filterSignal.set(null);
      return;
    }
    
    this.infoSignal.set("");
    
    // Crear el objeto filtro. En modo global, companyId es undefined para indicar al backend que agrupe todas las empresas.
    // En modo normal, companyId es un número que identifica la empresa específica.
    const filter: AnalyticsQueryParams = {
      companyId: selectedCompanyId === 'GLOBAL' ? undefined : companyId,
      departmentIds: this.selectedDepartmentIdSignal() != null ? [this.selectedDepartmentIdSignal()!] : undefined,
      pillarIds: this.selectedPillarSignal() !== "ALL" ? [this.selectedPillarSignal() as number] : undefined,
      employeeIds: this.selectedEmployeeIdSignal() != null ? [this.selectedEmployeeIdSignal()!] : undefined,
      includeTimeline: false,
    };
    
    // Establecer el filtro - el signal detectará el cambio automáticamente
    this.filterSignal.set({ ...filter });
  }

  private buildCacheKey(filter: AnalyticsQueryParams): string {
    // Genera una clave única para cachear los resultados del dashboard.
    // En modo global (companyId = undefined), la clave incluye 'GLOBAL' para diferenciarlo del modo normal.
    return JSON.stringify({
      companyId: filter.companyId ?? 'GLOBAL', // 'GLOBAL' cuando es undefined (modo global)
      departmentIds: filter.departmentIds ?? [],
      pillarIds: filter.pillarIds ?? [],
      employeeIds: filter.employeeIds ?? [],
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

  // =========================================================
  // Funciones helper para comparación
  // =========================================================

  /**
   * Obtiene el nombre del filtro comparativo actual
   */
  getComparisonFilterName(): string {
    if (!this.hasComparison()) return "";
    
    if (this.compareType === "DEPARTMENT" && this.compareDepartmentId != null) {
      return this.resolveDepartmentName(this.compareDepartmentId);
    }
    
    if (this.compareType === "EMPLOYEE" && this.compareEmployeeId != null) {
      return this.resolveEmployeeName(this.compareEmployeeId);
    }
    
    return "Comparación";
  }

  /**
   * Obtiene el nombre del filtro principal actual
   */
  getMainFilterName(): string {
    const departmentId = this.selectedDepartmentIdSignal();
    const employeeId = this.selectedEmployeeIdSignal();
    
    if (employeeId != null) {
      return this.resolveEmployeeName(employeeId);
    }
    
    if (departmentId != null) {
      return this.resolveDepartmentName(departmentId);
    }
    
    const selectedCompanyId = this.selectedCompanyIdSignal();
    if (selectedCompanyId === 'GLOBAL') {
      return 'Global (todas las empresas)';
    }
    
    const companyId = selectedCompanyId ?? this.empresaId;
    return this.resolveCompanyName(companyId);
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

  private async generateChartFromData(options: {
    type: 'bar' | 'line';
    title: string;
    data: Array<{ label: string; value: number }>;
  }): Promise<ArrayBuffer> {
    const echartsModule = await import('echarts');
    const echarts = echartsModule as unknown as {
      init: (dom: HTMLElement, theme?: string) => {
        setOption: (option: EChartsOption) => void;
        getDataURL: (opts: { type: string; pixelRatio: number; backgroundColor: string }) => string;
        dispose: () => void;
      };
    };
    
    // Create a temporary container
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '500px';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    try {
      const chart = echarts.init(container, TS_MONO_THEME);
      
      const chartOption: EChartsOption = {
        title: {
          text: options.title,
          left: 'center',
          textStyle: { fontSize: 16, fontWeight: 600, color: TS_COLORS.text },
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
        },
        grid: { left: '10%', right: '10%', top: '20%', bottom: '15%', containLabel: true },
        xAxis: {
          type: options.type === 'bar' ? 'category' : 'value',
          data: options.type === 'bar' ? options.data.map((d) => d.label) : undefined,
          axisLabel: { rotate: options.type === 'bar' ? 45 : 0, color: TS_COLORS.text },
        },
        yAxis: {
          type: options.type === 'bar' ? 'value' : 'category',
          data: options.type === 'line' ? options.data.map((d) => d.label) : undefined,
          axisLabel: { formatter: '{value}%', color: TS_COLORS.text },
        },
        series: [
          {
            type: options.type,
            data: options.data.map((d) => d.value),
            itemStyle: { color: TS_COLORS.primary },
            label: {
              show: true,
              position: options.type === 'bar' ? 'right' : 'top',
              formatter: '{c}%',
              color: TS_COLORS.text,
            },
          },
        ],
      };

      chart.setOption(chartOption);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for chart to render

      // Get chart as data URL and convert to buffer
      const dataUrl = chart.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#FFFFFF',
      });
      
      // Convert data URL to ArrayBuffer
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      chart.dispose();
      document.body.removeChild(container);

      return await blob.arrayBuffer();
    } catch (error) {
      document.body.removeChild(container);
      throw error;
    }
  }

  private async generateStackedChartFromData(options: {
    type: 'bar';
    title: string;
    categories: string[];
    series: Array<{ name: string; data: number[] }>;
  }): Promise<ArrayBuffer> {
    const echartsModule = await import('echarts');
    const echarts = echartsModule as unknown as {
      init: (dom: HTMLElement, theme?: string) => {
        setOption: (option: EChartsOption) => void;
        getDataURL: (opts: { type: string; pixelRatio: number; backgroundColor: string }) => string;
        dispose: () => void;
      };
    };
    
    const container = document.createElement('div');
    container.style.width = '900px';
    container.style.height = '500px';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    try {
      const chart = echarts.init(container, TS_MONO_THEME);
      
      // Usar la paleta compartida de colores Likert
      const levelColors = LIKERT_LEVEL_COLORS;

      const chartOption: EChartsOption = {
        title: {
          text: options.title,
          left: 'center',
          textStyle: { fontSize: 16, fontWeight: 600, color: TS_COLORS.text },
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
        },
        legend: {
          data: options.series.map((s) => s.name),
          top: 40,
        },
        grid: { left: '10%', right: '10%', top: '25%', bottom: '15%', containLabel: true },
        xAxis: {
          type: 'category',
          data: options.categories,
          axisLabel: { rotate: 45, color: TS_COLORS.text },
        },
        yAxis: {
          type: 'value',
          max: 100,
          axisLabel: { formatter: '{value}%', color: TS_COLORS.text },
        },
        series: options.series.map((serie, idx) => ({
          name: serie.name,
          type: 'bar',
          stack: 'total',
          data: serie.data,
          itemStyle: { color: levelColors[idx] || TS_COLORS.primary },
        })),
      };

      chart.setOption(chartOption);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Get chart as data URL and convert to buffer
      const dataUrl = chart.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#FFFFFF',
      });
      
      // Convert data URL to ArrayBuffer
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      chart.dispose();
      document.body.removeChild(container);

      return await blob.arrayBuffer();
    } catch (error) {
      document.body.removeChild(container);
      throw error;
    }
  }

  private async generateChartFromOption(option: EChartsOption, title?: string): Promise<ArrayBuffer> {
    const echartsModule = await import('echarts');
    const echarts = echartsModule as unknown as {
      init: (dom: HTMLElement, theme?: string) => {
        setOption: (option: EChartsOption) => void;
        getDataURL: (opts: { type: string; pixelRatio: number; backgroundColor: string }) => string;
        dispose: () => void;
      };
    };
    
    // Create a temporary container
    const container = document.createElement('div');
    container.style.width = '900px';
    container.style.height = '600px';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    try {
      const chart = echarts.init(container, TS_MONO_THEME);
      
      // Add title if provided and not already in option
      const chartOption: EChartsOption = {
        ...option,
        title: option.title || (title ? {
          text: title,
          left: 'center',
          textStyle: { fontSize: 16, fontWeight: 600, color: TS_COLORS.text },
        } : undefined),
      };

      chart.setOption(chartOption);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for chart to render

      // Get chart as data URL and convert to buffer
      const dataUrl = chart.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#FFFFFF',
      });
      
      // Convert data URL to ArrayBuffer
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      chart.dispose();
      document.body.removeChild(container);

      return await blob.arrayBuffer();
    } catch (error) {
      document.body.removeChild(container);
      throw error;
    }
  }

  private async generateScatterChartFromData(options: {
    title: string;
    data: Array<{ name: string; value: number; level: number }>;
  }): Promise<ArrayBuffer> {
    const echartsModule = await import('echarts');
    const echarts = echartsModule as unknown as {
      init: (dom: HTMLElement, theme?: string) => {
        setOption: (option: EChartsOption) => void;
        getDataURL: (opts: { type: string; pixelRatio: number; backgroundColor: string }) => string;
        dispose: () => void;
      };
    };
    
    // Create a temporary container
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '500px';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    try {
      const chart = echarts.init(container, TS_MONO_THEME);
      
      // Group data by level for color coding
      const levelColors: Record<number, string> = {
        1: '#EF4444',
        2: '#EAB308',
        3: '#3B82F6',
        4: '#22C55E',
        5: '#0EA5E9',
      };

      const seriesByLevel: Record<number, Array<[number, number, string]>> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
      options.data.forEach((item, idx) => {
        const level = item.level;
        if (level >= 1 && level <= 5) {
          seriesByLevel[level].push([idx, item.value, item.name]);
        }
      });

      const series = [1, 2, 3, 4, 5].map((level) => ({
        type: 'scatter' as const,
        name: this.formatLikertLabel(level),
        data: seriesByLevel[level],
        itemStyle: { color: levelColors[level] || TS_COLORS.primary },
        symbolSize: 8,
      }));

      const chartOption: EChartsOption = {
        title: {
          text: options.title,
          left: 'center',
          textStyle: { fontSize: 16, fontWeight: 600, color: TS_COLORS.text },
        },
        tooltip: {
          trigger: 'item',
          formatter: (params: any) => {
            const data = params.data;
            if (Array.isArray(data) && data.length >= 3) {
              return `${data[2]}<br/>Promedio: ${this.formatNumber(data[1])}%`;
            }
            return '';
          },
        },
        legend: {
          data: [1, 2, 3, 4, 5].map((l) => this.formatLikertLabel(l)),
          bottom: 0,
        },
        grid: { left: '10%', right: '10%', top: '20%', bottom: '20%', containLabel: true },
        xAxis: {
          type: 'value',
          name: 'Índice',
          axisLabel: { color: TS_COLORS.text },
        },
        yAxis: {
          type: 'value',
          name: 'Promedio (%)',
          axisLabel: { formatter: '{value}%', color: TS_COLORS.text },
        },
        series: series as unknown as EChartsOption["series"],
      };

      chart.setOption(chartOption);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for chart to render

      // Get chart as data URL and convert to buffer
      const dataUrl = chart.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#FFFFFF',
      });
      
      // Convert data URL to ArrayBuffer
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      chart.dispose();
      document.body.removeChild(container);

      return await blob.arrayBuffer();
    } catch (error) {
      document.body.removeChild(container);
      throw error;
    }
  }

  // ======================================================
  // Report Generation Functions
  // ======================================================

  openReportModal(): void {
    this.reportModalOpenSignal.set(true);
    this.reportErrorSignal.set("");
    // Reset formats
    this.selectedFormats = {
      pdf: false,
      csv: false,
      json: false,
      xml: false,
      excel: false,
    };
  }

  closeReportModal(): void {
    this.reportModalOpenSignal.set(false);
    this.reportErrorSignal.set("");
  }

  closeReceiptModal(): void {
    this.receiptModalOpenSignal.set(false);
  }

  hasSelectedFormats(): boolean {
    return Object.values(this.selectedFormats).some((v) => v === true);
  }

  async generateReports(): Promise<void> {
    if (!this.hasSelectedFormats()) {
      this.reportErrorSignal.set("Selecciona al menos un formato para exportar.");
      return;
    }

    const filter = this.filterSignal();
    if (!filter?.companyId) {
      this.reportErrorSignal.set("Selecciona una empresa para exportar.");
      return;
    }

    this.generatingReportsSignal.set(true);
    this.reportErrorSignal.set("");

    try {
      const selectedFormatNames: string[] = [];
      const selectedCount = Object.values(this.selectedFormats).filter((v) => v === true).length;

      // Si solo hay un formato, usar el comportamiento original (descarga directa)
      if (selectedCount === 1) {
        const exportPromises: Promise<void>[] = [];

        if (this.selectedFormats.pdf) {
          selectedFormatNames.push("PDF");
          exportPromises.push(this.exportPdfImproved());
        }

        if (this.selectedFormats.csv) {
          selectedFormatNames.push("CSV");
          exportPromises.push(this.exportCsvForReport());
        }

        if (this.selectedFormats.json) {
          selectedFormatNames.push("JSON");
          exportPromises.push(this.exportJson());
        }

        if (this.selectedFormats.xml) {
          selectedFormatNames.push("XML");
          exportPromises.push(this.exportXml());
        }

        if (this.selectedFormats.excel) {
          selectedFormatNames.push("Excel");
          exportPromises.push(this.exportExcel());
        }

        await Promise.all(exportPromises);
      } else {
        // Si hay múltiples formatos, generar todos en memoria y crear un ZIP
        const filePromises: Promise<{ blob: Blob; filename: string }>[] = [];

        if (this.selectedFormats.pdf) {
          selectedFormatNames.push("PDF");
          filePromises.push(this.generatePdfBlob());
        }

        if (this.selectedFormats.csv) {
          selectedFormatNames.push("CSV");
          filePromises.push(this.generateCsvBlob());
        }

        if (this.selectedFormats.json) {
          selectedFormatNames.push("JSON");
          filePromises.push(this.generateJsonBlob());
        }

        if (this.selectedFormats.xml) {
          selectedFormatNames.push("XML");
          filePromises.push(this.generateXmlBlob());
        }

        if (this.selectedFormats.excel) {
          selectedFormatNames.push("Excel");
          filePromises.push(this.generateExcelBlob());
        }

        const files = await Promise.all(filePromises);
        await this.downloadAsZip(files);
      }

      // Generate receipt
      await this.ensureCurrentUser();
      const receipt = {
        usuario: `${this.currentUserName ?? "--"} (${this.currentUserEmail ?? "--"})`,
        fechaHora: new Date().toLocaleString("es-ES"),
        filtros: this.filterSummary(),
        formatos: selectedFormatNames,
      };
      this.exportReceiptSignal.set(receipt);
      this.closeReportModal();
      this.receiptModalOpenSignal.set(true);
      
      // Registrar evento de auditoría
      const filter = this.filterSignal();
      if (filter?.companyId != null) {
        const companyName = this.resolveCompanyName(filter.companyId);
        const departmentName = filter.departmentIds?.[0] 
          ? this.resolveDepartmentName(filter.departmentIds[0])
          : 'Todos';
        const pillarName = filter.pillarIds?.[0]
          ? this.analytics()?.pillars.find((p) => p.pillar_id === filter.pillarIds![0])?.pillar_name
          : 'Todos';
        
        const notes = `Generó informe: Empresa: ${companyName}, Departamento: ${departmentName}, Pilar: ${pillarName}, Formatos: ${selectedFormatNames.join(', ')}`;
        this.auditSvc.logReportExport('dashboard', notes).subscribe({
          error: (err) => console.error('Error registrando auditoría de informe', err),
        });
      }
      
      // Auto-cerrar el modal de resumen después de 5 segundos
      setTimeout(() => {
        this.closeReceiptModal();
      }, 5000);
    } catch (error) {
      console.error("Error generating reports", error);
      this.reportErrorSignal.set("Ocurrió un error al generar los informes. Intenta nuevamente.");
    } finally {
      this.generatingReportsSignal.set(false);
    }
  }

  private async exportCsvForReport(): Promise<void> {
    const filter = this.filterSignal();
    if (!filter?.companyId) return;

    return new Promise((resolve, reject) => {
      this.analyticsSvc.exportResponsesCsv(filter).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = `tacticsphere-informe-${new Date().toISOString().slice(0, 10)}.csv`;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          URL.revokeObjectURL(url);
          resolve();
        },
        error: (err) => {
          console.error("Export CSV failed", err);
          reject(err);
        },
      });
    });
  }

  private async exportJson(): Promise<void> {
    const filter = this.filterSignal();
    if (!filter?.companyId) return;

    return new Promise((resolve, reject) => {
      this.analyticsSvc.exportResponsesCsv(filter).subscribe({
        next: async (blob) => {
          try {
            const text = await blob.text();
            const lines = text.split("\n");
            let headers = lines[0].split(",").map(h => h.trim());
            const data: any[] = [];

            for (let i = 1; i < lines.length; i++) {
              if (!lines[i].trim()) continue;
              const values = this.parseCsvLine(lines[i]);
              if (values.length === headers.length) {
                const obj: any = {};
                headers.forEach((header, idx) => {
                  obj[header] = values[idx]?.trim() || "";
                });
                data.push(obj);
              }
            }

            // Filtrar respuesta_esperada
            const { filteredHeaders, filteredData } = this.filterExpectedAnswerColumn(headers, data);
            headers = filteredHeaders;
            const finalData = filteredData.map(record => {
              if (typeof record === 'object' && !Array.isArray(record)) {
                const filtered: any = {};
                filteredHeaders.forEach(header => {
                  if (record.hasOwnProperty(header)) {
                    filtered[header] = record[header];
                  }
                });
                return filtered;
              }
              return record;
            });

            const jsonData = {
              metadata: {
                generatedAt: new Date().toISOString(),
                filters: this.filterSummary(),
                totalRecords: finalData.length,
              },
              data: finalData,
            };

            const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(jsonBlob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = `tacticsphere-informe-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        error: (err) => {
          console.error("Export JSON failed", err);
          reject(err);
        },
      });
    });
  }

  private async exportXml(): Promise<void> {
    const filter = this.filterSignal();
    if (!filter?.companyId) return;

    return new Promise((resolve, reject) => {
      this.analyticsSvc.exportResponsesCsv(filter).subscribe({
        next: async (blob) => {
          try {
            const text = await blob.text();
            const lines = text.split("\n");
            let headers = lines[0].split(",").map(h => h.trim());
            const data: any[] = [];

            for (let i = 1; i < lines.length; i++) {
              if (!lines[i].trim()) continue;
              const values = this.parseCsvLine(lines[i]);
              if (values.length === headers.length) {
                const obj: any = {};
                headers.forEach((header, idx) => {
                  obj[header] = values[idx]?.trim() || "";
                });
                data.push(obj);
              }
            }

            // Filtrar respuesta_esperada
            const { filteredHeaders, filteredData } = this.filterExpectedAnswerColumn(headers, data);
            headers = filteredHeaders;
            const finalData = filteredData.map(record => {
              if (typeof record === 'object' && !Array.isArray(record)) {
                const filtered: any = {};
                filteredHeaders.forEach(header => {
                  if (record.hasOwnProperty(header)) {
                    filtered[header] = record[header];
                  }
                });
                return filtered;
              }
              return record;
            });

            let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
            xml += "<report>\n";
            xml += "  <metadata>\n";
            xml += `    <generatedAt>${new Date().toISOString()}</generatedAt>\n`;
            xml += "    <filters>\n";
            this.filterSummary().forEach((filter) => {
              xml += `      <filter>${this.escapeXml(filter)}</filter>\n`;
            });
            xml += "    </filters>\n";
            xml += `    <totalRecords>${finalData.length}</totalRecords>\n`;
            xml += "  </metadata>\n";
            xml += "  <data>\n";

            finalData.forEach((record) => {
              xml += "    <record>\n";
              Object.keys(record).forEach((key) => {
                const value = record[key];
                const safeKey = key.replace(/[^a-zA-Z0-9_]/g, "_");
                xml += `      <${safeKey}>${this.escapeXml(String(value))}</${safeKey}>\n`;
              });
              xml += "    </record>\n";
            });

            xml += "  </data>\n";
            xml += "</report>";

            const xmlBlob = new Blob([xml], { type: "application/xml" });
            const url = URL.createObjectURL(xmlBlob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = `tacticsphere-informe-${new Date().toISOString().slice(0, 10)}.xml`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        error: (err) => {
          console.error("Export XML failed", err);
          reject(err);
        },
      });
    });
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  private filterExpectedAnswerColumn(headers: string[], data: any[]): { filteredHeaders: string[]; filteredData: any[] } {
    const expectedAnswerIndex = headers.findIndex(h => {
      const normalized = h.trim().toLowerCase();
      return normalized === "respuesta_esperada" || 
             normalized === "expected_answer" ||
             normalized === "respuesta esperada";
    });
    
    if (expectedAnswerIndex === -1) {
      return { filteredHeaders: headers, filteredData: data };
    }

    const filteredHeaders = headers.filter((_, idx) => idx !== expectedAnswerIndex);
    const filteredData = data.map(record => {
      if (typeof record === 'object' && !Array.isArray(record)) {
        const filtered: any = {};
        filteredHeaders.forEach(header => {
          if (record.hasOwnProperty(header)) {
            filtered[header] = record[header];
          }
        });
        return filtered;
      }
      return record;
    });

    return { filteredHeaders, filteredData };
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  private async exportPdfImproved(): Promise<void> {
    if (this.exporting()) return;

    this.exportingSignal.set(true);
    try {
      // Esperar a que el DOM se actualice y el elemento esté disponible
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      // Intentar encontrar el contenedor varias veces si es necesario
      let container = document.getElementById("analytics-export");
      if (!container) {
        // Esperar un poco más y volver a intentar
        await new Promise((resolve) => setTimeout(resolve, 300));
        container = document.getElementById("analytics-export");
      }
      
      if (!container) {
        throw new Error("No pudimos encontrar el contenido para exportar. Asegúrate de que los datos estén cargados.");
      }

      this.resizeAllCharts();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await this.ensureLogo();
      await this.ensureCurrentUser();

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const headerHeight = 25;
      const contentWidth = pageWidth - 2 * margin;
      let currentY = margin + headerHeight;

      // Función helper para dibujar el header en cada página
      const drawHeader = () => {
        if (this.logoDataUrl) {
          pdf.addImage(this.logoDataUrl, "PNG", margin, margin, 20, 20);
          pdf.setFontSize(18);
          pdf.setTextColor(15, 23, 42);
          pdf.text("TacticSphere - Informe Analítico", margin + 22, margin + 12);
        } else {
          pdf.setFontSize(18);
          pdf.setTextColor(15, 23, 42);
          pdf.text("TacticSphere - Informe Analítico", margin, margin + 8);
        }
      };

      // Dibujar header en la primera página
      drawHeader();

      // Metadata
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      const generatedAt = new Date();
      const metadataLines = this.buildMetadataLines(generatedAt);
      metadataLines.forEach((line) => {
        pdf.text(line, margin, currentY);
        currentY += 5;
      });

      currentY += 5;

      // KPIs Section
      const kpis = this.kpiCards();
      if (kpis.length > 0) {
        pdf.setFontSize(14);
        pdf.setTextColor(15, 23, 42);
        pdf.text("Indicadores Clave (KPIs)", margin, currentY);
        currentY += 8;

        pdf.setFontSize(9);
        pdf.setTextColor(100, 116, 139);
        const kpiCols = 2;
        const kpiWidth = (contentWidth - 5) / kpiCols;
        const kpiRowHeight = 18; // Altura aumentada para acomodar el suffix
        
        // Mostrar todos los KPIs (ahora son más de 6)
        kpis.forEach((kpi, idx) => {
          const col = idx % kpiCols;
          const row = Math.floor(idx / kpiCols);
          const x = margin + col * (kpiWidth + 5);
          const y = currentY + row * kpiRowHeight;

          // Label
          pdf.setFontSize(8);
          pdf.setTextColor(100, 116, 139);
          pdf.text(kpi.label, x, y);
          
          // Value con color si aplica
          pdf.setFontSize(10);
          if (kpi.color) {
            const rgb = this.hexToRgb(kpi.color);
            if (rgb) {
              pdf.setTextColor(rgb.r, rgb.g, rgb.b);
            } else {
              pdf.setTextColor(15, 23, 42);
            }
          } else {
            pdf.setTextColor(15, 23, 42);
          }
          pdf.text(kpi.value, x, y + 5);
          
          // Suffix (texto pequeño y gris, con word-wrap)
          if (kpi.suffix) {
            pdf.setFontSize(7);
            pdf.setTextColor(85, 85, 85); // #555
            // Dividir el texto en líneas que quepan en el ancho de la columna
            const maxWidth = kpiWidth - 2; // Margen interno
            const suffixLines = pdf.splitTextToSize(kpi.suffix, maxWidth);
            suffixLines.forEach((line: string, lineIdx: number) => {
              pdf.text(line, x, y + 10 + (lineIdx * 3.5));
            });
          }
        });
        // Calcular la altura total basada en el KPI con más líneas de suffix
        // Usar un PDF temporal solo para calcular el número de líneas
        const tempPdf = new jsPDF("p", "mm", "a4");
        const maxSuffixLines = Math.max(...kpis.map(kpi => {
          if (!kpi.suffix) return 1;
          const maxWidth = kpiWidth - 2;
          return tempPdf.splitTextToSize(kpi.suffix, maxWidth).length;
        }));
        const suffixHeight = maxSuffixLines > 1 ? (maxSuffixLines - 1) * 3.5 : 0;
        currentY += Math.ceil(kpis.length / kpiCols) * kpiRowHeight + suffixHeight + 5;
      }

      // Charts - we'll capture them individually
      const chartElements = container.querySelectorAll("echarts");
      const chartPromises: Promise<{ dataUrl: string; title: string; height: number }>[] = [];

      chartElements.forEach((chartEl, idx) => {
        const chartCard = chartEl.closest(".ts-card");
        const titleEl = chartCard?.querySelector("h2");
        const title = titleEl?.textContent?.trim() || `Gráfico ${idx + 1}`;

        chartPromises.push(
          html2canvas(chartEl as HTMLElement, { scale: 2, backgroundColor: "#FFFFFF" }).then((canvas) => ({
            dataUrl: canvas.toDataURL("image/png"),
            title,
            height: (canvas.height * contentWidth) / canvas.width,
          }))
        );
      });

      const charts = await Promise.all(chartPromises);

      for (const chart of charts) {
        // Verificar si necesitamos nueva página (considerando el header)
        if (currentY + chart.height + 20 > pageHeight - margin) {
          pdf.addPage();
          drawHeader(); // Dibujar header en la nueva página
          currentY = margin + headerHeight;
        }

        pdf.setFontSize(12);
        pdf.setTextColor(15, 23, 42);
        pdf.text(chart.title, margin, currentY);
        currentY += 7;

        const chartHeight = Math.min(chart.height, pageHeight - currentY - margin);
        const chartWidth = (chart.height * contentWidth) / chart.height;
        pdf.addImage(chart.dataUrl, "PNG", margin, currentY, contentWidth, chartHeight);
        currentY += chartHeight + 10;
      }

      pdf.save(`tacticsphere-informe-${new Date().toISOString().slice(0, 10)}.pdf`);

      try {
        await firstValueFrom(this.auditSvc.logReportExport("dashboard-analytics"));
      } catch {
        // ignore log errors
      }
    } finally {
      this.exportingSignal.set(false);
    }
  }

  private async exportExcel(): Promise<void> {
    // Dynamic import for exceljs - exceljs is CommonJS, so handle it accordingly
    let ExcelJS: any;
    try {
      // Import the CommonJS module
      const exceljsModule = await import("exceljs");
      
      // CommonJS modules: the entire module is the default export
      // exceljs exports Workbook as a property of the module
      // Try different access patterns for CommonJS
      if (exceljsModule.default) {
        // If there's a default export, it might be the module itself
        const defaultExport = exceljsModule.default;
        if (defaultExport.Workbook && typeof defaultExport.Workbook === 'function') {
          ExcelJS = defaultExport;
        } else if (typeof defaultExport === 'object' && defaultExport !== null) {
          // The default might be the module with Workbook on it
          ExcelJS = defaultExport;
        }
      }
      
      // Also check if Workbook is directly on the module (named export)
      if (!ExcelJS || !ExcelJS.Workbook) {
        if (exceljsModule.Workbook && typeof exceljsModule.Workbook === 'function') {
          ExcelJS = exceljsModule;
        } else {
          // Last resort: the module itself might be structured differently
          // In some CommonJS builds, the module is the namespace
          ExcelJS = exceljsModule;
        }
      }
      
      // Final check - if still no Workbook, try accessing it directly
      if (!ExcelJS.Workbook) {
        const WorkbookClass = (exceljsModule as any).Workbook || 
                             (exceljsModule as any).default?.Workbook ||
                             ((exceljsModule as any).default as any)?.Workbook;
        if (WorkbookClass && typeof WorkbookClass === 'function') {
          ExcelJS = { Workbook: WorkbookClass };
        } else {
          console.error("ExcelJS module structure:", {
            keys: Object.keys(exceljsModule),
            hasDefault: !!exceljsModule.default,
            defaultKeys: exceljsModule.default ? Object.keys(exceljsModule.default) : []
          });
          throw new Error("No se pudo encontrar Workbook. El módulo exceljs puede no estar cargado correctamente.");
        }
      }
      
      // Verify Workbook is available and is a constructor
      if (!ExcelJS || typeof ExcelJS.Workbook !== 'function') {
        throw new Error("Workbook no es un constructor válido");
      }
    } catch (error) {
      console.error("Error importing exceljs:", error);
      throw new Error(`Error al cargar exceljs: ${error instanceof Error ? error.message : String(error)}`);
    }

    const filter = this.filterSignal();
    if (!filter?.companyId) return;

    return new Promise(async (resolve, reject) => {
      try {
        // Get data
        const csvBlob = await firstValueFrom(this.analyticsSvc.exportResponsesCsv(filter));
        const text = await csvBlob.text();
        const lines = text.split("\n");
        let headers = lines[0].split(",").map(h => h.trim());
        const data: any[][] = [];

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const values = this.parseCsvLine(lines[i]);
          if (values.length === headers.length) {
            data.push(values.map((v) => v.trim()));
          }
        }

        // Filtrar respuesta_esperada
        const expectedAnswerIndex = headers.findIndex(h => 
          h.toLowerCase() === "respuesta_esperada" || 
          h.toLowerCase() === "expected_answer" ||
          h === "respuesta esperada"
        );
        
        if (expectedAnswerIndex !== -1) {
          headers = headers.filter((_, idx) => idx !== expectedAnswerIndex);
          const filteredData = data.map(row => row.filter((_, idx) => idx !== expectedAnswerIndex));
          data.length = 0;
          data.push(...filteredData);
        }

        // Create workbook - ExcelJS should already have Workbook available
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "TacticSphere";
        workbook.created = new Date();

        // Sheet 1: Summary
        const summarySheet = workbook.addWorksheet("Resumen");
        summarySheet.addRow(["Informe TacticSphere"]);
        summarySheet.addRow(["Generado:", new Date().toLocaleString("es-ES")]);
        summarySheet.addRow(["Filtros aplicados:"]);
        this.filterSummary().forEach((f) => summarySheet.addRow(["", f]));
        summarySheet.addRow([]);
        summarySheet.addRow(["Total de registros:", data.length]);

        // Sheet 2: Data
        const dataSheet = workbook.addWorksheet("Datos");
        dataSheet.addRow(headers);
        data.forEach((row) => dataSheet.addRow(row));

        // Charts data sheets with native Excel charts
        const analytics = this.analytics();
        if (analytics) {
          // 1. Pillar Performance Chart (Bar Chart)
          if (analytics.pillars.length > 0) {
            const pillarsSheet = workbook.addWorksheet("Desempeño por Pilar");
            const sortedPillars = [...analytics.pillars].sort((a, b) => b.percent - a.percent);
            
            pillarsSheet.addRow(["Pilar", "Porcentaje"]);
            sortedPillars.forEach((p) => {
              pillarsSheet.addRow([p.pillar_name, p.percent]);
            });

            // Generate chart from data (not from dashboard) and add as image
            try {
              const chartCanvas = await this.generateChartFromData({
                type: 'bar',
                title: 'Desempeño por Pilar',
                data: sortedPillars.map((p) => ({ label: p.pillar_name, value: p.percent })),
              });
              const imageId = workbook.addImage({
                buffer: chartCanvas,
                extension: 'png',
              });
              pillarsSheet.addImage(imageId, {
                tl: { col: 2.5, row: 0 },
                ext: { width: 600, height: 400 },
              });
            } catch (chartError) {
              console.warn("Chart generation failed, data is available in sheet:", chartError);
            }
          }

          // 2. Coverage Chart (Bar Chart)
          if (analytics.coverage_by_department.length > 0) {
            const coverageSheet = workbook.addWorksheet("Cobertura por Área");
            const sortedCoverage = [...analytics.coverage_by_department]
              .filter((c) => c.total > 0)
              .sort((a, b) => b.coverage_percent - a.coverage_percent)
              .slice(0, 15);

            coverageSheet.addRow(["Departamento", "Cobertura %", "Respondentes", "Total"]);
            sortedCoverage.forEach((c) => {
              coverageSheet.addRow([c.department_name, c.coverage_percent, c.respondents, c.total]);
            });

            // Generate chart from data and add as image
            try {
              const chartCanvas = await this.generateChartFromData({
                type: 'bar',
                title: 'Cobertura por Área',
                data: sortedCoverage.map((c) => ({ label: c.department_name, value: c.coverage_percent })),
              });
              const imageId = workbook.addImage({
                buffer: chartCanvas,
                extension: 'png',
              });
              coverageSheet.addImage(imageId, {
                tl: { col: 4, row: 0 },
                ext: { width: 600, height: 400 },
              });
            } catch (chartError) {
              console.warn("Chart generation failed, data is available in sheet:", chartError);
            }
          }

          // 3. Distribution Chart (Stacked Bar Chart)
          if (analytics.distribution?.global?.length > 0) {
            const distSheet = workbook.addWorksheet("Distribución por Nivel");
            const sortedDist = [...analytics.distribution.global].sort((a, b) => b.pct_ge4 - a.pct_ge4);

            distSheet.addRow(["Pilar", "Nivel 1", "Nivel 2", "Nivel 3", "Nivel 4", "Nivel 5"]);
            sortedDist.forEach((d) => {
              distSheet.addRow([
                d.pillar_name,
                d.levels[0] || 0,
                d.levels[1] || 0,
                d.levels[2] || 0,
                d.levels[3] || 0,
                d.levels[4] || 0,
              ]);
            });

            // Generate stacked bar chart from data and add as image
            try {
              const chartCanvas = await this.generateStackedChartFromData({
                type: 'bar',
                title: 'Distribución por Nivel',
                categories: sortedDist.map((d) => d.pillar_name),
                series: [
                  { name: 'Nivel 1', data: sortedDist.map((d) => d.levels[0] || 0) },
                  { name: 'Nivel 2', data: sortedDist.map((d) => d.levels[1] || 0) },
                  { name: 'Nivel 3', data: sortedDist.map((d) => d.levels[2] || 0) },
                  { name: 'Nivel 4', data: sortedDist.map((d) => d.levels[3] || 0) },
                  { name: 'Nivel 5', data: sortedDist.map((d) => d.levels[4] || 0) },
                ],
              });
              const imageId = workbook.addImage({
                buffer: chartCanvas,
                extension: 'png',
              });
              distSheet.addImage(imageId, {
                tl: { col: 6, row: 0 },
                ext: { width: 700, height: 400 },
              });
            } catch (chartError) {
              console.warn("Chart generation failed, data is available in sheet:", chartError);
            }
          }

          // 4. Ranking Chart (Bar Chart)
          if (analytics.ranking) {
            const rankingSheet = workbook.addWorksheet("Ranking Departamentos");
            rankingSheet.addRow(["Tipo", "Departamento", "Porcentaje"]);
            analytics.ranking.top.forEach((r) => rankingSheet.addRow(["Top 5", r.name, r.value]));
            analytics.ranking.bottom.forEach((r) => rankingSheet.addRow(["A reforzar", r.name, r.value]));

            // Generate chart from data and add as image
            if (analytics.ranking.top.length > 0) {
              try {
                const chartCanvas = await this.generateChartFromData({
                  type: 'bar',
                  title: 'Top 5 Departamentos',
                  data: analytics.ranking.top.map((r) => ({ label: r.name, value: r.value })),
                });
                const imageId = workbook.addImage({
                  buffer: chartCanvas,
                  extension: 'png',
                });
                rankingSheet.addImage(imageId, {
                  tl: { col: 3, row: 0 },
                  ext: { width: 500, height: 300 },
                });
              } catch (chartError) {
                console.warn("Chart generation failed, data is available in sheet:", chartError);
              }
            }
          }

          // 5. Heatmap Data
          if (analytics.heatmap?.length > 0) {
            const heatmapSheet = workbook.addWorksheet("Heatmap Pilar × Depto");
            const pillars = analytics.pillars;
            const departments = analytics.heatmap.slice(0, 10);

            // Header row
            heatmapSheet.addRow(["Departamento", ...pillars.map((p) => p.pillar_name)]);
            
            // Data rows
            departments.forEach((row) => {
              const deptRow: (string | number)[] = [row.department_name || ""];
              pillars.forEach((p) => {
                const cell = row.values.find((v) => v.pillar_id === p.pillar_id);
                deptRow.push(cell?.percent || 0);
              });
              heatmapSheet.addRow(deptRow);
            });

            // Generate chart from data and add as image
            if (pillars.length > 0 && departments.length > 0) {
              try {
                const firstPillarData = departments.map((row) => {
                  const cell = row.values.find((v) => v.pillar_id === pillars[0].pillar_id);
                  return { label: row.department_name || '', value: cell?.percent || 0 };
                });
                const chartCanvas = await this.generateChartFromData({
                  type: 'bar',
                  title: `Heatmap - ${pillars[0].pillar_name}`,
                  data: firstPillarData,
                });
                const imageId = workbook.addImage({
                  buffer: chartCanvas,
                  extension: 'png',
                });
                const colOffset = pillars.length + 2;
                heatmapSheet.addImage(imageId, {
                  tl: { col: colOffset, row: 0 },
                  ext: { width: 500, height: 400 },
                });
              } catch (chartError) {
                console.warn("Chart generation failed, data is available in sheet:", chartError);
              }
            }
          }

          // 6. Balance Chart (Line Chart as approximation of radar)
          if (analytics.pillars.length > 0) {
            const balanceSheet = workbook.addWorksheet("Equilibrio Organizacional");
            balanceSheet.addRow(["Pilar", "Porcentaje"]);
            analytics.pillars.forEach((p) => {
              balanceSheet.addRow([p.pillar_name, p.percent]);
            });

            // Generate line chart from data and add as image
            try {
              const chartCanvas = await this.generateChartFromData({
                type: 'line',
                title: 'Equilibrio Organizacional',
                data: analytics.pillars.map((p) => ({ label: p.pillar_name, value: p.percent })),
              });
              const imageId = workbook.addImage({
                buffer: chartCanvas,
                extension: 'png',
              });
              balanceSheet.addImage(imageId, {
                tl: { col: 2, row: 0 },
                ext: { width: 600, height: 400 },
              });
            } catch (chartError) {
              console.warn("Chart generation failed, data is available in sheet:", chartError);
            }
          }

          // 7. Employee Scatter Chart
          if (analytics.employees.length > 0) {
            const scatterSheet = workbook.addWorksheet("Dispersión de Empleados");
            scatterSheet.addRow(["Empleado", "Porcentaje", "Estadio"]);
            analytics.employees.forEach((emp) => {
              const levelName = this.formatLikertLabel(emp.level).split(" - ")[1] || `Nivel ${emp.level}`;
              scatterSheet.addRow([emp.name || `Empleado ${emp.id}`, emp.percent, levelName]);
            });

            // Generate scatter chart from data and add as image
            try {
              const chartCanvas = await this.generateScatterChartFromData({
                title: 'Dispersión de Empleados',
                data: analytics.employees.map((emp) => ({
                  name: emp.name || `Empleado ${emp.id}`,
                  value: emp.percent,
                  level: emp.level,
                })),
              });
              const imageId = workbook.addImage({
                buffer: chartCanvas,
                extension: 'png',
              });
              scatterSheet.addImage(imageId, {
                tl: { col: 3, row: 0 },
                ext: { width: 700, height: 500 },
              });
            } catch (chartError) {
              console.warn("Chart generation failed, data is available in sheet:", chartError);
            }
          }

          // 8. Likert Distribution by Stage
          const likertEmployees = this.likertBucketEmployees();
          if (likertEmployees.length > 0) {
            const likertSheet = workbook.addWorksheet("Distribución por Estadio");
            const stageCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            likertEmployees.forEach((emp) => {
              if (emp.level >= 1 && emp.level <= 5) {
                stageCounts[emp.level] = (stageCounts[emp.level] || 0) + 1;
              }
            });

            const levels = this.likertLevelsSignal();
            likertSheet.addRow(["Estadio", "Cantidad de Empleados", "Porcentaje"]);
            const total = likertEmployees.length;
            [1, 2, 3, 4, 5].forEach((level) => {
              const count = stageCounts[level] || 0;
              const percent = total > 0 ? (count / total) * 100 : 0;
              const levelName = levels.find((l) => l.valor === level)?.nombre || `Nivel ${level}`;
              likertSheet.addRow([levelName, count, this.round(percent)]);
            });

            // Generate bar chart from data and add as image
            try {
              const chartCanvas = await this.generateChartFromData({
                type: 'bar',
                title: 'Distribución de Empleados por Estadio',
                data: [1, 2, 3, 4, 5].map((level) => {
                  const count = stageCounts[level] || 0;
                  const percent = total > 0 ? (count / total) * 100 : 0;
                  const levelName = levels.find((l) => l.valor === level)?.nombre || `Nivel ${level}`;
                  return { label: levelName, value: this.round(percent) };
                }),
              });
              const imageId = workbook.addImage({
                buffer: chartCanvas,
                extension: 'png',
              });
              likertSheet.addImage(imageId, {
                tl: { col: 3, row: 0 },
                ext: { width: 600, height: 400 },
              });
            } catch (chartError) {
              console.warn("Chart generation failed, data is available in sheet:", chartError);
            }
          }

          // 9. New KPIs (Estadio actual, Departamentos)
          const kpis = this.kpiCards();
          if (kpis.length > 0) {
            const kpiSheet = workbook.addWorksheet("Indicadores Clave (KPIs)");
            kpiSheet.addRow(["Indicador", "Valor", "Detalle"]);
            kpis.forEach((kpi) => {
              kpiSheet.addRow([
                kpi.label,
                kpi.value,
                kpi.suffix || "",
              ]);
            });
          }

          // 10. Mapa Organizacional (Treemap)
          if (analytics.coverage_by_department?.length > 0 && analytics.heatmap?.length > 0) {
            const treemapSheet = workbook.addWorksheet("Mapa Organizacional");
            const coverage = analytics.coverage_by_department.filter((dept) => (dept.total ?? 0) > 0);
            const heatmapRows = analytics.heatmap;
            
            const heatmapByDept = new Map<number | null, number>();
            heatmapRows.forEach((row) => {
              heatmapByDept.set(row.department_id, row.average ?? 0);
            });

            treemapSheet.addRow(["Departamento", "Colaboradores", "Desempeño Promedio (%)"]);
            coverage.forEach((dept) => {
              const avgPerformance = heatmapByDept.get(dept.department_id) ?? 0;
              treemapSheet.addRow([
                dept.department_name,
                dept.total || 0,
                this.formatNumber(avgPerformance),
              ]);
            });

            // Generate treemap chart from option and add as image
            try {
              const treemapOption = this.organizationalTreemapOption();
              const chartCanvas = await this.generateChartFromOption(treemapOption, 'Mapa Organizacional');
              const imageId = workbook.addImage({
                buffer: chartCanvas,
                extension: 'png',
              });
              treemapSheet.addImage(imageId, {
                tl: { col: 3, row: 0 },
                ext: { width: 700, height: 500 },
              });
            } catch (chartError) {
              console.warn("Treemap chart generation failed, data is available in sheet:", chartError);
            }
          }

          // 11. Matriz Impacto vs Desempeño
          if (analytics.pillars.length > 0) {
            const impactSheet = workbook.addWorksheet("Matriz Impacto vs Desempeño");
            impactSheet.addRow(["Pilar", "Desempeño (%)", "Importancia (%)", "Promedio del Pilar (%)"]);
            
            const avgPerformance = analytics.pillars.reduce((sum, p) => sum + p.percent, 0) / analytics.pillars.length;
            const avgImportance = analytics.pillars.reduce((sum, p) => sum + p.pct_ge4, 0) / analytics.pillars.length;
            
            analytics.pillars.forEach((p) => {
              impactSheet.addRow([
                p.pillar_name,
                this.formatNumber(p.percent),
                this.formatNumber(p.pct_ge4),
                this.formatNumber(p.percent),
              ]);
            });

            // Add quadrant information
            impactSheet.addRow([]);
            impactSheet.addRow(["Promedio Desempeño:", this.formatNumber(avgPerformance) + "%"]);
            impactSheet.addRow(["Promedio Importancia:", this.formatNumber(avgImportance) + "%"]);

            // Generate impact-performance matrix chart from option and add as image
            try {
              const impactOption = this.impactPerformanceMatrixOption();
              const chartCanvas = await this.generateChartFromOption(impactOption, 'Matriz Impacto vs Desempeño');
              const imageId = workbook.addImage({
                buffer: chartCanvas,
                extension: 'png',
              });
              impactSheet.addImage(imageId, {
                tl: { col: 4, row: 0 },
                ext: { width: 700, height: 500 },
              });
            } catch (chartError) {
              console.warn("Impact-Performance matrix chart generation failed, data is available in sheet:", chartError);
            }
          }
        }

        // Generate buffer and download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `tacticsphere-informe-${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        resolve();
      } catch (error) {
        console.error("Export Excel failed", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        reject(new Error(`Error al generar Excel: ${errorMessage}`));
      }
    });
  }

  // Métodos helper que retornan Blobs para crear ZIPs
  private async generatePdfBlob(): Promise<{ blob: Blob; filename: string }> {
    if (this.exporting()) {
      throw new Error("Ya se está generando un informe");
    }

    this.exportingSignal.set(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      let container = document.getElementById("analytics-export");
      if (!container) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        container = document.getElementById("analytics-export");
      }
      
      if (!container) {
        throw new Error("No pudimos encontrar el contenido para exportar.");
      }

      this.resizeAllCharts();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await this.ensureLogo();
      await this.ensureCurrentUser();

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const headerHeight = 25;
      const contentWidth = pageWidth - 2 * margin;
      let currentY = margin + headerHeight;

      const drawHeader = () => {
        if (this.logoDataUrl) {
          pdf.addImage(this.logoDataUrl, "PNG", margin, margin, 20, 20);
          pdf.setFontSize(18);
          pdf.setTextColor(15, 23, 42);
          pdf.text("TacticSphere - Informe Analítico", margin + 22, margin + 12);
        } else {
          pdf.setFontSize(18);
          pdf.setTextColor(15, 23, 42);
          pdf.text("TacticSphere - Informe Analítico", margin, margin + 8);
        }
      };

      drawHeader();

      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      const generatedAt = new Date();
      const metadataLines = this.buildMetadataLines(generatedAt);
      metadataLines.forEach((line) => {
        pdf.text(line, margin, currentY);
        currentY += 5;
      });

      currentY += 5;

      const kpis = this.kpiCards();
      if (kpis.length > 0) {
        pdf.setFontSize(14);
        pdf.setTextColor(15, 23, 42);
        pdf.text("Indicadores Clave (KPIs)", margin, currentY);
        currentY += 8;

        pdf.setFontSize(9);
        pdf.setTextColor(100, 116, 139);
        const kpiCols = 2;
        const kpiWidth = (contentWidth - 5) / kpiCols;
        const kpiRowHeight = 18;
        
        kpis.forEach((kpi, idx) => {
          const col = idx % kpiCols;
          const row = Math.floor(idx / kpiCols);
          const x = margin + col * (kpiWidth + 5);
          const y = currentY + row * kpiRowHeight;

          pdf.setFontSize(8);
          pdf.setTextColor(100, 116, 139);
          pdf.text(kpi.label, x, y);
          
          pdf.setFontSize(10);
          if (kpi.color) {
            const rgb = this.hexToRgb(kpi.color);
            if (rgb) {
              pdf.setTextColor(rgb.r, rgb.g, rgb.b);
            } else {
              pdf.setTextColor(15, 23, 42);
            }
          } else {
            pdf.setTextColor(15, 23, 42);
          }
          pdf.text(kpi.value, x, y + 5);
          
          if (kpi.suffix) {
            pdf.setFontSize(7);
            pdf.setTextColor(85, 85, 85);
            const maxWidth = kpiWidth - 2;
            const suffixLines = pdf.splitTextToSize(kpi.suffix, maxWidth);
            suffixLines.forEach((line: string, lineIdx: number) => {
              pdf.text(line, x, y + 10 + (lineIdx * 3.5));
            });
          }
        });
        const tempPdf = new jsPDF("p", "mm", "a4");
        const maxSuffixLines = Math.max(...kpis.map(kpi => {
          if (!kpi.suffix) return 1;
          const maxWidth = kpiWidth - 2;
          return tempPdf.splitTextToSize(kpi.suffix, maxWidth).length;
        }));
        const suffixHeight = maxSuffixLines > 1 ? (maxSuffixLines - 1) * 3.5 : 0;
        currentY += Math.ceil(kpis.length / kpiCols) * kpiRowHeight + suffixHeight + 5;
      }

      const chartElements = container.querySelectorAll("echarts");
      const chartPromises: Promise<{ dataUrl: string; title: string; height: number }>[] = [];

      chartElements.forEach((chartEl, idx) => {
        const chartCard = chartEl.closest(".ts-card");
        const titleEl = chartCard?.querySelector("h2");
        const title = titleEl?.textContent?.trim() || `Gráfico ${idx + 1}`;

        chartPromises.push(
          html2canvas(chartEl as HTMLElement, { scale: 2, backgroundColor: "#FFFFFF" }).then((canvas) => ({
            dataUrl: canvas.toDataURL("image/png"),
            title,
            height: (canvas.height * contentWidth) / canvas.width,
          }))
        );
      });

      const charts = await Promise.all(chartPromises);

      for (const chart of charts) {
        if (currentY + chart.height + 20 > pageHeight - margin) {
          pdf.addPage();
          drawHeader();
          currentY = margin + headerHeight;
        }

        pdf.setFontSize(12);
        pdf.setTextColor(15, 23, 42);
        pdf.text(chart.title, margin, currentY);
        currentY += 7;

        const chartHeight = Math.min(chart.height, pageHeight - currentY - margin);
        pdf.addImage(chart.dataUrl, "PNG", margin, currentY, contentWidth, chartHeight);
        currentY += chartHeight + 10;
      }

      const pdfArrayBuffer = pdf.output("arraybuffer");
      const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" });
      const dateStr = new Date().toISOString().slice(0, 10);
      return { blob: pdfBlob, filename: `tacticsphere-informe-${dateStr}.pdf` };
    } finally {
      this.exportingSignal.set(false);
    }
  }

  private async generateCsvBlob(): Promise<{ blob: Blob; filename: string }> {
    const filter = this.filterSignal();
    if (!filter?.companyId) {
      throw new Error("No se ha seleccionado una empresa");
    }

    const csvBlob = await firstValueFrom(this.analyticsSvc.exportResponsesCsv(filter));
    const dateStr = new Date().toISOString().slice(0, 10);
    return { blob: csvBlob, filename: `tacticsphere-informe-${dateStr}.csv` };
  }

  private async generateJsonBlob(): Promise<{ blob: Blob; filename: string }> {
    const filter = this.filterSignal();
    if (!filter?.companyId) {
      throw new Error("No se ha seleccionado una empresa");
    }

    const csvBlob = await firstValueFrom(this.analyticsSvc.exportResponsesCsv(filter));
    const text = await csvBlob.text();
    const lines = text.split("\n");
    let headers = lines[0].split(",").map(h => h.trim());
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = this.parseCsvLine(lines[i]);
      if (values.length === headers.length) {
        const obj: any = {};
        headers.forEach((header, idx) => {
          obj[header] = values[idx]?.trim() || "";
        });
        data.push(obj);
      }
    }

    // Filtrar respuesta_esperada
    const { filteredHeaders, filteredData } = this.filterExpectedAnswerColumn(headers, data);
    headers = filteredHeaders;
    const finalData = filteredData.map(record => {
      if (typeof record === 'object' && !Array.isArray(record)) {
        const filtered: any = {};
        filteredHeaders.forEach(header => {
          if (record.hasOwnProperty(header)) {
            filtered[header] = record[header];
          }
        });
        return filtered;
      }
      return record;
    });

    const jsonData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        filters: this.filterSummary(),
        totalRecords: finalData.length,
      },
      data: finalData,
    };

    const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
    const dateStr = new Date().toISOString().slice(0, 10);
    return { blob: jsonBlob, filename: `tacticsphere-informe-${dateStr}.json` };
  }

  private async generateXmlBlob(): Promise<{ blob: Blob; filename: string }> {
    const filter = this.filterSignal();
    if (!filter?.companyId) {
      throw new Error("No se ha seleccionado una empresa");
    }

    const csvBlob = await firstValueFrom(this.analyticsSvc.exportResponsesCsv(filter));
    const text = await csvBlob.text();
    const lines = text.split("\n");
    let headers = lines[0].split(",").map(h => h.trim());
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = this.parseCsvLine(lines[i]);
      if (values.length === headers.length) {
        const obj: any = {};
        headers.forEach((header, idx) => {
          obj[header] = values[idx]?.trim() || "";
        });
        data.push(obj);
      }
    }

    // Filtrar respuesta_esperada
    const { filteredHeaders, filteredData } = this.filterExpectedAnswerColumn(headers, data);
    headers = filteredHeaders;
    const finalData = filteredData.map(record => {
      if (typeof record === 'object' && !Array.isArray(record)) {
        const filtered: any = {};
        filteredHeaders.forEach(header => {
          if (record.hasOwnProperty(header)) {
            filtered[header] = record[header];
          }
        });
        return filtered;
      }
      return record;
    });

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += "<report>\n";
    xml += "  <metadata>\n";
    xml += `    <generatedAt>${new Date().toISOString()}</generatedAt>\n`;
    xml += "    <filters>\n";
    this.filterSummary().forEach((filter) => {
      xml += `      <filter>${this.escapeXml(filter)}</filter>\n`;
    });
    xml += "    </filters>\n";
    xml += `    <totalRecords>${finalData.length}</totalRecords>\n`;
    xml += "  </metadata>\n";
    xml += "  <data>\n";

    finalData.forEach((record) => {
      xml += "    <record>\n";
      Object.keys(record).forEach((key) => {
        const value = record[key];
        const safeKey = key.replace(/[^a-zA-Z0-9_]/g, "_");
        xml += `      <${safeKey}>${this.escapeXml(String(value))}</${safeKey}>\n`;
      });
      xml += "    </record>\n";
    });

    xml += "  </data>\n";
    xml += "</report>";

    const xmlBlob = new Blob([xml], { type: "application/xml" });
    const dateStr = new Date().toISOString().slice(0, 10);
    return { blob: xmlBlob, filename: `tacticsphere-informe-${dateStr}.xml` };
  }

  private async generateExcelBlob(): Promise<{ blob: Blob; filename: string }> {
    // Dynamic import for exceljs - exceljs is CommonJS, so handle it accordingly
    let ExcelJS: any;
    try {
      // Import the CommonJS module
      const exceljsModule = await import("exceljs");
      
      // CommonJS modules: the entire module is the default export
      // exceljs exports Workbook as a property of the module
      // Try different access patterns for CommonJS
      if (exceljsModule.default) {
        // If there's a default export, it might be the module itself
        const defaultExport = exceljsModule.default;
        if (defaultExport.Workbook && typeof defaultExport.Workbook === 'function') {
          ExcelJS = defaultExport;
        } else if (typeof defaultExport === 'object' && defaultExport !== null) {
          // The default might be the module with Workbook on it
          ExcelJS = defaultExport;
        }
      }
      
      // Also check if Workbook is directly on the module (named export)
      if (!ExcelJS || !ExcelJS.Workbook) {
        if (exceljsModule.Workbook && typeof exceljsModule.Workbook === 'function') {
          ExcelJS = exceljsModule;
        } else {
          // Last resort: the module itself might be structured differently
          // In some CommonJS builds, the module is the namespace
          ExcelJS = exceljsModule;
        }
      }
      
      // Final check - if still no Workbook, try accessing it directly
      if (!ExcelJS.Workbook) {
        const WorkbookClass = (exceljsModule as any).Workbook || 
                             (exceljsModule as any).default?.Workbook ||
                             ((exceljsModule as any).default as any)?.Workbook;
        if (WorkbookClass && typeof WorkbookClass === 'function') {
          ExcelJS = { Workbook: WorkbookClass };
        } else {
          console.error("ExcelJS module structure:", {
            keys: Object.keys(exceljsModule),
            hasDefault: !!exceljsModule.default,
            defaultKeys: exceljsModule.default ? Object.keys(exceljsModule.default) : []
          });
          throw new Error("No se pudo encontrar Workbook. El módulo exceljs puede no estar cargado correctamente.");
        }
      }
      
      // Verify Workbook is available and is a constructor
      if (!ExcelJS || typeof ExcelJS.Workbook !== 'function') {
        throw new Error("Workbook no es un constructor válido");
      }
    } catch (error) {
      console.error("Error importing exceljs:", error);
      throw new Error(`Error al cargar exceljs: ${error instanceof Error ? error.message : String(error)}`);
    }

    const filter = this.filterSignal();
    if (!filter?.companyId) {
      throw new Error("No se ha seleccionado una empresa");
    }

    const csvBlob = await firstValueFrom(this.analyticsSvc.exportResponsesCsv(filter));
    const text = await csvBlob.text();
    const lines = text.split("\n");
    let headers = lines[0].split(",").map(h => h.trim());
    const data: any[][] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = this.parseCsvLine(lines[i]);
      if (values.length === headers.length) {
        data.push(values.map((v) => v.trim()));
      }
    }

    // Filtrar respuesta_esperada
    const expectedAnswerIndex = headers.findIndex(h => 
      h.toLowerCase() === "respuesta_esperada" || 
      h.toLowerCase() === "expected_answer" ||
      h === "respuesta esperada"
    );
    
    if (expectedAnswerIndex !== -1) {
      headers = headers.filter((_, idx) => idx !== expectedAnswerIndex);
      const filteredData = data.map(row => row.filter((_, idx) => idx !== expectedAnswerIndex));
      data.length = 0;
      data.push(...filteredData);
    }

    // Create workbook - ExcelJS should already have Workbook available
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "TacticSphere";
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet("Resumen");
    summarySheet.addRow(["Informe TacticSphere"]);
    summarySheet.addRow(["Generado:", new Date().toLocaleString("es-ES")]);
    summarySheet.addRow(["Filtros aplicados:"]);
    this.filterSummary().forEach((f) => summarySheet.addRow(["", f]));
    summarySheet.addRow([]);
    summarySheet.addRow(["Total de registros:", data.length]);

    const dataSheet = workbook.addWorksheet("Datos");
    dataSheet.addRow(headers);
    data.forEach((row) => dataSheet.addRow(row));

    const analytics = this.analytics();
    if (analytics) {
      if (analytics.pillars.length > 0) {
        const pillarsSheet = workbook.addWorksheet("Desempeño por Pilar");
        const sortedPillars = [...analytics.pillars].sort((a, b) => b.percent - a.percent);
        pillarsSheet.addRow(["Pilar", "Porcentaje"]);
        sortedPillars.forEach((p) => {
          pillarsSheet.addRow([p.pillar_name, p.percent]);
        });
      }

      if (analytics.coverage_by_department.length > 0) {
        const coverageSheet = workbook.addWorksheet("Cobertura por Área");
        const sortedCoverage = [...analytics.coverage_by_department]
          .filter((c) => c.total > 0)
          .sort((a, b) => b.coverage_percent - a.coverage_percent)
          .slice(0, 15);
        coverageSheet.addRow(["Departamento", "Cobertura %", "Respondentes", "Total"]);
        sortedCoverage.forEach((c) => {
          coverageSheet.addRow([c.department_name, c.coverage_percent, c.respondents, c.total]);
        });
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const excelBlob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const dateStr = new Date().toISOString().slice(0, 10);
    return { blob: excelBlob, filename: `tacticsphere-informe-${dateStr}.xlsx` };
  }

  private async downloadAsZip(files: { blob: Blob; filename: string }[]): Promise<void> {
    const zip = new JSZip();
    
    for (const file of files) {
      zip.file(file.filename, file.blob);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    anchor.download = `tacticsphere-informes-${dateStr}.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}

