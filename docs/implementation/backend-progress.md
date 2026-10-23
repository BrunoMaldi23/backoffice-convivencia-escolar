# Progreso de implementación backend

Actualizado: 2026-10-22.

## Último bloque completado

- Bloque 2: administración institucional. Commit `6004ddb`.
- Bloque 1: consolidación de Casos. Commit `6499f7a`.

## En curso

- Bloque 3: se incorporó la migración aditiva `20261022230000_reports_participants`, aplicada sólo en `convivencia_test`. Crea `CaseReport`, `Participant` y `CaseParticipant`; faltan servicios, rutas HTTP y pruebas de integración antes de considerar el bloque terminado.

## Migraciones

- `20261022230000_reports_participants`: aplicada en `convivencia_test`; no aplicada fuera de ese entorno por esta ejecución.

## Validaciones recientes

- Bloques 1 y 2: build, typecheck, lint, Prisma validate, estado de migraciones, diff check y 24 pruebas: PASS.
- Migración Bloque 3: `prisma validate` y `prisma migrate deploy` en `convivencia_test`: PASS.

## Riesgos y decisiones pendientes

- Los códigos de canal, clasificación y participación siguen configurables; no se inventan catálogos institucionales.
- La etiqueta de participante es mínima y no debe contener identificadores sensibles sin una política institucional posterior.
- No hay almacenamiento de documentos ni notificaciones aún.

## Próxima tarea exacta

Implementar el módulo `reports-participants`: DTOs, autorización contextual de expediente, auditoría, eventos, endpoints y pruebas HTTP con PostgreSQL para cerrar el Bloque 3.
