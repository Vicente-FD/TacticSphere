import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { IconComponent } from '../shared/ui/icon/icon.component';
import { SITE } from './site-config';

// Mini-diagnóstico del home: una pregunta por pilar con 5 opciones (niveles 1 a 5).
// Al terminar muestra "tu esfera de madurez" (4 sectores, uno por pilar), el nivel estimado y una invitación
// a pedir el diagnóstico completo (el padre abre el formulario con el resumen).
@Component({
  standalone: true,
  selector: 'app-maturity-quiz',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgFor, NgIf, IconComponent],
  template: `
    <div class="quiz">
      <!-- Inicio -->
      <div *ngIf="step() === -1" class="quiz__panel quiz__intro">
        <p class="ts-label">Mini-diagnóstico · 1 minuto</p>
        <h2 class="ts-title">¿Qué tan madura es tu empresa?</h2>
        <p class="mx-auto max-w-xl text-base leading-relaxed text-muted">
          Responde 4 preguntas, una por pilar, y obtén una estimación de tu nivel de madurez tecnológica.
        </p>
        <button type="button" class="ts-btn quiz__start" (click)="start()">
          Comenzar
          <app-icon name="arrow-right" size="sm"></app-icon>
        </button>
      </div>

      <!-- Preguntas -->
      <div *ngIf="step() >= 0 && step() < questions.length" class="quiz__panel">
        <div class="quiz__progress" aria-hidden="true">
          <span class="quiz__progress-fill" [style.transform]="'scaleX(' + (step() + 1) / questions.length + ')'"></span>
        </div>

        <div class="quiz__question" [attr.data-step]="step()">
          <div class="flex items-center justify-between gap-4">
            <p class="ts-label inline-flex items-center gap-2">
              <app-icon [name]="current().icon" size="sm"></app-icon>
              {{ current().pillar }}
            </p>
            <p class="text-xs text-muted">{{ step() + 1 }} / {{ questions.length }}</p>
          </div>
          <h3 class="text-xl font-semibold text-ink md:text-2xl">{{ current().question }}</h3>

          <div class="grid gap-2" role="radiogroup" [attr.aria-label]="current().question">
            <button
              *ngFor="let option of current().options; let i = index"
              type="button"
              role="radio"
              class="quiz__option"
              [class.is-selected]="answers()[step()] === i + 1"
              [attr.aria-checked]="answers()[step()] === i + 1"
              [style.--i]="i"
              (click)="choose(i + 1)"
            >
              <span class="quiz__option-index">{{ i + 1 }}</span>
              <span>{{ option }}</span>
            </button>
          </div>

          <button *ngIf="step() > 0" type="button" class="quiz__back" (click)="back()">
            <app-icon name="arrow-left" size="sm"></app-icon>
            Anterior
          </button>
        </div>
      </div>

      <!-- Resultado -->
      <div *ngIf="step() === questions.length" class="quiz__panel quiz__result">
        <div class="grid items-center gap-8 md:grid-cols-[1.1fr_1fr]">
          <!-- Tu esfera de madurez: cada sector crece desde el centro hasta el nivel del pilar -->
          <figure class="quiz__sphere">
            <svg viewBox="-190 -140 380 280" role="img" [attr.aria-label]="sphereLabel()">
              <g class="quiz__sphere-grid">
                <circle *ngFor="let r of levelRadii" [attr.r]="r" />
                <ellipse rx="100" ry="34" />
                <ellipse rx="34" ry="100" />
              </g>
              <path
                *ngFor="let w of wedges(); let i = index"
                class="quiz__wedge"
                [attr.d]="w.path"
                [style.--i]="i"
              />
              <circle class="quiz__sphere-outline" r="100" />
              <g *ngFor="let w of wedges()" class="quiz__sphere-label">
                <text [attr.x]="w.labelX" [attr.y]="w.labelY" [attr.text-anchor]="w.anchor">{{ w.pillar }}</text>
                <text class="quiz__sphere-value" [attr.x]="w.labelX" [attr.y]="w.labelY + 16" [attr.text-anchor]="w.anchor">
                  {{ w.value }}/5
                </text>
              </g>
            </svg>
            <figcaption class="text-center text-xs text-muted">Tu esfera de madurez</figcaption>
          </figure>

          <div class="space-y-4 text-left">
            <p class="ts-label">Tu nivel estimado</p>
            <p class="quiz__level">
              <span class="quiz__level-number">{{ levelIndex() + 1 }}</span>
              <span>
                <span class="block text-2xl font-semibold text-ink">{{ level().name }}</span>
                <span class="block text-sm text-muted">{{ level().label }}</span>
              </span>
            </p>
            <p class="text-sm leading-relaxed text-muted">{{ level().text }}</p>
            <p class="text-sm leading-relaxed text-muted">
              Tu mayor oportunidad está en <strong class="text-ink">{{ weakest().pillar }}</strong>.
              El diagnóstico completo evalúa cada pilar en detalle por área y te entrega una hoja de ruta priorizada.
            </p>
            <div class="flex flex-wrap gap-3 pt-2">
              <button type="button" class="ts-btn" (click)="requestFull()">
                Recibe el diagnóstico completo
                <app-icon name="arrow-right" size="sm"></app-icon>
              </button>
              <button type="button" class="ts-btn ts-btn--secondary" (click)="restart()">
                <app-icon name="rotate-ccw" size="sm"></app-icon>
                Repetir
              </button>
            </div>
            <p class="text-xs text-muted">Estimación referencial basada en 4 respuestas.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --ease: cubic-bezier(0.16, 1, 0.3, 1);
      display: block;
    }

    .quiz__panel {
      animation: panelIn 0.5s var(--ease) both;
    }

    .quiz__intro {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.85rem;
      padding: 1.5rem 0;
      text-align: center;
    }

    .quiz__start {
      margin-top: 0.5rem;
      padding: 0.75rem 1.5rem;
    }

    .quiz__progress {
      position: relative;
      height: 2px;
      margin-bottom: 1.75rem;
      overflow: hidden;
      border-radius: 9999px;
      background: #e5e7eb;
    }

    .quiz__progress-fill {
      position: absolute;
      inset: 0;
      background: #0f0f0f;
      transform-origin: left;
      transition: transform 0.5s var(--ease);
    }

    .quiz__question {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .quiz__option {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      width: 100%;
      border: 1px solid #e5e7eb;
      border-radius: 0.85rem;
      background: #fff;
      padding: 0.8rem 1rem;
      text-align: left;
      font-size: 0.9rem;
      color: #0f0f0f;
      opacity: 0;
      transform: translateY(8px);
      animation: optionIn 0.45s var(--ease) forwards;
      animation-delay: calc(var(--i) * 60ms + 80ms);
      transition: border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease, translate 0.2s ease;
    }

    .quiz__option:hover {
      border-color: #0f0f0f;
      translate: 4px 0;
    }

    .quiz__option.is-selected {
      border-color: #0f0f0f;
      background: #0f0f0f;
      color: #fff;
    }

    .quiz__option-index {
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      height: 1.75rem;
      border-radius: 9999px;
      border: 1px solid currentColor;
      font-size: 0.75rem;
      opacity: 0.6;
    }

    .quiz__back {
      display: inline-flex;
      align-self: flex-start;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.85rem;
      color: #6b7280;
    }

    .quiz__back:hover {
      color: #0f0f0f;
    }

    .quiz__sphere {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .quiz__sphere svg {
      width: 100%;
      height: auto;
      overflow: visible;
    }

    .quiz__sphere-grid circle,
    .quiz__sphere-grid ellipse {
      fill: none;
      stroke: #eeeef0;
      stroke-width: 1;
    }

    .quiz__sphere-outline {
      fill: none;
      stroke: #d4d4d8;
      stroke-width: 1;
    }

    .quiz__wedge {
      fill: #0f0f0f;
      fill-opacity: 0.88;
      stroke: #fff;
      stroke-width: 2;
      transform-box: view-box;
      transform-origin: 50% 50%;
      animation: wedgeGrow 0.9s var(--ease) both;
      animation-delay: calc(var(--i) * 160ms + 200ms);
    }

    .quiz__sphere-label text {
      font-size: 11px;
      fill: #6b7280;
    }

    .quiz__sphere-label .quiz__sphere-value {
      font-size: 12px;
      font-weight: 600;
      fill: #0f0f0f;
    }

    @keyframes wedgeGrow {
      from {
        transform: scale(0);
      }
      to {
        transform: scale(1);
      }
    }

    .quiz__level {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .quiz__level-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 3.5rem;
      height: 3.5rem;
      border-radius: 9999px;
      background: #0f0f0f;
      color: #fff;
      font-size: 1.5rem;
      font-weight: 600;
      animation: levelPop 0.6s var(--ease) 0.4s both;
    }

    :host ::ng-deep app-icon lucide-icon,
    :host ::ng-deep app-icon svg {
      color: inherit !important;
    }

    @keyframes panelIn {
      from {
        opacity: 0;
        transform: translateX(16px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }

    @keyframes optionIn {
      to {
        opacity: 1;
        transform: none;
      }
    }

    @keyframes levelPop {
      0% {
        transform: scale(0.4);
        opacity: 0;
      }
      70% {
        transform: scale(1.1);
        opacity: 1;
      }
      100% {
        transform: scale(1);
      }
    }

    @media (max-width: 640px) {
      .quiz__sphere svg {
        max-height: 260px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .quiz__panel,
      .quiz__option,
      .quiz__level-number,
      .quiz__wedge {
        animation: none;
        opacity: 1;
        transform: none;
      }
    }
  `],
})
export class MaturityQuizComponent {
  @Output() readonly requestDiagnosis = new EventEmitter<string>();

  readonly questions = SITE.quiz;
  private readonly levels = SITE.maturityLevels;

  readonly step = signal(-1);
  readonly answers = signal<number[]>([]);
  readonly current = computed(() => this.questions[Math.max(this.step(), 0)]);

  readonly average = computed(() => {
    const values = this.answers();
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  });
  readonly levelIndex = computed(() => Math.min(Math.max(Math.round(this.average()) - 1, 0), 4));
  readonly level = computed(() => this.levels[this.levelIndex()]);
  readonly weakest = computed(() => {
    const values = this.answers();
    const min = Math.min(...values);
    return this.questions[values.indexOf(min)];
  });

  // Anillos de nivel (1 a 5) de la esfera; radio exterior = 100
  readonly levelRadii = [20, 40, 60, 80, 100];

  // Un sector por pilar, en sentido horario desde arriba; radio proporcional al nivel
  readonly wedges = computed(() =>
    this.questions.map((q, i) => {
      const value = this.answers()[i] ?? 0;
      const r = value * 20;
      const start = -90 + i * 90;
      const end = start + 90;
      const mid = ((start + 45) * Math.PI) / 180;
      const point = (deg: number, radius: number) => {
        const rad = (deg * Math.PI) / 180;
        return `${(Math.cos(rad) * radius).toFixed(2)},${(Math.sin(rad) * radius).toFixed(2)}`;
      };
      const labelX = Math.cos(mid) * 112;
      const labelY = Math.sin(mid) * 112 + (Math.sin(mid) > 0 ? 8 : -12);
      return {
        pillar: q.pillar,
        value,
        path: `M0,0 L${point(start, r)} A${r},${r} 0 0 1 ${point(end, r)} Z`,
        labelX,
        labelY,
        anchor: labelX >= 0 ? 'start' : 'end',
      };
    }),
  );

  readonly sphereLabel = computed(
    () =>
      'Tu esfera de madurez: ' +
      this.wedges()
        .map((w) => `${w.pillar} ${w.value} de 5`)
        .join(', '),
  );

  private advanceTimer: ReturnType<typeof setTimeout> | null = null;

  start(): void {
    this.answers.set([]);
    this.step.set(0);
  }

  choose(value: number): void {
    const index = this.step();
    this.answers.update((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
    // Breve pausa para que se vea la opción marcada antes de avanzar
    if (this.advanceTimer) clearTimeout(this.advanceTimer);
    this.advanceTimer = setTimeout(() => this.step.set(index + 1), 320);
  }

  back(): void {
    if (this.advanceTimer) clearTimeout(this.advanceTimer);
    this.step.update((s) => Math.max(s - 1, 0));
  }

  restart(): void {
    this.start();
  }

  requestFull(): void {
    const detail = this.questions
      .map((q, i) => `${q.pillar}: ${this.answers()[i]}/5`)
      .join(', ');
    this.requestDiagnosis.emit(
      `Mini-diagnóstico: nivel ${this.levelIndex() + 1} (${this.level().name}). ${detail}.`,
    );
  }
}
