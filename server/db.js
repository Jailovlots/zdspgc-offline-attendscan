import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Assuming postgres is running locally on default port 5432
// We use the database name "scanner_db" as requested by the user
// Connection configuration
const poolConfig = process.env.DATABASE_URL
  ? { 
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    }
  : {
      user: process.env.PGUSER || 'postgres',
      host: process.env.PGHOST || 'localhost',
      database: process.env.PGDATABASE || 'scanner_db',
      password: process.env.PGPASSWORD || 'hadzmie0104',
      port: process.env.PGPORT || 5432,
    };

if (process.env.DATABASE_URL) {
  console.log('Database connecting via DATABASE_URL');
} else if (process.env.PGHOST) {
  console.log(`Database connecting to ${process.env.PGHOST}`);
} else {
  console.warn('No database environment variables found. Falling back to localhost:5432');
}

const db = new Pool(poolConfig);

// Initialize database schema
export const initDb = async () => {
  try {
    // 1. Initial table creation for users
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        studentid TEXT PRIMARY KEY,
        firstname TEXT NOT NULL,
        lastname TEXT NOT NULL,
        middlename TEXT,
        suffix TEXT,
        email TEXT,
        course TEXT NOT NULL,
        yearlevel TEXT NOT NULL,
        section TEXT NOT NULL,
        gender TEXT NOT NULL,
        phone TEXT,
        birthday TEXT,
        address TEXT,
        city TEXT,
        province TEXT,
        zipcode TEXT,
        semester TEXT,
        schoolyear TEXT,
        enrollmentstatus TEXT,
        guardianname TEXT,
        guardianphone TEXT,
        guardianrelation TEXT,
        role TEXT NOT NULL DEFAULT 'student',
        password TEXT NOT NULL
      );
    `);

    // 2. Migration: Ensure studentid is lowercase if it was created as studentId (quoted)
    try {
      await db.query('ALTER TABLE users RENAME COLUMN "studentId" TO studentid');
      console.log('Migrated users table column "studentId" to "studentid"');
    } catch (e) {
      // Ignore if column doesn't exist or already lowercase
    }

    // 3. Create other tables
    await db.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL DEFAULT 'officer',
        password TEXT NOT NULL,
        createdat TEXT NOT NULL
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS sections (
        id SERIAL PRIMARY KEY,
        course TEXT NOT NULL,
        year TEXT NOT NULL,
        section TEXT NOT NULL,
        UNIQUE(course, year, section)
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        location TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        targetcourses TEXT,
        status TEXT NOT NULL
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        studentid TEXT NOT NULL,
        name TEXT NOT NULL,
        course TEXT NOT NULL,
        section TEXT NOT NULL,
        gender TEXT NOT NULL,
        time TEXT NOT NULL,
        status TEXT NOT NULL,
        eventid TEXT NOT NULL,
        eventname TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        FOREIGN KEY(studentid) REFERENCES users(studentid)
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        schoolname TEXT NOT NULL,
        academicyear TEXT NOT NULL,
        semester TEXT NOT NULL,
        latethreshold TEXT NOT NULL,
        CONSTRAINT one_row CHECK (id = 1)
      );
    `);

    // Initialize default settings if missing
    const settingsCheck = await db.query('SELECT 1 FROM settings WHERE id = 1');
    if (settingsCheck.rows.length === 0) {
      await db.query(`
        INSERT INTO settings (id, schoolname, academicyear, semester, latethreshold)
        VALUES (1, 'Zamboanga del Sur Provincial Government College', '2024-2025', '2nd', '08:30')
      `);
      console.log('Default system settings initialized');
    }

    console.log('PostgreSQL Database schema initialized');
  } catch (err) {
    console.error('Error initializing database schema:', err);
    throw err;
  }
};

export default db;
