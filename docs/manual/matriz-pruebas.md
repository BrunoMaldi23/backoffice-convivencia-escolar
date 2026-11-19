# Matriz de pruebas — demostración local

| ID | Flujo | Evidencia / resultado | Estado |
|---|---|---|---|
| DEMO-01 | Salud de API y base | `/api/health`: `ok`, base conectada | PASS |
| DEMO-02 | Inicio de sesión | Acceso al panel con cuenta ficticia local | PASS |
| DEMO-03 | Panel de inicio | Indicadores y alertas muestran registros de demo | PASS |
| DEMO-04 | Listado de casos | `EXP-0001` visible con metadatos esperados | PASS |
| DEMO-05 | Expediente | Resumen y pestañas cargan con registros relacionados | PASS |
| DEMO-06 | Medida | Cambio de pendiente a completada reflejado en UI | PASS |
| DEMO-07 | Nombre de etapa | `GET /cases/:id` entrega la etapa y el resumen muestra “Intervención” | PASS |
| DEMO-10 | Entrevistas | Entrevista finalizada y acuerdos visibles en el expediente | PASS |
| DEMO-11 | Seguimientos e historial | Registros ficticios cargan en sus pestañas | PASS |
| DEMO-12 | Administración | Usuarios, roles y auditoría se visualizan; auditoría refleja la medida actualizada | PASS |
| DEMO-13 | Pausa, reanudación y cierre | Regresión HTTP cubre transiciones, cierre y reapertura (6/6 casos) | PASS |
| DEMO-08 | Documentos | Requiere almacenamiento Supabase no configurado localmente | NOT RUN |
| DEMO-09 | Correo / recuperación | Sin prueba de mensajería real en esta ejecución | NOT RUN |

Los estados PASS, FAIL y NOT RUN describen sólo esta ejecución local y no constituyen una validación productiva.
