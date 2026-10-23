# Auditoría previa a la salida

Fecha: 2026-10-23. Alcance: backend, frontend, seguridad, operación y datos. Cada hallazgo se verificó con ejecución real (pruebas, consultas o solicitudes a la API); lo que no se pudo probar figura como tal.

## Resultado de las comprobaciones automáticas

| Comprobación | Resultado |
| --- | --- |
| API: build, typecheck, lint y 55 pruebas con PostgreSQL de prueba | PASS |
| Web: typecheck, lint, build y 96 pruebas | PASS |
| Contrato OpenAPI sin referencias rotas | PASS |
| Recorrido autenticado completo con una cuenta real | NOT RUN (lo hizo la persona usuaria de forma parcial) |
| Prueba de carga de un video desde una cuenta Microsoft 365 | NOT RUN (sin acceso a la cuenta) |

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
2. **Límite de 100 KB para documentos.** Un PDF de más de ~75 KB fallaba con error 413. Ahora la carga de documentos admite 15 MB (el archivo máximo es 10 MiB) y el resto sigue en 100 KB. Verificado contra la API real.
3. **Copias de la base de datos sin protección en Git.** La carpeta `.local-backups/` (con un respaldo real de la base) no estaba en `.gitignore`; ahora está ignorada, junto con `*.dump`.

## Pendiente antes de cargar datos reales

| # | Tema | Detalle | Quién |
| --- | --- | --- | --- |
| 1 | Correo institucional | Configurar las variables del apartado anterior, probar invitación, reenvío y recuperación, y configurar SPF/DKIM/DMARC. | TI |
| 2 | Publicación en producción | Hoy el proyecto solo tiene el entorno de desarrollo (API con recarga automática, Vite y carpetas montadas). Faltan imágenes de producción, HTTPS con proxy inverso, `trust proxy` (sin él, el límite de intentos vería la IP del proxy) y un dominio donde web y API compartan el mismo sitio (la cookie es `SameSite=Strict`). | TI / desarrollo |
| 3 | Respaldo y restauración | No hay respaldo automático de la base ni de los archivos privados (`data/private`, sin volumen propio). Solo existe una copia manual. Definir frecuencia, cifrado y probar una restauración. | TI |
| 4 | Dependencias | `pnpm audit --prod`: 75 avisos (30 altos, ninguno crítico), todos de denegación de servicio o contaminación de prototipos en dependencias indirectas. Actualizar `nodemailer` (>= 7.0.11), `joi` (>= 18.2.6) y `axios` (>= 1.15.1), y los parches de NestJS; requiere reconstruir las imágenes y repetir las pruebas. | Desarrollo |
| 5 | Datos de prueba | Eliminar el expediente EXP-0001 de ejemplo, el curso, estudiantes, apoderado, funcionario y protocolo de ejemplo, y la cuenta de prueba. La plataforma no elimina expedientes: se hace con una consulta controlada. | Desarrollo |
| 6 | Cargas iniciales | Registrar usuarios (uno a uno, con invitación), estudiantes (hay carga masiva CSV) y apoderados (se registran desde la ficha del estudiante; no hay carga masiva). | Convivencia / TI |
| 7 | Reportes | Configurar los reportes definitivos una vez que se tenga acceso a todo lo anterior. | Convivencia / desarrollo |
| 8 | Decisiones institucionales | Retención documental, catálogos, matriz final de permisos (hoy Dirección no ve expedientes) y gestión de incidentes. Ver [preparación operativa](preparacion-operativa.md). | Dirección |

## Mejoras posteriores (no bloquean la salida)

- Carta de citación en PDF y aviso por correo al apoderado; citaciones y derivaciones en el panel y el calendario.
- Alojar la tipografía en el propio servidor (hoy se descarga de Google Fonts).
- Aviso al administrador cuando una cuenta lleva días sin aceptar su invitación (hoy no se distingue de una cuenta desactivada).
- Permisos efectivos en `GET /auth/me` (hoy el menú los deduce de los roles).
