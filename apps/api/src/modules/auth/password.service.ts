import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AuditRequestContext, SecurityAuditService } from '../../common/security/security-audit.service';
import { SupabaseAuthService } from './supabase-auth.service';

@Injectable()
export class PasswordService {
  constructor(private readonly db: DatabaseService, private readonly supabaseAuth: SupabaseAuthService, private readonly audit: SecurityAuditService) {}
  async forgot(email: string, context: AuditRequestContext = {}) {
    const user = await this.db.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true, email: true, isActive: true } });
    await this.audit.record({ actorUserId: user?.id, action: 'PASSWORD_RESET_REQUEST', targetType: 'USER', targetId: user?.id, metadata: { result: 'ACCEPTED' }, context });
    if (user?.isActive) {
      try { await this.supabaseAuth.resetPassword(user.email); }
      catch { await this.audit.record({ actorUserId: user.id, action: 'PASSWORD_RESET_DELIVERY_FAILED', targetType: 'USER', targetId: user.id, metadata: { result: 'FAILED' }, context }); }
    }
    return { message: 'Si la cuenta existe, recibirá instrucciones por correo.' };
  }
}
