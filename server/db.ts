import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Client } = pkg;
import * as schema from '../shared/schema';
import { eq, and, or, like } from 'drizzle-orm';

export async function createDbClient() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  await client.connect();
  return client;
}

export async function getDb() {
  const client = await createDbClient();
  return drizzle(client, { schema });
}