import db from './db.js';

async function listTables() {
  try {
    console.log('Listing all tables...');
    const result = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables:');
    result.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Failed to list tables:', err);
    process.exit(1);
  }
}

listTables();
