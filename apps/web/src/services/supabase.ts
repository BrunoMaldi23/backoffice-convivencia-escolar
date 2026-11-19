import { createClient } from '@supabase/supabase-js';
import { ClientValidationError } from '@/lib/errors';

let client: ReturnType<typeof createClient> | null = null;

function supabase() {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new ClientValidationError('El acceso de Supabase aún no está configurado. Contacte a la administración del sistema.');
  client = createClient(url, key, { auth: { persistSession: false, detectSessionInUrl: true, autoRefreshToken: false } });
  return client;
}

export async function invokeDocuments<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase().functions.invoke<T>('documents', { body });
  if (error || data === null) throw new ClientValidationError('No fue posible comunicarse con el servicio seguro de documentos.');
  return data;
}

/** Finaliza una invitación o recuperación desde el enlace de Supabase sin guardar tokens en el navegador. */
export async function setSupabasePassword(password: string) {
  const auth = supabase().auth;
  const { data: session } = await auth.getSession();
  if (!session.session) throw new ClientValidationError('El enlace de seguridad no es válido o venció. Solicite uno nuevo.');
  const { error } = await auth.updateUser({ password });
  if (error) throw new ClientValidationError('No fue posible actualizar la contraseña. Solicite un enlace nuevo e intente nuevamente.');
  await auth.signOut();
}
