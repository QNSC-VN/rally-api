import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import * as schema from '../../../../db/schema';

export const DRIZZLE = Symbol('DRIZZLE');

export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;
export type DrizzleTx = Parameters<Parameters<DrizzleDB['transaction']>[0]>[0];

export const InjectDrizzle = () => Inject(DRIZZLE);

@Injectable()
export class DrizzleProvider {
  private pool: Pool;
  private db: DrizzleDB;

  constructor(private readonly config: AppConfigService) {
    this.pool = new Pool({
      connectionString: config.get('DATABASE_URL'),
      min: config.get('DATABASE_POOL_MIN'),
      max: config.get('DATABASE_POOL_MAX'),
      // Fail fast on idle connections to surface misconfiguration
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    this.db = drizzle(this.pool, { schema, logger: config.get('NODE_ENV') === 'development' });
  }

  get instance(): DrizzleDB {
    return this.db;
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
