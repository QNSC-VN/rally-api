export const AUTH_SESSION_REPOSITORY = Symbol('AUTH_SESSION_REPOSITORY');

export interface IAuthSessionRepository {
  findByTokenHash(hash: string): Promise<unknown | null>;
  save(session: unknown): Promise<void>;
  revokeFamily(familyId: string): Promise<void>;
}
