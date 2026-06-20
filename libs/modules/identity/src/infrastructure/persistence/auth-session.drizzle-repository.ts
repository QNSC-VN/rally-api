import { Injectable } from '@nestjs/common';
import { IAuthSessionRepository } from '../../domain/ports/auth-session.repository';

@Injectable()
export class AuthSessionDrizzleRepository implements IAuthSessionRepository {
  async findByTokenHash(_hash: string): Promise<null> { return null; }
  async save(_session: unknown): Promise<void> {}
  async revokeFamily(_familyId: string): Promise<void> {}
}
