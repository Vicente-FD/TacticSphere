import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { LEAD_SERVICE_LABELS, LeadServiceKey } from '../types';

type SpherePoint = { key: LeadServiceKey; label: string; lat: number; lon: number };

// Esfera del formulario de contacto: cada opción es un punto sobre la esfera. Al elegir una
// (aquí o en los botones del formulario) la esfera gira hasta dejar ese punto al frente.
// Proyección 3D propia en SVG: no carga Three.js en el formulario.
@Component({
  standalone: true,
  selector: 'app-contact-sphere',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgFor, NgIf],
  template: `
    <svg class="cs" viewBox="-120 -100 240 200" role="group" aria-label="Servicios de TacticSphere">
      <!-- Malla: lo que queda detrás de la esfera se dibuja más tenue -->
      <path class="cs__grid cs__grid--back" [attr.d]="grid().back" />
      <circle class="cs__outline" r="80" />
      <path class="cs__grid" [attr.d]="grid().front" />

      <!-- Puntos: primero los de atrás para que los del frente queden encima -->
      <g
        *ngFor="let p of projected(); trackBy: trackByKey"
        class="cs__point"
        [class.is-back]="p.z < 0"
        [class.is-selected]="p.key === selected"
        [attr.transform]="'translate(' + p.x + ',' + p.y + ')'"
        [style.opacity]="p.opacity"
        role="button"
        [attr.tabindex]="p.z < 0 ? -1 : 0"
        [attr.aria-label]="p.label"
        [attr.aria-pressed]="p.key === selected"
        (click)="choose(p.key)"
        (keydown.enter)="choose(p.key)"
        (keydown.space)="$event.preventDefault(); choose(p.key)"
      >
        <circle class="cs__hit" r="12" />
        <circle class="cs__halo" [attr.r]="p.key === selected ? 11 : 0" />
        <circle class="cs__dot" [attr.r]="p.key === selected ? 6 : 3.5 + p.z * 1.5" />
        <text
          *ngIf="p.z > 0.15 || p.key === selected"
          class="cs__label"
          [attr.x]="p.x >= 0 ? 12 : -12"
          y="4"
          [attr.text-anchor]="p.x >= 0 ? 'start' : 'end'"
        >{{ p.label }}</text>
      </g>
    </svg>
  `,
  styles: [`
    :host {
      display: block;
    }

    .cs {
      display: block;
      width: 100%;
      max-width: 17rem;
      height: auto;
      margin: 0 auto;
      overflow: visible;
    }

    @media (max-width: 640px) {
      .cs {
        max-width: 12rem;
      }
    }

    .cs__outline {
      fill: #fafafa;
      stroke: #d4d4d8;
      stroke-width: 1;
    }

    .cs__grid {
      fill: none;
      stroke: #d4d4d8;
      stroke-width: 0.8;
    }

    .cs__grid--back {
      stroke: #ececee;
    }

    .cs__point {
      cursor: pointer;
      outline: none;
    }

    .cs__hit {
      fill: transparent;
    }

    .cs__dot {
      fill: #0f0f0f;
      transition: r 0.25s ease;
    }

    .cs__point.is-back .cs__dot {
      fill: #a1a1aa;
    }

    .cs__halo {
      fill: rgba(15, 15, 15, 0.12);
      transition: r 0.3s ease;
    }

    .cs__point:hover .cs__dot,
    .cs__point:focus-visible .cs__dot {
      fill: #0f0f0f;
    }

    .cs__label {
      font-size: 9px;
      fill: #52525b;
      paint-order: stroke;
      stroke: #fafafa;
      stroke-width: 3px;
      pointer-events: none;
    }

    .cs__point.is-selected .cs__label {
      font-size: 10.5px;
      font-weight: 600;
      fill: #0f0f0f;
    }
  `],
})
export class ContactSphereComponent implements OnInit, OnChanges, OnDestroy {
  @Input() selected: LeadServiceKey | null = null;
  @Output() readonly select = new EventEmitter<LeadServiceKey>();

  private static readonly R = 80;

  private readonly zone = inject(NgZone);
  private targetKey: LeadServiceKey | null = null;

  // Posiciones sobre la esfera (grados): repartidas en longitud y alternadas en latitud
  private readonly points: SpherePoint[] = (
    [
      ['consultoria', 18, 0],
      ['desarrollo', -16, 72],
      ['ciencia_datos', 24, 144],
      ['agentes_ia', -20, 216],
      ['otro', 8, 288],
    ] as [LeadServiceKey, number, number][]
  ).map(([key, lat, lon]) => ({ key, label: LEAD_SERVICE_LABELS[key], lat, lon }));

  // Rotación actual de la esfera en grados (alrededor del eje vertical y del horizontal)
  private readonly rotY = signal(-20);
  private readonly rotX = signal(-12);

  private frame: number | null = null;
  private readonly reducedMotion =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

  readonly projected = computed(() => {
    const θ = this.rad(this.rotY());
    const φ = this.rad(this.rotX());
    return this.points
      .map((p) => {
        const v = this.project(this.rad(p.lat), this.rad(p.lon), θ, φ);
        return {
          key: p.key,
          label: p.label,
          x: +(v.x * ContactSphereComponent.R).toFixed(2),
          y: +(v.y * ContactSphereComponent.R).toFixed(2),
          z: v.z,
          opacity: v.z < 0 ? 0.45 + v.z * 0.25 : 1,
        };
      })
      .sort((a, b) => a.z - b.z);
  });

  // Meridianos y paralelos proyectados, separados en tramo frontal y trasero
  readonly grid = computed(() => {
    const θ = this.rad(this.rotY());
    const φ = this.rad(this.rotX());
    const front: string[] = [];
    const back: string[] = [];
    const trace = (pointAt: (t: number) => [number, number]) => {
      let prev: { x: number; y: number; z: number } | null = null;
      for (let i = 0; i <= 48; i++) {
        const [lat, lon] = pointAt(i / 48);
        const v = this.project(lat, lon, θ, φ);
        const cur = { x: v.x * ContactSphereComponent.R, y: v.y * ContactSphereComponent.R, z: v.z };
        if (prev) {
          const seg = `M${prev.x.toFixed(1)},${prev.y.toFixed(1)}L${cur.x.toFixed(1)},${cur.y.toFixed(1)}`;
          (prev.z + cur.z >= 0 ? front : back).push(seg);
        }
        prev = cur;
      }
    };
    for (let m = 0; m < 6; m++) {
      const lon = (m * Math.PI) / 6;
      trace((t) => [-Math.PI / 2 + t * Math.PI, lon]);
      trace((t) => [-Math.PI / 2 + t * Math.PI, lon + Math.PI]);
    }
    for (const latDeg of [-50, -25, 0, 25, 50]) {
      const lat = this.rad(latDeg);
      trace((t) => [lat, t * 2 * Math.PI]);
    }
    return { front: front.join(''), back: back.join('') };
  });

  trackByKey = (_: number, p: { key: LeadServiceKey }) => p.key;

  ngOnInit(): void {
    if (this.selected) {
      this.jumpTo(this.selected);
    } else {
      this.idle();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // El primer valor lo maneja ngOnInit; después, girar cuando cambia la opción elegida
    if (changes['selected'] && !changes['selected'].firstChange && this.selected) {
      this.rotateTo(this.selected);
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }

  choose(key: LeadServiceKey): void {
    this.select.emit(key);
    this.rotateTo(key);
  }

  // Gira rápido (con un leve rebote al final) hasta dejar el punto al frente y centrado
  private rotateTo(key: LeadServiceKey): void {
    const target = this.points.find((p) => p.key === key);
    if (!target || (key === this.targetKey && this.frame !== null)) return;
    this.stop();
    this.targetKey = key;

    // Ángulos que llevan el punto al frente; se elige el giro más corto
    const fromY = this.rotY();
    let toY = -target.lon;
    toY = fromY + ((((toY - fromY) % 360) + 540) % 360) - 180;
    const fromX = this.rotX();
    const toX = target.lat;

    if (this.reducedMotion) {
      this.rotY.set(toY);
      this.rotX.set(toX);
      return;
    }

    const duration = 700;
    const start = performance.now();
    const easeOutBack = (t: number) => {
      const c1 = 1.2;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const e = easeOutBack(t);
      this.rotY.set(fromY + (toY - fromY) * e);
      this.rotX.set(fromX + (toX - fromX) * e);
      this.frame = t < 1 ? requestAnimationFrame(step) : null;
    };
    // Fuera de la zona de Angular: las señales actualizan la vista sin revisar toda la página
    this.zone.runOutsideAngular(() => (this.frame = requestAnimationFrame(step)));
  }

  private jumpTo(key: LeadServiceKey): void {
    const target = this.points.find((p) => p.key === key);
    if (!target) return;
    // Parte un poco girada para que al abrir se vea el movimiento hacia el punto
    this.rotY.set(-target.lon + 60);
    this.rotX.set(target.lat - 10);
    this.rotateTo(key);
  }

  // Sin opción elegida: giro lento y continuo
  private idle(): void {
    if (this.reducedMotion) return;
    let last = performance.now();
    const step = (now: number) => {
      this.rotY.update((v) => v + (now - last) * 0.012);
      last = now;
      this.frame = requestAnimationFrame(step);
    };
    this.zone.runOutsideAngular(() => (this.frame = requestAnimationFrame(step)));
  }

  private stop(): void {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.targetKey = null;
  }

  private rad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  // Punto (lat, lon) -> rotación Y (θ) y luego X (φ). Devuelve coordenadas de pantalla (y hacia abajo)
  private project(lat: number, lon: number, θ: number, φ: number) {
    const x = Math.cos(lat) * Math.sin(lon);
    const y = Math.sin(lat);
    const z = Math.cos(lat) * Math.cos(lon);
    const x1 = x * Math.cos(θ) + z * Math.sin(θ);
    const z1 = -x * Math.sin(θ) + z * Math.cos(θ);
    const y2 = y * Math.cos(φ) - z1 * Math.sin(φ);
    const z2 = y * Math.sin(φ) + z1 * Math.cos(φ);
    return { x: x1, y: -y2, z: z2 };
  }
}
