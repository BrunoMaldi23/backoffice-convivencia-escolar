import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Puente de servidor hacia Supabase Auth. La clave de servicio nunca llega a la interfaz. */
@Injectable()
export class SupabaseAuthService {
  private readonly logger = new Logger(SupabaseAuthService.name);
  private readonly client: SupabaseClient | null;

  constructor(private readonly config: ConfigService) {
    const url = config.get<string>('SUPABASE_URL');
    const key = config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.client = url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }) : null;
  }

  async invite(email: string, displayName: string) {
    const existing = await this.findUserByEmail(email);
    if (existing) {
      await this.resetPassword(email);
      return { id: existing.id, created: false };
    }
    const { data, error } = await this.requireClient().auth.admin.inviteUserByEmail(email, {
      data: { displayName }, redirectTo: `${this.config.getOrThrow<string>('WEB_ORIGIN')}/establecer-contrasena`
    });
    if (error || !data.user) {
      this.throwEmailError(error, 'la invitación');
    }
    return { id: data.user.id, created: true };
  }

  async resetPassword(email: string) {
    const { error } = await this.requireClient().auth.resetPasswordForEmail(email, { redirectTo: `${this.config.getOrThrow<string>('WEB_ORIGIN')}/restablecer-contrasena` });
    if (error) this.throwEmailError(error, 'el enlace de acceso');
  }

  async verifyPassword(email: string, password: string) {
    const { data, error } = await this.requireClient().auth.signInWithPassword({ email, password });
    if (error || !data.user) throw new UnauthorizedException('Credenciales inválidas');
    return data.user.id;
  }

  async removeUser(id: string) {
    const { error } = await this.requireClient().auth.admin.deleteUser(id);
    if (error) throw new ServiceUnavailableException('No fue posible revertir la invitación en Supabase Auth');
  }

  private requireClient() {
    if (!this.client) throw new ServiceUnavailableException('Supabase Auth no está configurado');
    return this.client;
  }

  private async findUserByEmail(email: string) {
    const { data, error } = await this.requireClient().auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) {
      this.logger.error(`Supabase Auth no permitió consultar usuarios: status=${error.status ?? 'n/a'} code=${error.code ?? 'n/a'} message=${error.message}`);
      throw new ServiceUnavailableException('No fue posible consultar Supabase Auth');
    }
    const normalized = email.trim().toLowerCase();
    return data.users.find((user) => user.email?.trim().toLowerCase() === normalized) ?? null;
  }

  private throwEmailError(error: { status?: number; code?: string; message?: string } | null, action: string): never {
    this.logger.error(`Supabase Auth rechazó ${action}: status=${error?.status ?? 'n/a'} code=${error?.code ?? 'n/a'} message=${error?.message ?? 'sin detalle'}`);
    if (error?.status === 429 || error?.code === 'over_email_send_rate_limit') {
      throw new HttpException('Supabase alcanzó el límite temporal de correos de prueba. Espere hasta que se renueve la cuota o configure SMTP propio en Supabase Auth.', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (error?.code === 'email_address_not_authorized') {
      throw new BadRequestException('El correo no está autorizado por el servicio de prueba de Supabase. Configure SMTP propio para invitar direcciones externas.');
    }
    throw new ServiceUnavailableException(`No fue posible enviar ${action} mediante Supabase Auth`);
  }
}
