# Autorización institucional de expedientes

## Dos niveles obligatorios

1. RBAC global: el guard existente debe comprobar uno de los permisos `cases.read`, `cases.create`, `cases.update`, `cases.assign`, `cases.transition`, `cases.close`, `cases.reopen` o `cases.timeline.read`.
2. Alcance institucional y del expediente: membresía activa en el establecimiento y, según operación, creador, responsable o `CaseAccessGrant` vigente. Ningún permiso global elimina esta segunda comprobación.

La secuencia de servicio es: cargar caso por `id` **y** `establishmentId`; comprobar membresía; comprobar permiso; comprobar alcance; recién entonces leer o mutar. No debe resolverse un caso por UUID y luego filtrar en memoria.

## Matriz inicial propuesta

| Rol | Lectura | Crear/actualizar | Asignar/transitar | Cerrar/reabrir | Timeline |
| --- | --- | --- | --- | --- | --- |
| `SYSTEM_ADMIN` | Solo con membresía/grant; no acceso implícito | No implícito | No implícito | No implícito | Solo con alcance |
| `DIRECTOR` | Casos de su establecimiento, sujeto a política institucional | No por defecto | No por defecto | Pendiente confirmación | Sí, sin exportación por defecto |
| `CONVIVENCIA` | Casos asignados o concedidos | Sí | Sí | Cierre: pendiente confirmación | Sí |
| `PSICOLOGO` / `TRABAJADOR_SOCIAL` | Asignados o grant | Actualización acotada posterior | No por defecto | No | Sí, asignados |
| `INSPECTOR_GENERAL` | Asignados o grant | Crear y actualizar inicial, pendiente confirmación | No por defecto | No | Sí, asignados |
| `INSPECTOR` / `DOCENTE` / `ORIENTADOR` | Solo grants explícitos | No por defecto | No | No | Solo grants de lectura |
| `AUDITOR` | Solo grants de auditoría institucional | No | No | No | Timeline y auditoría de consulta, sin contenido futuro restringido |

Los permisos nuevos no deben agregarse al seed actual hasta que esta matriz sea aprobada. Dirección y auditoría no obtienen acceso transversal automático; exportar expedientes queda fuera de esta fase.

## Protección de datos

- Registrar en auditoría técnica las consultas de expediente y timeline sensibles, sin copiar el contenido consultado.
- Responder `404` para UUID ajeno al alcance, evitando confirmar su existencia entre establecimientos.
- Usar borrado lógico solo en catálogos o grants, nunca para borrar eventos de timeline desde servicios normales.
- Definir retención, exportación y eliminación institucional antes de adjuntar antecedentes de menores.
