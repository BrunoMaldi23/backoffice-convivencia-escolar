# Almacenamiento documental privado: decisión pendiente

La ruta se configura con `PRIVATE_STORAGE_PATH`; si no existe usa `data/private` relativo al proceso. Los archivos se nombran con UUID interno, no con nombre original, tienen permisos de escritura del proceso y se persisten junto con metadatos, tipo, tamaño y SHA-256. Sólo PDF/JPEG/PNG con firma comprobada y hasta 10 MiB son aceptados.

La descarga exige sesión, permiso `documents.read` y alcance actual sobre el expediente. No existe URL pública, borrado API ni plazo de retención implementado. Administración del establecimiento debe definir retención, eliminación autorizada, respaldo cifrado, restauración verificada, responsable de custodia y requisitos legales antes de datos reales.

Para migrar a objeto privado externo, implemente un adaptador con las operaciones `save/read/remove`, claves opacas, cifrado, control de acceso por servicio y verificación de hash; migre mediante inventario y validación hash, sin publicar URLs firmadas genéricas.
