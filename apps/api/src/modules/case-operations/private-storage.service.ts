import { BadRequestException, Injectable, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { DocumentStorageProvider } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const maximumBytes = 10 * 1024 * 1024;
@Injectable()
export class PrivateStorageService {
  private readonly root = resolve(process.env.PRIVATE_STORAGE_PATH ?? 'data/private');
  private readonly bucket = process.env.SUPABASE_DOCUMENTS_BUCKET ?? 'case-documents';
  private readonly supabase: SupabaseClient | null;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.supabase = url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
  }

  validateDeclaredUpload(contentType: string, sizeBytes: number) {
    if (!allowedTypes.has(contentType)) throw new BadRequestException('Tipo de archivo no permitido');
    if (!Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > maximumBytes) throw new BadRequestException('El archivo debe medir entre 1 byte y 10 MB');
  }

  validate(content: Buffer, contentType: string, declaredSizeBytes?: number) {
    this.validateDeclaredUpload(contentType, content.length);
    if (declaredSizeBytes !== undefined && content.length !== declaredSizeBytes) throw new BadRequestException('El tamaño del archivo cargado no coincide con la solicitud');
    if (!this.matchesType(content, contentType)) throw new BadRequestException('El contenido no coincide con el tipo de archivo declarado');
    return { sizeBytes: content.length, sha256: createHash('sha256').update(content).digest('hex') };
  }

  newSupabaseKey(establishmentId: string, caseId: string) { return `${establishmentId}/${caseId}/${randomUUID()}`; }

  async createSignedUploadUrl(storageKey: string) {
    const { data, error } = await this.client().storage.from(this.bucket).createSignedUploadUrl(storageKey);
    if (error || !data?.signedUrl) throw new ServiceUnavailableException('No fue posible preparar la carga del documento');
    return data.signedUrl;
  }

  async read(storageProvider: DocumentStorageProvider, storageKey: string) {
    if (storageProvider === DocumentStorageProvider.LOCAL) return this.readLegacy(storageKey);
    const { data, error } = await this.client().storage.from(this.bucket).download(storageKey);
    if (error || !data) throw new InternalServerErrorException('Archivo privado no disponible');
    return Buffer.from(await data.arrayBuffer());
  }

  async save(storageProvider: DocumentStorageProvider, storageKey: string, content: Buffer, contentType: string) {
    this.validate(content, contentType);
    if (storageProvider === DocumentStorageProvider.LOCAL) {
      const path = join(this.root, storageKey);
      await mkdir(resolve(path, '..'), { recursive: true });
      await writeFile(path, content, { flag: 'wx' });
      return;
    }
    const { error } = await this.client().storage.from(this.bucket).upload(storageKey, content, { contentType, upsert: false });
    if (error) throw new InternalServerErrorException('No fue posible guardar el documento firmado');
  }

  async remove(storageProvider: DocumentStorageProvider, storageKey: string) {
    if (storageProvider === DocumentStorageProvider.LOCAL) return this.removeLegacy(storageKey);
    const { error } = await this.client().storage.from(this.bucket).remove([storageKey]);
    if (error) throw new InternalServerErrorException('No fue posible limpiar el archivo privado');
  }

  private client() {
    if (!this.supabase) throw new ServiceUnavailableException('El almacenamiento de documentos aún no está configurado');
    return this.supabase;
  }
  private async readLegacy(storageKey: string) { try { return await readFile(join(this.root, storageKey)); } catch { throw new InternalServerErrorException('Archivo privado no disponible'); } }
  private async removeLegacy(storageKey: string) { try { await unlink(join(this.root, storageKey)); } catch (error: unknown) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new InternalServerErrorException('No fue posible limpiar el archivo privado'); } }
  private matchesType(content: Buffer, contentType: string) {
    if (contentType === 'application/pdf') return content.subarray(0, 5).toString('ascii') === '%PDF-';
    if (contentType === 'image/jpeg') return content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff;
    return content.length >= 8 && content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
}
