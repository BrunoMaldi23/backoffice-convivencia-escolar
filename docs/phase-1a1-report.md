# Informe Fase 1A.1: autenticación

## Base de pruebas aislada

Las pruebas HTTP usan exclusivamente `convivencia_test`. Antes de ejecutarse, la suite exige que `DATABASE_URL` incluya ese nombre y aborta en cualquier otro caso. Las tres migraciones se aplicaron y `prisma migrate status` confirmó el esquema actualizado. Las fixtures usan correo aleatorio `@test.local`, contraseña aleatoria en memoria y se eliminan al terminar.

## Cobertura ejecutada

- Acceso sin sesión y DTO inválido.
- Contraseña incorrecta y correo inexistente.
- Cuenta desactivada.
- Inicio de sesión, creación persistente de sesión, cookies `HttpOnly` y `SameSite=Strict`.
- Consulta de sesión y CSRF ligado a la sesión.
- Logout sin CSRF, con CSRF incorrecto y con CSRF válido.
- Revocación posterior al logout y rechazo de sesión vencida.

## Comando reproducible

```powershell
docker compose exec -e DATABASE_URL='postgresql://convivencia_app:<contraseña-local>@db:5432/convivencia_test?schema=public' api pnpm --filter @backoffice/api test
```

No use este comando contra `convivencia` ni `convivencia_shadow`.
