import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const maximumBytes = 10 * 1024 * 1024;
@Injectable()
export class PrivateStorageService {
  private readonly root = resolve(process.env.PRIVATE_STORAGE_PATH ?? 'data/private');
  async save(encoded: string, contentType: string) {
    if (!allowedTypes.has(contentType)) throw new BadRequestException('Tipo de archivo no permitido');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0) throw new BadRequestException('Contenido de archivo inválido');
    const content = Buffer.from(encoded, 'base64');
    if (!content.length || content.length > maximumBytes) throw new BadRequestException('El archivo debe medir entre 1 byte y 10 MB');
    const storageKey = randomUUID();
    try { await mkdir(this.root, { recursive: true }); await writeFile(join(this.root, storageKey), content, { flag: 'wx', mode: 0o600 }); }
    catch { throw new InternalServerErrorException('No fue posible resguardar el archivo'); }
    return { storageKey, sizeBytes: content.length, sha256: createHash('sha256').update(content).digest('hex') };
  }
  async read(storageKey: string) { try { return await readFile(join(this.root, storageKey)); } catch { throw new InternalServerErrorException('Archivo privado no disponible'); } }
}
