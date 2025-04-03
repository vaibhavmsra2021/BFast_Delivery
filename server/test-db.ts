import { db, pool } from './db';
import { sql } from 'drizzle-orm';

console.log('Testing database connection...');

async function testConnection() {
  try {
    // Check if the database connection is working
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('Database connection successful:', result.rows[0].current_time);
    
    // Test if we can access the database schema
    console.log('Testing schema access...');
    const userCount = await db.execute(sql`SELECT COUNT(*) FROM users`);
    console.log('User count:', userCount);
    
    // Close the connection pool
    await pool.end();
    console.log('Database pool closed');
  } catch (error) {
    console.error('Database connection error:', error);
  }
}

// Run the test
testConnection().catch(console.error);