import { Pool, types, type PoolClient, type QueryResultRow } from 'pg';
import { databaseUrl, getEnv } from './env';
import { AppError } from './errors';

// PostgreSQL returns numeric/bigint as text by default. Our values are rupees and ids that fit safely in a JS number.
types.setTypeParser(1700, (v: string) => parseFloat(v));
types.setTypeParser(20, (v: string) => Number(v));

let pool: Pool | undefined;
export function getPool(): Pool {
  pool ??= new Pool({
    connectionString: databaseUrl(), max: 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000,
    ssl: getEnv().DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
  });
  return pool;
}

export type Db = Pick<PoolClient, 'query'>;

/** Runs one SQL statement with $1,$2… parameters (never build SQL by joining user text – that is how SQL injection happens). */
export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = [], db?: Db): Promise<T[]> {
  try {
    return (await (db ?? getPool()).query<T>(text, params)).rows;
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError('STORAGE_ERROR', 'A database error occurred.', 500, { sqlState: (e as { code?: string }).code }, e);
  }
}

/** Runs several statements as ONE all-or-nothing unit (BEGIN … COMMIT, ROLLBACK on any error). */
export async function tx<T>(fn: (db: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    if (e instanceof AppError) throw e;
    throw new AppError('STORAGE_ERROR', 'A database error occurred.', 500, { sqlState: (e as { code?: string }).code }, e);
  } finally {
    client.release();
  }
}
