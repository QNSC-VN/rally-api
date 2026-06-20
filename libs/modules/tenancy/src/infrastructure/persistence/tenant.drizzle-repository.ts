import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { InjectDrizzle } from '@platform';
import type { DrizzleDB } from '@platform';
import { tenants } from '../../../../../../db/schema/tenancy';
import type { Tenant } from '../../domain/tenancy.types';
import { ITenantRepository } from '../../domain/ports/tenant.repository';

@Injectable()
export class TenantDrizzleRepository implements ITenantRepository {
  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<Tenant | null> {
    const rows = await this.db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return (rows[0] as Tenant | undefined) ?? null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const rows = await this.db
      .select()
      .from(tenants)
      .where(and(eq(tenants.slug, slug), isNull(tenants.deletedAt)))
      .limit(1);
    return (rows[0] as Tenant | undefined) ?? null;
  }
}
