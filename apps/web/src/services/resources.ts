import type { ListResourceName, ResourceItem, ResourceMap, ResourceName } from '@/types/models';
import { pendingIntegration } from './integration';

/**
 * Endpoints por recurso. `null` significa que el backend todavía no define ese recurso.
 * Al conectar un recurso, reemplace `pendingIntegration` por la llamada con la instancia `api`
 * y adapte la respuesta al modelo de `ResourceMap`.
 */
export const ENDPOINTS: Record<ResourceName, string | null> = {
  dashboard: null,
  cases: null,
  closedCases: null,
  complaints: null,
  measures: null,
  protocols: null,
  followUps: null,
  students: null,
  guardians: null,
  staff: null,
  courses: null,
  tasks: null,
  interviews: null,
  citations: null,
  referrals: null,
  documents: null,
  templates: null,
  calendar: null,
  users: '/api/users',
  roles: '/api/roles',
  audit: '/api/audit'
};

export async function fetchResource<K extends ResourceName>(resource: K): Promise<ResourceMap[K]> {
  const endpoint = ENDPOINTS[resource];
  return pendingIntegration(endpoint ? `GET ${endpoint}` : null);
}

export async function fetchResourceItem<K extends ListResourceName>(resource: K, _id: string): Promise<ResourceItem<K>> {
  const endpoint = ENDPOINTS[resource];
  return pendingIntegration(endpoint ? `GET ${endpoint}/:id` : null);
}

/** Toda escritura queda pendiente hasta revisar el contrato. Nunca se simula un guardado exitoso. */
export async function submitResource(resource: ResourceName, method: 'POST' | 'PATCH', suffix = ''): Promise<never> {
  const endpoint = ENDPOINTS[resource];
  return pendingIntegration(endpoint ? `${method} ${endpoint}${suffix}` : null);
}
