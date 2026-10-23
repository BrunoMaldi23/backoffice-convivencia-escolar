import { IntegrationPendingError } from '@/lib/errors';

/**
 * Punto único de integración pendiente. Cada servicio declara el endpoint que usará y, mientras el contrato
 * no esté revisado, lanza `IntegrationPendingError` en lugar de simular una respuesta.
 */
export function pendingIntegration(endpoint: string | null): never {
  throw new IntegrationPendingError(endpoint);
}
