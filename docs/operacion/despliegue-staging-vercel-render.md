# Despliegue de staging: Vercel y Supabase

Esta guía prepara un entorno de pruebas con datos ficticios. No autoriza cargar datos de estudiantes ni credenciales reales.

## Arquitectura requerida

Vercel sirve la interfaz y ejecuta la API Nest mediante `api/[...path].js`. Supabase es el único servicio gestionado para PostgreSQL, Auth, Storage y correo de identidad.

| Componente | Plataforma |
| ---------- | ---------- |
| Interfaz y API pública `/api` | Vercel |
| Base de datos, Auth y Storage | Supabase |
| Correo de invitación y recuperación | Supabase Auth, con SMTP configurado en Supabase |

No se usa Neon, Render, Railway ni servicios equivalentes.

## 1. Base de datos y archivos

1. Configure la cadena de conexión de Supabase como `DATABASE_URL` en Vercel. Use el pooler recomendado por Supabase para tráfico de aplicación.
2. Cree el bucket privado `case-documents`, con límite de 10 MiB y MIME PDF/JPEG/PNG. No habilite acceso público.
3. En Vercel, declare como secretos `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_DOCUMENTS_BUCKET=case-documents`.
4. En **Authentication > SMTP Settings** de Supabase, configure el SMTP institucional o de pruebas. El remitente debe estar verificado por el proveedor SMTP.
5. En **Authentication > URL Configuration**, agregue la URL exacta de Vercel a las URLs de redirección permitidas. Nunca use `localhost` para correos de producción.

## 2. Servicio en Vercel

1. Importe el repositorio en Vercel desde la raíz. `vercel.json` construye `@backoffice/api` y `@backoffice/web`, y enruta `/api/(.*)` a la función de API antes de la regla SPA.
2. Configure `WEB_ORIGIN` con la URL pública exacta, sin barra final. Agregue también `TRUST_PROXY_HOPS=1` y `NODE_ENV=production`.
3. No defina secretos con prefijo `VITE_`: quedarían visibles en el navegador. La API conserva las claves de servidor para Supabase Storage.
4. Ejecute las migraciones mediante el flujo aprobado contra Supabase antes del primer despliegue. No ejecute resets ni seeds de pruebas en la base principal.

## 3. Interfaz en Vercel

1. El cliente consume `/api` automáticamente en producción; la ruta la atiende la función Vercel declarada antes de la regla SPA.
2. No defina secretos de API, SMTP ni base de datos con prefijo `VITE_`: esos valores son visibles desde el navegador.

Las URLs preview de Vercel no son un sustituto del dominio de staging autenticado. Se pueden usar para comprobaciones visuales aisladas, no para ingreso o escrituras.

## 4. Verificación de salida

Ejecute y registre con cuentas y datos ficticios:

1. `GET https://<proyecto>.vercel.app/api/health` responde 200 y `database: connected`.
2. Ingreso, recarga de la página y cierre de sesión; la cookie debe ser `Secure`, `HttpOnly` y `SameSite=Strict`.
3. Invitación, reenvío y recuperación de contraseña llegan al buzón de prueba y redirigen a la URL pública, nunca a `localhost`.
4. La carga, descarga y eliminación de un documento se realizan en el bucket privado `case-documents`.
5. UAT completa con la matriz vigente, sin datos personales reales.

## Límites del entorno de prueba

Antes de datos reales siguen siendo obligatorios: SMTP institucional con SPF/DKIM/DMARC, respaldo cifrado de PostgreSQL y Storage, restauración ensayada, aprobación institucional de retención y UAT firmada.
