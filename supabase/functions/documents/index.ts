import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' };
const bucket = 'case-documents';
const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png']);

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const fail = (message: string, status: number) => json({ error: message }, status);

async function hasPermission(db: ReturnType<typeof createClient>, userId: string, code: string) {
  const { data: roles, error: rolesError } = await db.from('user_roles').select('role_id').eq('user_id', userId);
  if (rolesError || !roles?.length) return false;
  const { data: grants, error: grantsError } = await db.from('role_permissions').select('permission_id').in('role_id', roles.map((role) => role.role_id));
  if (grantsError || !grants?.length) return false;
  const { data: permission, error: permissionError } = await db.from('permissions').select('id').eq('code', code).in('id', grants.map((grant) => grant.permission_id)).maybeSingle();
  return !permissionError && Boolean(permission);
}

async function sha256(content: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', content);
  return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, '0')).join('');
}

function validContent(content: Uint8Array, type: string) {
  if (type === 'application/pdf') return new TextDecoder().decode(content.slice(0, 5)) === '%PDF-';
  if (type === 'image/jpeg') return content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff;
  return type === 'image/png' && content.length >= 8 && content.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const authorization = request.headers.get('authorization');
  if (!authorization) return fail('Sesión requerida', 401);
  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const auth = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
  const { data: { user: identity } } = await auth.auth.getUser();
  if (!identity) return fail('Sesión inválida', 401);
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: actor } = await db.from('users').select('id,is_active').eq('supabase_auth_user_id', identity.id).maybeSingle();
  if (!actor) return fail('La cuenta no está habilitada por administración', 403);
  if (!actor.is_active) await db.from('users').update({ is_active: true }).eq('id', actor.id);
  const body = await request.json().catch(() => ({}));
  const action = body.action as string;
  const caseId = body.caseId as string;
  if (!caseId) return fail('Expediente requerido', 400);
  if (!['list', 'link', 'start', 'complete'].includes(action)) return fail('Operación no disponible', 400);
  if (!await hasPermission(db, actor.id, action === 'list' ? 'documents.read' : 'documents.create')) return fail('No tiene permiso para esta operación de documentos', 403);
  const write = action !== 'list';
  const { data: record } = await db.from('cases').select('id,establishment_id,status,created_by_user_id,responsible_user_id').eq('id', caseId).maybeSingle();
  if (!record) return fail('Expediente no disponible', 404);
  const { data: membership } = await db.from('establishment_memberships').select('user_id').eq('user_id', actor.id).eq('establishment_id', record.establishment_id).eq('is_active', true).maybeSingle();
  const owns = record.created_by_user_id === actor.id || record.responsible_user_id === actor.id;
  const { data: grant } = await db.from('case_access_grants').select('access_level,expires_at').eq('case_id', caseId).eq('user_id', actor.id).is('revoked_at', null).maybeSingle();
  const grantValid = grant && (!grant.expires_at || new Date(grant.expires_at) > new Date()) && (!write || grant.access_level === 'WRITE');
  if (!membership || (!owns && !grantValid)) return fail('Expediente no disponible', 404);
  if (action === 'list') {
    const { data, error } = await db.from('case_documents').select('id,kind,original_filename,content_type,size_bytes,sha256,external_url,version,created_at,uploaded_by_user_id').eq('case_id', caseId).is('voided_at', null).order('created_at');
    return error ? fail('No fue posible listar documentos', 500) : json(data);
  }
  if (record.status === 'CERRADO') return fail('El expediente está cerrado', 409);
  if (action === 'link') {
    let target: URL;
    try { target = new URL(String(body.externalUrl ?? '')); } catch { return fail('Ingrese un enlace HTTPS válido', 400); }
    if (target.protocol !== 'https:' || !(target.hostname === '1drv.ms' || target.hostname.endsWith('.sharepoint.com'))) return fail('Use un enlace institucional de OneDrive o SharePoint', 400);
    const title = String(body.title ?? '').trim();
    if (!title || title.length > 255) return fail('Ingrese un título de hasta 255 caracteres', 400);
    const { data, error } = await db.from('case_documents').insert({ case_id: caseId, uploaded_by_user_id: actor.id, kind: 'EVIDENCIA', original_filename: title, storage_key: crypto.randomUUID(), storage_provider: 'SUPABASE', content_type: 'text/uri-list', size_bytes: 0, sha256: await sha256(new TextEncoder().encode(target.toString())), external_url: target.toString() }).select().single();
    return error ? fail('No fue posible registrar la evidencia', 500) : json(data, 201);
  }
  if (action === 'start') {
    const contentType = String(body.contentType ?? ''); const sizeBytes = Number(body.sizeBytes);
    if (!allowed.has(contentType) || !Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > 10 * 1024 * 1024) return fail('Archivo no permitido', 400);
    const originalFilename = String(body.originalFilename ?? '').trim();
    if (!originalFilename || originalFilename.length > 255) return fail('Ingrese un nombre de archivo de hasta 255 caracteres', 400);
    const storageKey = `${record.establishment_id}/${caseId}/${crypto.randomUUID()}`;
    const { data: intent, error } = await db.from('document_upload_intents').insert({ case_id: caseId, created_by_user_id: actor.id, original_filename: originalFilename, content_type: contentType, declared_size_bytes: sizeBytes, storage_key: storageKey, expires_at: new Date(Date.now() + 15 * 60_000).toISOString() }).select().single();
    if (error) return fail('No fue posible preparar la carga', 500);
    const { data: signed, error: signedError } = await db.storage.from(bucket).createSignedUploadUrl(storageKey);
    if (signedError || !signed) { await db.from('document_upload_intents').delete().eq('id', intent.id); return fail('No fue posible preparar la carga', 503); }
    return json({ uploadId: intent.id, signedUrl: signed.signedUrl, expiresAt: intent.expires_at });
  }
  if (action === 'complete') {
    const { data: intent } = await db.from('document_upload_intents').select('*').eq('id', body.uploadId).eq('case_id', caseId).eq('created_by_user_id', actor.id).gt('expires_at', new Date().toISOString()).maybeSingle();
    if (!intent) return fail('La carga no está disponible o venció', 404);
    const { data: blob, error: downloadError } = await db.storage.from(bucket).download(intent.storage_key);
    if (downloadError || !blob) return fail('Archivo privado no disponible', 400);
    const content = new Uint8Array(await blob.arrayBuffer());
    if (content.length !== intent.declared_size_bytes || !validContent(content, intent.content_type)) return fail('El archivo no coincide con la carga solicitada', 400);
    const { data, error } = await db.from('case_documents').insert({ case_id: caseId, uploaded_by_user_id: actor.id, kind: 'DOCUMENTO', original_filename: intent.original_filename, storage_key: intent.storage_key, storage_provider: 'SUPABASE', content_type: intent.content_type, size_bytes: content.length, sha256: await sha256(content) }).select().single();
    if (error) return fail('No fue posible registrar el documento', 500);
    await db.from('document_upload_intents').delete().eq('id', intent.id);
    return json(data, 201);
  }
});
