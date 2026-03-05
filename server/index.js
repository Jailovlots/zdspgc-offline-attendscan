import express from 'express';
import cors from 'cors';
import db, { initDb } from './db.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize Database before starting server
initDb();

// --- Auth Routes ---
app.post('/api/login', async (req, res) => {
  const { loginId, password, role } = req.body;
  let userResult;

  try {
    if (role === 'admin') {
      userResult = await db.query('SELECT * FROM users WHERE email = $1 AND password = $2 AND role = $3', [loginId, password, 'admin']);
    } else {
      userResult = await db.query('SELECT * FROM users WHERE email = $1 AND password = $2 AND role = $3', [loginId, password, 'student']);
    }

    if (userResult.rows.length > 0) {
      res.json(userResult.rows[0]);
    } else {
      res.status(401).json({ error: 'Invalid credentials or role mismatch' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/register', async (req, res) => {
  const u = req.body;
  try {
    await db.query(`
      INSERT INTO users (
        studentId, firstName, lastName, middleName, suffix, email, 
        course, yearLevel, section, gender, phone, birthday, 
        address, city, province, zipCode, semester, schoolYear, 
        enrollmentStatus, guardianName, guardianPhone, guardianRelation, 
        role, password
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
    `, [
      u.studentId, u.firstName, u.lastName, u.middleName || '', u.suffix || '', u.email || '',
      u.course, u.yearLevel, u.section, u.gender, u.phone || '', u.birthday || '',
      u.address || '', u.city || '', u.province || '', u.zipCode || '', u.semester || '', u.schoolYear || '',
      u.enrollmentStatus || '', u.guardianName || '', u.guardianPhone || '', u.guardianRelation || '',
      u.role || 'student', u.password
    ]);
    res.json({ success: true });
  } catch (err) {
    // PostgreSQL unique violation error code is 23505
    if (err.code === '23505') {
      res.status(400).json({ error: 'User with this ID already exists.' });
    } else {
      res.status(400).json({ error: err.message });
    }
  }
});

app.get('/api/students', async (req, res) => {
  try {
    const studentsResult = await db.query('SELECT * FROM users WHERE role = $1', ['student']);
    res.json(studentsResult.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/students/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const userResult = await db.query('SELECT * FROM users WHERE studentId = $1', [id]);
    if (userResult.rows.length > 0) {
      res.json(userResult.rows[0]);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/students/:id', async (req, res) => {
  const { id } = req.params;
  const u = req.body;
  try {
    await db.query(`
      UPDATE users SET 
        firstName = $1, lastName = $2, middleName = $3, suffix = $4, email = $5,
        course = $6, yearLevel = $7, section = $8, gender = $9, phone = $10, 
        birthday = $11, address = $12, city = $13, province = $14, zipCode = $15, 
        semester = $16, schoolYear = $17, enrollmentStatus = $18, guardianName = $19, 
        guardianPhone = $20, guardianRelation = $21, password = $22
      WHERE studentId = $23
    `, [
      u.firstName, u.lastName, u.middleName || '', u.suffix || '', u.email || '',
      u.course, u.yearLevel, u.section, u.gender, u.phone || '',
      u.birthday || '', u.address || '', u.city || '', u.province || '', u.zipCode || '',
      u.semester || '', u.schoolYear || '', u.enrollmentStatus || '', u.guardianName || '',
      u.guardianPhone || '', u.guardianRelation || '', u.password, id
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE studentId = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Sections Routes ---
app.get('/api/sections', async (req, res) => {
  try {
    const sectionsResult = await db.query('SELECT * FROM sections');
    const grouped = {};
    sectionsResult.rows.forEach(s => {
      if (!grouped[s.course]) grouped[s.course] = {};
      if (!grouped[s.course][s.year]) grouped[s.course][s.year] = [];
      grouped[s.course][s.year].push(s.section);
    });
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sections', async (req, res) => {
  const { course, year, section } = req.body;
  try {
    await db.query('INSERT INTO sections (course, year, section) VALUES ($1, $2, $3)', [course, year, section]);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/sections/bulk', async (req, res) => {
  const sections = req.body;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM sections');

    for (const [course, years] of Object.entries(sections)) {
      for (const [year, sctns] of Object.entries(years)) {
        for (const s of sctns) {
          await client.query('INSERT INTO sections (course, year, section) VALUES ($1, $2, $3)', [course, year, s]);
        }
      }
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.delete('/api/sections', async (req, res) => {
  const { course, year, section } = req.body;
  try {
    await db.query('DELETE FROM sections WHERE course = $1 AND year = $2 AND section = $3', [course, year, section]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/sections/rename', async (req, res) => {
  const { oldName, newName, type, course, year } = req.body;
  try {
    if (type === 'course') {
      await db.query('UPDATE sections SET course = $1 WHERE course = $2', [newName, oldName]);
    } else if (type === 'section') {
      await db.query('UPDATE sections SET section = $1 WHERE section = $2 AND course = $3 AND year = $4', [newName, oldName, course, year]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Events Routes ---
app.get('/api/events', async (req, res) => {
  try {
    const eventsResult = await db.query('SELECT * FROM events');
    eventsResult.rows.forEach(e => {
      e.targetCourses = JSON.parse(e.targetcourses || e.targetCourses || '[]');
    });
    res.json(eventsResult.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events', async (req, res) => {
  const event = req.body;
  try {
    // PostgreSQL uses INSERT ... ON CONFLICT DO UPDATE instead of INSERT OR REPLACE
    await db.query(`
      INSERT INTO events (id, name, date, time, location, description, category, targetCourses, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        date = EXCLUDED.date,
        time = EXCLUDED.time,
        location = EXCLUDED.location,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        targetCourses = EXCLUDED.targetCourses,
        status = EXCLUDED.status
    `, [event.id, event.name, event.date, event.time, event.location, event.description, event.category, JSON.stringify(event.targetCourses), event.status]);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM events WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Attendance Routes ---
app.get('/api/attendance', async (req, res) => {
  try {
    const recordsResult = await db.query('SELECT * FROM attendance ORDER BY timestamp DESC');
    res.json(recordsResult.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attendance', async (req, res) => {
  const r = req.body;
  try {
    await db.query(`
      INSERT INTO attendance (studentId, name, course, section, gender, time, status, eventId, eventName, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [r.id, r.name, r.course, r.section, r.gender, r.time, r.status, r.eventId, r.eventName, r.timestamp]);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/attendance/clear', async (req, res) => {
  try {
    await db.query('DELETE FROM attendance');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Migration Route ---
app.post('/api/migrate', async (req, res) => {
  const { users, sections, events, attendance } = req.body;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    if (users) {
      for (const u of users) {
        await client.query(`
          INSERT INTO users (
            studentId, firstName, lastName, middleName, suffix, email, 
            course, yearLevel, section, gender, phone, birthday, 
            address, city, province, zipCode, semester, schoolYear, 
            enrollmentStatus, guardianName, guardianPhone, guardianRelation, 
            role, password
          ) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
          ON CONFLICT (studentId) DO NOTHING
        `, [
          u.studentId, u.firstName, u.lastName, u.middleName || '', u.suffix || '', u.email || '',
          u.course, u.yearLevel, u.section, u.gender, u.phone || '', u.birthday || '',
          u.address || '', u.city || '', u.province || '', u.zipCode || '', u.semester || '', u.schoolYear || '',
          u.enrollmentStatus || '', u.guardianName || '', u.guardianPhone || '', u.guardianRelation || '',
          u.role || 'student', u.password
        ]);
      }
    }

    if (sections) {
      for (const [course, years] of Object.entries(sections)) {
        for (const [year, sctns] of Object.entries(years)) {
          for (const s of sctns) {
            // Postgres unique constraint
            await client.query(`
               INSERT INTO sections (course, year, section) 
               VALUES ($1, $2, $3)
               ON CONFLICT (course, year, section) DO NOTHING
            `, [course, year, s]);
          }
        }
      }
    }

    if (events) {
      for (const e of events) {
        await client.query(`
            INSERT INTO events (id, name, date, time, location, description, category, targetCourses, status) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO NOTHING
        `, [e.id, e.name, e.date, e.time, e.location, e.description, e.category, JSON.stringify(e.targetCourses), e.status]);
      }
    }

    if (attendance) {
      for (const r of attendance) {
        // No unique constraint besides ID, so just insert
        await client.query(`
            INSERT INTO attendance (studentId, name, course, section, gender, time, status, eventId, eventName, timestamp) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         `, [r.id, r.name, r.course, r.section, r.gender, r.time, r.status, r.eventId, r.eventName, r.timestamp]);
      }
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
