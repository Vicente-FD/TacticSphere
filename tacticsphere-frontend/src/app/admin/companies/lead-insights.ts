// Utilidades para analizar las solicitudes de contacto (leads) en el panel de administración.

import { LEAD_SERVICE_LABELS, Lead, LeadServiceKey } from '../../types';

export type QuizSummary = {
  level: number;
  levelName: string;
  pillars: { name: string; value: number }[];
};

// El mini-diagnóstico del home envía un mensaje con este formato:
// "Mini-diagnóstico: nivel 2 (Básico). Infraestructura & Cloud: 2/5, Big Data & Analytics: 3/5, ..."
const QUIZ_PATTERN = /Mini-diagn[oó]stico:\s*nivel\s*(\d)\s*\(([^)]+)\)\.\s*(.*)/i;
const PILLAR_PATTERN = /([^,:]+):\s*(\d)\/5/g;

export function parseQuizSummary(message?: string | null): QuizSummary | null {
  if (!message) return null;
  const match = message.match(QUIZ_PATTERN);
  if (!match) return null;
  const pillars = [...match[3].matchAll(PILLAR_PATTERN)].map((m) => ({
    name: m[1].trim(),
    value: Number(m[2]),
  }));
  return { level: Number(match[1]), levelName: match[2].trim(), pillars };
}

export type ServiceCount = { key: LeadServiceKey | 'sin_servicio'; label: string; count: number; percent: number };

export function countByService(leads: Lead[]): ServiceCount[] {
  const total = leads.length || 1;
  const counts = new Map<ServiceCount['key'], number>();
  for (const lead of leads) {
    const key = lead.service ?? 'sin_servicio';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({
      key,
      label: key === 'sin_servicio' ? 'Sin especificar' : LEAD_SERVICE_LABELS[key],
      count,
      percent: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

export type WeekCount = { start: Date; label: string; count: number };

// Últimas `weeks` semanas (lunes a domingo), de la más antigua a la actual
export function countByWeek(leads: Lead[], weeks = 8, now = new Date()): WeekCount[] {
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

  const buckets: WeekCount[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(monday);
    start.setDate(monday.getDate() - i * 7);
    buckets.push({
      start,
      label: start.toLocaleDateString('es', { day: 'numeric', month: 'short' }),
      count: 0,
    });
  }

  const first = buckets[0].start.getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  for (const lead of leads) {
    const created = parseLeadDate(lead.created_at).getTime();
    const index = Math.floor((created - first) / weekMs);
    if (index >= 0 && index < buckets.length) buckets[index].count++;
  }
  return buckets;
}

// El backend guarda created_at en UTC sin zona horaria
export function parseLeadDate(value: string): Date {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
}
