# Plataforma única: Supabase

La plataforma objetivo usa Supabase como único servicio gestionado de backend: PostgreSQL, Auth, Storage y Edge Functions. No se usa Neon, Render, Railway ni servicios equivalentes para base de datos, autenticación, archivos, correo de identidad o funciones.

Invitaciones y recuperación se emiten desde Supabase Auth usando el emisor de prueba seleccionado para este proyecto. Es apto sólo para pocos usuarios y desarrollo; antes de producción se debe revisar su cuota y configurar SMTP institucional dentro de Supabase si deja de ser suficiente.

La API Nest actual conserva temporalmente la lógica de dominio, RBAC y autorización contextual mientras se migra endpoint por endpoint a Edge Functions. No se debe retirar hasta completar paridad, UAT y migración de usuarios existentes a `auth.users`.
