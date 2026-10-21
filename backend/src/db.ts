import { MongoClient, type Db } from 'mongodb';

let client: MongoClient | undefined;

function dbNameFromUri(uri: string): string | undefined {
  const name = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]*\/([^?]*)/)?.[1];
  return name ? decodeURIComponent(name) : undefined;
}

export function getDb(): Db {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error('MONGODB_URI is not set (see .env.example)');
  client ??= new MongoClient(uri, { appName: 'sahi-sahi-forms', maxPoolSize: 5, serverSelectionTimeoutMS: 10_000 });
  return client.db(process.env.MONGODB_DB_NAME?.trim() || dbNameFromUri(uri) || 'sahisahi');
}

export async function closeDb(): Promise<void> {
  const c = client;
  client = undefined;
  await c?.close();
}
