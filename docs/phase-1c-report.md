# Informe técnico: comunidad educativa, citaciones y derivaciones

Fecha: 2026-10-23 (America/Santiago).

**ESTADO: COMPLETADA** en backend y frontend, con las pruebas descritas abajo. Quedan fuera, y documentados como pendientes, la generación de cartas de citación y el envío de correos a apoderados.

## 1. Qué se agregó

Los seis módulos que figuraban como "Pendiente" en el menú ya funcionan contra la API real:

| Módulo | Qué permite |
| --- | --- |
| Cursos | Crear y editar cursos por año académico; contador de estudiantes activos |
| Estudiantes | Registro con RUT validado, búsqueda por nombre o RUT, filtro por curso, ficha, edición con control de versión, **carga masiva desde CSV** y expedientes visibles donde figura |
| Apoderados | Registro, ficha, vínculo con estudiantes (con apoderado principal) |
| Funcionarios | Registro con cargo y cuenta de acceso opcional |
| Citaciones | Programar, reprogramar y cerrar (realizada, no asistió, cancelada) dentro del expediente; listado global |
| Derivaciones | Registrar y avanzar (pendiente → enviada → con respuesta → cerrada) dentro del expediente; listado global |

Además:

- **Involucrados desde el directorio.** En la pestaña Involucrados se busca a la persona por nombre o RUT; el servidor reutiliza el involucrado si ya participó en otro caso. La referencia de texto libre sigue disponible.
- **Tres lecturas que no exigen permisos administrativos** (antes eran necesidades de backend): `GET /me/establishments`, `GET /establishments/:id/stages` y `GET /establishments/:id/members`. Con ellas, un encargado de convivencia conoce su establecimiento, ve el nombre de la etapa y elige responsables sin ser administrador.
- **Seed de permisos v4** con 12 permisos nuevos y su matriz por rol.

## 2. Backend

- Migración aditiva `20261023120000_school_community_summons_referrals` (tablas `courses`, `students`, `guardians`, `student_guardians`, `staff_members`, `case_summons`, `case_referrals`; columnas opcionales en `participants`; cuatro eventos nuevos de línea de tiempo). No modifica ni elimina datos.
- Dos módulos NestJS (`community` y `summons-referrals`), DTO validados, Swagger, control de versión (`expectedVersion` → 409) y auditoría sin datos personales.
- 29 operaciones nuevas: la API pasa de 64 a **93**. Contrato en [community-contract.md](api/community-contract.md).
- Reglas: acceso solo con membresía activa (404 si no), RUT con dígito verificador de 7 u 8 dígitos, carga masiva "todo o nada", una sola persona principal por estudiante, citación o derivación cerrada inmodificable, expediente cerrado no admite nuevas acciones.

## 3. Frontend

- Nuevos servicios (`community.ts`), composables (`useCommunity`, `useCaseActions`), vistas en `modules/community`, `modules/summons` y `modules/referrals`, pestañas Citaciones y Derivaciones en el expediente y los componentes `PersonPicker` y `NoEstablishment`.
- El menú ya no marca módulos como pendientes; se eliminó la vista genérica de "pendiente".
- La API simulada de previsualización replica todos los endpoints nuevos (no llega al paquete de producción: se verificó que `dist/` no contiene datos de ejemplo).
- La validación de RUT del navegador se alineó con la del servidor (7 u 8 dígitos).

## 4. Resultados reales

| Comprobación | Resultado |
| --- | --- |
| API: `build`, `typecheck`, `lint` | PASS |
| API: `test` (48 pruebas, 10 suites; incluye pruebas HTTP con PostgreSQL en `convivencia_test` y el contrato OpenAPI de 93 operaciones) | PASS |
| Web: `typecheck`, `lint`, `build` | PASS |
| Web: `test` (89 pruebas) | PASS |
| Recorrido en previsualización: estudiantes, fichas, apoderados, funcionarios, cursos, citaciones, derivaciones, pestañas del expediente y selección de una persona del directorio | PASS, sin errores en consola |
| Recorrido autenticado contra la API real con un usuario del colegio | NOT RUN (requiere iniciar sesión con credenciales reales) |

## 5. Estado de la base local

Se aplicó la migración nueva a la base `convivencia` al reiniciar el contenedor `api` (el comando de Compose ejecuta `prisma migrate deploy`) y se ejecutó `roles:seed`, que solo agrega permisos (SYSTEM_ADMIN pasó a 52). No se tocaron datos existentes, volúmenes ni otras bases.

## 6. Pendientes conocidos

- Carta de citación en PDF y notificación por correo al apoderado.
- Catálogos oficiales (vínculo familiar, tipo de institución) definidos por el establecimiento.
- Indicadores de citaciones y derivaciones en el panel y el calendario.
- Los pendientes anteriores de [api-integration.md](frontend/api-integration.md) (límite de cuerpo de 100 KB para documentos, permisos efectivos en `/auth/me`, etc.).
