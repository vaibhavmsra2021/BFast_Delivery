import { db, pool } from "./db";
import { users, clients, orders, tokenBlacklist } from "../shared/schema";
import { UserRole } from "../shared/schema";
import { sql } from "drizzle-orm";
import * as bcrypt from "bcrypt";

export async function runMigrations() {
  try {
    console.log("Running database migrations...");
    
    // Create tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        client_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        client_id VARCHAR(255) UNIQUE NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        shopify_store_id VARCHAR(255),
        shopify_api_key VARCHAR(255),
        shopify_api_secret VARCHAR(255),
        shiprocket_api_key VARCHAR(255),
        logo_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        client_id VARCHAR(255) NOT NULL,
        shopify_store_id VARCHAR(255) NOT NULL,
        order_id VARCHAR(255) UNIQUE NOT NULL,
        fulfillment_status VARCHAR(50) NOT NULL,
        pickup_date TIMESTAMP,
        product_details JSONB NOT NULL,
        shipping_details JSONB NOT NULL,
        courier VARCHAR(255),
        awb VARCHAR(255),
        delivery_status VARCHAR(50),
        last_scan_location VARCHAR(255),
        last_timestamp TIMESTAMP,
        last_remark TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS token_blacklist (
        id SERIAL PRIMARY KEY,
        token TEXT NOT NULL,
        expiry TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS shiprocket_data (
        id SERIAL PRIMARY KEY,
        awb VARCHAR(255),
        courier_type VARCHAR(255),
        client_order_id VARCHAR(255),
        order_confirmation VARCHAR(255),
        bfast_status VARCHAR(255),
        delivery_status VARCHAR(255),
        sale_channel VARCHAR(255),
        aggregator_partner VARCHAR(255),
        client_id VARCHAR(255),
        month VARCHAR(10),
        pickup_date VARCHAR(50),
        sale_order_number VARCHAR(255),
        order_date VARCHAR(50),
        delivery_center_name VARCHAR(255),
        transport_mode VARCHAR(50),
        payment_mode VARCHAR(50),
        cod_amount VARCHAR(50),
        customer_first_name VARCHAR(255),
        customer_last_name VARCHAR(255),
        customer_email VARCHAR(255),
        customer_phone VARCHAR(50),
        shipping_address TEXT,
        customer_alt_phone VARCHAR(50),
        shipping_address_2 TEXT,
        shipping_city VARCHAR(255),
        shipping_state VARCHAR(255),
        shipping_pincode VARCHAR(50),
        item_category VARCHAR(255),
        item_sku_code VARCHAR(255),
        item_description TEXT,
        quantity VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if we need to seed initial data (if users table is empty)
    const existingUsers = await db.select().from(users);
    
    if (existingUsers.length === 0) {
      console.log("Seeding initial data...");
      
      // Create initial admin user
      const passwordHash = await bcrypt.hash("password", 10);
      
      // Insert admin user
      await db.insert(users).values({
        username: "admin",
        password: passwordHash,
        name: "Admin User",
        email: "admin@bfast.com",
        role: UserRole.BFAST_ADMIN,
        client_id: null,
        created_at: new Date()
      });
      
      // Insert a sample client
      await db.insert(clients).values({
        client_id: "ACME001",
        client_name: "ACME Corporation",
        shopify_store_id: "your-shopify-store.myshopify.com",
        shopify_api_key: "sample_api_key",
        shopify_api_secret: "sample_api_secret",
        shiprocket_api_key: "sample_shiprocket_key",
        logo_url: null,
        created_at: new Date()
      });
      
      // Insert client admin user
      await db.insert(users).values({
        username: "clientadmin",
        password: passwordHash,
        name: "Client Admin",
        email: "client@acme.com",
        role: UserRole.CLIENT_ADMIN,
        client_id: "ACME001",
        created_at: new Date()
      });
      
      // Insert executive user
      await db.insert(users).values({
        username: "executive",
        password: passwordHash,
        name: "Executive User",
        email: "executive@bfast.com",
        role: UserRole.BFAST_EXECUTIVE,
        client_id: null,
        created_at: new Date()
      });
      
      console.log("Initial data seeded successfully");
    }
    
    console.log("Database migrations completed successfully");
  } catch (error) {
    console.error("Error running migrations:", error);
    throw error;
  }
}