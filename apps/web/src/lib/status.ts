import type { Priority } from '@/types/models';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'progress';

interface StatusDef { label: string; tone: Tone }

/** Catálogo único de estados visibles. Toda insignia de estado pasa por aquí para mantener etiquetas consistentes. */
const STATUSES: Record<string, StatusDef> = {
  abierto: { label: 'Abierto', tone: 'info' },
  en_proceso: { label: 'En proceso', tone: 'progress' },
  en_revision: { label: 'En revisión', tone: 'progress' },
  en_curso: { label: 'En curso', tone: 'progress' },
  recibida: { label: 'Recibida', tone: 'info' },
  clasificada: { label: 'Clasificada', tone: 'progress' },
  derivada: { label: 'Derivada', tone: 'neutral' },
  desestimada: { label: 'Desestimada', tone: 'neutral' },
  cerrado: { label: 'Cerrado', tone: 'neutral' },
  cerrada: { label: 'Cerrada', tone: 'neutral' },
  pendiente: { label: 'Pendiente', tone: 'warning' },
  vigente: { label: 'Vigente', tone: 'success' },
  finalizada: { label: 'Finalizada', tone: 'neutral' },
  vencida: { label: 'Vencida', tone: 'danger' },
  completada: { label: 'Completada', tone: 'success' },
  realizada: { label: 'Realizada', tone: 'success' },
  programada: { label: 'Programada', tone: 'info' },
  reprogramada: { label: 'Reprogramada', tone: 'warning' },
  no_asiste: { label: 'No asiste', tone: 'danger' },
  enviada: { label: 'Enviada', tone: 'info' },
  confirmada: { label: 'Confirmada', tone: 'success' },
  en_atencion: { label: 'En atención', tone: 'progress' },
  sin_respuesta: { label: 'Sin respuesta', tone: 'warning' },
  borrador: { label: 'Borrador', tone: 'neutral' },
  publicado: { label: 'Publicado', tone: 'success' },
  activo: { label: 'Activo', tone: 'success' },
  inactivo: { label: 'Inactivo', tone: 'neutral' },
  invitado: { label: 'Invitación pendiente', tone: 'warning' },
  matriculado: { label: 'Matriculado', tone: 'success' },
  retirado: { label: 'Retirado', tone: 'neutral' },
  exito: { label: 'Exitoso', tone: 'success' },
  denegado: { label: 'Denegado', tone: 'warning' },
  error: { label: 'Error', tone: 'danger' }
};

export function statusOf(code: string): StatusDef {
  return STATUSES[code] ?? { label: code.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()), tone: 'neutral' };
}

export const PRIORITIES: Record<Priority, { label: string; tone: Tone; rank: number }> = {
  baja: { label: 'Baja', tone: 'neutral', rank: 1 },
  media: { label: 'Media', tone: 'info', rank: 2 },
  alta: { label: 'Alta', tone: 'warning', rank: 3 },
  critica: { label: 'Crítica', tone: 'danger', rank: 4 }
};

/** Clases por tono: texto y borde con contraste AA sobre blanco. Siempre se acompañan de icono y texto. */
export const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
  progress: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-red-50 text-red-800 ring-red-200'
};

export const TONE_ICONS: Record<Tone, string> = {
  neutral: 'circle', info: 'info', progress: 'clock', success: 'check-circle', warning: 'alert-triangle', danger: 'alert-circle'
};

export const optionsFrom = (codes: string[]) => codes.map((value) => ({ value, label: statusOf(value).label }));
export const priorityOptions = (Object.keys(PRIORITIES) as Priority[]).map((value) => ({ value, label: PRIORITIES[value].label }));
