import { Component, OnInit, WritableSignal, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';

import { PilarService } from '../../pillar.service';
import { SubpilarService } from '../../subpilar.service';
import { Pilar, Subpilar } from '../../types';

@Component({
  standalone: true,
  selector: 'app-pillars',
  imports: [CommonModule, FormsModule, IconComponent, ModalComponent],
  template: `
    <div class="ts-page">
      <div class="ts-container space-y-6">
        <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div class="space-y-1">
            <h1 class="ts-title">Pilares</h1>
            <p class="ts-subtitle">
              Administra el catálogo global de pilares que comparten todas las empresas.
            </p>
          </div>
          <div class="ts-chip h-fit">
            <app-icon name="layers" size="sm" variant="accent"></app-icon>
            {{ pilares().length }} registrados
          </div>
        </div>

        <div class="space-y-3" *ngIf="message || error">
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

        <div class="grid gap-6 xl:grid-cols-[minmax(0,_0.35fr)_minmax(0,_0.65fr)]">
          <div class="ts-card space-y-5">
            <div class="flex items-center gap-3">
              <app-icon name="plus-circle" size="md" variant="accent"></app-icon>
              <div>
                <h2 class="text-lg font-semibold text-ink">Nuevo pilar</h2>
                <p class="text-sm text-neutral-400">
                  Crea un pilar disponible para todas las empresas. Se aplicará automáticamente
                  a futuros cuestionarios.
                </p>
              </div>
            </div>

            <div class="space-y-4">
              <label class="block space-y-2">
                <span class="ts-label">Nombre</span>
                <input
                  class="ts-input"
                  [(ngModel)]="form.nombre"
                  name="nombre"
                  placeholder="Estrategia, Talento, Cultura..."
                />
              </label>

              <label class="block space-y-2">
                <span class="ts-label">Descripción (opcional)</span>
                <textarea
                  class="ts-input min-h-[96px] resize-y"
                  [(ngModel)]="form.descripcion"
                  name="descripcion"
                  placeholder="Detalles que ayuden a entender el alcance del pilar"
                ></textarea>
              </label>

              <label class="block space-y-2">
                <span class="ts-label">Peso relativo</span>
                <input
                  class="ts-input"
                  type="number"
                  min="1"
                  step="1"
                  [(ngModel)]="form.peso"
                  name="peso"
                />
              </label>
            </div>

            <button
              class="ts-btn ts-btn--positive w-full"
              (click)="crearPilar()"
              [disabled]="creating || !form.nombre.trim()"
            >
              {{ creating ? 'Creando...' : 'Crear pilar' }}
            </button>
          </div>

          <div class="ts-card space-y-5">
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-lg font-semibold text-ink">Listado</h2>
              <button
                class="ts-btn ts-btn--ghost border border-neutral-200 text-neutral-500 hover:text-ink"
                (click)="loadPilares()"
                [disabled]="loading"
              >
                <app-icon name="refresh-ccw" size="sm" class="mr-1"></app-icon>
                Recargar
              </button>
            </div>

            <div class="rounded-xl border border-neutral-200">
              <table class="ts-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    <th>Peso</th>
                    <th class="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngIf="loading">
                    <td colspan="4" class="p-6 text-center text-sm text-neutral-500">
                      Cargando pilares...
                    </td>
                  </tr>
                  <tr *ngIf="!loading && !pilares().length">
                    <td colspan="4" class="p-6 text-center text-sm text-neutral-500">
                      Aún no se han configurado pilares.
                    </td>
                  </tr>
                  <tr *ngFor="let pilar of pilares()">
                    <td title="ID: {{ pilar.id }}" class="cursor-help">{{ pilar.nombre }}</td>
                    <td>{{ pilar.descripcion || '--' }}</td>
                    <td class="w-20">{{ pilar.peso }}</td>
                    <td>
                      <div class="flex flex-wrap justify-end gap-2">
                        <button
                          class="ts-btn ts-btn--ghost border border-neutral-200 text-neutral-500 hover:text-ink"
                          (click)="iniciarEdicion(pilar)"
                        >
                          Editar
                        </button>
                        <button
                          class="ts-btn ts-btn--danger"
                          (click)="confirmarEliminar(pilar)"
                          [disabled]="deletingId === pilar.id"
                        >
                          {{ deletingId === pilar.id ? 'Eliminando...' : 'Eliminar' }}
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p class="text-xs text-neutral-400">
              Al eliminar un pilar se eliminarán todas las preguntas asociadas. Esta acción no se puede deshacer.
            </p>
          </div>
        </div>
      </div>

      <!-- Modal de edición -->
      <ts-modal title="Editar pilar" [open]="editModalOpen" (close)="cerrarModalEdicion()">
        <div class="space-y-6">
          <!-- Campos del pilar -->
          <div class="space-y-4">
            <label class="block space-y-2">
              <span class="ts-label">Nombre</span>
              <input
                class="ts-input"
                [(ngModel)]="editBuffer.nombre"
                name="editNombre"
                placeholder="Estrategia, Talento, Cultura..."
              />
            </label>

            <label class="block space-y-2">
              <span class="ts-label">Descripción (opcional)</span>
              <textarea
                class="ts-input min-h-[96px] resize-y"
                [(ngModel)]="editBuffer.descripcion"
                name="editDescripcion"
                placeholder="Detalles que ayuden a entender el alcance del pilar"
              ></textarea>
            </label>

            <label class="block space-y-2">
              <span class="ts-label">Peso relativo</span>
              <input
                class="ts-input"
                type="number"
                min="1"
                step="1"
                [(ngModel)]="editBuffer.peso"
                name="editPeso"
              />
            </label>
          </div>

          <!-- Sección de Subpilares -->
          <div class="space-y-4 pt-4 border-t border-border">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-base font-semibold text-ink">Subpilares (opcional)</h3>
                <p class="text-xs text-neutral-500">
                  Organiza las preguntas del pilar en subpilares opcionales.
                </p>
              </div>
            </div>

            <div class="space-y-3 max-h-64 overflow-y-auto">
              <div
                *ngFor="let subpilar of subpilaresBuffer; trackBy: trackBySubpilarIndex"
                class="flex gap-2 items-start rounded-lg border border-neutral-200 p-3 bg-white"
              >
                <div class="flex-1 space-y-2">
                  <input
                    class="ts-input"
                    type="text"
                    [(ngModel)]="subpilar.nombre"
                    [name]="'subpilar_nombre_' + subpilar._index"
                    placeholder="Nombre del subpilar"
                    (blur)="markSubpilarDirty(subpilar)"
                  />
                  <textarea
                    class="ts-input min-h-[60px] resize-y text-sm"
                    [(ngModel)]="subpilar.descripcion"
                    [name]="'subpilar_desc_' + subpilar._index"
                    placeholder="Descripción (opcional)"
                    (blur)="markSubpilarDirty(subpilar)"
                  ></textarea>
                </div>
                <button
                  type="button"
                  class="ts-btn ts-btn--danger mt-1"
                  (click)="marcarSubpilarParaEliminar(subpilar)"
                  [disabled]="savingSubpilares"
                >
                  <app-icon name="trash2" size="sm"></app-icon>
                </button>
              </div>

              <button
                type="button"
                class="w-full ts-btn ts-btn--ghost border border-neutral-200 text-neutral-600"
                (click)="agregarSubpilarNuevo()"
                [disabled]="savingSubpilares"
              >
                <app-icon name="plus" size="sm" class="mr-2"></app-icon>
                Agregar subpilar
              </button>

              <div *ngIf="loadingSubpilares" class="text-center text-sm text-neutral-500 py-2">
                Cargando subpilares...
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              class="ts-btn ts-btn--secondary"
              (click)="cerrarModalEdicion()"
              [disabled]="saving || savingSubpilares"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="ts-btn ts-btn--positive"
              (click)="guardarEdicion()"
              [disabled]="saving || savingSubpilares || !editBuffer.nombre.trim()"
            >
              {{ saving || savingSubpilares ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
      </ts-modal>

      <!-- Modal de confirmación para eliminar pilar -->
      <ts-modal
        title="¿Eliminar pilar?"
        [open]="deleteConfirmModal.open"
        (close)="closeDeleteConfirmModal()"
      >
        <div class="space-y-4">
          <p class="text-sm text-neutral-500">
            ¿Estás seguro de que deseas eliminar el pilar <strong>{{ deleteConfirmModal.pilar?.nombre }}</strong>?
            Esta acción eliminará el pilar y todas sus preguntas asociadas. Esta acción es irreversible.
          </p>
          <div class="flex justify-end gap-3">
            <button
              type="button"
              class="ts-btn ts-btn--secondary"
              (click)="closeDeleteConfirmModal()"
              [disabled]="deleteConfirmModal.busy"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="ts-btn ts-btn--danger"
              (click)="confirmDeletePilar()"
              [disabled]="deleteConfirmModal.busy"
            >
              <app-icon
                *ngIf="!deleteConfirmModal.busy"
                name="trash2"
                size="sm"
              ></app-icon>
              <app-icon
                *ngIf="deleteConfirmModal.busy"
                name="loader2"
                size="sm"
                class="animate-spin"
              ></app-icon>
              <span>{{ deleteConfirmModal.busy ? 'Eliminando...' : 'Eliminar' }}</span>
            </button>
          </div>
        </div>
      </ts-modal>
    </div>
  `,
})
export class PillarsComponent implements OnInit {
  private pillarsSrv = inject(PilarService);
  private subpilaresSrv = inject(SubpilarService);

  pilares: WritableSignal<Pilar[]> = signal<Pilar[]>([]);

  loading = false;
  creating = false;
  saving = false;
  deletingId: number | null = null;

  editingId: number | null = null;
  editModalOpen = false;
  editBuffer: { nombre: string; descripcion: string; peso: number } = {
    nombre: '',
    descripcion: '',
    peso: 1,
  };

  form: { nombre: string; descripcion: string; peso: number } = {
    nombre: '',
    descripcion: '',
    peso: 1,
  };

  // Gestión de subpilares
  subpilaresBuffer: Array<Subpilar & { _index: number; _dirty?: boolean; _deleted?: boolean }> = [];
  loadingSubpilares = false;
  savingSubpilares = false;

  message = '';
  error = '';

  ngOnInit(): void {
    this.loadPilares();
  }

  loadPilares(): void {
    this.loading = true;
    this.clearFeedback();
    this.pillarsSrv.listAll().subscribe({
      next: (rows) => this.pilares.set(rows ?? []),
      error: (err) => {
        this.error = this.formatError(err, 'No se pudieron cargar los pilares');
        this.loading = false;
      },
      complete: () => (this.loading = false),
    });
  }

  crearPilar(): void {
    if (!this.form.nombre.trim() || this.creating) return;

    const peso = Number(this.form.peso) || 1;
    const payload = {
      nombre: this.form.nombre.trim(),
      descripcion: this.form.descripcion.trim() ? this.form.descripcion.trim() : undefined,
      peso,
    };

    this.creating = true;
    this.clearFeedback();

    this.pillarsSrv.create(payload).subscribe({
      next: (pilar) => {
        this.message = `Pilar "${pilar.nombre}" creado correctamente.`;
        this.form = { nombre: '', descripcion: '', peso: 1 };
        this.loadPilares();
      },
      error: (err) => {
        this.error = this.formatError(err, 'No se pudo crear el pilar');
        this.creating = false;
      },
      complete: () => {
        this.creating = false;
      },
    });
  }

  iniciarEdicion(pilar: Pilar): void {
    this.clearFeedback();
    this.editingId = pilar.id;
    this.editBuffer = {
      nombre: pilar.nombre,
      descripcion: pilar.descripcion ?? '',
      peso: pilar.peso,
    };
    this.editModalOpen = true;
    this.cargarSubpilares(pilar.id);
  }

  cerrarModalEdicion(): void {
    // Permitir cerrar incluso si está guardando (para poder cerrar después de un guardado exitoso)
    this.editModalOpen = false;
    this.editingId = null;
    this.editBuffer = { nombre: '', descripcion: '', peso: 1 };
    this.subpilaresBuffer = [];
    // Resetear el estado de guardado si aún está activo
    this.saving = false;
    this.savingSubpilares = false;
  }

  /**
   * Carga los subpilares del pilar actual
   */
  private cargarSubpilares(pilarId: number): void {
    this.loadingSubpilares = true;
    this.subpilaresBuffer = [];
    this.subpilaresSrv.getSubpilares(pilarId).subscribe({
      next: (subpilares) => {
        // Agregar índices y flags para tracking
        this.subpilaresBuffer = subpilares.map((sp, index) => ({
          ...sp,
          _index: index,
          _dirty: false,
          _deleted: false,
          descripcion: sp.descripcion ?? '',
        }));
      },
      error: (err) => {
        console.error('Error cargando subpilares', err);
        this.error = 'No se pudieron cargar los subpilares';
      },
      complete: () => {
        this.loadingSubpilares = false;
      },
    });
  }

  /**
   * Agrega un nuevo subpilar al buffer (aún no guardado)
   */
  agregarSubpilarNuevo(): void {
    const nuevoIndex = this.subpilaresBuffer.length;
    this.subpilaresBuffer.push({
      id: -1, // ID temporal para nuevos
      pilar_id: this.editingId!,
      nombre: '',
      descripcion: '',
      orden: null,
      _index: nuevoIndex,
      _dirty: true,
      _deleted: false,
    });
  }

  /**
   * Marca un subpilar como modificado
   */
  markSubpilarDirty(subpilar: Subpilar & { _dirty?: boolean }): void {
    if (subpilar.id > 0) {
      subpilar._dirty = true;
    }
  }

  /**
   * Marca un subpilar para eliminación
   */
  marcarSubpilarParaEliminar(subpilar: Subpilar & { _deleted?: boolean; _index: number }): void {
    if (!confirm(`¿Eliminar el subpilar "${subpilar.nombre || 'sin nombre'}"?`)) {
      return;
    }
    subpilar._deleted = true;
  }

  /**
   * TrackBy para ngFor de subpilares
   */
  trackBySubpilarIndex(_index: number, item: Subpilar & { _index: number }): number {
    return item._index;
  }

  guardarEdicion(): void {
    if (!this.editingId || this.saving || this.savingSubpilares) return;

    const body = {
      nombre: this.editBuffer.nombre.trim(),
      descripcion: this.editBuffer.descripcion?.trim()
        ? this.editBuffer.descripcion.trim()
        : null,
      peso: Number(this.editBuffer.peso) || 1,
    };

    if (!body.nombre) {
      this.error = 'El nombre es obligatorio.';
      return;
    }

    this.saving = true;
    this.clearFeedback();

    // Primero guardar el pilar
    this.pillarsSrv.update(this.editingId, body).subscribe({
      next: (updated) => {
        this.message = `Pilar "${updated.nombre}" actualizado correctamente.`;
        // Actualizar el pilar en la lista sin recargar todo
        this.pilares.set(
          this.pilares().map((p) => (p.id === updated.id ? updated : p))
        );
        // Luego sincronizar subpilares
        this.sincronizarSubpilares();
      },
      error: (err) => {
        console.error('Error actualizando pilar', err);
        const errorMsg = err.error?.detail || err.message || 'No se pudo actualizar el pilar';
        this.error = errorMsg;
        this.saving = false;
      },
    });
  }

  /**
   * Sincroniza los subpilares: crea nuevos, actualiza modificados y elimina marcados
   */
  private sincronizarSubpilares(): void {
    if (!this.editingId) {
      this.saving = false;
      this.cerrarModalEdicion();
      return;
    }

    this.savingSubpilares = true;

    // Filtrar subpilares válidos (no eliminados y con nombre)
    const subpilaresValidos = this.subpilaresBuffer.filter(
      (sp) => !sp._deleted && sp.nombre.trim()
    );

    const operaciones: Array<Promise<void>> = [];

    // 1. Eliminar los marcados para borrar
    const paraEliminar = this.subpilaresBuffer.filter(
      (sp) => sp._deleted && sp.id > 0
    );
    paraEliminar.forEach((sp) => {
      operaciones.push(
        this.subpilaresSrv.deleteSubpilar(sp.id).toPromise().then(() => {
          // Éxito silencioso
        }).catch((err) => {
          console.error(`Error eliminando subpilar ${sp.id}`, err);
          throw err;
        }) as Promise<void>
      );
    });

    // 2. Crear los nuevos (id < 0)
    const paraCrear = subpilaresValidos.filter((sp) => sp.id < 0);
    paraCrear.forEach((sp) => {
      operaciones.push(
        this.subpilaresSrv
          .createSubpilar(this.editingId!, {
            pilar_id: this.editingId!,
            nombre: sp.nombre.trim(),
            descripcion: sp.descripcion?.trim() || null,
            orden: sp.orden ?? null,
          })
          .toPromise()
          .then(() => {
            // Éxito silencioso
          })
          .catch((err) => {
            console.error('Error creando subpilar', err);
            throw err;
          }) as Promise<void>
      );
    });

    // 3. Actualizar los modificados (id > 0 y _dirty)
    const paraActualizar = subpilaresValidos.filter(
      (sp) => sp.id > 0 && sp._dirty
    );
    paraActualizar.forEach((sp) => {
      operaciones.push(
        this.subpilaresSrv
          .updateSubpilar(sp.id, {
            nombre: sp.nombre.trim(),
            descripcion: sp.descripcion?.trim() || null,
            orden: sp.orden ?? null,
          })
          .toPromise()
          .then(() => {
            // Éxito silencioso
          })
          .catch((err) => {
            console.error(`Error actualizando subpilar ${sp.id}`, err);
            throw err;
          }) as Promise<void>
      );
    });

    // Ejecutar todas las operaciones
    Promise.all(operaciones)
      .then(() => {
        this.message = this.message || 'Subpilares sincronizados correctamente.';
        this.savingSubpilares = false;
        this.saving = false;
        this.cerrarModalEdicion();
      })
      .catch((err) => {
        console.error('Error sincronizando subpilares', err);
        this.error = 'Error al guardar algunos subpilares. Revisa la consola.';
        this.savingSubpilares = false;
        this.saving = false;
      });
  }

  // Modal de confirmación para eliminar pilar
  deleteConfirmModal = {
    open: false,
    pilar: null as Pilar | null,
    busy: false,
  };

  confirmarEliminar(pilar: Pilar): void {
    this.clearFeedback();
    this.deleteConfirmModal = {
      open: true,
      pilar,
      busy: false,
    };
  }

  closeDeleteConfirmModal(): void {
    if (this.deleteConfirmModal.busy) return;
    this.deleteConfirmModal = {
      open: false,
      pilar: null,
      busy: false,
    };
  }

  confirmDeletePilar(): void {
    const pilar = this.deleteConfirmModal.pilar;
    if (!pilar || this.deleteConfirmModal.busy) return;

    this.deleteConfirmModal.busy = true;
    this.deletingId = pilar.id;

    this.pillarsSrv.delete(pilar.id, true).subscribe({
      next: () => {
        this.message = `Pilar "${pilar.nombre}" eliminado.`;
        this.deletingId = null;
        this.deleteConfirmModal = {
          open: false,
          pilar: null,
          busy: false,
        };
        this.loadPilares();
      },
      error: (err) => {
        this.error = this.formatError(err, 'No se pudo eliminar el pilar');
        this.deletingId = null;
        this.deleteConfirmModal.busy = false;
      },
      complete: () => {
        this.deletingId = null;
        // Asegurar que el estado busy se resetee incluso si hay error
        if (this.deleteConfirmModal.busy) {
          this.deleteConfirmModal.busy = false;
        }
      },
    });
  }

  private clearFeedback(): void {
    this.message = '';
    this.error = '';
  }

  private formatError(err: unknown, fallback: string): string {
    const detail = (err as { error?: unknown })?.error as unknown;
    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object' && 'msg' in item) {
            return String((item as { msg?: unknown }).msg ?? fallback);
          }
          return JSON.stringify(item);
        })
        .join(' | ');
    }
    if (detail && typeof detail === 'object' && 'detail' in (detail as Record<string, unknown>)) {
      const inner = (detail as Record<string, unknown>)['detail'];
      if (typeof inner === 'string') return inner;
    }
    if (typeof detail === 'string') {
      return detail;
    }
    return fallback;
  }
}
