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
}
