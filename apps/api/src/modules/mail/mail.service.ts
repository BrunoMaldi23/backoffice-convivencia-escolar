import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Opciones del transporte SMTP. Con `MAIL_USER` y `MAIL_PASSWORD` se autentica (Google Workspace o Microsoft 365 lo exigen); sin ellas
 * se envía sin autenticación (Mailpit en desarrollo o un relé autorizado por IP). En producción se exige TLS: puerto 465 con
 * `MAIL_SECURE=true` o puerto 587 con STARTTLS. La contraseña nunca se registra.
 */
export function smtpOptions(read: (key: string) => string | number | boolean | undefined) {
  const secure = Boolean(read('MAIL_SECURE'));
  const user = String(read('MAIL_USER') ?? '').trim();
  const pass = String(read('MAIL_PASSWORD') ?? '');
  return {
    host: String(read('MAIL_HOST')), port: Number(read('MAIL_PORT')), secure,
    requireTLS: read('NODE_ENV') === 'production' && !secure, tls: { minVersion: 'TLSv1.2' as const },
    ...(user && pass ? { auth: { user, pass } } : {})
  };
}

@Injectable()
export class MailService {
  constructor(private readonly config: ConfigService) {}
  async sendAction(to: string, kind: 'INVITE' | 'RESET', token: string) {
    const origin = this.config.getOrThrow<string>('WEB_ORIGIN');
    const subject = kind === 'INVITE' ? 'Invitación al Backoffice Convivencia Escolar' : 'Restablecimiento de contraseña';
    const action = kind === 'INVITE' ? 'establecer su contraseña' : 'restablecer su contraseña';
    const path = kind === 'INVITE' ? '/establecer-contrasena' : '/restablecer-contrasena';
    const ttl = this.config.getOrThrow<number>('PASSWORD_RESET_TTL_MINUTES');
    const text = `Estimado/a funcionario/a:\n\nPara ${action}, abra ${origin}${path} e ingrese este código de un solo uso:\n\n${token}\n\nEl código vence en ${ttl} minutos. Si no solicitó esta acción, ignore este mensaje.\n\nBackoffice Convivencia Escolar`;
    const transport = nodemailer.createTransport(smtpOptions((key) => this.config.get<string | number | boolean>(key)));
    try { await transport.sendMail({ from: this.config.getOrThrow<string>('MAIL_FROM'), to, subject, text }); }
    catch { throw new ServiceUnavailableException('No se pudo enviar el correo. Intente nuevamente.'); }
  }

  async sendSummons(to: string, input: { recipientLabel: string; scheduledAt: Date; location: string; attachment: Buffer; filename: string }) {
    const when = new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Santiago' }).format(input.scheduledAt);
    const text = `Estimado/a ${input.recipientLabel}:\n\nSe adjunta la citación a entrevista.\n\nFecha y hora: ${when}\nLugar: ${input.location}\n\nSi no puede asistir, comuníquese oportunamente con el establecimiento.\n\nEquipo de Convivencia Escolar`;
    const transport = nodemailer.createTransport(smtpOptions((key) => this.config.get<string | number | boolean>(key)));
    try {
      await transport.sendMail({ from: this.config.getOrThrow<string>('MAIL_FROM'), to, subject: 'Citación a entrevista', text, attachments: [{ filename: input.filename, content: input.attachment, contentType: 'application/pdf' }] });
    } catch { throw new ServiceUnavailableException('No se pudo enviar la citación por correo. Verifique la configuración e intente nuevamente.'); }
  }
}
