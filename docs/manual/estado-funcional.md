# Estado funcional — entorno demostrativo local

Fecha de validación: 6 de noviembre de 2026.

## Alcance y aislamiento

La validación se realizó exclusivamente contra la base local `convivencia_demo`. Se aplicaron las 19 migraciones del repositorio y se cargaron datos completamente ficticios. No se consultó ni modificó la base principal, la base de pruebas ni la base sombra.

La interfaz y API se habilitaron sólo en el equipo local para la revisión. No se publicó ningún entorno ni se realizaron cambios productivos.

## Resultado general

- PASS — API local: salud `ok`, PostgreSQL conectado a la base demostrativa.
- PASS — Inicio de sesión de la cuenta ficticia local.
- PASS — Panel de inicio: indicadores, alertas, tareas, citaciones, derivaciones y actividad reciente muestran el caso de demostración.
- PASS — Listado de casos: se visualiza `EXP-0001` con estado, prioridad, categoría y próximo plazo.
- PASS — Expediente: resumen, pestañas y controles de gestión se muestran para el caso ficticio.
- PASS — Medidas: se comprobó una escritura real al cambiar una medida ficticia de pendiente a completada; la fecha se reflejó en pantalla.
- PASS — Nombre de etapa en el resumen: la API entrega `currentStage` y la interfaz muestra “Intervención”. La regresión HTTP cubre este contrato.
- NOT RUN — Carga y descarga de documentos: el entorno demo no tiene almacenamiento Supabase configurado; no se simuló un éxito inexistente.
- NOT RUN — Recuperación de contraseña y envío real de correos: no se validó mensajería en esta ejecución.

## Incidencias técnicas encontradas

1. La imagen/volumen local anterior del frontend no contenía `@supabase/supabase-js`, aunque la dependencia está declarada y bloqueaba Vite. La validación se hizo con una imagen actual sin ese volumen obsoleto. No se cambió el código ni el lockfile por este motivo.
2. Las cuatro migraciones posteriores a `20261023170000` no estaban presentes en la imagen local inicial; se aplicaron desde el directorio actual sólo sobre `convivencia_demo`. Esto permitió detectar el desfase antes de cargar datos.
3. La base `convivencia_test` también estaba atrasada respecto del esquema actual. Se alineó con las mismas migraciones existentes antes de ejecutar regresión; no se modificaron migraciones ya aplicadas.

## Evidencias

- [Panel de inicio](capturas/01-panel-inicio.png)
- [Listado de casos](capturas/02-listado-casos.png)
- [Resumen del expediente](capturas/03-expediente-resumen.png)
- [Confirmación de medida](capturas/04-medida-completada.png)
- [Entrevistas](capturas/06-entrevistas.png)
- [Seguimientos](capturas/07-seguimientos.png)
- [Historial](capturas/08-historial.png)
- [Usuarios](capturas/09-usuarios.png)
- [Roles y permisos](capturas/10-roles-permisos.png)
- [Auditoría](capturas/11-auditoria.png)
