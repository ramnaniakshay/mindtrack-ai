import pg from 'pg';
import { execSync } from 'child_process';
import fs from 'fs';

const { Pool } = pg;
let pool = null;

function getDbPassword() {
  if (process.env.DB_PASSWORD) {
    return process.env.DB_PASSWORD;
  }
  try {
    console.log("Fetching DB_PASSWORD from Secret Manager via gcloud...");
    const password = execSync(
      'gcloud secrets versions access latest --secret=DB_PASSWORD --project=ai-deployment-project-492711',
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    return password.trim();
  } catch (err) {
    console.error("Error fetching password from Secret Manager:", err.message);
    throw new Error("Could not retrieve DB_PASSWORD from Secret Manager. Ensure gcloud is configured.");
  }
}

export function getPool() {
  if (pool) return pool;

  const password = getDbPassword();
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
    console.log("Local connection: using Public IP: 34.93.26.233");
    config.host = '34.93.26.233';
    config.ssl = {
      rejectUnauthorized: false
    };
  }

  pool = new Pool(config);
  return pool;
}

export async function runMigrations() {
  const dbPool = getPool();
  const client = await dbPool.connect();
  try {
    console.log("Running database migrations...");
    
    // Create settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL
      );
    `);

    // Create mood logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS mood_logs (
        id SERIAL PRIMARY KEY,
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
        role VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Database migrations completed successfully.");
  } catch (err) {
    console.error("Database migrations failed:", err.message);
    throw err;
  } finally {
    client.release();
  }
}
