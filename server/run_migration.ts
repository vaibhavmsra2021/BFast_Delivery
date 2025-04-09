import { pool } from './db';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('Running migration for Shiprocket credentials...');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'migrations', 'shiprocket_email_password.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Connect to the database
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Execute the SQL commands
      await client.query(sql);
      
      await client.query('COMMIT');
      console.log('Migration completed successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Migration failed:', error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration().then(() => {
  console.log('Migration process completed');
  process.exit(0);
});