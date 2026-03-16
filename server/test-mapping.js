import db from './db.js';

const mapAttendance = (row) => ({
  id: row.id,
  studentId: row.studentid ?? row.studentId,
  name: row.name ?? '',
  course: row.course ?? '',
  section: row.section ?? '',
  gender: row.gender ?? '',
  time: row.time ?? '',
  status: row.status ?? 'Present',
  eventId: row.eventid ?? row.eventId ?? '',
  eventName: row.eventname ?? row.eventName ?? '',
  timestamp: row.timestamp ? parseInt(row.timestamp, 10) : Date.now(),
});

async function test() {
  try {
    console.log('Testing Attendance Mapping...');
    const recordsResult = await db.query('SELECT * FROM attendance ORDER BY timestamp DESC');
    const mappedRecords = recordsResult.rows.map(mapAttendance);
    console.log('Mapped Attendance records:', mappedRecords.length);
    if (mappedRecords.length > 0) console.log('First record:', mappedRecords[0]);

    console.log('Testing Events Mapping...');
    const eventsResult = await db.query('SELECT * FROM events');
    eventsResult.rows.forEach(e => {
      e.targetCourses = JSON.parse(e.targetcourses || e.targetCourses || '[]');
    });
    console.log('Mapped Events:', eventsResult.rows.length);

    console.log('All mappings successful');
    process.exit(0);
  } catch (err) {
    console.error('Mapping test failed:', err);
    process.exit(1);
  }
}

test();
