import db from './db.js';

async function introspect() {
  try {
    console.log('Introspecting settings table...');
    const result = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'settings'");
    console.log('Columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });

    const data = await db.query('SELECT * FROM settings');
    console.log('Data:', data.rows);

    process.exit(0);
  } catch (err) {
    console.error('Introspection failed:', err);
    process.exit(1);
  }
}

introspect();
