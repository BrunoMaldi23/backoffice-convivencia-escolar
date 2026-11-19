# Guion de capturas demostrativas

1. **Panel de inicio**: ingresar al panel y mostrar indicadores, alertas y actividad reciente. Evidencia: `capturas/01-panel-inicio.png`.
2. **Listado de casos**: abrir Casos y mostrar el único expediente ficticio, su folio, estado y plazo. Evidencia: `capturas/02-listado-casos.png`.
3. **Resumen de expediente**: abrir `EXP-0001`; mostrar estado, prioridad, responsable, descripción ficticia y próxima acción. Evidencia: `capturas/03-expediente-resumen.png`.
4. **Gestión de una medida**: abrir Medidas, seleccionar la medida demostrativa y confirmar el cambio de estado. Evidencia: `capturas/04-medida-completada.png`.
5. **Entrevistas**: abrir la pestaña Entrevistas y mostrar modalidad, estado finalizada y acuerdos. Evidencia: `capturas/06-entrevistas.png`.
6. **Seguimientos e historial**: abrir las pestañas Seguimientos y Línea de tiempo. Evidencias: `capturas/07-seguimientos.png` y `capturas/08-historial.png`.
7. **Administración**: mostrar Usuarios, Roles y permisos, y Auditoría. Evidencias: `capturas/09-usuarios.png`, `capturas/10-roles-permisos.png` y `capturas/11-auditoria.png`.

La pestaña Documentos se puede recorrer, pero su carga/descarga queda sin prueba local hasta configurar Supabase Storage. La pausa, reanudación y cierre existen como transiciones; se cubrieron por regresión HTTP en `convivencia_test`, pero no se ejecutaron visualmente en el caso para conservar su estado demostrativo en “En proceso”.

Antes de presentar, confirme que la pantalla se abre en `localhost`; no utilice capturas de producción ni exponga correos, contraseñas, tokens o datos de estudiantes reales.
