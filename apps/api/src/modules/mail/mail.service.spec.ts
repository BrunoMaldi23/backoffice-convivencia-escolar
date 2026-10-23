import { envValidationSchema } from '../../config/env.validation';
import { smtpOptions } from './mail.service';

const read = (values: Record<string, string | number | boolean>) => (key: string) => values[key];
const base = { MAIL_HOST: 'smtp.example.invalid', MAIL_PORT: 587, MAIL_SECURE: false, NODE_ENV: 'development' };

describe('smtpOptions', () => {
  it('no autentica sin usuario y contraseña (Mailpit o relé autorizado)', () => {
    expect(smtpOptions(read(base))).not.toHaveProperty('auth');
    expect(smtpOptions(read({ ...base, MAIL_USER: '', MAIL_PASSWORD: '' }))).not.toHaveProperty('auth');
    expect(smtpOptions(read({ ...base, MAIL_USER: 'usuario@example.invalid' }))).not.toHaveProperty('auth');
  });
  it('autentica cuando hay usuario y contraseña', () => {
    expect(smtpOptions(read({ ...base, MAIL_USER: ' usuario@example.invalid ', MAIL_PASSWORD: 'clave-ficticia' }))).toMatchObject({ auth: { user: 'usuario@example.invalid', pass: 'clave-ficticia' }, host: 'smtp.example.invalid', port: 587 });
  });
  it('exige TLS en producción (STARTTLS en 587 o conexión segura en 465)', () => {
    expect(smtpOptions(read({ ...base, NODE_ENV: 'production' }))).toMatchObject({ secure: false, requireTLS: true, tls: { minVersion: 'TLSv1.2' } });
    expect(smtpOptions(read({ ...base, NODE_ENV: 'production', MAIL_PORT: 465, MAIL_SECURE: true }))).toMatchObject({ secure: true, requireTLS: false });
    expect(smtpOptions(read(base))).toMatchObject({ requireTLS: false });
  });
});

describe('variables de correo', () => {
  const env = { WEB_ORIGIN: 'http://localhost:5173', DATABASE_URL: 'postgresql://u:p@db:5432/x', SHADOW_DATABASE_URL: 'postgresql://u:p@db:5432/y' };
  it('acepta un entorno sin credenciales SMTP', () => {
    expect(envValidationSchema.validate(env).error).toBeUndefined();
    expect(envValidationSchema.validate({ ...env, MAIL_USER: '', MAIL_PASSWORD: '' }).error).toBeUndefined();
  });
  it('exige la contraseña cuando se indica el usuario y acepta ambos juntos', () => {
    expect(envValidationSchema.validate({ ...env, MAIL_USER: 'usuario@example.invalid' }).error).toBeDefined();
    expect(envValidationSchema.validate({ ...env, MAIL_USER: 'usuario@example.invalid', MAIL_PASSWORD: '' }).error).toBeDefined();
    expect(envValidationSchema.validate({ ...env, MAIL_USER: 'usuario@example.invalid', MAIL_PASSWORD: 'clave-ficticia' }).error).toBeUndefined();
  });
});
