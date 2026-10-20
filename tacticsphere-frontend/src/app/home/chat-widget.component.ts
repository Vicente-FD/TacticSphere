import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
  signal,
} from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../shared/ui/icon/icon.component';
import { LeadServiceKey } from '../types';
import { SITE } from './site-config';

type ChatAction = { label: string; kind: 'contact' | 'section'; target?: string; service?: LeadServiceKey };

type ChatMessage = { from: 'bot' | 'user'; text: string; actions?: ChatAction[] };

type Intent = { keywords: string[]; reply: string; actions?: ChatAction[] };

const CONTACT: ChatAction = { label: 'Hablar con el equipo', kind: 'contact' };
const QUIZ: ChatAction = { label: 'Hacer el mini-diagnóstico', kind: 'section', target: 'diagnostico' };

const faq = (fragment: string) =>
  SITE.faq.find((f) => f.question.toLowerCase().includes(fragment))?.answer ?? '';

// Respuestas por palabras clave (sin tildes, en minúsculas). El orden importa: gana la primera coincidencia.
const INTENTS: Intent[] = [
  {
    keywords: ['precio', 'costo', 'cuesta', 'cotiz', 'valor', 'presupuesto'],
    reply: faq('cotiza'),
    actions: [CONTACT],
  },
  {
    keywords: ['dura', 'plazo', 'tiempo', 'demora', 'cuanto tarda'],
    reply: faq('dura'),
    actions: [CONTACT],
  },
  {
    keywords: ['pyme', 'pequena', 'tamano', 'startup'],
    reply: faq('pymes'),
  },
  {
    keywords: ['confidencial', 'seguridad', 'privacidad', 'nda'],
    reply: faq('confidencialidad'),
  },
  {
    keywords: ['agente', 'chatbot', 'bot', 'llm', 'automatiz', 'gpt'],
    reply:
      'Diseñamos e implementamos agentes de IA que automatizan tareas, atienden usuarios y se integran con tus sistemas. Este mismo asistente es una pequeña muestra.',
    actions: [{ ...CONTACT, service: 'agentes_ia' }],
  },
  {
    keywords: ['machine', 'learning', 'deep', 'modelo', 'predic', 'ciencia de datos', 'datos', ' ml', 'ia '],
    reply:
      'Desarrollamos modelos de Machine Learning y Deep Learning para predecir, clasificar y optimizar a partir de tus datos. Todo el equipo es de Ingeniería en Informática con mención en Ciencias de Datos.',
    actions: [{ ...CONTACT, service: 'ciencia_datos' }],
  },
  {
    keywords: ['desarroll', 'software', 'app', 'aplicacion', 'web', 'sistema', 'api', 'integracion'],
    reply:
      'Construimos plataformas web, integraciones y herramientas a medida, desde el diseño hasta la puesta en producción.',
    actions: [{ ...CONTACT, service: 'desarrollo' }],
  },
  {
    keywords: ['consultor', 'diagnost', 'madurez', 'itil', 'roadmap', 'hoja de ruta', 'pilar'],
    reply:
      'Evaluamos la madurez tecnológica en cuatro pilares (Infraestructura & Cloud, Big Data, BI e IA) con base en ITIL 4, y entregamos una hoja de ruta priorizada.',
    actions: [QUIZ, { ...CONTACT, service: 'consultoria' }],
  },
  {
    keywords: ['equipo', 'quienes', 'personas', 'fundador'],
    reply:
      'Somos un equipo de Ingenieros en Informática con mención en Ciencias de Datos. Puedes conocernos en la sección Equipo.',
    actions: [{ label: 'Ver el equipo', kind: 'section', target: 'team' }],
  },
  {
    keywords: ['contacto', 'contactar', 'whatsapp', 'correo', 'mail', 'llamar', 'hablar', 'reunion'],
    reply: 'Déjanos tus datos y te contactamos a la brevedad.',
    actions: [CONTACT],
  },
  {
    keywords: ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'hey'],
    reply: '¡Hola! Cuéntame qué necesitas: consultoría, desarrollo de software, ciencia de datos o agentes de IA.',
  },
];

const FALLBACK: Intent = {
  keywords: [],
  reply: 'No tengo una respuesta precisa para eso, pero el equipo puede ayudarte directamente.',
  actions: [CONTACT],
};

function normalize(text: string): string {
  return ` ${text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')} `;
}

@Component({
  standalone: true,
  selector: 'app-chat-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgFor, NgIf, FormsModule, IconComponent],
  template: `
    <div class="chat" [class.is-open]="open()">
      <section *ngIf="open()" class="chat__panel" role="dialog" aria-label="Asistente de TacticSphere">
        <header class="chat__header">
          <span class="chat__avatar"><app-icon name="bot" size="sm"></app-icon></span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-ink">Asistente TacticSphere</p>
            <p class="text-xs text-muted">Demo · responde sobre nuestros servicios</p>
          </div>
          <button type="button" class="chat__close" aria-label="Cerrar asistente" (click)="toggle()">
            <app-icon name="x" size="sm"></app-icon>
          </button>
        </header>

        <div #scroller class="chat__messages" aria-live="polite">
          <div *ngFor="let m of messages()" class="chat__msg" [class.chat__msg--user]="m.from === 'user'">
            <p class="chat__bubble">{{ m.text }}</p>
            <div *ngIf="m.actions?.length" class="chat__actions">
              <button *ngFor="let a of m.actions" type="button" class="chat__action" (click)="runAction(a)">
                {{ a.label }}
              </button>
            </div>
          </div>
          <div *ngIf="typing()" class="chat__msg">
            <p class="chat__bubble chat__typing" aria-label="Escribiendo">
              <span></span><span></span><span></span>
            </p>
          </div>
        </div>

        <div *ngIf="messages().length <= 1" class="chat__suggestions">
          <button *ngFor="let s of suggestions" type="button" class="chat__suggestion" (click)="send(s)">{{ s }}</button>
        </div>

        <form class="chat__form" (ngSubmit)="send(draft)">
          <input
            class="chat__input"
            name="draft"
            [(ngModel)]="draft"
            placeholder="Escribe tu pregunta…"
            autocomplete="off"
            maxlength="300"
            aria-label="Mensaje"
          />
          <button type="submit" class="chat__send" [disabled]="!draft.trim() || typing()" aria-label="Enviar">
            <app-icon name="send" size="sm"></app-icon>
          </button>
        </form>
      </section>

      <button
        type="button"
        class="chat__launcher"
        [attr.aria-expanded]="open()"
        [attr.aria-label]="open() ? 'Cerrar asistente' : 'Abrir asistente'"
        (click)="toggle()"
      >
        <app-icon [name]="open() ? 'x' : 'message-circle'" size="md"></app-icon>
        <span *ngIf="!open() && !opened" class="chat__ping" aria-hidden="true"></span>
      </button>
    </div>
  `,
  styles: [`
    :host {
      --ease: cubic-bezier(0.16, 1, 0.3, 1);
      position: fixed;
      right: 1.25rem;
      bottom: 1.25rem;
      z-index: 50;
    }

    .chat {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.75rem;
    }

    .chat__launcher {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 3.25rem;
      height: 3.25rem;
      border-radius: 9999px;
      background: #0f0f0f;
      color: #fff;
      /* Anillo blanco para que se distinga también sobre fondos oscuros */
      box-shadow: 0 0 0 2px #fff, 0 12px 28px -12px rgba(15, 15, 15, 0.55);
      transition: transform 0.25s var(--ease);
      animation: launcherIn 0.6s var(--ease) 2s both;
    }

    .chat__launcher:hover {
      transform: translateY(-2px) scale(1.04);
    }

    .chat__ping {
      position: absolute;
      inset: 0;
      border-radius: 9999px;
      border: 2px solid #0f0f0f;
      animation: ping 2.4s ease-out 3s infinite;
    }

    .chat__panel {
      display: flex;
      flex-direction: column;
      width: min(22rem, calc(100vw - 2.5rem));
      height: min(32rem, calc(100vh - 7rem));
      overflow: hidden;
      border: 1px solid #e5e7eb;
      border-radius: 1.1rem;
      background: #fff;
      box-shadow: 0 30px 60px -30px rgba(15, 15, 15, 0.45);
      transform-origin: bottom right;
      animation: panelIn 0.35s var(--ease);
    }

    .chat__header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      border-bottom: 1px solid #f0f0f1;
      padding: 0.85rem 1rem;
    }

    .chat__avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.1rem;
      height: 2.1rem;
      border-radius: 9999px;
      background: #0f0f0f;
      color: #fff;
    }

    .chat__close {
      border-radius: 9999px;
      padding: 0.35rem;
      color: #6b7280;
    }

    .chat__close:hover {
      background: #f4f4f5;
      color: #0f0f0f;
    }

    .chat__messages {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.75rem;
      overflow-y: auto;
      padding: 1rem;
    }

    .chat__msg {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.4rem;
      animation: msgIn 0.35s var(--ease);
    }

    .chat__msg--user {
      align-items: flex-end;
    }

    .chat__bubble {
      max-width: 85%;
      border-radius: 1rem 1rem 1rem 0.3rem;
      background: #f4f4f5;
      padding: 0.6rem 0.85rem;
      font-size: 0.85rem;
      line-height: 1.45;
      color: #0f0f0f;
    }

    .chat__msg--user .chat__bubble {
      border-radius: 1rem 1rem 0.3rem 1rem;
      background: #0f0f0f;
      color: #fff;
    }

    .chat__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .chat__action,
    .chat__suggestion {
      border: 1px solid #0f0f0f;
      border-radius: 9999px;
      padding: 0.3rem 0.75rem;
      font-size: 0.75rem;
      color: #0f0f0f;
      transition: background-color 0.2s ease, color 0.2s ease;
    }

    .chat__action:hover,
    .chat__suggestion:hover {
      background: #0f0f0f;
      color: #fff;
    }

    .chat__suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      padding: 0 1rem 0.75rem;
    }

    .chat__suggestion {
      border-color: #e5e7eb;
    }

    .chat__typing {
      display: inline-flex;
      gap: 0.25rem;
    }

    .chat__typing span {
      width: 0.4rem;
      height: 0.4rem;
      border-radius: 9999px;
      background: #9ca3af;
      animation: typing 1s ease-in-out infinite;
    }

    .chat__typing span:nth-child(2) {
      animation-delay: 0.15s;
    }

    .chat__typing span:nth-child(3) {
      animation-delay: 0.3s;
    }

    .chat__form {
      display: flex;
      gap: 0.5rem;
      border-top: 1px solid #f0f0f1;
      padding: 0.75rem;
    }

    .chat__input {
      flex: 1;
      min-width: 0;
      border: 1px solid #e5e7eb;
      border-radius: 9999px;
      padding: 0.5rem 0.9rem;
      font-size: 0.85rem;
      outline: none;
    }

    .chat__input:focus {
      border-color: #0f0f0f;
    }

    .chat__send {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.4rem;
      height: 2.4rem;
      border-radius: 9999px;
      background: #0f0f0f;
      color: #fff;
    }

    .chat__send:disabled {
      opacity: 0.4;
    }

    :host ::ng-deep app-icon lucide-icon,
    :host ::ng-deep app-icon svg {
      color: inherit !important;
    }

    @keyframes launcherIn {
      from {
        opacity: 0;
        transform: translateY(16px) scale(0.8);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }

    @keyframes ping {
      0% {
        transform: scale(1);
        opacity: 0.5;
      }
      80%,
      100% {
        transform: scale(1.6);
        opacity: 0;
      }
    }

    @keyframes panelIn {
      from {
        opacity: 0;
        transform: translateY(12px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }

    @keyframes msgIn {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }

    @keyframes typing {
      0%,
      100% {
        transform: translateY(0);
        opacity: 0.5;
      }
      50% {
        transform: translateY(-3px);
        opacity: 1;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .chat__launcher,
      .chat__ping,
      .chat__panel,
      .chat__msg,
      .chat__typing span {
        animation: none;
      }
    }
  `],
})
export class ChatWidgetComponent {
  @Output() readonly contact = new EventEmitter<LeadServiceKey | null>();
  @Output() readonly navigate = new EventEmitter<string>();

  @ViewChild('scroller') private scroller?: ElementRef<HTMLElement>;

  readonly open = signal(false);
  readonly typing = signal(false);
  readonly messages = signal<ChatMessage[]>([
    {
      from: 'bot',
      text: '¡Hola! Soy el asistente de TacticSphere. ¿En qué te puedo ayudar?',
    },
  ]);
  readonly suggestions = [
    '¿Qué servicios ofrecen?',
    '¿Cuánto cuesta un proyecto?',
    'Necesito un agente de IA',
    '¿Cuánto dura el diagnóstico?',
  ];

  draft = '';
  opened = false;

  toggle(): void {
    this.open.update((v) => !v);
    this.opened = true;
    this.scrollToEnd();
  }

  async send(text: string): Promise<void> {
    const message = text.trim();
    if (!message || this.typing()) return;
    this.draft = '';
    this.push({ from: 'user', text: message });
    this.typing.set(true);

    const reply = SITE.agentEndpoint ? await this.askEndpoint(message) : this.answerLocally(message);

    // Pequeña pausa para que la respuesta se sienta natural
    setTimeout(() => {
      this.typing.set(false);
      this.push(reply);
    }, SITE.agentEndpoint ? 0 : 650);
  }

  runAction(action: ChatAction): void {
    if (action.kind === 'contact') {
      this.contact.emit(action.service ?? null);
    } else if (action.target) {
      this.navigate.emit(action.target);
      this.open.set(false);
    }
  }

  private answerLocally(message: string): ChatMessage {
    const text = normalize(message);
    if (/servicio|que hacen|ofrecen/.test(text)) {
      return {
        from: 'bot',
        text: 'Ofrecemos consultoría tecnológica (diagnóstico de madurez con ITIL 4), desarrollo de software, ciencia de datos (Machine Learning y Deep Learning) y agentes de IA.',
        actions: [QUIZ, CONTACT],
      };
    }
    const intent = INTENTS.find((i) => i.keywords.some((k) => text.includes(k))) ?? FALLBACK;
    return { from: 'bot', text: intent.reply, actions: intent.actions };
  }

  private async askEndpoint(message: string): Promise<ChatMessage> {
    try {
      const history = this.messages().map(({ from, text }) => ({ from, text }));
      const res = await fetch(SITE.agentEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { reply?: string };
      return { from: 'bot', text: data.reply || FALLBACK.reply, actions: data.reply ? undefined : FALLBACK.actions };
    } catch {
      return this.answerLocally(message);
    }
  }

  private push(message: ChatMessage): void {
    this.messages.update((list) => [...list, message]);
    this.scrollToEnd();
  }

  private scrollToEnd(): void {
    setTimeout(() => {
      const el = this.scroller?.nativeElement;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
  }
}
