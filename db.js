import pg from 'pg';
import { execFile } from 'child_process';
import fs from 'fs';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const { Pool } = pg;
let pool = null;

async function getDbPassword() {
  if (process.env.DB_PASSWORD) {
    return process.env.DB_PASSWORD;
  }
  try {
    console.log("Fetching DB_PASSWORD from Secret Manager via gcloud...");
    const { stdout } = await execFileAsync('gcloud', [
      'secrets', 'versions', 'access', 'latest',
      '--secret=DB_PASSWORD',
      '--project=ai-deployment-project-492711'
    ], { encoding: 'utf8' });
    return stdout.trim();
  } catch (err) {
    console.error("Error fetching password from Secret Manager:", err.message);
    throw new Error("Could not retrieve DB_PASSWORD from Secret Manager. Ensure gcloud is configured.", { cause: err });
  }
}

let poolPromise = null;

export async function getPool() {
  if (poolPromise) return poolPromise;

  poolPromise = (async () => {
    const password = await getDbPassword();
  const socketPath = '/cloudsql/ai-deployment-project-492711:asia-south1:my-pg-db';
  const useSocket = fs.existsSync(socketPath);

  const config = {
    port: 5432,
    user: 'postgres',
    password: password,
    database: 'postgres',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  };

  if (useSocket) {
    console.log("Production connection: using Cloud SQL Unix socket path:", socketPath);
    config.host = socketPath;
    // Unix socket connections are secure locally by default and do not require SSL wrapping
    config.ssl = false;
  } else {
    const dbHost = process.env.DB_HOST || '127.0.0.1';
    console.log(`Local connection: using DB_HOST: ${dbHost}`);
    config.host = dbHost;
    
    // Gate disabling SSL verification explicitly on local dev
    if (process.env.NODE_ENV === 'development' || dbHost === '127.0.0.1' || dbHost === 'localhost') {
      config.ssl = false; // Local DBs usually don't support SSL at all
    } else {
      config.ssl = { rejectUnauthorized: true }; // Enforce strict TLS validation
    }
  }

  const pool = new Pool(config);
  return pool;
  })();
  
  return poolPromise;
}

export async function runMigrations() {
  const dbPool = await getPool();
  const client = await dbPool.connect();
  try {
    console.log("Running database migrations...");
    
    // Create settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        user_id VARCHAR(255) NOT NULL,
        key VARCHAR(100),
        value JSONB NOT NULL,
        PRIMARY KEY (user_id, key)
      );
    `);

    // Create mood logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS mood_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        mood VARCHAR(50) NOT NULL,
        energy INTEGER NOT NULL,
        stress INTEGER NOT NULL,
        tags TEXT[] NOT NULL,
        logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create journals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS journals (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        sentiment VARCHAR(50) NOT NULL,
        stress_score INTEGER NOT NULL,
        triggers TEXT[] NOT NULL,
        cognitive_distortions TEXT[] NOT NULL,
        logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create chats table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Alter existing tables to add user_id if they exist from before
    const tables = ['settings', 'mood_logs', 'journals', 'chats'];
    for (const table of tables) {
      await client.query(`
        ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) DEFAULT 'legacy_user';
      `);
      if (table !== 'settings') {
        // Ensure user_id is indexed for performance
        await client.query(`CREATE INDEX IF NOT EXISTS idx_${table}_user_id ON ${table} (user_id);`);
      }
    }

    // Performance Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mood_logs_logged_at ON mood_logs (logged_at DESC);
      CREATE INDEX IF NOT EXISTS idx_journals_logged_at ON journals (logged_at DESC);
      CREATE INDEX IF NOT EXISTS idx_chats_logged_at ON chats (logged_at DESC);
    `);

    console.log("Database migrations completed successfully.");
  } catch (err) {
    console.error("Database migrations failed:", err.message);
    throw err;
  } finally {
    client.release();
  }
}
