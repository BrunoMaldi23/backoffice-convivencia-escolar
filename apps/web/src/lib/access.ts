/**
 * Indicios de interfaz para mostrar u ocultar opciones según los roles de la sesión.
 *
 * `GET /auth/me` solo entrega roles ("informativos", según la guía de integración): los permisos efectivos los
 * evalúa el servidor en cada solicitud y responde 403 si corresponde. Esta tabla refleja la matriz inicial
 * documentada en docs/api/users-roles-contract.md y solo decide qué opciones del menú se muestran; nunca
 * concede acceso. Un permiso desconocido no se oculta: la última palabra es siempre la respuesta de la API.
 */
const DEFAULT_ROLES_BY_PERMISSION: Record<string, readonly string[]> = {
  'users.read': ['SYSTEM_ADMIN', 'DIRECTOR'],
  'users.create': ['SYSTEM_ADMIN'],
  'users.update': ['SYSTEM_ADMIN'],
  'users.disable': ['SYSTEM_ADMIN'],
  'roles.read': ['SYSTEM_ADMIN', 'DIRECTOR'],
  'roles.assign': ['SYSTEM_ADMIN'],
  'audit.read': ['SYSTEM_ADMIN', 'DIRECTOR', 'AUDITOR']
};

export function roleHintAllows(roles: readonly string[], permission?: string): boolean {
  if (!permission) return true;
  const carriers = DEFAULT_ROLES_BY_PERMISSION[permission];
  return !carriers || roles.some((role) => carriers.includes(role));
}
