export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'progress';

interface Def { label: string; tone: Tone }

const humanize = (code: string) => code.toLowerCase().replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

/**
 * Catálogo de estados que entrega la API (enums de la base de datos) y de usuarios. Todo estado visible pasa por aquí
 * para mantener etiquetas y tonos consistentes; un código desconocido se muestra legible y en tono neutro.
 */
const STATUSES: Record<string, Def> = {
  // Expediente
  ABIERTO: { label: 'Abierto', tone: 'info' },
  EN_EVALUACION: { label: 'En evaluación', tone: 'progress' },
  EN_PROCESO: { label: 'En proceso', tone: 'progress' },
  PAUSADO: { label: 'Pausado', tone: 'warning' },
  RESUELTO: { label: 'Resuelto', tone: 'success' },
  CERRADO: { label: 'Cerrado', tone: 'neutral' },
  // Entrevistas
  BORRADOR: { label: 'Borrador', tone: 'warning' },
  FINALIZADA: { label: 'Finalizada', tone: 'success' },
  // Medidas y tareas
  PENDIENTE: { label: 'Pendiente', tone: 'warning' },
  COMPLETADA: { label: 'Completada', tone: 'success' },
  CANCELADA: { label: 'Cancelada', tone: 'neutral' },
  // Citaciones y derivaciones
  PROGRAMADA: { label: 'Programada', tone: 'info' },
  REALIZADA: { label: 'Realizada', tone: 'success' },
  NO_ASISTIO: { label: 'No asistió', tone: 'danger' },
  ENVIADA: { label: 'Enviada', tone: 'progress' },
  CON_RESPUESTA: { label: 'Con respuesta', tone: 'success' },
  CERRADA: { label: 'Cerrada', tone: 'neutral' },
  // Protocolos
  PUBLICADO: { label: 'Publicado', tone: 'success' },
  RETIRADO: { label: 'Retirado', tone: 'neutral' },
  // Documentos
  DOCUMENTO: { label: 'Documento', tone: 'neutral' },
  EVIDENCIA: { label: 'Evidencia', tone: 'info' },
  // Auditoría
  SUCCESS: { label: 'Exitoso', tone: 'success' },
  FAILURE: { label: 'Fallido', tone: 'danger' },
  DENIED: { label: 'Denegado', tone: 'warning' },
  // Cuentas y vencimientos
  ACTIVO: { label: 'Activo', tone: 'success' },
  INACTIVO: { label: 'Inactivo', tone: 'neutral' },
  VENCIDO: { label: 'Vencido', tone: 'danger' },
  VIGENTE: { label: 'Vigente', tone: 'success' }
};

export function statusOf(code: string): Def {
  return STATUSES[code] ?? { label: humanize(code), tone: 'neutral' };
}

/** Prioridades que usa la interfaz. La API guarda un código libre; los códigos no reconocidos se muestran tal cual. */
export const PRIORITIES: Record<string, Def & { rank: number }> = {
  BAJA: { label: 'Baja', tone: 'neutral', rank: 1 },
  MEDIA: { label: 'Media', tone: 'info', rank: 2 },
  ALTA: { label: 'Alta', tone: 'warning', rank: 3 },
  CRITICA: { label: 'Crítica', tone: 'danger', rank: 4 }
};

export function priorityOf(code: string): Def & { rank: number } {
  return PRIORITIES[code] ?? { label: humanize(code), tone: 'neutral', rank: 0 };
}

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

export const optionsFrom = (codes: readonly string[]) => codes.map((value) => ({ value, label: statusOf(value).label }));
export const priorityOptions = Object.entries(PRIORITIES).map(([value, def]) => ({ value, label: def.label }));
