import pg from 'pg';
import { execSync } from 'child_process';

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
  pool = new Pool({
    host: '34.93.26.233',
    port: 5432,
    user: 'postgres',
    password: password,
    database: 'postgres',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: {
      rejectUnauthorized: false
    }
  });

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
