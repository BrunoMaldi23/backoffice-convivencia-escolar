# Recuperación e invitaciones

| Método y ruta | Entrada | Respuesta |
| --- | --- | --- |
| POST `/api/auth/forgot-password` | `{email}` | 201 `{message:"Si la cuenta existe, recibirá instrucciones por correo."}` |
| POST `/api/auth/reset-password` | `{token,password}` | 201 `{success:true}` |
| POST `/api/auth/accept-invitation` | `{token,password}` | 201 `{success:true}` |

Los códigos son aleatorios, de un solo uso, vigencia 30 minutos, y se almacenan solo como SHA-256. Un código de invitación no sirve para recuperación y viceversa. Contraseña nueva: mínimo 12 caracteres; Argon2id. Al consumir el código se revocan todas las sesiones del usuario. Código inválido, vencido o usado: 400. Los endpoints públicos tienen rate limiting; `forgot-password` devuelve el mismo cuerpo para correo inexistente o existente.

Mailpit entrega un correo en español a la cuenta. El correo contiene el código separado de la URL (`/establecer-contrasena` o `/restablecer-contrasena`); Vue debe pedir que el usuario pegue el código en un formulario y enviarlo en el cuerpo POST. No coloque el código en ruta, query string, analytics, logs, `localStorage` ni encabezado `Referer`. Tras éxito, dirija al ingreso. El frontend visual aún no está implementado.

El SMTP local usa `mailpit:1025`; la bandeja de desarrollo está en `http://localhost:8025`. En producción, configure un servidor institucional y transporte seguro antes de habilitar estos flujos fuera del entorno local.

La vigencia indicada en el correo usa `PASSWORD_RESET_TTL_MINUTES`; no está fijada a un valor textual. La política compartida exige al menos 12 caracteres para una contraseña nueva.
