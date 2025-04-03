import { createDbClient } from './db';
import { users, clients, orders, tokenBlacklist } from '@shared/schema';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Create schema for shiprocket data
const shiprocketData = pgTable('shiprocket_data', {
  id: serial('id').primaryKey(),
  awb: text('awb'),
  courier_type: text('courier_type'),
  client_order_id: text('client_order_id'),
  order_confirmation: text('order_confirmation'),
  bfast_status: text('bfast_status'),
  delivery_status: text('delivery_status'),
  sale_channel: text('sale_channel'),
  aggregator_partner: text('aggregator_partner'),
  client_id: text('client_id'),
  month: text('month'),
  pickup_date: text('pickup_date'),
  sale_order_number: text('sale_order_number'),
  order_date: text('order_date'),
  delivery_center_name: text('delivery_center_name'),
  transport_mode: text('transport_mode'),
  payment_mode: text('payment_mode'),
  cod_amount: text('cod_amount'),
  customer_first_name: text('customer_first_name'),
  customer_last_name: text('customer_last_name'),
  customer_email: text('customer_email'),
  customer_phone: text('customer_phone'),
  shipping_address: text('shipping_address'),
  customer_alt_phone: text('customer_alt_phone'),
  shipping_address_2: text('shipping_address_2'),
  shipping_city: text('shipping_city'),
  shipping_state: text('shipping_state'),
  shipping_pincode: text('shipping_pincode'),
  item_category: text('item_category'),
  item_sku_code: text('item_sku_code'),
  item_description: text('item_description'),
  quantity: text('quantity'),
  created_at: timestamp('created_at').defaultNow()
});

async function runMigration() {
  console.log('Starting database migration...');
  
  try {
    const client = await createDbClient();
    const db = drizzle(client);
    
    // Define the schema we want to migrate
    const schema = {
      users,
      clients,
      orders,
      tokenBlacklist,
      shiprocketData
    };
    
    // Create tables if they don't exist
    console.log('Creating tables if they don\'t exist...');
    
    for (const [tableName, tableSchema] of Object.entries(schema)) {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS "${tableName}" (
          ${Object.entries(tableSchema).map(([columnName, column]) => {
            if (columnName === 'id') {
              return `"id" SERIAL PRIMARY KEY`;
            }
            
            if (columnName === 'created_at') {
              return `"created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`;
            }
            
            return `"${columnName}" TEXT`;
          }).join(',\n          ')}
        )
      `;
      
      console.log(`Creating table ${tableName}...`);
      await client.query(createTableQuery);
    }
    
    console.log('Database migration completed successfully!');
    await client.end();
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
runMigration();