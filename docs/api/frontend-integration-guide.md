# Guía de integración Vue 3

Use Axios con cookies; no use `localStorage` para sesión.

```ts
import axios from 'axios';
export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api'), withCredentials: true });
export async function csrf() { return (await api.get<{token:string}>('/auth/csrf')).data.token; }
export async function write(url: string, data?: unknown) { return api.post(url, data, { headers: { 'X-CSRF-Token': (await csrf()) } }); }
```

Inicie con `POST /auth/login`, cargue `GET /auth/me` y maneje 401 cerrando estado local. Los roles son informativos: habilite UX con ellos, pero espere 403 porque el servidor evalúa permisos actuales, membresía y grants. Obtenga establecimientos con `/establishments`; cada listado de casos requiere un `establishmentId` que el usuario pueda usar.

Para detalle consulte `/cases/:id`; el 404 significa inexistente **o** sin alcance y no debe distinguirse visualmente. Guarde `version` para PATCH, asignación, transición y medidas; un 409 exige recargar antes de reintentar. En escrituras envíe CSRF. 400 es DTO inválido, 403 permiso/CSRF, 429 límite.

Denuncias e involucrados viven bajo `/cases/:caseId`; entrevistas usan el mismo prefijo. Para adjuntar un documento, convierta un `File` a base64 y envíe `kind:"DOCUMENTO"`, nombre, MIME y contenido a `/documents`; sólo PDF/JPEG/PNG hasta 10 MiB. Para evidencia audiovisual, envíe `kind:"EVIDENCIA"`, título y un enlace HTTPS de OneDrive/SharePoint; nunca la URL en una ruta de storage ni el video en base64. Descargue documentos con `responseType:'blob'` desde la URL de descarga. Protocolos, medidas, seguimientos, tareas y notificaciones siguen las rutas y DTOs de [backend-contracts.md](backend-contracts.md). Cierre sesión con `POST /auth/logout` y CSRF.
