const TIME_ZONE = 'America/Santiago';

const dateParts = new Intl.DateTimeFormat('es-CL', { timeZone: TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric' });
const timeParts = new Intl.DateTimeFormat('es-CL', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const longDate = new Intl.DateTimeFormat('es-CL', { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long' });

const toDate = (value: string | Date): Date => (value instanceof Date ? value : new Date(value));

/** Fecha visible en formato dd-mm-aaaa, en hora de Chile continental. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '—';
  const parts = Object.fromEntries(dateParts.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.day}-${parts.month}-${parts.year}`;
}

/** Fecha y hora de 24 h: dd-mm-aaaa HH:mm. */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${formatDate(date)} ${timeParts.format(date)}`;
}

export function formatTime(value: string | Date): string {
  return timeParts.format(toDate(value));
}

export function formatLongDate(value: string | Date): string {
  const text = longDate.format(toDate(value));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-CL').format(value);
}

/** Iniciales para avatares; no expone más información que el nombre ya visible. */
export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
}
