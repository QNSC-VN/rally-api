import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectDrizzle } from '@platform';
import type { DrizzleDB } from '@platform';
import { authSessions } from '../../../../../../db/schema/identity';
import type { AuthSession, CreateSessionInput } from '../../domain/user.types';
import { IAuthSessionRepository } from '../../domain/ports/auth-session.repository';

@Injectable()
export class AuthSessionDrizzleRepository implements IAuthSessionRepository {
  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  async findByTokenHash(hash: string): Promise<AuthSession | null> {
    const rows = await this.db
      .select()
      .from(authSessions)
      .where(eq(authSessions.tokenHash, hash))
      .limit(1);
    return rows[0] ?? null;
  }

  async create(input: CreateSessionInput): Promise<void> {
    await this.db.insert(authSessions).values({
      id: input.id,
      tenantId: input.tenantId,
      userId: input.userId,
      tokenHash: input.tokenHash,
      familyId: input.familyId,
      ipAddress: input.ipAddress,
      expiresAt: input.expiresAt,
    });
  }

  async revokeById(id: string): Promise<void> {
    await this.db.update(authSessions).set({ isRevoked: true }).where(eq(authSessions.id, id));
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.db
      .update(authSessions)
      .set({ isRevoked: true })
      .where(eq(authSessions.familyId, familyId));
  }
}
