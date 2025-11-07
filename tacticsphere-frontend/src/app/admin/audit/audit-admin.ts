import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { LucideAngularModule } from 'lucide-angular';

import { CompanyService } from '../../company.service';
import { AuditService } from '../../services/audit.service';
import { AuthService } from '../../auth.service';
import { AuditLog, Empresa, RolEnum } from '../../types';

type FilterValue = string | number | null;

@Component({
  standalone: true,
  selector: 'app-audit-admin',
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="ts-page">
      <div class="ts-container space-y-6">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 class="ts-title">Registro de auditoría</h1>
            <p class="ts-subtitle">Monitorea las acciones clave realizadas dentro de la plataforma.</p>
          </div>
          <button
            type="button"
            class="ts-btn ts-btn--positive"
            (click)="exportCsv()"
            [disabled]="exporting || loading"
          >
            <lucide-icon name="Download" class="h-4 w-4"></lucide-icon>
            {{ exporting ? 'Exportando...' : 'Exportar CSV' }}
          </button>
        </div>

        <div class="ts-card space-y-4">
          <form class="grid gap-4 md:grid-cols-2 xl:grid-cols-4" (ngSubmit)="applyFilters()">
            <label class="space-y-2">
              <span class="ts-label">Fecha desde</span>
              <input type="datetime-local" class="ts-input" [(ngModel)]="filters.date_from" name="date_from" />
            </label>
            <label class="space-y-2">
              <span class="ts-label">Fecha hasta</span>
              <input type="datetime-local" class="ts-input" [(ngModel)]="filters.date_to" name="date_to" />
            </label>
            <label class="space-y-2">
              <span class="ts-label">Empresa</span>
              <select class="ts-select" [(ngModel)]="filters.empresa_id" name="empresa_id">
                <option [ngValue]="null">Todas</option>
                <option *ngFor="let c of companies" [ngValue]="c.id">{{ c.nombre }}</option>
              </select>
            </label>
            <label class="space-y-2">
              <span class="ts-label">Usuario (email)</span>
              <input class="ts-input" [(ngModel)]="filters.user_email" name="user_email" placeholder="usuario@dominio.com" />
            </label>
            <label class="space-y-2">
              <span class="ts-label">Rol</span>
              <select class="ts-select" [(ngModel)]="filters.user_role" name="user_role">
                <option value="">Todos</option>
                <option *ngFor="let r of roles" [value]="r">{{ r }}</option>
              </select>
            </label>
            <label class="space-y-2">
              <span class="ts-label">Acción</span>
              <select class="ts-select" [(ngModel)]="filters.action" name="action">
                <option value="">Todas</option>
                <option *ngFor="let action of auditActions" [value]="action">{{ action }}</option>
              </select>
            </label>
            <label class="space-y-2">
              <span class="ts-label">Entidad</span>
              <input class="ts-input" [(ngModel)]="filters.entity_type" name="entity_type" placeholder="Usuario, Empresa, ..." />
            </label>
            <label class="space-y-2">
              <span class="ts-label">Texto</span>
              <input class="ts-input" [(ngModel)]="filters.search" name="search" placeholder="Buscar en notas" />
            </label>
            <label class="space-y-2">
              <span class="ts-label">Límite</span>
              <input class="ts-input" type="number" min="10" max="500" [(ngModel)]="filters.limit" name="limit" />
            </label>
            <div class="flex items-end gap-3 md:col-span-2 xl:col-span-4">
              <button class="ts-btn ts-btn--positive" type="submit" [disabled]="loading">Aplicar filtros</button>
              <button class="ts-btn ts-btn--secondary" type="button" (click)="resetFilters()" [disabled]="loading">
                Limpiar
              </button>
              <span class="text-xs text-neutral-400" *ngIf="logs.length">
                {{ logs.length }} registros visibles
              </span>
            </div>
          </form>
        </div>

        <div class="ts-card space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-ink">Eventos</h2>
              <p class="text-sm text-neutral-400">Registros ordenados del más reciente al más antiguo.</p>
            </div>
            <div class="text-sm text-neutral-500" *ngIf="loading">Cargando...</div>
          </div>

          <div *ngIf="error" class="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {{ error }}
          </div>
          <div *ngIf="message" class="rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-[#0b7a56]">
            {{ message }}
          </div>

          <div *ngIf="!loading && !logs.length" class="rounded-xl border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500">
            No se encontraron registros con los filtros actuales.
          </div>

          <div class="overflow-x-auto" *ngIf="!loading && logs.length">
            <table class="ts-table min-w-full text-xs">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Empresa</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Acción</th>
                  <th>Entidad</th>
                  <th>Notas</th>
                  <th>IP</th>
                  <th>Ruta</th>
                  <th *ngIf="isAdminSistema">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let log of logs">
                  <td class="whitespace-nowrap">{{ log.created_at | date: 'short' }}</td>
                  <td>{{ companyName(log.empresa_id) }}</td>
                  <td>{{ log.user_email || '—' }}</td>
                  <td>{{ log.user_role || '—' }}</td>
                  <td class="font-semibold">{{ log.action }}</td>
                  <td>{{ log.entity_type || '—' }} <span *ngIf="log.entity_id">#{{ log.entity_id }}</span></td>
                  <td>{{ log.notes || '—' }}</td>
                  <td>{{ log.ip || '—' }}</td>
                  <td class="whitespace-nowrap">
                    <span class="text-neutral-400">{{ log.method }}</span>
                    <span class="ml-1">{{ log.path }}</span>
                  </td>
                  <td *ngIf="isAdminSistema">
                    <button
                      type="button"
                      class="ts-btn ts-btn--danger text-xs"
                      (click)="deleteLog(log)"
                      [disabled]="deletingId === log.id"
                    >
                      {{ deletingId === log.id ? 'Eliminando...' : 'Eliminar' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AuditAdminComponent implements OnInit {
  private audit = inject(AuditService);
  private companiesApi = inject(CompanyService);
  private auth = inject(AuthService);

  companies: Empresa[] = [];
  logs: AuditLog[] = [];

  loading = false;
  exporting = false;
  error = '';
  message = '';
  deletingId: number | null = null;
  readonly isAdminSistema = this.auth.hasRole('ADMIN_SISTEMA');

  roles: RolEnum[] = ['ADMIN_SISTEMA', 'ADMIN', 'ANALISTA', 'USUARIO'];
  auditActions: string[] = [
    'LOGIN',
    'LOGOUT',
    'USER_CREATE',
    'USER_UPDATE',
    'USER_DELETE',
    'USER_PASSWORD_RESET',
    'COMPANY_CREATE',
    'COMPANY_DELETE',
    'DEPARTMENT_CREATE',
    'DEPARTMENT_DELETE',
    'EMPLOYEE_CREATE',
    'EMPLOYEE_UPDATE',
    'PILLAR_CREATE',
    'PILLAR_DELETE',
    'QUESTION_CREATE',
    'QUESTION_DELETE',
    'ASSIGNMENT_CREATE',
    'SURVEY_ANSWER_BULK',
    'REPORT_EXPORT',
    'AUDIT_EXPORT',
    'AUDIT_DELETE',
  ];

  filters: {
    date_from: string;
    date_to: string;
    empresa_id: FilterValue;
    user_email: string;
    user_role: string;
    action: string;
    entity_type: string;
    search: string;
    limit: number;
  } = {
    date_from: '',
    date_to: '',
    empresa_id: null,
    user_email: '',
    user_role: '',
    action: '',
    entity_type: '',
    search: '',
    limit: 100,
  };

  ngOnInit(): void {
    this.loadCompanies();
    this.loadLogs();
  }

  companyName(id: number | null | undefined): string {
    if (!id) return '—';
    return this.companies.find((c) => c.id === id)?.nombre ?? `#${id}`;
  }

  applyFilters(): void {
    this.loadLogs();
  }

  resetFilters(): void {
    this.filters = {
      date_from: '',
      date_to: '',
      empresa_id: null,
      user_email: '',
      user_role: '',
      action: '',
      entity_type: '',
      search: '',
      limit: 100,
    };
    this.loadLogs();
  }

  private loadCompanies(): void {
    this.companiesApi.list().subscribe({
      next: (rows) => (this.companies = rows ?? []),
    });
  }

  private loadLogs(preserveMessage = false): void {
    this.loading = true;
    this.error = '';
    if (!preserveMessage) {
      this.message = '';
    }
    this.audit
      .list(this.serializeFilters())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (rows) => (this.logs = rows ?? []),
        error: (err) => {
          console.error('Error cargando auditoría', err);
          this.error = err?.error?.detail ?? 'No fue posible cargar el registro de auditoría.';
          this.logs = [];
        },
      });
  }

  exportCsv(): void {
    this.exporting = true;
    this.error = '';
    this.audit
      .exportCsv(this.serializeFilters())
      .pipe(finalize(() => (this.exporting = false)))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `audit-log-${new Date().toISOString()}.csv`;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: (err) => {
          console.error('Error exportando auditoría', err);
          this.error = err?.error?.detail ?? 'No fue posible exportar el registro.';
        },
      });
  }

  deleteLog(log: AuditLog): void {
    if (!this.isAdminSistema) {
      return;
    }
    const password = prompt(`Ingresa tu contraseña para eliminar el registro #${log.id}:`);
    if (!password) {
      return;
    }
    this.error = '';
    this.message = '';
    this.deletingId = log.id;
    this.audit
      .deleteLog(log.id, password)
      .pipe(finalize(() => (this.deletingId = null)))
      .subscribe({
        next: () => {
          this.message = 'Registro eliminado correctamente.';
          this.loadLogs(true);
        },
        error: (err) => {
          console.error('Error eliminando auditoría', err);
          this.error = err?.error?.detail ?? 'No fue posible eliminar el registro.';
        },
      });
  }

  private serializeFilters(): Record<string, string | number> {
    const payload: Record<string, string | number> = {
      limit: this.filters.limit || 100,
    };

    if (this.filters.date_from) {
      payload['date_from'] = new Date(this.filters.date_from).toISOString();
    }
    if (this.filters.date_to) {
      payload['date_to'] = new Date(this.filters.date_to).toISOString();
    }
    if (this.filters.empresa_id) {
      payload['empresa_id'] = Number(this.filters.empresa_id);
    }
    if (this.filters.user_email.trim()) {
      payload['user_email'] = this.filters.user_email.trim();
    }
    if (this.filters.user_role) {
      payload['user_role'] = this.filters.user_role;
    }
    if (this.filters.action) {
      payload['action'] = this.filters.action;
    }
    if (this.filters.entity_type.trim()) {
      payload['entity_type'] = this.filters.entity_type.trim();
    }
    if (this.filters.search.trim()) {
      payload['search'] = this.filters.search.trim();
    }
    return payload;
  }
}
