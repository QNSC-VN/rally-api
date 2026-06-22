import type { User } from '../user.types';
import type { DbExecutor } from '@platform';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  updateLastLogin(id: string, tx?: DbExecutor): Promise<void>;
  updatePasswordHash(id: string, passwordHash: string, tx?: DbExecutor): Promise<void>;
  updateStatus(id: string, status: string, tx?: DbExecutor): Promise<void>;
  updateProfile(
    id: string,
    input: { displayName?: string; avatarUrl?: string | null; locale?: string; timezone?: string },
  ): Promise<User>;
  createPasswordResetToken(
    id: string,
    tokenHash: string,
    expiresAt: Date,
    tx?: DbExecutor,
  ): Promise<void>;
  findPasswordResetToken(
    tokenHash: string,
  ): Promise<{ id: string; userId: string; usedAt: Date | null; expiresAt: Date } | null>;
  markPasswordResetTokenUsed(id: string, tx?: DbExecutor): Promise<void>;
}
