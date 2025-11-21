import { Component, OnInit, WritableSignal, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';

import { CompanyService } from '../../company.service';
import { LeadService } from '../../core/services/lead.service';
import { NotificationCenterService } from '../../core/services/notification-center.service';
import { Empresa, Lead } from '../../types';

@Component({
  standalone: true,
  selector: 'app-companies',
  imports: [
    CommonModule,
    FormsModule,
    NgxSkeletonLoaderModule,
    IconComponent,
    ModalComponent,
  ],
  template: `
    <div class="ts-page">
      <div class="ts-container">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div class="space-y-1">
            <h1 class="ts-title">Empresas</h1>
            <p class="ts-subtitle">Administra la información base y los departamentos asociados.</p>
          </div>
          <div class="ts-chip h-fit">
            <app-icon name="building2" size="16" class="h-4 w-4 text-ink" strokeWidth="1.75"></app-icon>
            {{ empresas().length }} registradas
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,1fr)]">
          <div class="ts-card space-y-6">
            <div>
              <h2 class="text-xl font-semibold text-ink">
                {{ editingEmpresa ? 'Editar empresa' : 'Crear empresa' }}
              </h2>
              <p class="text-sm text-muted">
                {{
                  editingEmpresa
                    ? 'Modifica los datos de la empresa seleccionada.'
                    : 'Completa los datos para dar de alta una nueva empresa.'
                }}
              </p>
            </div>

            <div class="space-y-4">
              <label class="block space-y-2">
                <span class="ts-label">Nombre</span>
                <input class="ts-input" [(ngModel)]="form.nombre" placeholder="Ej: Acme SpA" />
              </label>

              <div class="grid gap-4 md:grid-cols-2">
                <label class="block space-y-2">
                  <span class="ts-label">RUT</span>
                  <input class="ts-input" [(ngModel)]="form.rut" placeholder="12345678-9" />
                </label>

                <label class="block space-y-2">
                  <span class="ts-label">Giro</span>
                  <input class="ts-input" [(ngModel)]="form.giro" placeholder="Tecnología" />
                </label>
              </div>

              <label class="block space-y-2">
                <span class="ts-label">Departamentos</span>
                <input
                  class="ts-input"
                  [(ngModel)]="form.departamentos"
                  placeholder="Ventas, Marketing, Operaciones"
                />
                <span class="text-xs text-muted">Separa cada departamento con coma.</span>
              </label>
            </div>

            <div class="flex flex-wrap gap-3">
              <button
                class="ts-btn ts-btn--positive w-full md:w-auto"
                (click)="editingEmpresa ? guardarCambios() : crear()"
                [disabled]="creating || updating || !form.nombre.trim()"
              >
                <app-icon
                  *ngIf="!creating && !updating"
                  [name]="editingEmpresa ? 'check' : 'plus'"
                  size="16"
                  class="h-4 w-4"
                  strokeWidth="1.75"
                ></app-icon>
                <app-icon
                  *ngIf="creating || updating"
                  name="loader2"
                  size="16"
                  class="h-4 w-4 animate-spin"
                  strokeWidth="1.75"
                ></app-icon>
                <span>
                  {{
                    creating
                      ? 'Creando...'
                      : updating
                        ? 'Guardando...'
                        : editingEmpresa
                          ? 'Guardar cambios'
                          : 'Crear empresa'
                  }}
                </span>
              </button>
              <button
                *ngIf="editingEmpresa"
                type="button"
                class="ts-btn ts-btn--secondary w-full md:w-auto"
                (click)="cancelarEdicion()"
                [disabled]="creating || updating"
              >
                <app-icon name="x" size="16" class="h-4 w-4" strokeWidth="1.75"></app-icon>
                <span>Cancelar edición</span>
              </button>
            </div>

            <!-- Mensajes de éxito/error -->
            <div *ngIf="message" class="rounded-lg px-4 py-3 text-sm" [class.bg-success/10]="messageType === 'success'" [class.text-success]="messageType === 'success'" [class.bg-error/10]="messageType === 'error'" [class.text-error]="messageType === 'error'">
              {{ message }}
            </div>
          </div>

          <div class="ts-card space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-semibold text-ink">Listado</h2>
              <span class="text-sm text-muted">
                {{ loadingList ? 'Cargando empresas...' : 'Actualizado al día' }}
              </span>
            </div>

            <ng-container *ngIf="loadingList">
              <ngx-skeleton-loader count="4" [theme]="{ height: '70px', marginBottom: '1rem', borderRadius: '12px' }">
              </ngx-skeleton-loader>
            </ng-container>

            <ng-container *ngIf="!loadingList && empresas().length; else emptyState">
              <div class="space-y-3">
                <div
                  *ngFor="let e of empresas()"
                  class="rounded-xl border border-border p-4 transition-all duration-200 hover:border-ink/40 hover:shadow-card"
                >
                  <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div class="space-y-1">
                      <div class="flex items-center gap-2">
                        <app-icon name="building2" size="20" class="h-5 w-5 text-ink" strokeWidth="1.75"></app-icon>
                        <p class="text-lg font-semibold text-ink">{{ e.nombre }}</p>
                      </div>
                      <div class="flex flex-wrap gap-2 text-sm text-muted">
                        <span class="ts-chip">RUT: {{ e.rut || 'Sin RUT' }}</span>
                        <span class="ts-chip">Giro: {{ e.giro || 'Sin giro' }}</span>
                        <span class="ts-chip">
                          Estado:
                          <span class="font-medium text-success" *ngIf="e.activa; else inactive">Activa</span>
                          <ng-template #inactive>
                            <span class="font-medium text-muted">Inactiva</span>
                          </ng-template>
                        </span>
                      </div>
                    </div>

                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        class="ts-btn ts-btn--ghost border border-neutral-200 text-neutral-500 hover:text-ink"
                        (click)="editarEmpresa(e)"
                        [disabled]="deletingId === e.id || creating || updating"
                        aria-label="Editar empresa"
                      >
                        <app-icon name="pencil" size="16" class="h-4 w-4" strokeWidth="1.75"></app-icon>
                      </button>
                      <button
                        type="button"
                        class="ts-btn ts-btn--danger"
                        (click)="eliminar(e)"
                        [disabled]="deletingId === e.id || creating || updating"
                      >
                        <app-icon
                          *ngIf="deletingId !== e.id"
                          name="trash2"
                          size="16"
                          class="h-4 w-4"
                          strokeWidth="1.75"
                        ></app-icon>
                        <app-icon
                          *ngIf="deletingId === e.id"
                          name="loader2"
                          size="16"
                          class="h-4 w-4 animate-spin"
                          strokeWidth="1.75"
                        ></app-icon>
                        <span>{{ deletingId === e.id ? 'Eliminando...' : 'Eliminar' }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </ng-container>

            <ng-template #emptyState>
              <div class="rounded-xl border border-dashed border-border bg-[#f6f6f6] p-6 text-center">
                <p class="text-sm text-muted">
                  Todavía no tienes empresas registradas. Comienza creando la primera con el formulario.
                </p>
              </div>
            </ng-template>
          </div>
        </div>

        <div class="ts-card space-y-4" data-section="consulting-requests">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="space-y-1">
              <h2 class="text-xl font-semibold text-ink">Empresas que desean una consultoría</h2>
              <p class="text-sm text-muted">
                Solicitudes recibidas desde la landing pública.
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <button
                type="button"
                class="ts-btn ts-btn--secondary text-xs sm:text-sm"
                (click)="loadLeads()"
                [disabled]="loadingLeads"
              >
                <app-icon
                  *ngIf="!loadingLeads"
                  name="refresh-ccw"
                  size="16"
                  class="h-4 w-4"
                  strokeWidth="1.75"
                ></app-icon>
                <app-icon
                  *ngIf="loadingLeads"
                  name="loader2"
                  size="16"
                  class="h-4 w-4 animate-spin"
                  strokeWidth="1.75"
                ></app-icon>
                <span>{{ loadingLeads ? 'Recargando...' : 'Recargar' }}</span>
              </button>
              <button
                type="button"
                class="ts-btn ts-btn--secondary text-xs sm:text-sm"
                (click)="openClearLeadsDialog()"
                [disabled]="loadingLeads || !leads().length || leadActionId() !== null"
              >
                Limpiar solicitudes
              </button>
              <div class="ts-chip">
                <app-icon name="mail" size="16" class="h-4 w-4 text-ink" strokeWidth="1.75"></app-icon>
                {{ leads().length }} solicitudes
              </div>
            </div>
          </div>

          <div *ngIf="loadingLeads" class="space-y-3">
            <ngx-skeleton-loader count="3" [theme]="{ height: '50px', marginBottom: '0.75rem', borderRadius: '18px' }">
            </ngx-skeleton-loader>
          </div>

          <div *ngIf="!loadingLeads && leads().length" class="overflow-x-auto">
            <table class="ts-table min-w-full">
              <thead>
                <tr>
                  <th class="whitespace-nowrap">Empresa</th>
                  <th class="whitespace-nowrap">Correo</th>
                  <th class="whitespace-nowrap">Fecha</th>
                  <th class="whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let lead of leads(); trackBy: trackByLead">
                  <td class="py-3 font-medium text-ink">{{ lead.company }}</td>
                  <td class="py-3">
                    <a class="text-ink underline-offset-2 hover:underline" [href]="'mailto:' + lead.email">
                      {{ lead.email }}
                    </a>
                  </td>
                  <td class="py-3 text-sm text-muted">{{ lead.created_at | date: 'medium' }}</td>
                  <td class="py-3">
                    <div class="flex flex-wrap gap-2">
                      <button
                        type="button"
                        class="ts-btn ts-btn--positive text-xs"
                        (click)="acceptLead(lead)"
                        [disabled]="leadActionId() !== null"
                      >
                        <app-icon
                          *ngIf="leadActionId() === lead.id"
                          name="loader2"
                          size="14"
                          class="h-3.5 w-3.5 animate-spin"
                          strokeWidth="1.75"
                        ></app-icon>
                        <span>{{ leadActionId() === lead.id ? 'Procesando...' : 'Aceptar' }}</span>
                      </button>
                      <button
                        type="button"
                        class="ts-btn ts-btn--danger text-xs"
                        (click)="deleteLead(lead)"
                        [disabled]="leadActionId() !== null"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div *ngIf="!loadingLeads && !leads().length" class="rounded-xl border border-dashed border-border bg-[#f6f6f6] p-6 text-center text-sm text-muted">
            Aún no recibimos solicitudes de consultoría. Cuando lleguen, aparecerán aquí.
          </div>
        </div>

        <!-- Modal de confirmación para limpiar leads -->
        <ts-modal
          title="Limpiar solicitudes de consultoría"
          [open]="clearLeadsDialog.open"
          (close)="closeClearLeadsDialog()"
        >
          <div class="space-y-4">
            <p class="text-sm text-neutral-500">
              ¿Estás seguro de que deseas eliminar todas las solicitudes de consultoría?
              Esta acción no se puede deshacer.
            </p>
            <p class="text-sm font-medium text-ink">
              Se eliminarán <strong>{{ leads().length }}</strong> solicitud{{ leads().length !== 1 ? 'es' : '' }} pendiente{{ leads().length !== 1 ? 's' : '' }}.
            </p>
            <div class="flex justify-end gap-3">
              <button
                type="button"
                class="ts-btn ts-btn--secondary"
                (click)="closeClearLeadsDialog()"
                [disabled]="clearLeadsDialog.busy"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="ts-btn ts-btn--danger"
                (click)="clearLeads()"
                [disabled]="clearLeadsDialog.busy"
              >
                <app-icon
                  *ngIf="!clearLeadsDialog.busy"
                  name="trash2"
                  size="16"
                  class="h-4 w-4"
                  strokeWidth="1.75"
                ></app-icon>
                <app-icon
                  *ngIf="clearLeadsDialog.busy"
                  name="loader2"
                  size="16"
                  class="h-4 w-4 animate-spin"
                  strokeWidth="1.75"
                ></app-icon>
                <span>{{ clearLeadsDialog.busy ? 'Limpiando...' : 'Limpiar solicitudes' }}</span>
              </button>
            </div>
          </div>
        </ts-modal>
      </div>
    </div>
  `,
})
export class CompaniesComponent implements OnInit {
  private api = inject(CompanyService);
  private leadsApi = inject(LeadService);
  private notificationCenter = inject(NotificationCenterService);

  empresas: WritableSignal<Empresa[]> = signal<Empresa[]>([]);
  loadingList = true;
  creating = false;
  updating = false;
  deletingId: number | null = null;
  
  // =========================================================
  // MODO EDICIÓN
  // =========================================================
  editingEmpresa: Empresa | null = null;
  message = '';
  messageType: 'success' | 'error' | null = null;

  leads: WritableSignal<Lead[]> = signal<Lead[]>([]);
  loadingLeads = true;
  readonly leadActionId = signal<number | null>(null);

  // Modal de confirmación para limpiar leads
  clearLeadsDialog = {
    open: false,
    busy: false,
  };

  form = {
    nombre: '',
    rut: '',
    giro: '',
    departamentos: '',
  };

  ngOnInit(): void {
    this.loadEmpresas();
    this.loadLeads();
  }

  private loadEmpresas(): void {
    this.loadingList = true;
    this.api.list().subscribe({
      next: (rows: Empresa[]) => this.empresas.set(rows ?? []),
      error: (error) => console.error('Error cargando empresas', error),
      complete: () => (this.loadingList = false),
    });
  }

  loadLeads(): void {
    this.loadingLeads = true;
    this.leadsApi.listLeads().subscribe({
      next: (rows: Lead[]) => {
        const ordered = [...(rows ?? [])].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        
        this.leads.set(ordered);
        // Actualizar contador en el servicio de notificaciones
        this.notificationCenter.setInitialConsultingRequestsCount(ordered.length);
      },
      error: (error) => {
        console.error('Error cargando leads', error);
        this.loadingLeads = false;
        this.leadActionId.set(null);
      },
      complete: () => {
        this.loadingLeads = false;
        this.leadActionId.set(null);
      },
    });
  }

  // =========================================================
  // CREAR EMPRESA (sin cambios, se mantiene igual)
  // =========================================================
  crear(): void {
    const deps = this.form.departamentos
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      nombre: this.form.nombre.trim(),
      rut: this.form.rut || undefined,
      giro: this.form.giro || undefined,
      departamentos: deps.length ? deps : undefined,
    };

    if (!payload.nombre || this.creating || this.updating) return;

    this.creating = true;
    this.clearMessage();

    this.api.create(payload).subscribe({
      next: () => {
        this.form = { nombre: '', rut: '', giro: '', departamentos: '' };
        this.loadEmpresas();
        this.showMessage('Empresa creada correctamente', 'success');
      },
      error: (error) => {
        console.error('Error creando empresa', error);
        const errorMsg = error.error?.detail || error.message || 'Error al crear la empresa';
        this.showMessage(errorMsg, 'error');
        this.creating = false;
      },
      complete: () => (this.creating = false),
    });
  }

  // =========================================================
  // MODO EDICIÓN: Cargar empresa en el formulario
  // =========================================================
  editarEmpresa(empresa: Empresa): void {
    if (this.creating || this.updating) return;
    
    this.editingEmpresa = empresa;
    this.clearMessage();
    
    // Cargar datos en el formulario
    this.form.nombre = empresa.nombre;
    this.form.rut = empresa.rut || '';
    this.form.giro = empresa.giro || '';
    
    // Convertir array de departamentos a string separado por comas
    if (empresa.departamentos && empresa.departamentos.length > 0) {
      this.form.departamentos = empresa.departamentos.map(d => d.nombre).join(', ');
    } else {
      this.form.departamentos = '';
    }
  }

  // =========================================================
  // MODO EDICIÓN: Cancelar edición y volver a modo creación
  // =========================================================
  cancelarEdicion(): void {
    if (this.creating || this.updating) return;
    
    this.editingEmpresa = null;
    this.form = { nombre: '', rut: '', giro: '', departamentos: '' };
    this.clearMessage();
  }

  // =========================================================
  // MODO EDICIÓN: Guardar cambios de la empresa
  // =========================================================
  guardarCambios(): void {
    if (!this.editingEmpresa || this.creating || this.updating) return;

    const deps = this.form.departamentos
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: {
      nombre?: string;
      rut?: string;
      giro?: string;
      departamentos?: string[];
    } = {};

    // Solo incluir campos que han cambiado
    if (this.form.nombre.trim() !== this.editingEmpresa.nombre) {
      payload.nombre = this.form.nombre.trim();
    }
    if ((this.form.rut || '') !== (this.editingEmpresa.rut || '')) {
      payload.rut = this.form.rut || undefined;
    }
    if ((this.form.giro || '') !== (this.editingEmpresa.giro || '')) {
      payload.giro = this.form.giro || undefined;
    }
    
    // Comparar departamentos actuales con los del formulario
    const currentDepartamentos = (this.editingEmpresa.departamentos || []).map(d => d.nombre).sort();
    const newDepartamentos = deps.sort();
    if (JSON.stringify(currentDepartamentos) !== JSON.stringify(newDepartamentos)) {
      payload.departamentos = deps.length ? deps : [];
    }

    // Si no hay cambios, no hacer nada
    if (Object.keys(payload).length === 0) {
      this.showMessage('No hay cambios para guardar', 'error');
      return;
    }

    if (!this.form.nombre.trim()) {
      this.showMessage('El nombre es obligatorio', 'error');
      return;
    }

    this.updating = true;
    this.clearMessage();

    this.api.update(this.editingEmpresa.id, payload).subscribe({
      next: (updated) => {
        // Actualizar la empresa en la lista
        this.empresas.set(
          this.empresas().map((e) => (e.id === updated.id ? updated : e))
        );
        
        // Salir del modo edición
        this.cancelarEdicion();
        this.showMessage('Empresa actualizada correctamente', 'success');
      },
      error: (error) => {
        console.error('Error actualizando empresa', error);
        const errorMsg = error.error?.detail || error.message || 'Error al actualizar la empresa';
        this.showMessage(errorMsg, 'error');
        this.updating = false;
      },
      complete: () => {
        this.updating = false;
      },
    });
  }

  // =========================================================
  // HELPERS: Mensajes de éxito/error
  // =========================================================
  private showMessage(text: string, type: 'success' | 'error'): void {
    this.message = text;
    this.messageType = type;
    // Auto-ocultar mensaje después de 5 segundos
    setTimeout(() => {
      this.clearMessage();
    }, 5000);
  }

  private clearMessage(): void {
    this.message = '';
    this.messageType = null;
  }

  acceptLead(lead: Lead): void {
    if (!lead) return;
    this.leadActionId.set(lead.id);
    this.leadsApi.deleteLead(lead.id).subscribe({
      next: () => {
        this.leads.set(this.leads().filter((item) => item.id !== lead.id));
        // Refrescar notificaciones para actualizar contador
        this.notificationCenter.refresh(false);
      },
      error: (error) => {
        console.error('No se pudo procesar la solicitud', error);
        this.leadActionId.set(null);
      },
      complete: () => {
        this.leadActionId.set(null);
      },
    });
  }

  deleteLead(lead: Lead): void {
    if (!lead) return;
    if (!confirm(`¿Eliminar la solicitud de ${lead.company}?`)) return;

    this.leadActionId.set(lead.id);
    this.leadsApi.deleteLead(lead.id).subscribe({
      next: () => {
        this.leads.set(this.leads().filter((item) => item.id !== lead.id));
        // Refrescar notificaciones para actualizar contador
        this.notificationCenter.refresh(false);
      },
      error: (error) => {
        console.error('No se pudo eliminar la solicitud', error);
        this.leadActionId.set(null);
      },
      complete: () => {
        this.leadActionId.set(null);
      },
    });
  }

  /**
   * Abre el modal de confirmación para limpiar leads
   */
  openClearLeadsDialog(): void {
    if (!this.leads().length || this.leadActionId() !== null) {
      return;
    }
    this.clearLeadsDialog = {
      open: true,
      busy: false,
    };
  }

  /**
   * Cierra el modal de confirmación
   */
  closeClearLeadsDialog(): void {
    if (this.clearLeadsDialog.busy) {
      return;
    }
    this.clearLeadsDialog = {
      open: false,
      busy: false,
    };
  }

  /**
   * Confirma y ejecuta la limpieza de leads
   */
  clearLeads(): void {
    if (!this.leads().length || this.clearLeadsDialog.busy) {
      return;
    }

    this.clearLeadsDialog.busy = true;
    this.leadActionId.set(-1);

    this.leadsApi.clearLeads().subscribe({
      next: () => {
        // Cerrar el modal
        this.clearLeadsDialog = {
          open: false,
          busy: false,
        };
        this.leads.set([]);
        // Refrescar notificaciones para actualizar contador
        this.notificationCenter.refresh(false);
        this.leadActionId.set(null);
      },
      error: (error) => {
        console.error('No se pudo limpiar las solicitudes', error);
        this.clearLeadsDialog.busy = false;
        this.leadActionId.set(null);
      },
      complete: () => {
        this.leadActionId.set(null);
      },
    });
  }

  eliminar(e: Empresa): void {
    if (!confirm(`¿Eliminar empresa ${e.nombre}?`)) return;

    this.deletingId = e.id;
    this.api.delete(e.id).subscribe({
      next: () => {
        this.empresas.set(this.empresas().filter((x) => x.id !== e.id));
      },
      error: (error) => {
        console.error('Error eliminando empresa', error);
        this.deletingId = null;
      },
      complete: () => {
        this.deletingId = null;
      },
    });
  }

  trackByLead = (_: number, item: Lead) => item.id;
}
