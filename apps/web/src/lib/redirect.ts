/** Solo se aceptan destinos internos para evitar redirecciones abiertas tras iniciar sesión. */
export const safeRedirect = (value: unknown): string => (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/');
