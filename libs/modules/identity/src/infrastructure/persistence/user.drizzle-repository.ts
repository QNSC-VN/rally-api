import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { InjectDrizzle } from '@platform';
import type { DrizzleDB } from '@platform';
import { users } from '../../../../../../db/schema/identity';
import type { User } from '../../domain/user.types';
import { IUserRepository } from '../../domain/ports/user.repository';

@Injectable()
export class UserDrizzleRepository implements IUserRepository {
  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  async findByEmail(email: string): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findById(id: string): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
  }
}
