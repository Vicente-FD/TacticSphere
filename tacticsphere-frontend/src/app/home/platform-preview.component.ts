import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { NgFor, NgIf } from '@angular/common';

// Vista previa de la plataforma dentro de un marco de navegador. Entra inclinada en
// perspectiva y se endereza a medida que se hace scroll hasta ella.
// Usa assets/platform/dashboard.png; si aún no existe muestra una ilustración del dashboard.
@Component({
  standalone: true,
  selector: 'app-platform-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgFor, NgIf],
  template: `
    <div class="preview" [style.--tilt]="tilt()">
      <div class="preview__window">
        <div class="preview__bar">
          <span class="preview__dot"></span>
          <span class="preview__dot"></span>
          <span class="preview__dot"></span>
          <span class="preview__url">app.tacticsphere · Resultados</span>
        </div>

        <img
          *ngIf="!imageFailed(); else mock"
          class="preview__img"
          src="assets/platform/dashboard.png"
          alt="Dashboard de resultados de la plataforma TacticSphere"
          loading="lazy"
          decoding="async"
          (error)="imageFailed.set(true)"
        />

        <!-- Ilustración del dashboard mientras no haya captura real -->
        <ng-template #mock>
          <div class="mock" aria-label="Ilustración del dashboard de TacticSphere" role="img">
            <aside class="mock__side">
              <span class="mock__logo"></span>
              <span *ngFor="let w of [70, 55, 62, 48]" class="mock__nav" [style.width.%]="w"></span>
            </aside>
            <div class="mock__main">
              <div class="mock__kpis">
                <div *ngFor="let k of kpis" class="mock__kpi">
                  <span class="mock__kpi-label">{{ k.label }}</span>
                  <span class="mock__kpi-value">{{ k.value }}</span>
                </div>
              </div>
              <div class="mock__charts">
                <div class="mock__card">
                  <span class="mock__card-title">Madurez por pilar</span>
                  <div class="mock__bars">
                    <span
                      *ngFor="let b of bars; let i = index"
                      class="mock__bar"
                      [style.height.%]="b"
                      [style.--i]="i"
                    ></span>
                  </div>
                </div>
                <div class="mock__card">
                  <span class="mock__card-title">Perfil de madurez</span>
                  <svg class="mock__radar" viewBox="-60 -60 120 120">
                    <polygon *ngFor="let r of [50, 37.5, 25, 12.5]" [attr.points]="square(r)" class="mock__grid" />
                    <line x1="0" y1="-50" x2="0" y2="50" class="mock__grid" />
                    <line x1="-50" y1="0" x2="50" y2="0" class="mock__grid" />
                    <polygon class="mock__shape" points="0,-38 30,0 0,22 -40,0" />
                  </svg>
                </div>
              </div>
              <div class="mock__rows">
                <span *ngFor="let w of [92, 80, 86]" class="mock__row" [style.width.%]="w"></span>
              </div>
            </div>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      perspective: 1400px;
    }

    .preview {
      --tilt: 1;
      transform: rotateX(calc(var(--tilt) * 22deg)) scale(calc(1 - var(--tilt) * 0.08))
        translateY(calc(var(--tilt) * 24px));
      transform-origin: center bottom;
      transition: transform 0.12s linear;
      will-change: transform;
    }

    .preview__window {
      overflow: hidden;
      border: 1px solid #e5e7eb;
      border-radius: 1rem;
      background: #fff;
      box-shadow: 0 40px 80px -40px rgba(15, 15, 15, 0.35), 0 1px 3px rgba(0, 0, 0, 0.06);
    }

    .preview__bar {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      border-bottom: 1px solid #e5e7eb;
      background: #fafafa;
      padding: 0.6rem 0.9rem;
    }

    .preview__dot {
      width: 0.6rem;
      height: 0.6rem;
      border-radius: 9999px;
      background: #e5e7eb;
    }

    .preview__url {
      margin-left: 0.75rem;
      border-radius: 9999px;
      background: #f0f0f1;
      padding: 0.15rem 0.75rem;
      font-size: 0.7rem;
      color: #9ca3af;
    }

    .preview__img {
      display: block;
      width: 100%;
      height: auto;
    }

    /* ---- Ilustración ---- */
    .mock {
      display: grid;
      grid-template-columns: 9rem 1fr;
      min-height: 22rem;
      font-size: 0.7rem;
    }

    .mock__side {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      border-right: 1px solid #f0f0f1;
      padding: 1rem;
    }

    .mock__logo {
      width: 1.5rem;
      height: 1.5rem;
      margin-bottom: 0.5rem;
      border-radius: 9999px;
      border: 3px solid #0f0f0f;
    }

    .mock__nav,
    .mock__row {
      height: 0.5rem;
      border-radius: 9999px;
      background: #f0f0f1;
    }

    .mock__main {
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      padding: 1rem;
    }

    .mock__kpis {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.6rem;
    }

    .mock__kpi,
    .mock__card {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      border: 1px solid #f0f0f1;
      border-radius: 0.6rem;
      padding: 0.6rem 0.75rem;
    }

    .mock__kpi-label,
    .mock__card-title {
      color: #9ca3af;
    }

    .mock__kpi-value {
      font-size: 1.1rem;
      font-weight: 600;
      color: #0f0f0f;
    }

    .mock__charts {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 0.6rem;
    }

    .mock__bars {
      display: flex;
      align-items: flex-end;
      gap: 0.5rem;
      height: 7.5rem;
      padding-top: 0.5rem;
    }

    .mock__bar {
      flex: 1;
      border-radius: 0.3rem 0.3rem 0 0;
      background: #0f0f0f;
      opacity: calc(0.35 + var(--i) * 0.15);
      transform-origin: bottom;
      transform: scaleY(calc(1 - var(--tilt, 0)));
      transition: transform 0.3s ease;
    }

    .mock__radar {
      width: 100%;
      height: 7.5rem;
    }

    .mock__grid {
      fill: none;
      stroke: #e5e7eb;
      stroke-width: 1;
    }

    .mock__shape {
      fill: rgba(15, 15, 15, 0.12);
      stroke: #0f0f0f;
      stroke-width: 1.5;
    }

    .mock__rows {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    @media (max-width: 640px) {
      .mock {
        grid-template-columns: 1fr;
      }

      .mock__side {
        display: none;
      }

      .mock__charts {
        grid-template-columns: 1fr;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .preview {
        transform: none;
        transition: none;
      }

      .mock__bar {
        transform: none;
      }
    }
  `],
})
export class PlatformPreviewComponent implements AfterViewInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);

  // 1 = totalmente inclinada, 0 = derecha
  readonly tilt = signal(1);
  readonly imageFailed = signal(false);

  readonly kpis = [
    { label: 'Nivel general', value: '3.2' },
    { label: 'Respuestas', value: '128' },
    { label: 'Áreas evaluadas', value: '6' },
  ];
  readonly bars = [48, 66, 58, 82];

  private frame: number | null = null;

  private readonly onScroll = () => {
    if (this.frame !== null) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.update();
    });
  };

  ngAfterViewInit(): void {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      this.tilt.set(0);
      return;
    }
    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', this.onScroll, { passive: true });
    });
    this.update();
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
    if (this.frame !== null) cancelAnimationFrame(this.frame);
  }

  square(r: number): string {
    return `0,${-r} ${r},0 0,${r} ${-r},0`;
  }

  private update(): void {
    const rect = this.host.nativeElement.getBoundingClientRect();
    const vh = window.innerHeight;
    // Empieza a enderezarse cuando el borde superior entra por abajo y termina al llegar al 35% de la pantalla
    const progress = (vh - rect.top) / (vh * 0.65);
    const tilt = 1 - Math.min(Math.max(progress, 0), 1);
    if (Math.abs(tilt - this.tilt()) > 0.002) {
      this.zone.run(() => this.tilt.set(tilt));
    }
  }
}
