import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChildren,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ModalComponent } from '../shared/ui/modal/modal.component';
import { LeadService } from '../core/services/lead.service';
import { LucideAngularModule } from 'lucide-angular';
import {
  animate,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { take } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type SectionContent = {
  id: string;
  title: string;
  description: string[];
  items?: string[];
};

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    ModalComponent,
    LucideAngularModule,
  ],
  templateUrl: './home.html',
  animations: [
    trigger('fadeScaleIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.92)' }),
        animate(
          '420ms cubic-bezier(0.16, 1, 0.3, 1)',
          style({ opacity: 1, transform: 'scale(1)' }),
        ),
      ]),
    ]),
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate(
          '360ms 120ms cubic-bezier(0.16, 1, 0.3, 1)',
          style({ opacity: 1, transform: 'translateY(0)' }),
        ),
      ]),
    ]),
  ],
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly leadService = inject(LeadService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChildren('sectionBlock') sectionBlocks!: QueryList<ElementRef<HTMLElement>>;

  readonly sections: SectionContent[] = [
    {
      id: 'about',
      title: '¿Quiénes somos?',
      description: [
        'TacticSphere es una empresa de consultoría tecnológica enfocada en acompañar a las organizaciones en su proceso de transformación digital.',
        'Nuestra misión es ayudar a las empresas a comprender su nivel actual de madurez tecnológica y proporcionarles una ruta clara para avanzar hacia una gestión más eficiente, automatizada y basada en datos.',
        'Combinamos experiencia en gestión TI con herramientas de diagnóstico modernas para conectar estrategia, infraestructura y personas bajo una visión integral.',
      ],
    },
    {
      id: 'what',
      title: '¿Qué es TacticSphere?',
      description: [
        'TacticSphere es una plataforma inteligente que evalúa, analiza y visualiza la madurez tecnológica de las organizaciones tomando como base ITIL 4.',
        'Evaluamos cuatro pilares fundamentales y cinco niveles de madurez para mostrar con precisión dónde está la empresa y qué pasos seguir.',
      ],
      items: [
        'Infraestructura & Cloud: estabilidad, escalabilidad y adopción de servicios en la nube.',
        'Big Data & Analytics: gestión y aprovechamiento avanzado de los datos.',
        'Business Intelligence (BI): información estratégica para decidir con certeza.',
        'Inteligencia Artificial (IA): automatización, predicción y optimización de procesos.',
      ],
    },
    {
      id: 'challenge',
      title: '¿Qué buscamos solucionar?',
      description: [
        'Muchas organizaciones carecen de una metodología clara para medir su madurez tecnológica de manera objetiva.',
        'Esto deriva en decisiones desalineadas, brechas de conocimiento y falta de priorización.',
        'TacticSphere transforma datos técnicos y organizacionales en acciones concretas, ayudando a priorizar inversiones, optimizar recursos y construir un roadmap digital sostenible.',
      ],
    },
  ];

  readonly modalOpen = signal(false);
  readonly submitState = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  readonly sectionState = signal<Record<string, boolean>>({});

  readonly sectionVisible = computed(() => this.sectionState());

  readonly form = this.fb.nonNullable.group({
    company: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
  });

  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    this.setupObserver();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  openModal(): void {
    this.submitState.set('idle');
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  sectionIsVisible(id: string): boolean {
    return this.sectionVisible()[id] ?? false;
  }

  onSubmitConsulting(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitState.set('loading');
    const payload = this.form.getRawValue();

    this.leadService
      .createLead(payload)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.submitState.set('success');
          this.form.reset();
        },
        error: (error) => {
          console.error('No se pudo enviar la solicitud', error);
          this.submitState.set('error');
        },
      });
  }

  trackBySection = (_: number, item: SectionContent) => item.id;

  private setupObserver(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-section-id');
            if (id) {
              this.sectionState.update((state) => ({
                ...state,
                [id]: true,
              }));
              this.observer?.unobserve(entry.target);
            }
          }
        });
      },
      {
        threshold: 0.25,
        rootMargin: '0px 0px -10% 0px',
      },
    );

    this.sectionBlocks.forEach((ref) => this.observer?.observe(ref.nativeElement));

    this.sectionBlocks.changes
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list: QueryList<ElementRef<HTMLElement>>) => {
        list.forEach((ref: ElementRef<HTMLElement>) =>
          this.observer?.observe(ref.nativeElement),
        );
      });
  }
}
