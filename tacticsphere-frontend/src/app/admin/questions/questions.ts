import { Component, OnInit, WritableSignal, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { LucideAngularModule } from 'lucide-angular';

import { PilarService } from '../../pillar.service';
import { QuestionService } from '../../question.service';

import { Pilar, Pregunta, TipoPreguntaEnum } from '../../types';

@Component({
  standalone: true,
  selector: 'app-questions',
  imports: [
    CommonModule,
    FormsModule,
    NgxSkeletonLoaderModule,
    LucideAngularModule,
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
                  *ngFor="let q of preguntas()"
                  class="rounded-xl border border-neutral-200 p-4 transition-all duration-120 ease-smooth hover:border-accent/40 hover:shadow-card"
                >
                  <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div class="space-y-2">
                      <p class="text-base font-medium text-ink">{{ q.enunciado }}</p>
                      <p class="text-xs text-accent" *ngIf="q.respuesta_esperada">
                        Respuesta esperada: {{ q.respuesta_esperada }}
                      </p>
                      <div class="flex flex-wrap gap-2 text-xs text-neutral-400">
                        <span class="ts-badge uppercase">{{ q.tipo }}</span>
                        <span class="ts-chip">Peso {{ q.peso }}</span>
                        <span class="ts-chip">
                          {{ q.es_obligatoria ? 'Obligatoria' : 'Opcional' }}
                        </span>
                      </div>
                    </div>

                    <button
                      class="ts-btn ts-btn--danger"
                      (click)="eliminarPregunta(q.id)"
                      [disabled]="deletingId === q.id"
                    >
                      <lucide-icon
                        *ngIf="deletingId !== q.id"
                        name="Trash2"
                        class="h-4 w-4"
                        strokeWidth="1.75"
                      ></lucide-icon>
                      <lucide-icon
                        *ngIf="deletingId === q.id"
                        name="Loader2"
                        class="h-4 w-4 animate-spin"
                        strokeWidth="1.75"
                      ></lucide-icon>
                      <span>{{ deletingId === q.id ? 'Eliminando...' : 'Eliminar' }}</span>
                    </button>
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
    </div>
  `,
})
export class QuestionsComponent implements OnInit {
  private pillarsSrv = inject(PilarService);
  private questionsSrv = inject(QuestionService);

  pilares: WritableSignal<Pilar[]> = signal<Pilar[]>([]);
  preguntas: WritableSignal<Pregunta[]> = signal<Pregunta[]>([]);

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

  ngOnInit(): void {
    this.loadPilares();
  }

  private loadPilares(): void {
    this.pilares.set([]);
    this.preguntas.set([]);
    this.selectedPilarId = null;
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
      next: (rows: Pregunta[]) => this.preguntas.set(rows ?? []),
      error: (error: unknown) => console.error('Error listando preguntas', error),
      complete: () => (this.loadingPreguntas = false),
    });
  }

  loadPreguntas(): void {
    this.preguntas.set([]);
    if (!this.selectedPilarId) return;
    this.cargarPreguntas(this.selectedPilarId);
  }

  crearPregunta(): void {
    if (!this.selectedPilarId || this.creatingQuestion) return;

    const payload = {
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

  eliminarPregunta(id: number): void {
    if (this.deletingId) return;
    this.deletingId = id;

    this.questionsSrv.delete(id).subscribe({
      next: () => {
        if (this.selectedPilarId) this.cargarPreguntas(this.selectedPilarId);
      },
      error: (error) => {
        console.error('Error eliminando pregunta', error);
        this.deletingId = null;
      },
      complete: () => {
        this.deletingId = null;
      },
    });
  }
}
