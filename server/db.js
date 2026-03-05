import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Assuming postgres is running locally on default port 5432
// We use the database name "scanner_db" as requested by the user
const db = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'scanner_db',
  password: process.env.PGPASSWORD || 'hadzmie0104',
  port: process.env.PGPORT || 5432,
});

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
    `);
    console.log('PostgreSQL Database schema initialized');
  } catch (err) {
    console.error('Error initializing database schema:', err);
  }
};

export default db;
