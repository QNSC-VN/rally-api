import type { AuthSession, CreateSessionInput } from '../user.types';

export const AUTH_SESSION_REPOSITORY = Symbol('AUTH_SESSION_REPOSITORY');

export interface IAuthSessionRepository {
  findByTokenHash(hash: string): Promise<AuthSession | null>;
  create(input: CreateSessionInput): Promise<void>;
  revokeById(id: string): Promise<void>;
  revokeFamily(familyId: string): Promise<void>;
}
