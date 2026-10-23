import { isAxiosError } from 'axios';

/** Se lanza cuando una pantalla todavía no tiene un endpoint conectado. Nunca representa un fallo del usuario. */
export class IntegrationPendingError extends Error {
  constructor(public readonly endpoint: string | null) {
    super(endpoint ? `Integración pendiente con ${endpoint}` : 'Integración pendiente: endpoint no definido');
    this.name = 'IntegrationPendingError';
  }
}

export const isIntegrationPending = (error: unknown): error is IntegrationPendingError => error instanceof IntegrationPendingError;

/** Convierte un error en un mensaje accionable para la persona usuaria, sin detalles técnicos. */
export function describeError(error: unknown, fallback = 'No fue posible completar la operación. Intente nuevamente.'): string {
  if (isIntegrationPending(error)) return 'Esta función aún no está conectada con el servidor.';
  if (isAxiosError(error)) {
    if (!error.response) return 'No fue posible conectar con el servidor. Revise su conexión e intente nuevamente.';
    const status = error.response.status;
    if (status === 401) return 'Su sesión no es válida o expiró. Inicie sesión nuevamente.';
    if (status === 403) return 'No tiene permisos para realizar esta acción.';
    if (status === 404) return 'El registro solicitado no existe o fue eliminado.';
    if (status === 429) return 'Se realizaron demasiados intentos. Espere un minuto e intente nuevamente.';
    if (status >= 500) return 'El servidor tuvo un problema. Intente nuevamente en unos minutos.';
  }
  return fallback;
}
