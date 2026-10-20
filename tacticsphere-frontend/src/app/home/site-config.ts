// Contenido editable del home en un solo lugar.
// Los campos vacíos ('') se muestran como "Por definir" y no generan enlaces rotos.
// Los elementos con `placeholder: true` se marcan visualmente como "Ejemplo" hasta reemplazarlos.

import { IconName } from '../shared/ui/icon/icon.component';
import { LeadServiceKey } from '../types';

export type ContactLink = {
  key: 'email' | 'whatsapp' | 'linkedin' | 'instagram' | 'location';
  label: string;
  // Valor visible (ej. correo o número). Vacío = pendiente.
  value: string;
  // Enlace final. Si queda vacío se arma a partir de `value` cuando es posible.
  href: string;
};

export type CaseStudy = {
  sector: string;
  title: string;
  problem: string;
  solution: string;
  metric: { value: number; prefix?: string; suffix?: string; label: string };
  service: LeadServiceKey;
  placeholder?: boolean;
};

export type ClientLogo = { name: string; src: string };

export type Testimonial = { quote: string; author: string; role: string; placeholder?: boolean };

export type FaqItem = { question: string; answer: string };

export type QuizQuestion = {
  pillar: string;
  icon: IconName;
  question: string;
  // Una opción por nivel de madurez (1 = Inicial ... 5 = Innovador)
  options: string[];
};

export const SITE = {
  // Dominio público, se usa para la vista previa al compartir el enlace (index.html)
  url: 'https://tacticsphere-prod.web.app',

  // WhatsApp: solo dígitos con código de país, ej. '56912345678'
  contact: [
    { key: 'email', label: 'Correo', value: '', href: '' },
    { key: 'whatsapp', label: 'WhatsApp', value: '', href: '' },
    { key: 'linkedin', label: 'LinkedIn', value: '', href: '' },
    { key: 'instagram', label: 'Instagram', value: '', href: '' },
    { key: 'location', label: 'Ubicación', value: '', href: '' },
  ] as ContactLink[],

  // Mensaje prellenado al abrir WhatsApp
  whatsappMessage: 'Hola TacticSphere, me gustaría conversar sobre un proyecto.',

  // Asistente del sitio. Vacío = responde con reglas usando el contenido de esta página.
  // Para conectar un LLM: endpoint que reciba POST { message, history } y responda { reply }.
  agentEndpoint: '',

  // Mostrar la sección Casos (con logos y testimonio). Activar cuando haya proyectos y clientes reales.
  showCases: false,

  technologies: [
    'Python',
    'TensorFlow',
    'PyTorch',
    'scikit-learn',
    'Pandas',
    'FastAPI',
    'Angular',
    'TypeScript',
    'PostgreSQL',
    'LangChain',
    'OpenAI',
    'Docker',
    'Firebase',
    'Power BI',
  ],

  // TODO: reemplazar por proyectos reales (y quitar `placeholder`)
  cases: [
    {
      sector: 'Retail',
      title: 'Reportería automatizada',
      problem: 'Los reportes semanales se armaban a mano a partir de varias planillas.',
      solution: 'Pipeline de datos y dashboard de BI conectados a las fuentes originales.',
      metric: { value: 40, prefix: '−', suffix: '%', label: 'tiempo de reportería' },
      service: 'ciencia_datos',
      placeholder: true,
    },
    {
      sector: 'Servicios',
      title: 'Agente de atención 24/7',
      problem: 'Consultas repetitivas saturaban al equipo de soporte.',
      solution: 'Agente de IA integrado al sitio y al sistema de tickets.',
      metric: { value: 60, suffix: '%', label: 'consultas resueltas sin derivar' },
      service: 'agentes_ia',
      placeholder: true,
    },
    {
      sector: 'Manufactura',
      title: 'Hoja de ruta tecnológica',
      problem: 'Inversiones TI sin priorización ni medición de impacto.',
      solution: 'Diagnóstico de madurez ITIL 4 y roadmap priorizado a 18 meses.',
      metric: { value: 2, suffix: ' niveles', label: 'de avance en madurez' },
      service: 'consultoria',
      placeholder: true,
    },
  ] as CaseStudy[],

  // TODO: agregar logos en assets/clients/ (svg o png con fondo transparente)
  clients: [] as ClientLogo[],

  // TODO: reemplazar por una cita real de un cliente
  testimonial: {
    quote: 'Aquí irá la cita de un cliente sobre su experiencia trabajando con TacticSphere.',
    author: 'Nombre del cliente',
    role: 'Cargo, Empresa',
    placeholder: true,
  } as Testimonial,

  faq: [
    {
      question: '¿Cuánto dura un diagnóstico de madurez?',
      answer:
        'Depende del tamaño de la organización y de cuántas áreas participan. En la primera reunión definimos el alcance y te entregamos una estimación de plazos.',
    },
    {
      question: '¿Trabajan con pymes o solo con grandes empresas?',
      answer:
        'Trabajamos con organizaciones de distintos tamaños. El diagnóstico y las soluciones se ajustan a la realidad y al presupuesto de cada empresa.',
    },
    {
      question: '¿Pueden desarrollar la solución después del diagnóstico?',
      answer:
        'Sí. Además de consultoría, desarrollamos software a medida, modelos de Machine Learning y agentes de IA para implementar las mejoras detectadas.',
    },
    {
      question: '¿Cómo se cotiza un proyecto?',
      answer:
        'Cada proyecto se cotiza según su alcance. Cuéntanos qué necesitas en el formulario de contacto y te respondemos con una propuesta.',
    },
    {
      question: '¿Cómo manejan la confidencialidad de los datos?',
      answer:
        'Los datos de cada organización se usan solo para su diagnóstico y proyecto. Podemos firmar acuerdos de confidencialidad antes de comenzar.',
    },
  ] as FaqItem[],

  // Mini-diagnóstico del home: una pregunta por pilar
  quiz: [
    {
      pillar: 'Infraestructura & Cloud',
      icon: 'cloud',
      question: '¿Cómo describirías la infraestructura tecnológica de tu empresa?',
      options: [
        'Equipos y servidores locales, sin planificación',
        'Algunos servicios estandarizados, mayormente on-premise',
        'Sistemas integrados y uso parcial de la nube',
        'Infraestructura cloud escalable y monitoreada',
        'Arquitectura cloud automatizada que habilita nuevos negocios',
      ],
    },
    {
      pillar: 'Big Data & Analytics',
      icon: 'database',
      question: '¿Cómo gestionan los datos del negocio?',
      options: [
        'Planillas dispersas en distintas personas',
        'Bases de datos por área, sin integración',
        'Datos centralizados y con calidad controlada',
        'Plataforma de datos con analítica avanzada',
        'Los datos se explotan en tiempo real como activo estratégico',
      ],
    },
    {
      pillar: 'Business Intelligence',
      icon: 'chart-pie',
      question: '¿Cómo toman decisiones con la información?',
      options: [
        'Por intuición o experiencia',
        'Con reportes manuales periódicos',
        'Con dashboards e indicadores (KPIs) por área',
        'Con BI de autoservicio en toda la organización',
        'Con modelos que anticipan escenarios y recomiendan acciones',
      ],
    },
    {
      pillar: 'Inteligencia Artificial',
      icon: 'brain',
      question: '¿Qué uso hacen hoy de la inteligencia artificial?',
      options: [
        'Ninguno',
        'Uso individual de herramientas como ChatGPT',
        'Pilotos o pruebas de concepto en algún proceso',
        'Modelos o agentes en producción en procesos clave',
        'La IA es parte central de la estrategia y los productos',
      ],
    },
  ] as QuizQuestion[],

  maturityLevels: [
    { name: 'Inicial', label: 'Ad hoc / Reactivo', text: 'Procesos manuales, poca digitalización y gestión reactiva.' },
    { name: 'Básico', label: 'Estandarizado / Organizado', text: 'Digitalización inicial, herramientas aisladas y estandarización básica.' },
    { name: 'Intermedio', label: 'Integrado / Optimizado', text: 'Integración transversal, datos centralizados y decisiones basadas en KPIs.' },
    { name: 'Avanzado', label: 'Inteligente / Estratégico', text: 'Uso estratégico de datos, BI avanzado, IA predictiva e infraestructura resiliente.' },
    { name: 'Innovador', label: 'Transformador', text: 'Transformación del negocio con tecnología disruptiva e innovación continua.' },
  ],
};

export function contactHref(link: ContactLink, whatsappMessage = ''): string {
  if (link.href) return link.href;
  if (!link.value) return '';
  switch (link.key) {
    case 'email':
      return `mailto:${link.value}`;
    case 'whatsapp': {
      const digits = link.value.replace(/\D/g, '');
      const text = whatsappMessage ? `?text=${encodeURIComponent(whatsappMessage)}` : '';
      return digits ? `https://wa.me/${digits}${text}` : '';
    }
    default:
      return '';
  }
}
