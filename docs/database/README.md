# Base de datos y migraciones

Prisma administra el esquema PostgreSQL ubicado en `apps/api/prisma/schema.prisma`. Las migraciones versionadas viven en `apps/api/prisma/migrations`; la primera crea `system_control`, una tabla técnica sin datos personales.

En desarrollo con Compose, la API ejecuta `prisma migrate deploy` antes de iniciar. Nunca se usa `prisma db push` como sustituto de migraciones. Para una nueva migración en un entorno local con acceso a la base de datos, use `pnpm --filter @backoffice/api exec prisma migrate dev --name descripcion_corta` y confirme el SQL generado antes de versionarlo.

PostgreSQL usa el volumen nombrado `postgres_data`. Respaldo manual desde PowerShell:

```powershell
docker compose exec db pg_dump -U convivencia_app convivencia > respaldo.sql
```

Para restaurar, valide primero el archivo y el destino. No se eliminan volúmenes como parte de los reinicios normales.
