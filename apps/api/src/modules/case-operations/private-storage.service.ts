import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
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
    if (!this.matchesType(content, contentType)) throw new BadRequestException('El contenido no coincide con el tipo de archivo declarado');
    const storageKey = randomUUID();
    try { await mkdir(this.root, { recursive: true }); await writeFile(join(this.root, storageKey), content, { flag: 'wx', mode: 0o600 }); }
    catch { throw new InternalServerErrorException('No fue posible resguardar el archivo'); }
    return { storageKey, sizeBytes: content.length, sha256: createHash('sha256').update(content).digest('hex') };
  }
  async read(storageKey: string) { try { return await readFile(join(this.root, storageKey)); } catch { throw new InternalServerErrorException('Archivo privado no disponible'); } }
  async remove(storageKey: string) { try { await unlink(join(this.root, storageKey)); } catch (error: unknown) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new InternalServerErrorException('No fue posible limpiar el archivo privado'); } }
  private matchesType(content: Buffer, contentType: string) {
    if (contentType === 'application/pdf') return content.subarray(0, 5).toString('ascii') === '%PDF-';
    if (contentType === 'image/jpeg') return content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff;
    return content.length >= 8 && content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
}
