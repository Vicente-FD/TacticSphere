import { Component, OnInit, WritableSignal, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { LucideAngularModule } from 'lucide-angular';
import { ModalComponent } from '../../shared/ui/modal/modal.component';

import { PilarService } from '../../pillar.service';
import { QuestionService } from '../../question.service';

import { Pilar, Pregunta, TipoPreguntaEnum } from '../../types';

interface QuestionView {
  id: number;
  raw: Pregunta | undefined;
  title: string;
  typeLabel: string;
  weightLabel: string;
  expected: string;
  isMandatory: boolean;
}

@Component({
  standalone: true,
  selector: 'app-questions',
  imports: [
    CommonModule,
    FormsModule,
    NgxSkeletonLoaderModule,
    LucideAngularModule,
    ModalComponent,
  ],
  template: `
    <div class="ts-page">
      <div class="ts-container space-y-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div class="space-y-1">
            <h1 class="ts-title">Preguntas</h1>
            <p class="ts-subtitle">Gestiona el banco global de preguntas por pilar.</p>
          </div>
          <div class="ts-chip h-fit">
            <lucide-icon name="ListChecks" class="h-4 w-4 text-accent" strokeWidth="1.75"></lucide-icon>
            {{ preguntas().length }} en el pilar seleccionado
          </div>
        </div>

        <div class="grid gap-6 xl:grid-cols-[0.42fr_0.58fr]">
          <div class="space-y-6">
            <div class="ts-card space-y-4">
              <div class="flex items-center gap-3">
                <lucide-icon name="Layers" class="h-5 w-5 text-accent" strokeWidth="1.75"></lucide-icon>
                <div>
                  <h2 class="text-lg font-semibold text-ink">Pilar</h2>
                  <p class="text-sm text-neutral-400">
                    Selecciona el pilar global sobre el que quieres trabajar.
                  </p>
                </div>
              </div>

              <label class="block space-y-2">
                <span class="ts-label">Pilar</span>
                <select
                  class="ts-select"
                  [(ngModel)]="selectedPilarId"
                  (change)="loadPreguntas()"
                  [disabled]="loadingPilares"
                >
                  <option [ngValue]="null">Selecciona un pilar</option>
                  <option *ngFor="let p of pilares()" [ngValue]="p.id">{{ p.nombre }}</option>
                </select>
              </label>

              <ngx-skeleton-loader
                *ngIf="loadingPilares"
                count="4"
                [theme]="{ height: '14px', marginBottom: '10px', borderRadius: '6px' }"
              ></ngx-skeleton-loader>
            </div>

            <div class="ts-card space-y-5" *ngIf="selectedPilarId">
              <div>
                <h2 class="text-lg font-semibold text-ink">Nueva pregunta</h2>
                <p class="text-sm text-neutral-400">
                  Diseña la pregunta y define su tipo, obligatoriedad y peso relativo.
                </p>
              </div>

              <div class="space-y-4">
                <label class="block space-y-2">
                  <span class="ts-label">Enunciado</span>
                  <textarea
                    class="ts-input min-h-[120px] resize-y"
                    [(ngModel)]="form.enunciado"
                    placeholder="Describe la consulta que aparecerá en el cuestionario"
                  ></textarea>
                </label>

                <div class="grid gap-4 md:grid-cols-2">
                  <label class="block space-y-2">
                    <span class="ts-label">Tipo de respuesta</span>
                    <select class="ts-select" [(ngModel)]="form.tipo">
                      <option [ngValue]="'LIKERT'">Likert (1 a 5)</option>
                      <option [ngValue]="'ABIERTA'">Respuesta abierta</option>
                      <option [ngValue]="'SI_NO'">Sí / No</option>
                    </select>
                  </label>

                  <label class="block space-y-2">
                    <span class="ts-label">Peso</span>
                    <input class="ts-input" type="number" min="1" [(ngModel)]="form.peso" />
                  </label>
                </div>


                <label class="block space-y-2">
                  <span class="ts-label">Respuesta esperada (opcional)</span>
                  <input
                    class="ts-input"
                    type="text"
                    maxlength="500"
                    [(ngModel)]="form.respuesta_esperada"
                    placeholder="Ej.: Referencia a casos concretos o proceso objetivo"
                  />
                </label>

                <label class="flex items-center gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2">
                  <input
                    type="checkbox"
                    class="h-4 w-4 rounded border-neutral-300 text-accent focus:ring-accent"
                    [(ngModel)]="form.es_obligatoria"
                  />
                  <span class="text-sm text-neutral-700">Respuesta obligatoria</span>
                </label>
              </div>

              <button
                class="ts-btn ts-btn--positive w-full md:w-auto"
                (click)="crearPregunta()"
                [disabled]="creatingQuestion || !form.enunciado.trim()"
              >
                <lucide-icon
                  *ngIf="!creatingQuestion"
                  name="Plus"
                  class="h-4 w-4"
                  strokeWidth="1.75"
                ></lucide-icon>
                <lucide-icon
                  *ngIf="creatingQuestion"
                  name="Loader2"
                  class="h-4 w-4 animate-spin"
                  strokeWidth="1.75"
                ></lucide-icon>
                <span>{{ creatingQuestion ? 'Guardando...' : 'Agregar pregunta' }}</span>
              </button>
            </div>
            </div>

            <div class="ts-card space-y-5">
              <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-ink">Preguntas del pilar</h2>
                <p class="text-sm text-neutral-400">
                  Gestiona las preguntas activas. Puedes eliminarlas si ya no aplican.
                </p>
              </div>
              <lucide-icon name="HelpCircle" class="h-5 w-5 text-neutral-300" strokeWidth="1.75"></lucide-icon>
            </div>

            <ng-container *ngIf="loadingPreguntas">
              <ngx-skeleton-loader
                count="4"
                [theme]="{ height: '80px', marginBottom: '14px', borderRadius: '12px' }"
              ></ngx-skeleton-loader>
            </ng-container>

            <ng-container *ngIf="!loadingPreguntas && preguntas().length; else emptyQuestions">
              <div class="space-y-3">
                <div
                  *ngFor="let item of preguntasView(); trackBy: trackByQuestionView"
                  class="rounded-xl border border-neutral-200 p-4 transition-all duration-120 ease-smooth hover:border-accent/40 hover:shadow-card"
                >
                  <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div class="space-y-2 lg:flex-1">
                      <p class="text-base font-medium text-ink">
                        {{ item.title }}
                      </p>
                      <p class="text-xs text-accent" *ngIf="item.expected">
                        Respuesta esperada: {{ item.expected }}
                      </p>
                      <div class="flex flex-wrap gap-2 text-xs text-neutral-400">
                        <span class="ts-badge uppercase">{{ item.typeLabel }}</span>
                        <span class="ts-chip">Peso {{ item.weightLabel }}</span>
                        <span class="ts-chip">
                          {{ item.isMandatory ? 'Obligatoria' : 'Opcional' }}
                        </span>
                      </div>
                    </div>

                    <div class="flex w-full flex-wrap justify-end gap-2 lg:w-auto">
                      <button
                        class="ts-btn ts-btn--secondary"
                        type="button"
                        (click)="startEdit(item.raw)"
                        [disabled]="!item.raw"
                      >
                        <lucide-icon name="PencilLine" class="h-4 w-4" strokeWidth="1.75"></lucide-icon>
                        <span>Editar</span>
                      </button>
                      <button
                        class="ts-btn ts-btn--danger"
                        (click)="eliminarPregunta(item.raw?.id)"
                        [disabled]="!item.raw?.id || deletingId === item.raw?.id"
                      >
                        <lucide-icon
                          *ngIf="deletingId !== item.raw?.id"
                          name="Trash2"
                          class="h-4 w-4"
                          strokeWidth="1.75"
                        ></lucide-icon>
                        <lucide-icon
                          *ngIf="deletingId === item.raw?.id"
                          name="Loader2"
                          class="h-4 w-4 animate-spin"
                          strokeWidth="1.75"
                        ></lucide-icon>
                        <span>{{ deletingId === item.raw?.id ? 'Eliminando...' : 'Eliminar' }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </ng-container>

            <ng-template #emptyQuestions>
              <div class="rounded-xl border border-dashed border-neutral-200 bg-neutral-100/60 p-6 text-center">
                <p class="text-sm text-neutral-400">
                  {{ selectedPilarId ? 'Aún no hay preguntas en este pilar.' : 'Selecciona un pilar para comenzar.' }}
                </p>
              </div>
            </ng-template>
          </div>
        </div>
      </div>

      <!-- Modal de edición -->
      <ts-modal title="Editar pregunta" [open]="editModalOpen" (close)="cerrarModalEdicion()">
        <div class="space-y-4">
          <div class="text-xs text-neutral-400 mb-2" *ngIf="editingQuestionId">
            ID #{{ editingQuestionId }}
          </div>

          <label class="block space-y-2">
            <span class="ts-label">Enunciado</span>
            <textarea
              class="ts-input min-h-[120px] resize-y"
              [(ngModel)]="editForm.enunciado"
              name="editEnunciado"
              placeholder="Actualiza la pregunta"
            ></textarea>
          </label>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="block space-y-2">
              <span class="ts-label">Tipo de respuesta</span>
              <select class="ts-select" [(ngModel)]="editForm.tipo" name="editTipo">
                <option [ngValue]="'LIKERT'">Likert (1 a 5)</option>
                <option [ngValue]="'ABIERTA'">Respuesta abierta</option>
                <option [ngValue]="'SI_NO'">Sí / No</option>
              </select>
            </label>

            <label class="block space-y-2">
              <span class="ts-label">Peso</span>
              <input class="ts-input" type="number" min="1" [(ngModel)]="editForm.peso" name="editPeso" />
            </label>
          </div>

          <label class="block space-y-2">
            <span class="ts-label">Respuesta esperada (opcional)</span>
            <input
              class="ts-input"
              type="text"
              maxlength="500"
              [(ngModel)]="editForm.respuesta_esperada"
              name="editRespuestaEsperada"
              placeholder="Pista o guía interna"
            />
          </label>

          <label class="flex items-center gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-neutral-300 text-accent focus:ring-accent"
              [(ngModel)]="editForm.es_obligatoria"
              name="editEsObligatoria"
            />
            <span class="text-sm text-neutral-700">Respuesta obligatoria</span>
          </label>

          <div class="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              class="ts-btn ts-btn--secondary"
              (click)="cerrarModalEdicion()"
              [disabled]="updatingQuestion"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="ts-btn ts-btn--positive"
              (click)="guardarEdicion()"
              [disabled]="updatingQuestion || !editForm.enunciado.trim()"
            >
              {{ updatingQuestion ? 'Actualizando...' : 'Guardar cambios' }}
            </button>
          </div>
        </div>
      </ts-modal>

      <!-- Modal de confirmación para eliminar pregunta -->
      <ts-modal
        title="¿Eliminar pregunta?"
        [open]="deleteConfirmModal.open"
        (close)="closeDeleteConfirmModal()"
      >
        <div class="space-y-4">
          <p class="text-sm text-neutral-500">
            ¿Estás seguro de que deseas eliminar esta pregunta?
            Esta acción es irreversible.
          </p>
          <div class="rounded-lg border border-border bg-[#F8FAFC] p-3">
            <p class="text-sm font-medium text-ink">{{ deleteConfirmModal.preguntaEnunciado }}</p>
          </div>
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
              (click)="confirmDeletePregunta()"
              [disabled]="deleteConfirmModal.busy"
            >
              <lucide-icon
                *ngIf="!deleteConfirmModal.busy"
                name="Trash2"
                class="h-4 w-4"
                strokeWidth="1.75"
              ></lucide-icon>
              <lucide-icon
                *ngIf="deleteConfirmModal.busy"
                name="Loader2"
                class="h-4 w-4 animate-spin"
                strokeWidth="1.75"
              ></lucide-icon>
              <span>{{ deleteConfirmModal.busy ? 'Eliminando...' : 'Eliminar' }}</span>
            </button>
          </div>
        </div>
      </ts-modal>
    </div>
  `,
})
export class QuestionsComponent implements OnInit {
  private pillarsSrv = inject(PilarService);
  private questionsSrv = inject(QuestionService);

  pilares: WritableSignal<Pilar[]> = signal<Pilar[]>([]);
  preguntas: WritableSignal<Pregunta[]> = signal<Pregunta[]>([]);
  readonly preguntasView = computed<QuestionView[]>(() =>
    (this.preguntas() ?? []).map((question, index) => {
      const hasValidId = typeof question?.id === 'number' && Number.isFinite(question.id);
      const rawTitle =
        typeof question?.enunciado === 'string' ? question.enunciado.trim() : '';
      const title = rawTitle || `Pregunta ${index + 1}`;
      const typeLabel =
        typeof question?.tipo === 'string' && question.tipo.trim().length
          ? question.tipo
          : '--';
      const weightLabel =
        typeof question?.peso === 'number' && !Number.isNaN(question.peso)
          ? String(question.peso)
          : '--';
      const expected =
        typeof question?.respuesta_esperada === 'string'
          ? question.respuesta_esperada.trim()
          : '';
      return {
        id: hasValidId ? (question as Pregunta).id : index * -1,
        raw: question,
        title,
        typeLabel,
        weightLabel,
        expected,
        isMandatory: !!question?.es_obligatoria,
      };
    })
  );

  selectedPilarId: number | null = null;

  loadingPilares = false;
  loadingPreguntas = false;
  creatingQuestion = false;
  deletingId: number | null = null;

  form: {
    enunciado: string;
    tipo: TipoPreguntaEnum;
    es_obligatoria: boolean;
    peso: number;
    respuesta_esperada: string;
  } = {
    enunciado: '',
    tipo: 'LIKERT',
    es_obligatoria: true,
    peso: 1,
    respuesta_esperada: '',
  };
  editingQuestionId: number | null = null;
  editModalOpen = false;
  updatingQuestion = false;
  editForm: {
    enunciado: string;
    tipo: TipoPreguntaEnum;
    es_obligatoria: boolean;
    peso: number;
    respuesta_esperada: string;
  } = {
    enunciado: '',
    tipo: 'LIKERT',
    es_obligatoria: true,
    peso: 1,
    respuesta_esperada: '',
  };

  ngOnInit(): void {
    this.loadPilares();
  }

  private loadPilares(): void {
    this.pilares.set([]);
    this.preguntas.set([]);
    this.selectedPilarId = null;
    this.resetEditingState();
    this.loadingPilares = true;
    this.pillarsSrv.listAll().subscribe({
      next: (rows: Pilar[]) => this.pilares.set(rows ?? []),
      error: (error: unknown) => console.error('Error listando pilares', error),
      complete: () => (this.loadingPilares = false),
    });
  }

  private cargarPreguntas(pilarId: number): void {
    this.loadingPreguntas = true;
    this.questionsSrv.listByPilar(pilarId).subscribe({
      next: (rows: Pregunta[]) => {
        const sanitized = (rows ?? []).filter(
          (item): item is Pregunta => !!item && typeof item.id === 'number'
        );
        this.preguntas.set(sanitized);
      },
      error: (error: unknown) => console.error('Error listando preguntas', error),
      complete: () => (this.loadingPreguntas = false),
    });
  }

  loadPreguntas(): void {
    this.preguntas.set([]);
    this.resetEditingState();
    if (!this.selectedPilarId) return;
    this.cargarPreguntas(this.selectedPilarId);
  }

  crearPregunta(): void {
    if (!this.selectedPilarId || this.creatingQuestion) return;

    const payload: {
      pilar_id: number;
      enunciado: string;
      tipo: TipoPreguntaEnum;
      es_obligatoria: boolean;
      peso: number;
      respuesta_esperada?: string;
    } = {
      pilar_id: this.selectedPilarId,
      enunciado: this.form.enunciado.trim(),
      tipo: this.form.tipo,
      es_obligatoria: this.form.es_obligatoria,
      peso: this.form.peso || 1,
      respuesta_esperada: this.form.respuesta_esperada?.trim() || undefined,
    };

    if (!payload.enunciado) return;
    if (!payload.respuesta_esperada) {
      delete payload.respuesta_esperada;
    }

    this.creatingQuestion = true;

    this.questionsSrv.create(payload).subscribe({
      next: () => {
        this.form.enunciado = '';
        this.form.tipo = 'LIKERT';
        this.form.es_obligatoria = true;
        this.form.peso = 1;
        this.form.respuesta_esperada = '';
        this.cargarPreguntas(this.selectedPilarId!);
      },
      error: (error) => {
        console.error('Error creando pregunta', error);
        this.creatingQuestion = false;
      },
      complete: () => (this.creatingQuestion = false),
    });
  }

  // Modal de confirmación para eliminar pregunta
  deleteConfirmModal = {
    open: false,
    preguntaId: null as number | null,
    preguntaEnunciado: '',
    busy: false,
  };

  eliminarPregunta(id: number | null | undefined): void {
    if (!id || this.deletingId) return;
    
    const pregunta = this.preguntas().find(p => p.id === id);
    this.deleteConfirmModal = {
      open: true,
      preguntaId: id,
      preguntaEnunciado: pregunta?.enunciado || `Pregunta #${id}`,
      busy: false,
    };
  }

  closeDeleteConfirmModal(): void {
    if (this.deleteConfirmModal.busy) return;
    this.deleteConfirmModal = {
      open: false,
      preguntaId: null,
      preguntaEnunciado: '',
      busy: false,
    };
  }

  confirmDeletePregunta(): void {
    const id = this.deleteConfirmModal.preguntaId;
    if (!id || this.deleteConfirmModal.busy) return;

    this.deleteConfirmModal.busy = true;
    this.deletingId = id;

    this.questionsSrv.delete(id).subscribe({
      next: () => {
        if (this.editingQuestionId === id) {
          this.resetEditingState();
        }
        this.deletingId = null;
        this.deleteConfirmModal = {
          open: false,
          preguntaId: null,
          preguntaEnunciado: '',
          busy: false,
        };
        if (this.selectedPilarId) this.cargarPreguntas(this.selectedPilarId);
      },
      error: (error) => {
        console.error('Error eliminando pregunta', error);
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

  startEdit(question: Pregunta | undefined): void {
    if (!question) return;
    this.editingQuestionId = question.id;
    this.updatingQuestion = false;
    this.editForm = {
      enunciado: question.enunciado,
      tipo: question.tipo,
      es_obligatoria: question.es_obligatoria,
      peso: question.peso,
      respuesta_esperada: question.respuesta_esperada ?? '',
    };
    this.editModalOpen = true;
  }

  cerrarModalEdicion(): void {
    if (this.updatingQuestion) return;
    this.resetEditingState();
  }

  cancelarEdicion(): void {
    this.cerrarModalEdicion();
  }

  guardarEdicion(): void {
    if (!this.editingQuestionId || this.updatingQuestion) return;
    const trimmedEnunciado = this.editForm.enunciado.trim();
    if (!trimmedEnunciado) {
      // Mostrar error en el modal si es necesario
      return;
    }
    const payload: {
      enunciado: string;
      tipo: TipoPreguntaEnum;
      es_obligatoria: boolean;
      peso: number;
      respuesta_esperada?: string;
    } = {
      enunciado: trimmedEnunciado,
      tipo: this.editForm.tipo,
      es_obligatoria: this.editForm.es_obligatoria,
      peso: this.editForm.peso || 1,
      respuesta_esperada: this.editForm.respuesta_esperada?.trim() ?? '',
    };
    if (!payload.respuesta_esperada) {
      delete payload.respuesta_esperada;
    }
    this.updatingQuestion = true;
    this.questionsSrv.update(this.editingQuestionId, payload).subscribe({
      next: (updated) => {
        // Actualizar la pregunta en la lista sin recargar todo
        if (this.selectedPilarId) {
          this.preguntas.set(
            this.preguntas().map((p) => (p.id === updated.id ? updated : p))
          );
        }
        this.resetEditingState();
      },
      error: (error) => {
        console.error('Error actualizando pregunta', error);
        // Mantener el modal abierto para que el usuario pueda corregir
        // Solo resetear el estado de carga
        this.updatingQuestion = false;
        // Opcional: mostrar un mensaje de error en el modal
        // Puedes agregar una variable para mostrar errores en el modal si lo deseas
      },
      complete: () => {
        // Asegurar que el estado se resetee incluso si hay error
        if (this.updatingQuestion) {
          this.updatingQuestion = false;
        }
      },
    });
  }

  private resetEditingState(): void {
    this.editingQuestionId = null;
    this.editModalOpen = false;
    this.updatingQuestion = false;
    this.editForm = {
      enunciado: '',
      tipo: 'LIKERT',
      es_obligatoria: true,
      peso: 1,
      respuesta_esperada: '',
    };
  }

  trackByQuestionView(index: number, item: QuestionView): number {
    return item?.id ?? index;
  }
}
