import { ChangeDetectionStrategy, Component } from '@angular/core';

// Logo de TacticSphere en SVG (réplica de assets/logo_ts.png) para poder animar sus trazos:
// el globo se dibuja al cargar, los nodos aparecen con rebote y pulsos de luz recorren las conexiones.
@Component({
  standalone: true,
  selector: 'app-hero-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="hero-logo">
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
  `,
  styles: [`
    :host {
      --ease: cubic-bezier(0.16, 1, 0.3, 1);
      display: inline-block;
      color: #0f0f0f;
    }

    .hero-logo {
      display: grid;
      place-items: center;
      padding: 1.5rem;
    }

    .hero-logo__svg {
      width: 7.5rem;
      height: 7.5rem;
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

    @media (max-width: 640px) {
      .hero-logo__svg {
        width: 6rem;
        height: 6rem;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .draw,
      .node {
        animation: none;
        stroke-dashoffset: 0;
        transform: none;
      }

      .pulse {
        animation: none;
      }
    }
  `],
})
export class HeroLogoComponent {}
