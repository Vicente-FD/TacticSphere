import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor } from '@angular/common';
import { IconComponent, IconName } from '../shared/ui/icon/icon.component';
import { LeadServiceKey } from '../types';

export type OrbitService = { key: LeadServiceKey; title: string; icon: IconName };

// "La esfera TacticSphere": la consultoría (estrategia · ITIL 4) es el núcleo y las demás
// capacidades orbitan a su alrededor. Los satélites giran lento y se detienen al pasar el mouse
// para poder elegirlos; al activarlos se destaca la tarjeta del servicio correspondiente.
@Component({
  standalone: true,
  selector: 'app-services-orbit',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgFor, IconComponent],
  template: `
    <div class="sphere" role="group" aria-label="Capacidades de TacticSphere">
      <div
        *ngFor="let s of satellites; let i = index"
        class="sphere__orbit"
        [style.--size]="orbitSizes[i]"
        [style.--dur]="orbitDurations[i]"
        [style.--start]="orbitStarts[i]"
      >
        <button
          type="button"
          class="sphere__satellite"
          [class.is-active]="active === s.key"
          [attr.aria-pressed]="active === s.key"
          (mouseenter)="activate.emit(s.key)"
          (focus)="activate.emit(s.key)"
          (mouseleave)="activate.emit(null)"
          (blur)="activate.emit(null)"
          (click)="select.emit(s.key)"
        >
          <span class="sphere__satellite-icon"><app-icon [name]="s.icon" size="sm"></app-icon></span>
          <span class="sphere__satellite-label">{{ s.title }}</span>
        </button>
      </div>

      <button
        type="button"
        class="sphere__core"
        [class.is-active]="active === core.key"
        [attr.aria-pressed]="active === core.key"
        (mouseenter)="activate.emit(core.key)"
        (focus)="activate.emit(core.key)"
        (mouseleave)="activate.emit(null)"
        (blur)="activate.emit(null)"
        (click)="select.emit(core.key)"
      >
        <span class="sphere__core-label">Core</span>
        <span class="sphere__core-title">Estrategia</span>
        <span class="sphere__core-sub">ITIL 4</span>
      </button>
    </div>
  `,
  styles: [`
    :host {
      --ease: cubic-bezier(0.16, 1, 0.3, 1);
      display: block;
    }

    .sphere {
      position: relative;
      width: min(100%, 26rem);
      aspect-ratio: 1;
      margin: 0 auto;
    }

    /* Al pasar el mouse por el diagrama, las órbitas se detienen para poder elegir */
    .sphere:hover .sphere__orbit,
    .sphere:hover .sphere__satellite,
    .sphere:focus-within .sphere__orbit,
    .sphere:focus-within .sphere__satellite {
      animation-play-state: paused;
    }

    .sphere__orbit {
      position: absolute;
      z-index: 2;
      pointer-events: none;
      inset: 0;
      margin: auto;
      width: var(--size);
      height: var(--size);
      border: 1px dashed #d4d4d8;
      border-radius: 9999px;
      animation: orbitSpin var(--dur) linear infinite;
      animation-delay: calc(var(--dur) * var(--start) * -1);
    }

    .sphere__satellite {
      pointer-events: auto;
      position: absolute;
      top: 0;
      left: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      /* Centrado sobre la línea de la órbita; la contra-rotación mantiene el texto derecho */
      translate: -50% -1.25rem;
      z-index: 2;
      animation: orbitSpin var(--dur) linear infinite reverse;
      animation-delay: calc(var(--dur) * var(--start) * -1);
    }

    .sphere__satellite-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.5rem;
      height: 2.5rem;
      border: 1px solid #e5e7eb;
      border-radius: 9999px;
      background: #fff;
      color: #0f0f0f;
      box-shadow: 0 6px 16px -10px rgba(15, 15, 15, 0.4);
      transition: background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease, transform 0.35s var(--ease);
    }

    .sphere__satellite-label {
      border: 1px solid #f0f0f1;
      border-radius: 9999px;
      background: #fff;
      padding: 0.1rem 0.55rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: #374151;
      white-space: nowrap;
    }

    .sphere__satellite.is-active .sphere__satellite-icon,
    .sphere__satellite:hover .sphere__satellite-icon {
      border-color: #0f0f0f;
      background: #0f0f0f;
      color: #fff;
      transform: scale(1.12);
    }

    .sphere__satellite.is-active .sphere__satellite-label {
      color: #0f0f0f;
    }

    .sphere__core {
      position: absolute;
      inset: 0;
      margin: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.1rem;
      z-index: 1;
      width: 6rem;
      height: 6rem;
      border-radius: 9999px;
      background: #0f0f0f;
      color: #fff;
      box-shadow: 0 0 0 10px rgba(15, 15, 15, 0.05), 0 0 0 22px rgba(15, 15, 15, 0.03);
      transition: transform 0.4s var(--ease), box-shadow 0.4s ease;
      animation: corePulse 4s ease-in-out infinite;
    }

    .sphere__core.is-active,
    .sphere__core:hover {
      transform: scale(1.05);
    }

    .sphere__core-label {
      font-size: 0.6rem;
      font-weight: 500;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #a1a1aa;
    }

    .sphere__core-title {
      font-size: 1rem;
      font-weight: 600;
    }

    .sphere__core-sub {
      font-size: 0.75rem;
      color: #d4d4d8;
    }

    :host ::ng-deep .sphere__satellite-icon lucide-icon,
    :host ::ng-deep .sphere__satellite-icon svg {
      color: inherit !important;
    }

    @keyframes orbitSpin {
      to {
        rotate: 360deg;
      }
    }

    @keyframes corePulse {
      0%,
      100% {
        box-shadow: 0 0 0 10px rgba(15, 15, 15, 0.05), 0 0 0 22px rgba(15, 15, 15, 0.03);
      }
      50% {
        box-shadow: 0 0 0 14px rgba(15, 15, 15, 0.06), 0 0 0 30px rgba(15, 15, 15, 0.02);
      }
    }

    /* En pantallas pequeñas el diagrama se achica: núcleo y etiquetas más compactos para no cruzarse */
    @media (max-width: 640px) {
      .sphere__core {
        width: 4.5rem;
        height: 4.5rem;
      }

      .sphere__core-title {
        font-size: 0.8rem;
      }

      .sphere__core-label,
      .sphere__core-sub {
        font-size: 0.55rem;
      }

      .sphere__satellite-icon {
        width: 2.1rem;
        height: 2.1rem;
      }

      .sphere__satellite-label {
        font-size: 0.65rem;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .sphere__orbit,
      .sphere__satellite,
      .sphere__core {
        animation: none;
      }

      /* Sin animación, los satélites quedan repartidos alrededor del núcleo */
      .sphere__orbit {
        rotate: calc(var(--start) * 360deg);
      }

      .sphere__satellite {
        rotate: calc(var(--start) * -360deg);
      }
    }
  `],
})
export class ServicesOrbitComponent {
  @Input({ required: true }) core!: OrbitService;
  @Input({ required: true }) satellites: OrbitService[] = [];
  @Input() active: LeadServiceKey | null = null;
  @Output() readonly activate = new EventEmitter<LeadServiceKey | null>();
  @Output() readonly select = new EventEmitter<LeadServiceKey>();

  // Órbita interior a exterior. Todas giran a la misma velocidad y parten separadas 120°,
  // así los satélites se mantienen repartidos y nunca se superponen.
  readonly orbitSizes = ['78%', '89%', '100%'];
  readonly orbitDurations = ['70s', '70s', '70s'];
  readonly orbitStarts = [0.05, 0.383, 0.717];
}
