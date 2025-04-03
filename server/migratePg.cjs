const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function runMigration() {
  console.log('Starting database migration...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');
    
    // Create tables
    await createUsersTable(client);
    await createClientsTable(client);
    await createOrdersTable(client);
    await createTokenBlacklistTable(client);
    await createShiprocketDataTable(client);
    
    // Add admin user if it doesn't exist
    await createAdminUser(client);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

async function createUsersTable(client) {
  console.log('Creating users table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      client_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function createClientsTable(client) {
  console.log('Creating clients table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      client_id TEXT NOT NULL UNIQUE,
      client_name TEXT NOT NULL,
      shopify_store_id TEXT,
      shopify_api_key TEXT,
      shopify_api_secret TEXT,
      shiprocket_api_key TEXT,
      logo_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function createOrdersTable(client) {
  console.log('Creating orders table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      client_id TEXT NOT NULL,
      shopify_store_id TEXT NOT NULL,
      order_id TEXT NOT NULL UNIQUE,
      fulfillment_status TEXT NOT NULL,
      shipping_name TEXT,
      shipping_email TEXT,
      shipping_phone TEXT,
      shipping_address TEXT,
      shipping_city TEXT,
      shipping_state TEXT,
      shipping_pincode TEXT,
      shipping_phone_2 TEXT,
      shipping_method TEXT,
      payment_mode TEXT,
      pickup_date TEXT,
      awb TEXT,
      courier TEXT,
      order_date TIMESTAMP,
      last_remark TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function createTokenBlacklistTable(client) {
  console.log('Creating token blacklist table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS token_blacklist (
      id SERIAL PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      expiry TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function createShiprocketDataTable(client) {
  console.log('Creating shiprocket_data table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS shiprocket_data (
      id SERIAL PRIMARY KEY,
      awb TEXT,
      courier_type TEXT,
      client_order_id TEXT,
      order_confirmation TEXT,
      bfast_status TEXT,
      delivery_status TEXT,
      sale_channel TEXT,
      aggregator_partner TEXT,
      client_id TEXT,
      month TEXT,
      pickup_date TEXT,
      sale_order_number TEXT,
      order_date TEXT,
      delivery_center_name TEXT,
      transport_mode TEXT,
      payment_mode TEXT,
      cod_amount TEXT,
      customer_first_name TEXT,
      customer_last_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      shipping_address TEXT,
      customer_alt_phone TEXT,
      shipping_address_2 TEXT,
      shipping_city TEXT,
      shipping_state TEXT,
      shipping_pincode TEXT,
      item_category TEXT,
      item_sku_code TEXT,
      item_description TEXT,
      quantity TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function createAdminUser(client) {
  console.log('Checking for admin user...');
  const result = await client.query("SELECT * FROM users WHERE username = 'admin'");
  
  if (result.rows.length === 0) {
    console.log('Creating admin user...');
    const hashedPassword = await bcrypt.hash('password', 10);
    await client.query(
      'INSERT INTO users(username, password, name, email, role, client_id) VALUES($1, $2, $3, $4, $5, $6)',
      ['admin', hashedPassword, 'Admin User', 'admin@bfast.com', 'BFAST_ADMIN', null]
    );
    console.log('Admin user created');
  } else {
    console.log('Admin user already exists');
  }
}

// Create a test client for testing
async function createTestClient(client) {
  console.log('Creating test client...');
  try {
    const clientResult = await client.query("SELECT * FROM clients WHERE client_id = 'temp-test-client'");
    
    if (clientResult.rows.length === 0) {
      await client.query(
        'INSERT INTO clients(client_id, client_name, shopify_store_id, shopify_api_key, shopify_api_secret, shiprocket_api_key) VALUES($1, $2, $3, $4, $5, $6)',
        ['temp-test-client', 'Test Client', 'test-store', 'test-key', 'test-secret', 'test-shiprocket-key']
      );
      console.log('Test client created');
    } else {
      console.log('Test client already exists');
    }
  } catch (error) {
    console.error('Error creating test client:', error);
  }
}

// Run the migration
runMigration();