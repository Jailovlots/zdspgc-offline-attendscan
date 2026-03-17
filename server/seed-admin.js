import db from './db.js';

async function seedAdmin() {
  const adminEmail = 'admin@zdspgc.edu.ph';
  const adminPassword = 'admin123';
  const adminName = 'System Admin';
  const adminRole = 'superadmin';

  try {
    console.log('Checking for existing admin...');
    const result = await db.query('SELECT * FROM admins WHERE email = $1', [adminEmail]);

    if (result.rows.length === 0) {
      console.log('Seeding new admin account...');
      await db.query(`
        INSERT INTO admins (name, email, role, password, createdat)
        VALUES ($1, $2, $3, $4, $5)
      `, [adminName, adminEmail, adminRole, adminPassword, new Date().toISOString()]);
      console.log('Admin account created successfully!');
    } else {
      console.log('Admin account already exists.');
    }
    
    // Also ensure the user exists in the users table with role 'admin' for backward compatibility
    console.log('Checking users table for admin...');
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [adminEmail]);
    if (userResult.rows.length === 0) {
      console.log('Creating admin in users table...');
      await db.query(`
        INSERT INTO users (
          studentid, firstname, lastname, email, course, yearlevel, section, gender, role, password
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, ['ADMIN-001', 'System', 'Admin', adminEmail, 'N/A', 'N/A', 'N/A', 'Male', 'admin', adminPassword]);
      console.log('Admin added to users table.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error seeding admin:', err);
    process.exit(1);
  }
}

seedAdmin();
