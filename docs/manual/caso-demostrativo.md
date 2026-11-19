# Caso demostrativo local

## Identificación

- Folio: `EXP-0001`.
- Título: **Conflicto entre estudiantes durante un recreo**.
- Estado al inicio: En proceso.
- Prioridad: Media.
- Datos: enteramente ficticios y sólo presentes en `convivencia_demo`.

## Datos cargados

El caso contiene establecimiento local, curso, estudiantes ficticios, apoderado, responsable, denuncia, participantes, entrevista finalizada, protocolo publicado y aplicado, medida, seguimiento, tarea, citación, derivación, notificación y eventos de línea de tiempo.

Durante la prueba se completó la medida “Acompañamiento durante recreos”. Es la única modificación posterior a la carga inicial y también corresponde a datos ficticios.

## Cómo recorrerlo

1. Abra `http://localhost:5173` en el equipo donde quedó iniciado el entorno local.
2. Inicie sesión con la cuenta demostrativa local configurada durante la preparación. Sus credenciales no se incluyen en documentos ni repositorio.
3. Entre a **Casos** y abra `EXP-0001`.
4. Recorra Resumen, Línea de tiempo, Denuncias, Involucrados, Entrevistas, Protocolos, Medidas, Seguimientos, Tareas, Citaciones y Derivaciones.

La carga y descarga de documentos no se deben presentar como operativas en este entorno hasta configurar Supabase Storage. La recuperación de contraseña y los correos requieren un servicio SMTP o Mailpit local configurado; se mantienen fuera del recorrido validado.

No use este entorno para ingresar datos reales: es una instalación local demostrativa, no un ambiente de operación.
