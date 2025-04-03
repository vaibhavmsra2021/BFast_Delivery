import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './db';

// Run migrations
async function runMigrations() {
  console.log('Running migrations...');
  
  try {
    // Drop all tables to start fresh
    await db.execute(/*sql*/`
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS clients CASCADE;
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS token_blacklist CASCADE;
      DROP TABLE IF EXISTS shiprocket_data CASCADE;
    `);
    
    // Create tables from schema
    await db.execute(/*sql*/`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        client_id TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL UNIQUE,
        client_name TEXT NOT NULL,
        shopify_store_id TEXT NOT NULL,
        shopify_api_key TEXT NOT NULL,
        shopify_api_secret TEXT NOT NULL,
        shiprocket_api_key TEXT NOT NULL,
        logo_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        shopify_store_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        order_id TEXT NOT NULL UNIQUE,
        fulfillment_status TEXT NOT NULL,
        pickup_date TIMESTAMP,
        shipping_details JSONB NOT NULL,
        product_details JSONB NOT NULL,
        courier TEXT,
        awb TEXT,
        delivery_status TEXT,
        last_scan_location TEXT,
        last_timestamp TIMESTAMP,
        last_remark TEXT
      );
      
      CREATE TABLE IF NOT EXISTS token_blacklist (
        id SERIAL PRIMARY KEY,
        token TEXT NOT NULL UNIQUE,
        expiry TIMESTAMP NOT NULL
      );
      
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
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  } finally {
    // Close the pool connection
    await pool.end();
  }
}

// Run the migrations
runMigrations().catch(console.error);