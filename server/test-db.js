import db from './db.js';

async function test() {
  try {
    console.log('Testing DB connection...');
    const now = await db.query('SELECT NOW()');
    console.log('DB Time:', now.rows[0].now);
    
    console.log('Checking attendance table...');
    const attendance = await db.query('SELECT COUNT(*) FROM attendance');
    console.log('Attendance count:', attendance.rows[0].count);
    
    console.log('Checking users table...');
    const users = await db.query('SELECT COUNT(*) FROM users');
    console.log('Users count:', users.rows[0].count);
    
    console.log('Checking events table...');
    const events = await db.query('SELECT COUNT(*) FROM events');
    console.log('Events count:', events.rows[0].count);
    
    console.log('DB Test successful');
    process.exit(0);
  } catch (err) {
    console.error('DB Test failed:', err);
    process.exit(1);
  }
}

test();
