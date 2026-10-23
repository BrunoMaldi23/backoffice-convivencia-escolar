# Matriz de pruebas de aceptación (UAT)

Ejecute esta matriz en un entorno local o de preproducción con datos ficticios. Registre fecha, responsable, resultado, evidencia y observaciones para cada caso. Un fallo bloquea la aprobación hasta que se corrija o se acepte formalmente como excepción.

| ID | Rol que prueba | Escenario | Resultado esperado |
| --- | --- | --- | --- |
| UAT-01 | Administrador/a | Crear usuario con establecimiento y rol | Cuenta, roles y membresía activa quedan creados en una sola acción; se genera invitación. |
| UAT-02 | Nuevo funcionario/a | Aceptar invitación | Puede definir su contraseña e iniciar sesión; no se expone la contraseña a administración. |
| UAT-03 | Administrador/a | Reenviar invitación y revocar sesión | La invitación se reenvía al correo correcto y las sesiones previas dejan de servir tras revocación. |
| UAT-04 | Encargado/a de convivencia | Crear caso y asignar responsable | Se genera folio, se limita a su establecimiento y el responsable aparece disponible. |
| UAT-05 | Encargado/a de convivencia | Registrar denuncia | Se crea el expediente asociado y la denuncia queda visible en su pestaña. |
| UAT-06 | Equipo autorizado | Gestionar entrevista, medida, tarea y seguimiento | Cada acción se guarda, respeta permisos y aparece como hito relevante. |
| UAT-07 | Equipo autorizado | Cargar documento y agregar enlace de video | Documento válido se descarga; enlace OneDrive/SharePoint se abre sin mostrar URL extensa. |
| UAT-08 | Usuario sin alcance | Abrir expediente ajeno por URL | Recibe ausencia de acceso; no se filtran datos del expediente. |
| UAT-09 | Encargado/a de convivencia | Pausar, resolver, cerrar y reabrir | Solo se permiten transiciones válidas y los cambios quedan trazables. |
| UAT-10 | Equipo autorizado | Comparar línea de tiempo | “Hitos relevantes” reduce ruido; “Registro completo” conserva los eventos omitidos. |
| UAT-11 | Equipo de convivencia | Consultar calendario y reportes | Plazos coinciden con tareas/medidas/acciones y el reporte respeta filtros y alcance. |
| UAT-12 | Administrador/a | Revisar auditoría y desactivar cuenta | Acciones administrativas quedan auditadas y cuenta desactivada no puede iniciar sesión. |

## Criterio de aprobación

Se aprueba cuando todos los casos críticos UAT-01 a UAT-10 están conformes, UAT-11 y UAT-12 no tienen defectos graves, y Dirección/TI dejan constancia de las decisiones pendientes de correo, retención y respaldo.
