import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Assuming postgres is running locally on default port 5432
// We use the database name "scanner_db" as requested by the user
const db = new Pool(
  process.env.DATABASE_URL
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
      }
);

// Initialize database schema
export const initDb = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        studentId TEXT PRIMARY KEY,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        middleName TEXT,
        suffix TEXT,
        email TEXT,
        course TEXT NOT NULL,
        yearLevel TEXT NOT NULL,
        section TEXT NOT NULL,
        gender TEXT NOT NULL,
        phone TEXT,
        birthday TEXT,
        address TEXT,
        city TEXT,
        province TEXT,
        zipCode TEXT,
        semester TEXT,
        schoolYear TEXT,
        enrollmentStatus TEXT,
        guardianName TEXT,
        guardianPhone TEXT,
        guardianRelation TEXT,
        role TEXT NOT NULL DEFAULT 'student',
        password TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL DEFAULT 'officer',
        password TEXT NOT NULL,
        createdat TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sections (
        id SERIAL PRIMARY KEY,
        course TEXT NOT NULL,
        year TEXT NOT NULL,
        section TEXT NOT NULL,
        UNIQUE(course, year, section)
      );

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        location TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        targetCourses TEXT, -- JSON string array
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        studentId TEXT NOT NULL,
        name TEXT NOT NULL,
        course TEXT NOT NULL,
        section TEXT NOT NULL,
        gender TEXT NOT NULL,
        time TEXT NOT NULL,
        status TEXT NOT NULL,
        eventId TEXT NOT NULL,
        eventName TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        FOREIGN KEY(studentId) REFERENCES users(studentId)
      );

      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        schoolName TEXT NOT NULL,
        academicYear TEXT NOT NULL,
        semester TEXT NOT NULL,
        lateThreshold TEXT NOT NULL,
        CONSTRAINT one_row CHECK (id = 1)
      );
    `);

    // Initialize default settings if missing
    const settingsCheck = await db.query('SELECT 1 FROM settings WHERE id = 1');
    if (settingsCheck.rows.length === 0) {
      await db.query(`
        INSERT INTO settings (id, schoolName, academicYear, semester, lateThreshold)
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
