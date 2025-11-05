import { Component, OnInit, WritableSignal, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import { PilarService } from '../../pillar.service';
import { Pilar } from '../../types';

@Component({
  standalone: true,
  selector: 'app-pillars',
  imports: [CommonModule, FormsModule, LucideAngularModule],
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
            <lucide-icon name="Layers" class="h-4 w-4 text-accent" strokeWidth="1.75"></lucide-icon>
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
              <lucide-icon name="PlusCircle" class="h-5 w-5 text-accent" strokeWidth="1.75"></lucide-icon>
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
                <lucide-icon
                  name="RefreshCcw"
                  class="mr-1 h-4 w-4"
                  strokeWidth="1.75"
                ></lucide-icon>
                Recargar
              </button>
            </div>

            <div class="rounded-xl border border-neutral-200">
              <table class="ts-table">
                <thead>
                  <tr>
                    <th class="min-w-[4rem]">ID</th>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    <th>Peso</th>
                    <th class="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngIf="loading">
                    <td colspan="5" class="p-6 text-center text-sm text-neutral-500">
                      Cargando pilares...
                    </td>
                  </tr>
                  <tr *ngIf="!loading && !pilares().length">
                    <td colspan="5" class="p-6 text-center text-sm text-neutral-500">
                      Aún no se han configurado pilares.
                    </td>
                  </tr>
                  <tr
                    *ngFor="let pilar of pilares()"
                    [ngClass]="{ 'bg-accent/5': editingId === pilar.id }"
                  >
                    <td class="font-medium text-ink">#{{ pilar.id }}</td>
                    <td>
                      <ng-container *ngIf="editingId !== pilar.id; else editNombre">
                        {{ pilar.nombre }}
                      </ng-container>
                      <ng-template #editNombre>
                        <input class="ts-input text-sm" [(ngModel)]="editBuffer.nombre" />
                      </ng-template>
                    </td>
                    <td>
                      <ng-container *ngIf="editingId !== pilar.id; else editDescripcion">
                        {{ pilar.descripcion || '--' }}
                      </ng-container>
                      <ng-template #editDescripcion>
                        <textarea class="ts-input text-sm" rows="2" [(ngModel)]="editBuffer.descripcion"></textarea>
                      </ng-template>
                    </td>
                    <td class="w-20">
                      <ng-container *ngIf="editingId !== pilar.id; else editPeso">
                        {{ pilar.peso }}
                      </ng-container>
                      <ng-template #editPeso>
                        <input class="ts-input text-sm" type="number" min="1" step="1" [(ngModel)]="editBuffer.peso" />
                      </ng-template>
                    </td>
                    <td>
                      <div class="flex flex-wrap justify-end gap-2">
                        <button
                          *ngIf="editingId !== pilar.id"
                          class="ts-btn ts-btn--ghost border border-neutral-200 text-neutral-500 hover:text-ink"
                          (click)="iniciarEdicion(pilar)"
                        >
                          Editar
                        </button>
                        <button
                          *ngIf="editingId === pilar.id"
                          class="ts-btn ts-btn--positive"
                          (click)="guardarEdicion(pilar)"
                          [disabled]="saving"
                        >
                          {{ saving ? 'Guardando...' : 'Guardar' }}
                        </button>
                        <button
                          *ngIf="editingId === pilar.id"
                          class="ts-btn ts-btn--ghost border border-neutral-200 text-neutral-500 hover:text-ink"
                          (click)="cancelarEdicion()"
                          [disabled]="saving"
                        >
                          Cancelar
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
    </div>
  `,
})
export class PillarsComponent implements OnInit {
  private pillarsSrv = inject(PilarService);

  pilares: WritableSignal<Pilar[]> = signal<Pilar[]>([]);

  loading = false;
  creating = false;
  saving = false;
  deletingId: number | null = null;

  editingId: number | null = null;
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
  }

  cancelarEdicion(): void {
    this.editingId = null;
    this.editBuffer = { nombre: '', descripcion: '', peso: 1 };
  }

  guardarEdicion(pilar: Pilar): void {
    if (this.editingId !== pilar.id || this.saving) return;

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

    this.pillarsSrv.update(pilar.id, body).subscribe({
      next: (updated) => {
        this.message = `Pilar "${updated.nombre}" actualizado.`;
        this.cancelarEdicion();
        this.loadPilares();
      },
      error: (err) => {
        this.error = this.formatError(err, 'No se pudo actualizar el pilar');
        this.saving = false;
      },
      complete: () => {
        this.saving = false;
      },
    });
  }

  confirmarEliminar(pilar: Pilar): void {
    this.clearFeedback();
    const confirmado = confirm(
      `Eliminarás el pilar "${pilar.nombre}" y todas sus preguntas asociadas. ¿Deseas continuar?`
    );
    if (!confirmado) return;

    this.deletingId = pilar.id;

    this.pillarsSrv.delete(pilar.id, true).subscribe({
      next: () => {
        this.message = `Pilar "${pilar.nombre}" eliminado.`;
        this.loadPilares();
      },
      error: (err) => {
        this.error = this.formatError(err, 'No se pudo eliminar el pilar');
        this.deletingId = null;
      },
      complete: () => {
        this.deletingId = null;
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
