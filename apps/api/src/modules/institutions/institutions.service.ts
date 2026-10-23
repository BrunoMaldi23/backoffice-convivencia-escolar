import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, CaseAccessLevel } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class InstitutionsService {
  constructor(private readonly db: DatabaseService) {}

  async requireActiveMembership(userId: string, establishmentId: string, tx: Prisma.TransactionClient = this.db) {
    const membership = await tx.establishmentMembership.findFirst({ where: { userId, establishmentId, isActive: true, establishment: { isActive: true } } });
    if (!membership) throw new NotFoundException('Establecimiento no disponible');
    return membership;
  }

  caseAccessWhere(userId: string, write = false): Prisma.CaseWhereInput {
    const grant: Prisma.CaseAccessGrantWhereInput = {
      userId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      ...(write ? { accessLevel: CaseAccessLevel.WRITE } : {})
    };
    return {
      establishment: { memberships: { some: { userId, isActive: true } } },
      OR: [{ createdByUserId: userId }, { responsibleUserId: userId }, { accessGrants: { some: grant } }]
    };
  }

  async requireCaseAccess(userId: string, caseId: string, write = false, tx: Prisma.TransactionClient = this.db) {
    const record = await tx.case.findFirst({ where: { id: caseId, ...this.caseAccessWhere(userId, write) } });
    if (!record) throw new NotFoundException('Expediente no disponible');
    return record;
  }
}
