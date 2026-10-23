# Contrato de autenticación para Vue

Base URL: `http://localhost:3000/api`. Todas las solicitudes desde Vue usan `withCredentials: true`. En desarrollo, el origen CORS autorizado es `http://localhost:5173`.

| Método | Ruta | Entrada | Éxito |
| --- | --- | --- | --- |
| POST | `/auth/login` | `{email, password}` | 201 `{user}` y cookies |
| GET | `/auth/me` | cookie de sesión | 200 `{user}` |
| GET | `/auth/csrf` | cookie de sesión | 200 `{token}` |
| POST | `/auth/logout` | cookie y `X-CSRF-Token` | 201 `{success:true}` |

`user` contiene `id`, `email`, `displayName` y `roles: string[]`. Los roles sirven para presentación; el servidor comprueba los permisos efectivos desde PostgreSQL en cada solicitud administrativa. No se devuelven hashes ni tokens de sesión.

`bce_session`: opaca, HttpOnly, SameSite=Strict, Path=/, duración 12 horas y Secure con `NODE_ENV=production`. `bce_csrf`: SameSite=Strict, legible por JavaScript; el valor también está disponible mediante `GET /auth/csrf`. El hash CSRF se guarda en la sesión. Todas las rutas administrativas que escriben y `POST /auth/logout` requieren el encabezado `X-CSRF-Token`. `POST /auth/login`, recuperación y aceptación de invitación son públicos y tienen límites de frecuencia.

```ts
import axios from 'axios';
const api = axios.create({ baseURL: 'http://localhost:3000/api', withCredentials: true });
await api.post('/auth/login', { email, password });
const { data: session } = await api.get('/auth/me');
const { data: csrf } = await api.get<{ token: string }>('/auth/csrf');
await api.post('/auth/logout', {}, { headers: { 'X-CSRF-Token': csrf.token } });
```

Para `PATCH /users/:id`, por ejemplo, obtenga primero el CSRF y envíelo en el mismo encabezado. No almacene la sesión en `localStorage`. Ante `401`, limpie el estado local y redirija a ingreso. `403` indica permiso insuficiente o CSRF ausente/incorrecto; muestre un mensaje sin repetir automáticamente la escritura. `400` indica DTO inválido, `409` conflicto y `429` límite de solicitudes. NestJS devuelve normalmente `{statusCode, message, error}`; `message` puede ser una lista de validaciones. No use ese texto como clave de lógica de cliente.

La documentación de recuperación e invitación está en [password-recovery-contract.md](password-recovery-contract.md).
