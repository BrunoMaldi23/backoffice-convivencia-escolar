# Despliegue de staging: Vercel y Render

Esta guía prepara un entorno de pruebas con datos ficticios. No autoriza cargar datos de estudiantes ni credenciales reales.

## Arquitectura requerida

Use dos subdominios HTTPS del mismo dominio registrable:

| Componente | Ejemplo                               | Plataforma |
| ---------- | ------------------------------------- | ---------- |
| Interfaz   | `https://pruebas.colegio.example`     | Vercel     |
| API        | `https://api.pruebas.colegio.example` | Render     |

No use para pruebas autenticadas la combinación `*.vercel.app` y `*.onrender.com`: son sitios distintos y el navegador no enviará las cookies de sesión `SameSite=Strict`.

## 1. Base de datos y archivos

1. Cree PostgreSQL administrado en Render en la misma región que la API.
2. Copie su URL interna exclusivamente a `DATABASE_URL` en el servicio web de Render.
3. Configure también `SHADOW_DATABASE_URL` con una base aislada de staging. Aunque las migraciones productivas no usan la base sombra, Prisma la exige por el esquema actual.
4. Mantenga el disco definido en `render.yaml`, montado en `/var/data`; la API escribe los documentos en `/var/data/private`.
5. No use planes sin disco persistente si se habilitará carga de documentos.

## 2. Servicio API en Render

1. Cree el Blueprint desde este repositorio y seleccione la rama de staging.
2. Revise que el plan permita disco persistente y comando pre-deploy.
3. Complete las variables marcadas como secretas en el panel de Render:

   | Variable              | Valor de staging                                      |
   | --------------------- | ----------------------------------------------------- |
   | `WEB_ORIGIN`          | URL exacta de la interfaz, sin barra final.           |
   | `DATABASE_URL`        | URL interna de PostgreSQL de staging.                 |
   | `SHADOW_DATABASE_URL` | URL de base sombra aislada de staging.                |
   | `MAIL_*`              | SMTP sandbox o institucional autorizado para pruebas. |

   `PORT` lo proporciona Render; no lo declare. `NODE_ENV=production`, `TRUST_PROXY_HOPS=1` y `PRIVATE_STORAGE_PATH=/var/data/private` vienen declarados por el Blueprint.

4. El pre-deploy ejecuta solamente `prisma migrate deploy`. El Blueprint inicializa los roles una sola vez tras el primer despliegue; no mezcla datos ni creación de administrador con el arranque de cada despliegue.
5. Tras el primer despliegue y solo contra la base de staging, cree el administrador inicial con `pnpm --filter @backoffice/api admin:create` en una terminal interactiva. Nunca pegue la contraseña en logs ni variables.

## 3. Interfaz en Vercel

1. Importe el mismo repositorio como un proyecto Vercel usando la raíz del repositorio. `vercel.json` instala el workspace, construye `@backoffice/web` y publica `apps/web/dist`.
2. Agregue el dominio de staging y configure su DNS según indique Vercel.
3. Defina `VITE_API_BASE_URL=https://api.pruebas.colegio.example/api` solo para el entorno de staging/producción del proyecto. Esta variable se incorpora al paquete durante el build: redespliegue la interfaz tras cambiarla.
4. No defina secretos de API, SMTP ni base de datos en Vercel. `VITE_*` es visible desde el navegador.

Las URLs preview de Vercel no son un sustituto del dominio de staging autenticado. Se pueden usar para comprobaciones visuales aisladas, no para ingreso o escrituras.

## 4. Verificación de salida

Ejecute y registre con cuentas y datos ficticios:

1. `GET https://api.pruebas.colegio.example/api/health` responde 200 y `database: connected`.
2. La interfaz carga y su llamada a `/api/health` responde correctamente.
3. Ingreso, recarga de la página y cierre de sesión; la cookie debe ser `Secure`, `HttpOnly` y `SameSite=Strict`.
4. Invitación, reenvío y recuperación de contraseña llegan al buzón de prueba.
5. Carga, descarga y posterior redeploy de un PDF ficticio: el archivo continúa disponible.
6. UAT completa con la matriz vigente, sin datos personales reales.

## Límites del entorno de prueba

Antes de datos reales siguen siendo obligatorios: SMTP institucional con SPF/DKIM/DMARC, respaldo cifrado de PostgreSQL y del disco, restauración ensayada, aprobación institucional de retención y UAT firmada.
