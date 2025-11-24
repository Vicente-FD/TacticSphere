import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { LucideAngularModule } from 'lucide-angular';
import { ModalComponent } from '../../shared/ui/modal/modal.component';

import { CompanyService } from '../../company.service';
import { AuditService } from '../../services/audit.service';
import { AuthService } from '../../auth.service';
import { AuditLog, Empresa, RolEnum } from '../../types';

type FilterValue = string | number | null;

@Component({
  standalone: true,
  selector: 'app-audit-admin',
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent],
  template: `
    <div class="ts-page">
      <div class="ts-container space-y-6">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 class="ts-title">Registro de auditoría</h1>
            <p class="ts-subtitle">Monitorea las acciones clave realizadas dentro de la plataforma.</p>
          </div>
          <div class="flex flex-wrap gap-3">
            <button type="button" class="ts-btn ts-btn--ghost gap-2" (click)="toggleFilters()">
              <lucide-icon name="SlidersHorizontal" class="h-4 w-4" strokeWidth="1.75"></lucide-icon>
              <span>{{ showFilters ? 'Ocultar filtros' : 'Mostrar filtros' }}</span>
            </button>
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
        </div>

        <div class="ts-card space-y-4" *ngIf="showFilters">
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
                <option *ngFor="let r of roles" [value]="r">{{ formatRoleLabel(r) }}</option>
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
            <div class="flex items-end gap-3 md:col-span-2 xl:col-span-4">
              <button class="ts-btn ts-btn--positive" type="submit" [disabled]="loading">Aplicar filtros</button>
              <button class="ts-btn ts-btn--secondary" type="button" (click)="resetFilters()" [disabled]="loading">
                Limpiar
              </button>
            </div>
          </form>
        </div>

        <div class="space-y-3">
          <div class="flex justify-end pr-6">
            <button
              *ngIf="isAdminSistema"
              type="button"
              class="ts-btn ts-btn--danger"
              (click)="openClearAllDialog()"
              [disabled]="clearing || loading"
            >
              <lucide-icon name="Trash2" class="h-4 w-4"></lucide-icon>
              {{ clearing ? 'Vaciando...' : 'Vaciar registro de auditoría' }}
            </button>
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

          <div *ngIf="!loading && !paginatedLogs.length" class="rounded-xl border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500">
            No se encontraron registros con los filtros actuales.
          </div>

          <div *ngIf="!loading && paginatedLogs.length">
            <table class="ts-table w-full text-xs">
              <thead>
                <tr>
                  <th class="w-[140px]">Fecha</th>
                  <th class="w-[150px]">Empresa</th>
                  <th class="w-[180px]">Usuario</th>
                  <th class="w-[150px]">Entidad</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  *ngFor="let log of paginatedLogs"
                  class="cursor-pointer hover:bg-neutral-50 transition-colors"
                  (click)="openDetailModal(log)"
                >
                  <td class="whitespace-nowrap">{{ log.created_at | date: 'short' }}</td>
                  <td class="truncate">{{ companyName(log.empresa_id) }}</td>
                  <td class="truncate">{{ log.user_email || '—' }}</td>
                  <td class="truncate">{{ log.entity_type || '—' }}<span *ngIf="log.entity_id"> #{{ log.entity_id }}</span></td>
                  <td class="truncate">{{ log.notes || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Paginación -->
          <div *ngIf="!loading && totalPages > 1" class="flex items-center justify-center gap-2 pt-4">
            <button
              type="button"
              class="ts-btn ts-btn--ghost px-3 py-1.5 text-sm"
              (click)="goToPage(currentPage - 1)"
              [disabled]="currentPage === 1"
            >
              <lucide-icon name="ChevronLeft" class="h-4 w-4" strokeWidth="1.75"></lucide-icon>
            </button>
            <div class="flex items-center gap-1">
              <button
                *ngFor="let page of visiblePages"
                type="button"
                class="ts-btn px-3 py-1.5 text-sm min-w-[2.5rem]"
                [class.ts-btn--positive]="page === currentPage"
                [class.ts-btn--ghost]="page !== currentPage"
                (click)="goToPage(page)"
              >
                {{ page }}
              </button>
            </div>
            <button
              type="button"
              class="ts-btn ts-btn--ghost px-3 py-1.5 text-sm"
              (click)="goToPage(currentPage + 1)"
              [disabled]="currentPage === totalPages"
            >
              <lucide-icon name="ChevronRight" class="h-4 w-4" strokeWidth="1.75"></lucide-icon>
            </button>
          </div>
          </div>
        </div>
      </div>

      <!-- Modal de detalle -->
      <ts-modal title="Detalle del registro" [open]="detailModalOpen" (close)="closeDetailModal()">
        <div class="space-y-4" *ngIf="selectedLog">
          <div class="grid gap-4 text-sm">
            <div>
              <span class="font-semibold text-ink">Fecha:</span>
              <span class="ml-2 text-neutral-600">{{ selectedLog.created_at | date: 'short' }}</span>
            </div>
            <div>
              <span class="font-semibold text-ink">Empresa:</span>
              <span class="ml-2 text-neutral-600">{{ companyName(selectedLog.empresa_id) }}</span>
            </div>
            <div>
              <span class="font-semibold text-ink">Usuario:</span>
              <span class="ml-2 text-neutral-600">{{ selectedLog.user_email || '—' }}</span>
            </div>
            <div>
              <span class="font-semibold text-ink">Rol:</span>
              <span class="ml-2 text-neutral-600">{{ selectedLog.user_role ? formatRoleLabel(selectedLog.user_role) : '—' }}</span>
            </div>
            <div>
              <span class="font-semibold text-ink">Acción:</span>
              <span class="ml-2 text-neutral-600 font-semibold">{{ selectedLog.action }}</span>
            </div>
            <div>
              <span class="font-semibold text-ink">Entidad:</span>
              <span class="ml-2 text-neutral-600">
                {{ selectedLog.entity_type || '—' }}
                <span *ngIf="selectedLog.entity_id"> #{{ selectedLog.entity_id }}</span>
              </span>
            </div>
            <div>
              <span class="font-semibold text-ink">Notas:</span>
              <span class="ml-2 text-neutral-600">{{ selectedLog.notes || '—' }}</span>
            </div>
            <div>
              <span class="font-semibold text-ink">IP:</span>
              <span class="ml-2 text-neutral-600">{{ selectedLog.ip || '—' }}</span>
            </div>
            <div>
              <span class="font-semibold text-ink">Ruta:</span>
              <span class="ml-2 text-neutral-600">
                <span class="text-neutral-400">{{ selectedLog.method || '' }}</span>
                <span class="ml-1">{{ selectedLog.path || '—' }}</span>
              </span>
            </div>
          </div>
          <div class="flex justify-end gap-3 pt-4 border-t border-border" *ngIf="isAdminSistema">
            <button
              type="button"
              class="ts-btn ts-btn--danger"
              (click)="openDeleteDialog(selectedLog)"
              [disabled]="deletingId !== null"
            >
              Eliminar
            </button>
          </div>
        </div>
      </ts-modal>

      <!-- Modal de eliminar registro -->
      <ts-modal title="Eliminar registro" [open]="deleteDialogOpen" (close)="closeDeleteDialog()">
        <div class="space-y-4">
          <p class="text-sm text-neutral-500">
            Confirma la eliminación definitiva del registro seleccionado. Esta acción no se puede deshacer.
          </p>
          <div
            *ngIf="deleteDialogTarget"
            class="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600"
          >
            <div class="font-semibold text-ink">Registro #{{ deleteDialogTarget.id }}</div>
            <div>Acción: {{ deleteDialogTarget.action }}</div>
            <div>Usuario: {{ deleteDialogTarget.user_email || '--' }}</div>
          </div>
          <label class="block space-y-2">
            <span class="ts-label">Tu contraseña</span>
            <input
              type="password"
              class="ts-input"
              [(ngModel)]="deleteDialogPassword"
              placeholder="Ingresa tu contraseña para confirmar"
            />
          </label>
          <div class="flex justify-end gap-3">
            <button
              type="button"
              class="ts-btn ts-btn--secondary"
              (click)="closeDeleteDialog()"
              [disabled]="deletingId !== null"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="ts-btn ts-btn--danger"
              (click)="confirmDeleteLog()"
              [disabled]="!canDelete"
            >
              {{ deletingId !== null && deleteDialogTarget ? 'Eliminando...' : 'Eliminar' }}
            </button>
          </div>
        </div>
      </ts-modal>

      <!-- Modal de vaciar registro completo -->
      <ts-modal title="Vaciar registro de auditoría" [open]="clearAllDialogOpen" (close)="closeClearAllDialog()">
        <div class="space-y-4">
          <p class="text-sm text-neutral-500">
            Esta acción eliminará <strong>todos</strong> los registros de auditoría de forma permanente. Esta acción no se puede deshacer.
          </p>
          <label class="block space-y-2">
            <span class="ts-label">Tu contraseña</span>
            <input
              type="password"
              class="ts-input"
              [(ngModel)]="clearAllPassword"
              placeholder="Ingresa tu contraseña para confirmar"
            />
          </label>
          <div class="flex justify-end gap-3">
            <button
              type="button"
              class="ts-btn ts-btn--secondary"
              (click)="closeClearAllDialog()"
              [disabled]="clearing"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="ts-btn ts-btn--danger"
              (click)="confirmClearAll()"
              [disabled]="!canClearAll"
            >
              {{ clearing ? 'Vaciando...' : 'Vaciar registro' }}
            </button>
          </div>
        </div>
      </ts-modal>
    </div>
  `,
})
export class AuditAdminComponent implements OnInit {
  private audit = inject(AuditService);
  private companiesApi = inject(CompanyService);
  private auth = inject(AuthService);

  companies: Empresa[] = [];
  logs: AuditLog[] = [];
  totalCount = 0;

  loading = false;
  exporting = false;
  clearing = false;
  error = '';
  message = '';
  deletingId: number | null = null;
  showFilters = false;
  readonly isAdminSistema = this.auth.hasRole('ADMIN_SISTEMA');
  
  // Modales
  detailModalOpen = false;
  deleteDialogOpen = false;
  clearAllDialogOpen = false;
  selectedLog: AuditLog | null = null;
  deleteDialogTarget: AuditLog | null = null;
  deleteDialogPassword = '';
  clearAllPassword = '';

  // Paginación
  readonly pageSize = 20;
  currentPage = 1;
  totalPages = 1;

  roles: RolEnum[] = ['ADMIN_SISTEMA', 'ADMIN', 'ANALISTA', 'USUARIO'];
  
  formatRoleLabel(rol: RolEnum | string): string {
    // Mapear ANALISTA a CONSULTOR para mostrar en la UI
    if (rol === 'ANALISTA') {
      return 'CONSULTOR';
    }
    return rol;
  }
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
  } = {
    date_from: '',
    date_to: '',
    empresa_id: null,
    user_email: '',
    user_role: '',
    action: '',
    entity_type: '',
    search: '',
  };

  get paginatedLogs(): AuditLog[] {
    return this.logs;
  }

  get visiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 7;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  get canDelete(): boolean {
    return !this.deletingId && 
           this.deleteDialogPassword.trim().length > 0 && 
           !!this.deleteDialogTarget;
  }

  get canClearAll(): boolean {
    return !this.clearing && this.clearAllPassword.trim().length > 0;
  }

  ngOnInit(): void {
    this.loadCompanies();
    this.loadLogs();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  companyName(id: number | null | undefined): string {
    if (!id) return '—';
    return this.companies.find((c) => c.id === id)?.nombre ?? `#${id}`;
  }

  applyFilters(): void {
    this.currentPage = 1;
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
    };
    this.currentPage = 1;
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
    const filters = this.serializeFilters();
    filters['limit'] = this.pageSize;
    filters['offset'] = (this.currentPage - 1) * this.pageSize;
    
    this.audit
      .list(filters)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (rows) => {
          this.logs = rows ?? [];
          // Estimamos el total basado en si recibimos menos registros que el límite
          if (this.logs.length < this.pageSize) {
            // Última página: sabemos el total exacto
            this.totalCount = (this.currentPage - 1) * this.pageSize + this.logs.length;
          } else {
            // Si recibimos el límite completo, asumimos que hay al menos una página más
            // Usaremos el mínimo necesario para mostrar la siguiente página
            this.totalCount = this.currentPage * this.pageSize + 1;
          }
          this.updatePagination();
        },
        error: (err) => {
          console.error('Error cargando auditoría', err);
          this.error = err?.error?.detail ?? 'No fue posible cargar el registro de auditoría.';
          this.logs = [];
          this.totalCount = 0;
          this.updatePagination();
        },
      });
  }

  private updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.totalCount / this.pageSize));
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      const oldPage = this.currentPage;
      this.currentPage = this.totalPages;
      // Recargar si cambiamos de página
      if (oldPage !== this.currentPage) {
        this.loadLogs(true);
      }
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadLogs(true);
    }
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

  openDetailModal(log: AuditLog): void {
    this.selectedLog = log;
    this.detailModalOpen = true;
  }

  closeDetailModal(): void {
    this.detailModalOpen = false;
    this.selectedLog = null;
  }

  openDeleteDialog(log: AuditLog): void {
    if (!this.isAdminSistema || this.deletingId) {
      return;
    }
    this.deleteDialogTarget = log;
    this.deleteDialogPassword = '';
    this.deleteDialogOpen = true;
    this.detailModalOpen = false;
  }

  closeDeleteDialog(force = false): void {
    if (this.deletingId && !force) {
      return;
    }
    this.deleteDialogOpen = false;
    this.deleteDialogPassword = '';
    this.deleteDialogTarget = null;
  }

  confirmDeleteLog(): void {
    if (!this.isAdminSistema || !this.deleteDialogTarget || this.deletingId) {
      return;
    }
    const password = this.deleteDialogPassword.trim();
    if (!password) {
      return;
    }
    this.error = '';
    this.message = '';
    const target = this.deleteDialogTarget;
    this.deletingId = target.id;
    this.audit
      .deleteLog(target.id, password)
      .pipe(
        finalize(() => {
          this.deletingId = null;
        })
      )
      .subscribe({
        next: () => {
          this.closeDeleteDialog(true);
          this.closeDetailModal();
          this.message = 'Registro eliminado correctamente.';
          this.loadLogs(true);
        },
        error: (err) => {
          console.error('Error eliminando auditoría', err);
          this.error = err?.error?.detail ?? 'No fue posible eliminar el registro.';
        },
      });
  }

  openClearAllDialog(): void {
    if (!this.isAdminSistema || this.clearing) {
      return;
    }
    this.clearAllPassword = '';
    this.clearAllDialogOpen = true;
  }

  closeClearAllDialog(): void {
    if (this.clearing) {
      return;
    }
    this.clearAllDialogOpen = false;
    this.clearAllPassword = '';
  }

  confirmClearAll(): void {
    if (!this.isAdminSistema || this.clearing) {
      return;
    }
    const password = this.clearAllPassword.trim();
    if (!password) {
      return;
    }
    this.error = '';
    this.message = '';
    this.clearing = true;
    
    // Primero generar CSV y descargarlo, luego vaciar
    this.audit
      .backupAndClear(password)
      .pipe(
        finalize(() => {
          this.clearing = false;
        })
      )
      .subscribe({
        next: (blob) => {
          // Descargar el CSV automáticamente
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
          anchor.download = `auditoria-respaldo-${timestamp}.csv`;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          URL.revokeObjectURL(url);
          
          this.closeClearAllDialog();
          this.message = 'Respaldo CSV descargado y registro de auditoría vaciado correctamente.';
          this.currentPage = 1;
          this.loadLogs(true);
        },
        error: (err) => {
          console.error('Error vaciando auditoría', err);
          this.error = err?.error?.detail ?? 'No fue posible generar el respaldo y vaciar el registro de auditoría.';
        },
      });
  }

  private serializeFilters(): Record<string, string | number> {
    const payload: Record<string, string | number> = {};

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
