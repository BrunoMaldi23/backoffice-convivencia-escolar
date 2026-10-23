import { isAxiosError } from 'axios';

/** Se lanza cuando una pantalla todavía no tiene un endpoint conectado. Nunca representa un fallo del usuario. */
export class IntegrationPendingError extends Error {
  constructor(public readonly endpoint: string | null) {
    super(endpoint ? `Integración pendiente con ${endpoint}` : 'Integración pendiente: endpoint no definido');
    this.name = 'IntegrationPendingError';
  }
}

/** Se lanzó el inicio de sesión, pero el navegador no quedó con una sesión válida (por ejemplo, cookies bloqueadas). */
export class SessionNotEstablishedError extends Error {
  constructor() {
    super('La sesión no quedó establecida');
    this.name = 'SessionNotEstablishedError';
  }
}

/** Una validación del cliente impide enviar la solicitud (por ejemplo, un archivo demasiado grande). */
export class ClientValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClientValidationError';
  }
}

export const isIntegrationPending = (error: unknown): error is IntegrationPendingError => error instanceof IntegrationPendingError;

export const httpStatus = (error: unknown): number | null => (isAxiosError(error) ? error.response?.status ?? null : null);
/** 409: versión obsoleta o regla de estado. Exige recargar el registro antes de reintentar. */
export const isConflict = (error: unknown) => httpStatus(error) === 409;
export const isForbidden = (error: unknown) => httpStatus(error) === 403;
export const isNotFound = (error: unknown) => httpStatus(error) === 404;

/**
 * Texto de la API cuando es una regla de negocio (cadena en español). Los errores de validación de DTO llegan como
 * lista (en inglés) y no se muestran: se reemplazan por un mensaje genérico.
 */
function serverMessage(error: unknown): string | null {
  if (!isAxiosError(error)) return null;
  const message = (error.response?.data as { message?: unknown } | undefined)?.message;
  return typeof message === 'string' && message.trim() ? message.trim() : null;
}

/** Convierte un error en un mensaje accionable para la persona usuaria, sin detalles técnicos. */
export function describeError(error: unknown, fallback = 'No fue posible completar la operación. Intente nuevamente.'): string {
  if (isIntegrationPending(error)) return 'Esta función aún no está conectada con el servidor.';
  if (error instanceof ClientValidationError) return error.message;
  if (error instanceof SessionNotEstablishedError) return 'No se pudo establecer la sesión. Verifique que el navegador acepte cookies del sitio e intente nuevamente.';
  if (isAxiosError(error)) {
    if (!error.response) return 'No fue posible conectar con el servidor. Revise su conexión e intente nuevamente.';
    const status = error.response.status;
    const server = serverMessage(error);
    if (status === 400) return server ?? 'Los datos enviados no son válidos. Revíselos e intente nuevamente.';
    if (status === 401) return 'Su sesión no es válida o expiró. Inicie sesión nuevamente.';
    if (status === 403) return 'No tiene permisos para realizar esta acción.';
    if (status === 404) return 'El registro no está disponible: no existe o no tiene acceso a él.';
    if (status === 409) return server ? `${server}. Recargue el registro para ver los cambios y reintente.` : 'El registro cambió mientras lo editaba. Recargue para ver los cambios y reintente.';
    if (status === 413) return 'El servidor rechazó el archivo por su tamaño. Pruebe con uno más liviano o consulte a la administración del sistema.';
    if (status === 429) return 'Se realizaron demasiados intentos. Espere un minuto e intente nuevamente.';
    if (status >= 500) return 'El servidor tuvo un problema. Intente nuevamente en unos minutos.';
  }
  return fallback;
}
