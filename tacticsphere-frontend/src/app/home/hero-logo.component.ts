import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgFor, NgIf, NgTemplateOutlet } from '@angular/common';

type Orbit = {
  id: string;
  rx: number;
  ry: number;
  angle: number;
  duration: string;
  reverse: boolean;
};

// Logo de TacticSphere en SVG (réplica de assets/logo_ts.png) para poder animar sus trazos:
// el globo se dibuja al cargar, los nodos aparecen con rebote, pulsos de luz recorren las
// conexiones y tres órbitas giran alrededor con un "satélite" cada una.
// Las órbitas se dibujan dos veces: completas detrás del globo y solo su mitad delantera
// encima, lo que da la sensación de que pasan por delante y por detrás del logo.
@Component({
  standalone: true,
  selector: 'app-hero-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgFor, NgIf, NgTemplateOutlet],
  template: `
    <div class="hero-logo">
      <ng-container *ngTemplateOutlet="orbitLayer; context: { front: false }"></ng-container>

      <div class="hero-logo__globe">
        <svg class="hero-logo__svg" viewBox="200 195 625 625" role="img" aria-label="TacticSphere">
          <g fill="none" stroke="currentColor" stroke-width="30" stroke-linecap="round" stroke-linejoin="round">
            <circle class="draw" style="--o: 0" cx="512" cy="502" r="290" pathLength="1" transform="rotate(-90 512 502)" />
            <path class="draw" style="--o: 1" pathLength="1" d="M522 226 Q 400 318 377 470 Q 358 640 452 782" />
            <path class="draw" style="--o: 2" pathLength="1" d="M262 342 Q 330 402 385 422 Q 482 480 600 488 Q 722 492 796 460" />
            <path class="draw" style="--o: 3" pathLength="1" d="M232 545 Q 340 648 530 672 Q 682 670 776 594" />
            <path class="draw" style="--o: 4" pathLength="1" d="M735 317 Q 612 398 570 500 Q 534 600 530 672 L 532 784" />
          </g>

          <!-- Pulsos de datos que viajan por las conexiones -->
          <g fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round">
            <path class="pulse" style="--p: 0" pathLength="1" d="M735 317 Q 612 398 570 500 Q 534 600 530 672" />
            <path class="pulse" style="--p: 1" pathLength="1" d="M385 422 Q 482 480 600 488 Q 722 492 796 460" />
            <path class="pulse" style="--p: 2" pathLength="1" d="M232 545 Q 340 648 530 672" />
          </g>

          <!-- Nodos: el anillo blanco crea el corte en las líneas como en el logo original -->
          <g>
            <g class="node" style="--n: 0">
              <circle cx="385" cy="422" r="46" fill="#ffffff" />
              <circle cx="385" cy="422" r="33" fill="currentColor" />
            </g>
            <g class="node" style="--n: 1">
              <circle cx="735" cy="317" r="50" fill="#ffffff" />
              <circle cx="735" cy="317" r="37" fill="currentColor" />
            </g>
            <g class="node" style="--n: 2">
              <circle cx="530" cy="672" r="46" fill="#ffffff" />
              <circle cx="530" cy="672" r="33" fill="currentColor" />
            </g>
          </g>
        </svg>
      </div>

      <ng-container *ngTemplateOutlet="orbitLayer; context: { front: true }"></ng-container>
    </div>

    <ng-template #orbitLayer let-front="front">
      <svg class="orbits" [class.orbits--front]="front" viewBox="-170 -170 340 340" aria-hidden="true">
        <defs>
          <ng-container *ngIf="front">
            <clipPath *ngFor="let orbit of orbits" [attr.id]="'front-' + orbit.id">
              <rect [attr.x]="-orbit.rx - 10" y="0" [attr.width]="orbit.rx * 2 + 20" [attr.height]="orbit.ry + 10" />
            </clipPath>
          </ng-container>
          <!-- Recorta lo que cae sobre el globo: atrás queda oculto por él y adelante no ensucia el logo -->
          <mask [attr.id]="front ? 'outside-globe-front' : 'outside-globe-back'" maskUnits="userSpaceOnUse" x="-170" y="-170" width="340" height="340">
            <rect x="-170" y="-170" width="340" height="340" fill="#fff" />
            <circle r="61" fill="#000" />
          </mask>
        </defs>
        <g
          *ngFor="let orbit of orbits"
          [attr.transform]="'rotate(' + orbit.angle + ')'"
        >
          <g
            [attr.clip-path]="front ? 'url(#front-' + orbit.id + ')' : null"
            [attr.mask]="front ? null : 'url(#outside-globe-back)'"
          >
            <ellipse
              class="orbits__ring"
              cx="0"
              cy="0"
              [attr.rx]="orbit.rx"
              [attr.ry]="orbit.ry"
              [attr.mask]="front ? 'url(#outside-globe-front)' : null"
            />
            <circle class="orbits__satellite" r="4">
              <animateMotion
                *ngIf="!reducedMotion"
                [attr.dur]="orbit.duration"
                repeatCount="indefinite"
                calcMode="linear"
                [attr.keyPoints]="orbit.reverse ? '1;0' : '0;1'"
                keyTimes="0;1"
                [attr.path]="ellipsePath(orbit)"
              />
            </circle>
          </g>
        </g>
      </svg>
    </ng-template>
  `,
  styles: [`
    :host {
      --ease: cubic-bezier(0.16, 1, 0.3, 1);
      display: inline-block;
      color: #0f0f0f;
    }

    .hero-logo {
      position: relative;
      display: grid;
      place-items: center;
      width: 17rem;
      height: 13rem;
    }

    .hero-logo > * {
      grid-area: 1 / 1;
    }

    .hero-logo__globe {
      position: relative;
      z-index: 1;
      display: grid;
      place-items: center;
      width: 11rem;
      height: 11rem;
    }

    .hero-logo__svg {
      width: 6.25rem;
      height: 6.25rem;
      overflow: visible;
    }

    /* ---- Dibujo del trazo ---- */
    .draw {
      stroke-dasharray: 1;
      stroke-dashoffset: 1;
      animation: draw 1.1s var(--ease) forwards;
      animation-delay: calc(var(--o) * 140ms + 200ms);
    }

    @keyframes draw {
      to {
        stroke-dashoffset: 0;
      }
    }

    /* ---- Nodos ---- */
    .node {
      transform-box: fill-box;
      transform-origin: center;
      transform: scale(0);
      animation: nodePop 0.6s var(--ease) forwards;
      animation-delay: calc(var(--n) * 140ms + 1.1s);
    }

    @keyframes nodePop {
      0% {
        transform: scale(0);
      }
      60% {
        transform: scale(1.25);
      }
      100% {
        transform: scale(1);
      }
    }

    /* ---- Pulsos de datos ---- */
    .pulse {
      stroke-dasharray: 0.08 1.2;
      stroke-dashoffset: 0.08;
      opacity: 0;
      animation: pulse 3.6s ease-in-out infinite;
      animation-delay: calc(var(--p) * 1.2s + 2.4s);
    }

    @keyframes pulse {
      0% {
        stroke-dashoffset: 0.08;
        opacity: 0;
      }
      8% {
        opacity: 0.9;
      }
      40% {
        stroke-dashoffset: -1;
        opacity: 0.9;
      }
      45%,
      100% {
        stroke-dashoffset: -1;
        opacity: 0;
      }
    }

    /* ---- Órbitas ---- */
    .orbits {
      width: 17rem;
      height: 17rem;
      overflow: visible;
      pointer-events: none;
      opacity: 0;
      animation: orbitsIn 1.2s var(--ease) 1.4s forwards;
    }

    .orbits--front {
      z-index: 2;
    }

    .orbits__ring {
      fill: none;
      stroke: #d4d4d8;
      stroke-width: 1;
    }

    .orbits__satellite {
      fill: #0f0f0f;
      stroke: rgba(15, 15, 15, 0.1);
      stroke-width: 6;
      paint-order: stroke;
    }

    @keyframes orbitsIn {
      from {
        opacity: 0;
        transform: scale(0.7);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @media (max-width: 640px) {
      .hero-logo {
        width: 14rem;
        height: 11rem;
      }

      .orbits {
        width: 14rem;
        height: 14rem;
      }

      .hero-logo__globe {
        width: 9rem;
        height: 9rem;
      }

      .hero-logo__svg {
        width: 5.25rem;
        height: 5.25rem;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .draw,
      .node,
      .orbits {
        animation: none;
        stroke-dashoffset: 0;
        transform: none;
        opacity: 1;
      }

      .pulse {
        animation: none;
      }
    }
  `],
})
export class HeroLogoComponent {
  readonly reducedMotion =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

  // rx/ry en unidades del viewBox (340 = ancho total); ry pequeño = órbita más inclinada
  readonly orbits: Orbit[] = [
    { id: 'a', rx: 132, ry: 30, angle: -14, duration: '14s', reverse: false },
    { id: 'b', rx: 118, ry: 44, angle: 22, duration: '20s', reverse: true },
    { id: 'c', rx: 108, ry: 22, angle: 62, duration: '11s', reverse: false },
  ];

  // Recorrido elíptico completo empezando por la izquierda; la mitad inferior (y > 0) es la delantera
  ellipsePath(orbit: Orbit): string {
    const { rx, ry } = orbit;
    return `M ${-rx} 0 A ${rx} ${ry} 0 1 0 ${rx} 0 A ${rx} ${ry} 0 1 0 ${-rx} 0`;
  }
}
