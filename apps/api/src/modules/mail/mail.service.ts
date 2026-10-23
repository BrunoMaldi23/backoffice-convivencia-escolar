import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

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
    const secure = this.config.get<boolean>('MAIL_SECURE') ?? false;
    const transport = nodemailer.createTransport({ host: this.config.getOrThrow<string>('MAIL_HOST'), port: Number(this.config.getOrThrow<number>('MAIL_PORT')), secure, requireTLS: this.config.get<string>('NODE_ENV') === 'production' && !secure, tls: { minVersion: 'TLSv1.2' } });
    try { await transport.sendMail({ from: this.config.getOrThrow<string>('MAIL_FROM'), to, subject, text }); }
    catch { throw new ServiceUnavailableException('No se pudo enviar el correo. Intente nuevamente.'); }
  }
}
