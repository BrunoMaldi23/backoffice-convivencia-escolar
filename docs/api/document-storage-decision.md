# Almacenamiento documental privado en Supabase Storage

Los documentos nuevos se cargan al bucket privado configurado en `SUPABASE_DOCUMENTS_BUCKET` mediante una URL firmada de 15 minutos. La API autoriza cada inicio, genera una clave opaca por establecimiento y expediente, y vuelve a leer el objeto al confirmar para validar firma binaria, tamaño y SHA-256 antes de crear `CaseDocument`. La clave `SUPABASE_SERVICE_ROLE_KEY` sólo existe en la API.

El bucket debe ser privado, limitarse a PDF/JPEG/PNG de hasta 10 MiB y no contar con políticas que permitan acceso público. Las descargas continúan pasando por la API: exigen sesión, permiso `documents.read` y alcance vigente sobre el expediente. Un intento vencido se limpia al iniciar una nueva carga; cancelarlo desde la interfaz lo elimina inmediatamente.

Los documentos anteriores conservan proveedor `LOCAL` para una transición segura. Antes de retirar el disco local, inventarie esos objetos, súbalos al bucket con claves nuevas, verifique SHA-256 y actualice el proveedor sólo después de validar cada copia. Administración debe definir retención, eliminación autorizada, respaldo cifrado, restauración verificada, responsable de custodia y requisitos legales antes de datos reales.
