# Auditoría previa a la salida

Fecha de actualización: 2026-11-06. Alcance: backend, frontend, seguridad, operación y datos. Cada hallazgo se verificó con ejecución real (pruebas, consultas o solicitudes a la API); lo que no se pudo probar figura como tal.

## Resultado de las comprobaciones automáticas

| Comprobación | Resultado |
| --- | --- |
| API: build, typecheck, lint y 48 pruebas con PostgreSQL de prueba | PASS |
| Web: typecheck, lint, build y 97 pruebas | PASS |
| Auditoría de dependencias de producción | PASS: 0 críticas, 0 altas y 0 moderadas |
| Despliegue productivo y `GET /api/health` | PASS: API y base de datos conectadas |
| Recorrido autenticado completo con una cuenta real | PASS parcial: navegación, documentos, archivado y limpieza demostrativa |
| Prueba de correo institucional | NOT RUN: requiere configuración de TI |

## Lo que está bien (verificado)

- Cookie de sesión `HttpOnly`, `SameSite=Strict` y `Secure` en producción; CSRF en toda escritura; CORS limitado a `WEB_ORIGIN`; Helmet; Swagger desactivado en producción.
- Límite de intentos: 5 por minuto en el ingreso y 3 en la recuperación de contraseña.
- DTO validados con rechazo de campos desconocidos; control de versión (409) en todas las ediciones.
- Acceso por permisos y por alcance (membresía del establecimiento y expediente): se prueban 404 y 403.
- La auditoría no guarda datos personales (RUT, nombres, contenido de los registros).
- La previsualización con datos de ejemplo no llega al paquete de producción (verificado en `dist/`).
- Evidencia en video: solo se aceptan enlaces HTTPS de `*.sharepoint.com` y `1drv.ms`; se prueba que se rechacen `http`, otros dominios y dominios que imiten SharePoint. Un enlace personal de `onedrive.live.com` no se acepta.

## Corregido durante esta auditoría

1. **Correo sin autenticación SMTP.** El servicio no tenía usuario ni contraseña, por lo que no habría funcionado con Google ni Microsoft. Se agregaron `MAIL_USER` y `MAIL_PASSWORD` (obligatorias en conjunto), con pruebas.
2. **Límite de 100 KB para documentos.** Un PDF de más de ~75 KB fallaba con error 413. La solución actual usa carga directa a Supabase Storage mediante URL firmada y confirmación validada por la API; la carga y eliminación de un archivo demostrativo se verificaron en producción.
3. **Copias de la base de datos sin protección en Git.** La carpeta `.local-backups/` (con un respaldo real de la base) no estaba en `.gitignore`; ahora está ignorada, junto con `*.dump`.

## Pendiente antes de cargar datos reales

| # | Tema | Detalle | Quién |
| --- | --- | --- | --- |
| 1 | Correo institucional | Configurar las variables del apartado anterior, probar invitación, reenvío y recuperación, y configurar SPF/DKIM/DMARC. | TI |
| 2 | Respaldo y restauración | El proyecto Supabase no tiene recuperación a un punto en el tiempo habilitada. Definir frecuencia, ubicación cifrada, responsable y probar restauración de base y archivos privados en un entorno aislado. | TI |
| 3 | Dependencias | Resuelto el 2026-11-06: `pnpm audit --prod` no reporta vulnerabilidades críticas, altas ni moderadas; build, lint y pruebas aprobaron tras actualizar dependencias. | Desarrollo |
| 4 | Datos de prueba | Resuelto para expedientes: se eliminaron los cuatro casos demostrativos de Colegio Bautista, sus dependencias y auditorías asociadas; el próximo folio quedó en `EXP-0001`. Antes de uso real, confirmar que no queden personas, cursos o protocolos demostrativos. | Convivencia / desarrollo |
| 5 | Cargas iniciales | Registrar usuarios (uno a uno, con invitación), estudiantes (hay carga masiva CSV) y apoderados (se registran desde la ficha del estudiante; no hay carga masiva). | Convivencia / TI |
| 6 | Reportes | Configurar los reportes definitivos una vez que se tenga acceso a todo lo anterior. | Convivencia / desarrollo |
| 7 | Decisiones institucionales | Retención documental, catálogos, matriz final de permisos (hoy Dirección no ve expedientes) y gestión de incidentes. Ver [preparación operativa](preparacion-operativa.md). | Dirección |

## Mejoras posteriores (no bloquean la salida)

- Confirmar SMTP institucional y ejecutar UAT de la carta PDF y el aviso por correo al apoderado. Las citaciones programadas y derivaciones pendientes ya aparecen en el panel; el calendario muestra las citaciones del período visible.
- Alojar la tipografía en el propio servidor (hoy se descarga de Google Fonts).
- Aviso al administrador cuando una cuenta lleva días sin aceptar su invitación. La ficha ya distingue una invitación pendiente de una cuenta desactivada.
