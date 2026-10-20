import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { Lead } from '../../types';
import { countByService, countByWeek, parseLeadDate, parseQuizSummary } from './lead-insights';

// Indicadores de las solicitudes de contacto: totales, por servicio, por semana
// y resultados del mini-diagnóstico del home.
@Component({
  standalone: true,
  selector: 'app-leads-insights',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgFor, NgIf, DecimalPipe],
  template: `
    <div class="insights">
      <!-- Resumen -->
      <div class="insights__kpis">
        <div class="insights__kpi">
          <span class="insights__kpi-label">Total</span>
          <span class="insights__kpi-value">{{ leads().length }}</span>
        </div>
        <div class="insights__kpi">
          <span class="insights__kpi-label">Últimos 7 días</span>
          <span class="insights__kpi-value">{{ lastWeek() }}</span>
        </div>
        <div class="insights__kpi">
          <span class="insights__kpi-label">Desde el mini-diagnóstico</span>
          <span class="insights__kpi-value">{{ quizzes().length }}</span>
        </div>
      </div>

      <div class="insights__grid">
        <!-- Por servicio -->
        <section class="insights__card">
          <h3 class="insights__title">Por servicio</h3>
          <ul class="space-y-3">
            <li *ngFor="let s of byService()">
              <div class="flex items-baseline justify-between gap-2 text-sm">
                <span class="text-ink">{{ s.label }}</span>
                <span class="text-muted tabular-nums">{{ s.count }} · {{ s.percent }}%</span>
              </div>
              <div class="insights__bar">
                <span class="insights__bar-fill" [style.width.%]="s.percent"></span>
              </div>
            </li>
          </ul>
        </section>

        <!-- Por semana -->
        <section class="insights__card">
          <h3 class="insights__title">Por semana <span class="font-normal text-muted">(últimas 8)</span></h3>
          <div class="insights__weeks">
            <div *ngFor="let w of byWeek(); let last = last" class="insights__week" [class.is-current]="last">
              <span class="insights__week-count tabular-nums">{{ w.count || '' }}</span>
              <span class="insights__week-bar" [style.height.%]="weekHeight(w.count)"></span>
              <span class="insights__week-label">{{ w.label }}</span>
            </div>
          </div>
        </section>

        <!-- Mini-diagnóstico -->
        <section class="insights__card">
          <h3 class="insights__title">Mini-diagnóstico</h3>
          <ng-container *ngIf="quizzes().length; else noQuiz">
            <p class="text-sm text-muted">
              Nivel promedio
              <strong class="text-lg text-ink tabular-nums">{{ avgLevel() | number: '1.1-1' }}</strong>
              / 5
            </p>
            <div class="insights__levels" aria-label="Distribución por nivel">
              <div *ngFor="let l of levelDistribution(); let i = index" class="insights__level">
                <span class="insights__level-bar" [style.height.%]="levelHeight(l)"></span>
                <span class="insights__level-label">{{ i + 1 }}</span>
              </div>
            </div>
            <ul class="mt-3 space-y-1.5 text-sm">
              <li *ngFor="let p of pillarAverages()" class="flex justify-between gap-2">
                <span class="truncate text-muted">{{ p.name }}</span>
                <span class="tabular-nums text-ink">{{ p.avg | number: '1.1-1' }}</span>
              </li>
            </ul>
          </ng-container>
          <ng-template #noQuiz>
            <p class="text-sm text-muted">Aún no llegan solicitudes desde el mini-diagnóstico.</p>
          </ng-template>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .insights {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .insights__kpis {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.75rem;
    }

    .insights__kpi,
    .insights__card {
      border: 1px solid #e5e7eb;
      border-radius: 0.9rem;
      background: #fff;
      padding: 0.9rem 1rem;
    }

    .insights__kpi {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .insights__kpi-label {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .insights__kpi-value {
      font-size: 1.6rem;
      font-weight: 600;
      color: #0f0f0f;
      font-variant-numeric: tabular-nums;
    }

    .insights__grid {
      display: grid;
      gap: 0.75rem;
    }

    @media (min-width: 1024px) {
      .insights__grid {
        grid-template-columns: 1.1fr 1.2fr 1fr;
      }
    }

    .insights__title {
      margin-bottom: 0.9rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: #0f0f0f;
    }

    .insights__bar {
      height: 6px;
      margin-top: 0.35rem;
      overflow: hidden;
      border-radius: 9999px;
      background: #f0f0f1;
    }

    .insights__bar-fill {
      display: block;
      height: 100%;
      border-radius: 9999px;
      background: #0f0f0f;
      transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .insights__weeks,
    .insights__levels {
      display: flex;
      align-items: flex-end;
      gap: 0.4rem;
      height: 8.5rem;
    }

    .insights__levels {
      height: 5rem;
      margin-top: 0.75rem;
    }

    .insights__week,
    .insights__level {
      display: flex;
      flex: 1;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 0.3rem;
      height: 100%;
      min-width: 0;
    }

    .insights__week-bar,
    .insights__level-bar {
      width: 100%;
      min-height: 2px;
      border-radius: 0.3rem 0.3rem 0 0;
      background: #d4d4d8;
      transition: height 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .insights__week.is-current .insights__week-bar,
    .insights__level-bar {
      background: #0f0f0f;
    }

    .insights__week-count {
      font-size: 0.7rem;
      color: #0f0f0f;
    }

    .insights__week-label,
    .insights__level-label {
      font-size: 0.65rem;
      color: #9ca3af;
      white-space: nowrap;
    }

    @media (max-width: 640px) {
      .insights__kpis {
        grid-template-columns: 1fr;
      }

      .insights__week-label {
        display: none;
      }
    }
  `],
})
export class LeadsInsightsComponent {
  readonly leads = input.required<Lead[]>();

  readonly byService = computed(() => countByService(this.leads()));
  readonly byWeek = computed(() => countByWeek(this.leads()));
  private readonly maxWeek = computed(() => Math.max(1, ...this.byWeek().map((w) => w.count)));

  readonly lastWeek = computed(() => {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return this.leads().filter((l) => parseLeadDate(l.created_at).getTime() >= since).length;
  });

  readonly quizzes = computed(() =>
    this.leads()
      .map((l) => parseQuizSummary(l.message))
      .filter((q): q is NonNullable<typeof q> => q !== null),
  );

  readonly avgLevel = computed(() => {
    const q = this.quizzes();
    return q.length ? q.reduce((sum, item) => sum + item.level, 0) / q.length : 0;
  });

  readonly levelDistribution = computed(() => {
    const counts = [0, 0, 0, 0, 0];
    for (const q of this.quizzes()) {
      if (q.level >= 1 && q.level <= 5) counts[q.level - 1]++;
    }
    return counts;
  });

  readonly pillarAverages = computed(() => {
    const totals = new Map<string, { sum: number; n: number }>();
    for (const q of this.quizzes()) {
      for (const p of q.pillars) {
        const t = totals.get(p.name) ?? { sum: 0, n: 0 };
        t.sum += p.value;
        t.n++;
        totals.set(p.name, t);
      }
    }
    return [...totals.entries()].map(([name, t]) => ({ name, avg: t.sum / t.n }));
  });

  weekHeight(count: number): number {
    return (count / this.maxWeek()) * 80;
  }

  levelHeight(count: number): number {
    const max = Math.max(1, ...this.levelDistribution());
    return (count / max) * 75;
  }
}
