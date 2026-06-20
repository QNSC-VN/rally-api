/**
 * Lightweight domain types for the identity bounded context.
 * Mirror the DB schema shape — no ORM dependency in the domain.
 */

export interface User {
  id: string;
  tenantId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  passwordHash: string | null;
  emailVerified: boolean;
  locale: string;
  timezone: string;
  sessionVersion: number;
  lastLoginAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  id: string;
  tenantId: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
}

export interface CreateSessionInput {
  id: string;
  tenantId: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  ipAddress?: string;
  expiresAt: Date;
}
