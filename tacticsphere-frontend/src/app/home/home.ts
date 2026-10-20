import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewEncapsulation,
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
import { NotificationCenterService } from '../core/services/notification-center.service';
import { IconComponent, IconName } from '../shared/ui/icon/icon.component';
import { HeroSphere3dComponent } from './hero-sphere-3d.component';
import { HeroLogoComponent } from './hero-logo.component';
import { MaturityQuizComponent } from './maturity-quiz.component';
import { PlatformPreviewComponent } from './platform-preview.component';
import { ChatWidgetComponent } from './chat-widget.component';
import { ContactLink, SITE, contactHref } from './site-config';
import { LEAD_SERVICE_LABELS, LeadServiceKey } from '../types';
import {
  animate,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { take } from 'rxjs/operators';

type HeadlineWord = { text: string; highlight?: boolean };

type HeadlinePhrase = { label: string; text: string; words: HeadlineWord[]; dwell: number };

// Convierte "Texto con [parte destacada]" en palabras animables; lo que va entre [] se destaca
function toWords(text: string): HeadlineWord[] {
  return text
    .split(/(\[[^\]]+\])/)
    .filter(Boolean)
    .flatMap((chunk) =>
      chunk.startsWith('[')
        ? [{ text: chunk.slice(1, -1), highlight: true }]
        : chunk.trim().split(/\s+/).filter(Boolean).map((w) => ({ text: w })),
    );
}

function phrase(label: string, text: string, dwell: number): HeadlinePhrase {
  return { label, text: text.replace(/[[\]]/g, ''), words: toWords(text), dwell };
}

type Pillar = { icon: IconName; title: string; text: string };

type ProcessStep = { icon: IconName; title: string; text: string };

type Service = { key: LeadServiceKey; icon: IconName; title: string; text: string; tags: string[] };

type TeamMember = { name: string };

type NavLink = { id: string; label: string };

const CONTACT_ICONS: Record<ContactLink['key'], IconName> = {
  email: 'mail',
  whatsapp: 'message-circle',
  linkedin: 'linkedin',
  instagram: 'instagram',
  location: 'map-pin',
};

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    ModalComponent,
    IconComponent,
    HeroSphere3dComponent,
    HeroLogoComponent,
    MaturityQuizComponent,
    PlatformPreviewComponent,
    ChatWidgetComponent,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
  encapsulation: ViewEncapsulation.None,
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
          '480ms {{ delay }}ms cubic-bezier(0.16, 1, 0.3, 1)',
          style({ opacity: 1, transform: 'translateY(0)' }),
        ),
      ], { params: { delay: 120 } }),
    ]),
  ],
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly leadService = inject(LeadService);
  private readonly notificationCenter = inject(NotificationCenterService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);

  // Título rotativo: consultoría va primero y se mantiene más tiempo en pantalla
  readonly headlines: HeadlinePhrase[] = [
    phrase('Consultoría', 'Diagnosticamos la [madurez tecnológica] de tu organización', 6500),
    phrase('Desarrollo de software', 'Desarrollamos el [software] que tu empresa necesita', 3800),
    phrase('Ciencia de datos', 'Creamos modelos de [Machine Learning] con tus datos', 3800),
    phrase('Agentes de IA', 'Automatizamos tus procesos con [agentes de IA]', 3800),
  ];
  readonly activeHeadline = signal(-1);
  readonly leavingHeadline = signal<number | null>(null);
  private headlineTimer: ReturnType<typeof setTimeout> | null = null;

  readonly navLinks: NavLink[] = [
    { id: 'nosotros', label: 'Nosotros' },
    { id: 'services', label: 'Servicios' },
    { id: 'what', label: 'Plataforma' },
    { id: 'diagnostico', label: 'Diagnóstico' },
    ...(SITE.showCases ? [{ id: 'casos', label: 'Casos' }] : []),
    { id: 'team', label: 'Equipo' },
    { id: 'contacto', label: 'Contacto' },
  ];

  readonly site = SITE;
  readonly serviceOptions = Object.entries(LEAD_SERVICE_LABELS).map(([key, label]) => ({
    key: key as LeadServiceKey,
    label,
  }));
  // Solo se muestran los datos de contacto que ya están completos en SITE.contact
  readonly contactLinks = SITE.contact
    .map((link) => ({
      ...link,
      url: contactHref(link, SITE.whatsappMessage),
      icon: CONTACT_ICONS[link.key],
    }))
    .filter((link) => link.url || link.value);
  readonly socialLinks = this.contactLinks.filter(
    (l) => l.url && ['linkedin', 'instagram', 'whatsapp'].includes(l.key),
  );
  readonly openFaq = signal<number | null>(0);
  readonly caseValues = signal<number[]>(SITE.cases.map(() => 0));

  // Los 4 pilares que evalúa la plataforma
  readonly pillars: Pillar[] = [
    {
      icon: 'cloud',
      title: 'Infraestructura & Cloud',
      text: 'Estabilidad, escalabilidad y adopción de servicios en la nube.',
    },
    {
      icon: 'database',
      title: 'Big Data & Analytics',
      text: 'Gestión y aprovechamiento avanzado de los datos.',
    },
    {
      icon: 'chart-pie',
      title: 'Business Intelligence (BI)',
      text: 'Información estratégica para decidir con certeza.',
    },
    {
      icon: 'brain',
      title: 'Inteligencia Artificial (IA)',
      text: 'Automatización, predicción y optimización de procesos.',
    },
  ];

  readonly services: Service[] = [
    {
      key: 'consultoria',
      icon: 'compass',
      title: 'Consultoría tecnológica',
      text: 'Diagnosticamos la madurez tecnológica de tu organización y definimos una hoja de ruta priorizada basada en ITIL 4.',
      tags: ['Diagnóstico', 'ITIL 4', 'Roadmap'],
    },
    {
      key: 'desarrollo',
      icon: 'code-xml',
      title: 'Desarrollo de software',
      text: 'Construimos plataformas web, integraciones y herramientas a medida, desde el diseño hasta la puesta en producción.',
      tags: ['Web', 'APIs', 'Cloud'],
    },
    {
      key: 'ciencia_datos',
      icon: 'brain-circuit',
      title: 'Ciencia de datos',
      text: 'Desarrollamos modelos de Machine Learning y Deep Learning para predecir, clasificar y optimizar a partir de tus datos.',
      tags: ['Machine Learning', 'Deep Learning', 'Analytics'],
    },
    {
      key: 'agentes_ia',
      icon: 'bot',
      title: 'Agentes de IA',
      text: 'Diseñamos e implementamos agentes de IA que automatizan tareas, atienden usuarios y se integran con tus sistemas.',
      tags: ['LLMs', 'Automatización', 'Integraciones'],
    },
  ];

  readonly processSteps: ProcessStep[] = [
    {
      icon: 'clipboard-check',
      title: 'Diagnóstico',
      text: 'Aplicamos la evaluación a los equipos clave de tu organización sobre los cuatro pilares tecnológicos.',
    },
    {
      icon: 'chart-column',
      title: 'Análisis',
      text: 'Consolidamos los resultados en dashboards que muestran el nivel de madurez por pilar, área y empresa.',
    },
    {
      icon: 'map',
      title: 'Hoja de ruta',
      text: 'Traducimos las brechas detectadas en un roadmap priorizado y alineado a ITIL 4.',
    },
    {
      icon: 'rocket',
      title: 'Acompañamiento',
      text: 'Te acompañamos en la implementación y medimos el avance en cada nueva evaluación.',
    },
  ];

  // Manifiesto: se ilumina palabra por palabra al hacer scroll; lo que va entre [] queda destacado
  readonly manifesto = toWords(
    'Somos una [nueva generación] de ingenieros que creció junto a la tecnología. ' +
      'Trabajamos con [inteligencia artificial] todos los días y nos [comprometemos] con cada proyecto como si fuera propio, ' +
      'con el rigor de ITIL 4 y la [experiencia] de haber construido nuestra propia plataforma.',
  );
  readonly manifestoPlain = this.manifesto.map((w) => w.text).join(' ');
  readonly manifestoLit = signal(0);

  readonly trustReasons: { icon: IconName; title: string; text: string }[] = [
    {
      icon: 'sparkles',
      title: 'Nueva generación',
      text: 'Crecimos con la tecnología: adoptamos nuevas herramientas rápido y sin miedo al cambio.',
    },
    {
      icon: 'brain-circuit',
      title: 'Especialistas en IA y datos',
      text: 'Formación en Ciencias de Datos y trabajo diario con Machine Learning, Deep Learning y agentes de IA.',
    },
    {
      icon: 'layers',
      title: 'Experiencia real',
      text: 'Diseñamos, construimos y operamos nuestra propia plataforma de diagnóstico, la misma que usamos con nuestros clientes.',
    },
    {
      icon: 'shield-check',
      title: 'Comprometidos contigo',
      text: 'Comunicación directa con quienes construyen, avances visibles desde el primer día y foco en resultados medibles.',
    },
  ];

  readonly teamPhoto = 'assets/team/equipo.jpg';
  // En el mismo orden en que aparecen en la foto, de izquierda a derecha
  readonly teamMembers: TeamMember[] = [
    { name: 'Vicente Fernández' },
    { name: 'Samanta Navarro' },
    { name: 'Javier Auspont' },
    { name: 'Marcelo Darras' },
  ];
  readonly teamPhotoFailed = signal(false);
  readonly year = new Date().getFullYear();

  readonly modalOpen = signal(false);
  readonly submitState = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  readonly showScrollIndicator = signal(true);
  readonly navCompact = signal(false);
  readonly readProgress = signal(0);

  readonly form = this.fb.group({
    company: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    service: this.fb.control<LeadServiceKey | null>(null, Validators.required),
    message: this.fb.nonNullable.control('', [Validators.maxLength(2000)]),
  });

  private observer?: IntersectionObserver;
  private scrollFrame: number | null = null;
  private readonly reducedMotion =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

  private readonly onScroll = () => {
    if (this.scrollFrame !== null) return;
    this.scrollFrame = requestAnimationFrame(() => {
      this.scrollFrame = null;
      this.zone.run(() => this.updateScrollState());
    });
  };

  ngAfterViewInit(): void {
    this.setupRevealObserver();
    this.startHeadlineRotation();
    if (typeof window === 'undefined') return;
    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', this.onScroll, { passive: true });
    });
    this.updateScrollState();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.headlineTimer) clearTimeout(this.headlineTimer);
    if (typeof window === 'undefined') return;
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
    if (this.scrollFrame !== null) cancelAnimationFrame(this.scrollFrame);
  }

  // service: servicio preseleccionado; message: texto inicial (ej. resultado del mini-diagnóstico)
  openModal(service: LeadServiceKey | null = 'consultoria', message = ''): void {
    this.submitState.set('idle');
    this.form.reset({ company: '', email: '', service, message });
    this.modalOpen.set(true);
  }

  selectService(key: LeadServiceKey): void {
    this.form.controls.service.setValue(key);
    this.form.controls.service.markAsTouched();
  }

  toggleFaq(index: number): void {
    this.openFaq.update((current) => (current === index ? null : index));
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  onSubmitConsulting(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitState.set('loading');
    const { company, email, service, message } = this.form.getRawValue();

    this.leadService
      .createLead({ company, email, service, message })
      .pipe(take(1))
      .subscribe({
        next: (lead) => {
          this.submitState.set('success');

          // Notificar al servicio de notificaciones en tiempo real
          // Esto actualizará el contador y disparará la alerta para los admins
          this.notificationCenter.notifyNewConsultingRequest(lead);

          // Auto-cerrar el modal después de 4 segundos y limpiar formulario
          setTimeout(() => {
            this.closeModal();
            this.form.reset();
            this.submitState.set('idle');
          }, 4000);
        },
        error: (error) => {
          console.error('No se pudo enviar la solicitud', error);
          this.submitState.set('error');
        },
      });
  }

  scrollToContent(): void {
    this.scrollTo('content-section');
  }

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({
      behavior: this.reducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: this.reducedMotion ? 'auto' : 'smooth' });
  }

  showHeadline(index: number): void {
    const current = this.activeHeadline();
    if (index === current) return;
    this.leavingHeadline.set(current >= 0 ? current : null);
    this.activeHeadline.set(index);
    if (this.headlineTimer) clearTimeout(this.headlineTimer);
    this.scheduleNextHeadline();
    setTimeout(() => {
      if (this.leavingHeadline() !== this.activeHeadline()) this.leavingHeadline.set(null);
    }, 700);
  }

  private startHeadlineRotation(): void {
    // Un frame de espera para que la primera frase también anime su entrada
    requestAnimationFrame(() => {
      this.activeHeadline.set(0);
      this.scheduleNextHeadline();
    });
  }

  private scheduleNextHeadline(): void {
    if (this.reducedMotion) return;
    const current = this.headlines[this.activeHeadline()];
    this.headlineTimer = setTimeout(() => {
      // Si la pestaña no está visible, esperar sin rotar
      if (document.hidden) {
        this.scheduleNextHeadline();
        return;
      }
      this.showHeadline((this.activeHeadline() + 1) % this.headlines.length);
    }, current.dwell);
  }

  // Revela los elementos marcados con data-reveal y arranca los contadores al entrar en pantalla
  private setupRevealObserver(): void {
    const root = this.host.nativeElement;
    const targets = Array.from(
      root.querySelectorAll<HTMLElement>('[data-reveal], [data-counters]'),
    );

    if (this.reducedMotion || typeof IntersectionObserver === 'undefined') {
      targets.forEach((el) => el.classList.add('is-visible'));
      this.manifestoLit.set(this.manifesto.length);
      this.caseValues.set(SITE.cases.map((c) => c.metric.value));
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          el.classList.add('is-visible');
          const counters = el.getAttribute('data-counters');
          if (counters === 'cases') {
            this.zone.run(() =>
              this.animateCounters(SITE.cases.map((c) => c.metric.value), (v) => this.caseValues.set(v)),
            );
          }
          this.observer?.unobserve(el);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );

    targets.forEach((el) => {
      el.classList.add('reveal-armed');
      this.observer?.observe(el);
    });
  }

  // Red de seguridad: todo lo que ya pasó por la pantalla y sigue oculto se muestra igual
  private revealPassedElements(): void {
    const limit = window.innerHeight;
    this.host.nativeElement
      .querySelectorAll<HTMLElement>('.reveal-armed:not(.is-visible)')
      .forEach((el) => {
        if (el.getBoundingClientRect().top < limit) {
          el.classList.add('is-visible');
          this.observer?.unobserve(el);
        }
      });
  }

  private animateCounters(targets: number[], set: (values: number[]) => void): void {
    const duration = 1400;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      set(targets.map((value) => Math.round(value * eased)));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  private updateScrollState(): void {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;

    this.revealPassedElements();

    this.navCompact.set(scrollY > 24);
    this.readProgress.set(docHeight > 0 ? Math.min(scrollY / docHeight, 1) : 0);

    // El indicador solo se muestra mientras el usuario sigue en el hero
    const contentSection = document.getElementById('content-section');
    this.showScrollIndicator.set(
      contentSection ? contentSection.getBoundingClientRect().top > 200 : scrollY < 100,
    );

    // El manifiesto se "pinta" de gris a negro a medida que atraviesa la pantalla
    const manifesto = document.getElementById('manifiesto-texto');
    if (manifesto && !this.reducedMotion) {
      const rect = manifesto.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = (vh * 0.85 - rect.top) / (rect.height + vh * 0.35);
      const clamped = Math.min(Math.max(progress, 0), 1);
      this.manifestoLit.set(Math.round(clamped * this.manifesto.length));
    }
  }
}
