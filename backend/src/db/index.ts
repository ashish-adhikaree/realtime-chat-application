import { drizzle } from 'drizzle-orm/node-postgres';
import env from '@/config/env';
import * as schema from './schema';
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;
export { schema };
