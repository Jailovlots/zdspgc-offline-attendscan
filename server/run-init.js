import { initDb } from './db.js';

async function runInit() {
  try {
    console.log('Running initDb...');
    await initDb();
    console.log('initDb finished.');
    process.exit(0);
  } catch (err) {
    console.error('initDb failed:', err);
    process.exit(1);
  }
}

runInit();
