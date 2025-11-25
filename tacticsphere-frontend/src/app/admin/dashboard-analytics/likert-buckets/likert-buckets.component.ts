import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

export interface LikertBucketEmployee {
  id: number;
  level: number;
  nombre: string;
  apellidos?: string | null;
  rut?: string | null;
}

export type LikertBucketScope = 'global' | 'company' | 'department' | 'employee';

export interface LikertBucketsFilter {
  scope: LikertBucketScope;
}

interface LikertBucketConfig {
  level: number;
  label: string;
  color: string;
  subtitle: string;
}

@Component({
  selector: 'app-likert-buckets',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './likert-buckets.component.html',
  styleUrls: ['./likert-buckets.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LikertBucketsComponent {
  @Input() employees: LikertBucketEmployee[] = [];
  @Input() filter: LikertBucketsFilter | null = null;
  @Input() selectedEmployeeId: number | null = null; // Para resaltar el empleado seleccionado
  @Output() employeeClick = new EventEmitter<number>();

  private readonly buckets: LikertBucketConfig[] = [
    { level: 1, label: 'Inicial', subtitle: 'Procesos informales, foco operativo.', color: '#EF4444' },
    { level: 2, label: 'Básico', subtitle: 'Buenas prácticas aisladas.', color: '#EAB308' },
    { level: 3, label: 'Intermedio', subtitle: 'Procesos definidos en evolución.', color: '#3B82F6' },
    { level: 4, label: 'Avanzado', subtitle: 'Optimización y medición constante.', color: '#22C55E' },
    { level: 5, label: 'Innovador', subtitle: 'Estrategia data-driven y adaptable.', color: '#0EA5E9' },
  ];

  get shouldDisplay(): boolean {
    const scope = this.filter?.scope;
    // Mostrar el gráfico de Estadios Likert en:
    // - Vista global (todas las empresas): scope === 'global'
    // - Vista por empresa: scope === 'company'
    // - Vista por departamento: scope === 'department'
    // No mostrar en vista por empleado individual: scope === 'employee'
    return scope === 'global' || scope === 'company' || scope === 'department';
  }

  get totalEmployeesCount(): number {
    return this.employees?.length ?? 0;
  }

  get groupedBuckets(): Array<LikertBucketConfig & { employees: LikertBucketEmployee[] }> {
    const normalized = this.employees ?? [];
    return this.buckets.map((bucket) => ({
      ...bucket,
      employees: normalized
        .filter((employee) => employee.level === bucket.level)
        .sort((a, b) => this.buildFullName(a).localeCompare(this.buildFullName(b))),
    }));
  }

  trackByBucket = (_: number, bucket: LikertBucketConfig & { employees: LikertBucketEmployee[] }) => bucket.level;

  trackByEmployee = (_: number, employee: LikertBucketEmployee) => employee.id;

  handleEmployeeClick(employeeId: number): void {
    this.employeeClick.emit(employeeId);
  }

  formatEmployeeIdentity(employee: LikertBucketEmployee): string {
    const name = this.buildFullName(employee);
    const rut = (employee.rut ?? '').trim();
    return rut ? `${name} - ${rut}` : name;
  }

  private buildFullName(employee: LikertBucketEmployee): string {
    const parts = [employee.nombre, employee.apellidos]
      .map((value) => (value ?? '').trim())
      .filter((value) => !!value);
    if (parts.length) {
      return parts.join(' ');
    }
    return `Empleado ${employee.id}`;
  }
}
