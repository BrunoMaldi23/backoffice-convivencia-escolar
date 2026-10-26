import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

async function readSecret(prompt: string): Promise<string> {
  if (!input.isTTY) throw new Error('Ejecute este comando desde una terminal interactiva.');
  output.write(prompt); input.setRawMode(true); input.resume();
  return new Promise((resolve) => { let value = ''; input.on('data', function onData(chunk: Buffer) { const key = chunk.toString(); if (key === '\r' || key === '\n') { input.setRawMode(false); input.pause(); input.off('data', onData); output.write('\n'); resolve(value); } else if (key === '\u0003') process.exit(130); else if (key === '\u007f') value = value.slice(0, -1); else value += key; }); });
}

async function main() {
  const cli = createInterface({ input, output });
  const email = (await cli.question('Correo institucional: ')).trim().toLowerCase();
  const password = await readSecret('Contraseña: ');
  cli.close();
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 12) throw new Error('Correo o contraseña no cumplen los requisitos.');
  const db = new PrismaClient();
  try {
    const role = await db.role.upsert({ where: { name: 'SYSTEM_ADMIN' }, update: {}, create: { name: 'SYSTEM_ADMIN', description: 'Administrador inicial del sistema' } });
    if (await db.userRole.count({ where: { roleId: role.id } })) throw new Error('Ya existe un administrador inicial.');
    if (await db.user.findUnique({ where: { email } })) throw new Error('El correo ya está registrado.');
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    const user = await db.user.create({ data: { email, displayName: 'Administrador/a del sistema', passwordHash } });
    await db.userRole.create({ data: { userId: user.id, roleId: role.id } });
    await db.securityAudit.create({ data: { actorUserId: user.id, action: 'INITIAL_ADMIN_CREATED', targetType: 'USER', targetId: user.id } });
    output.write('Administrador inicial creado.\n');
  } finally { await db.$disconnect(); }
}
main().catch((error: unknown) => { output.write(`${error instanceof Error ? error.message : 'Error al crear administrador.'}\n`); process.exitCode = 1; });
