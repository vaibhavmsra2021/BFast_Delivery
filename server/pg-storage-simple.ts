import { 
  InsertUser, User, 
  InsertClient, Client, 
  InsertOrder, Order, 
  InsertToken, TokenBlacklist,
  ShiprocketData
} from '@shared/schema';
import { IStorage } from './storage';
import { Client as PgClient } from 'pg';
import * as bcrypt from 'bcrypt';

export class PgStorage implements IStorage {
  private client: PgClient;
  private shiprocketData: ShiprocketData[] = [];

  constructor() {
    this.client = new PgClient({
      connectionString: process.env.DATABASE_URL,
    });
    this.init();
  }

  private async init() {
    try {
      await this.client.connect();
      console.log('Connected to PostgreSQL database');
      
      // Create tables if they don't exist
      await this.createUsersTable();
      await this.createClientsTable();
      await this.createOrdersTable();
      await this.createTokenBlacklistTable();
      await this.createShiprocketDataTable();
      
      // Add admin user if it doesn't exist
      const adminExists = await this.getUserByUsername('admin');
      if (!adminExists) {
        const hashedPassword = await bcrypt.hash('password', 10);
        await this.createUser({
          username: 'admin',
          password: hashedPassword,
          name: 'Admin User',
          email: 'admin@bfast.com',
          role: 'BFAST_ADMIN',
          clientId: null
        });
        console.log('Created admin user');
      }
    } catch (error) {
      console.error('Failed to initialize PostgreSQL storage:', error);
    }
  }

  private async createUsersTable() {
    await this.client.query(`
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

  private async createClientsTable() {
    await this.client.query(`
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

  private async createOrdersTable() {
    await this.client.query(`
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

  private async createTokenBlacklistTable() {
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS token_blacklist (
        id SERIAL PRIMARY KEY,
        token TEXT NOT NULL UNIQUE,
        expiry TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private async createShiprocketDataTable() {
    await this.client.query(`
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

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.client.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] as User;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.client.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0] as User;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.client.query(
      'INSERT INTO users(username, password, name, email, role, client_id) VALUES($1, $2, $3, $4, $5, $6) RETURNING *',
      [insertUser.username, insertUser.password, insertUser.name, insertUser.email, insertUser.role, insertUser.clientId]
    );
    return result.rows[0] as User;
  }

  async getUsersByClientId(clientId: string): Promise<User[]> {
    const result = await this.client.query('SELECT * FROM users WHERE client_id = $1', [clientId]);
    return result.rows as User[];
  }

  // Client operations
  async getClient(id: number): Promise<Client | undefined> {
    const result = await this.client.query('SELECT * FROM clients WHERE id = $1', [id]);
    return result.rows[0] as Client;
  }

  async getClientByClientId(clientId: string): Promise<Client | undefined> {
    const result = await this.client.query('SELECT * FROM clients WHERE client_id = $1', [clientId]);
    return result.rows[0] as Client;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const result = await this.client.query(
      'INSERT INTO clients(client_id, client_name, shopify_store_id, shopify_api_key, shopify_api_secret, shiprocket_api_key, logo_url) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [
        insertClient.clientId, 
        insertClient.clientName, 
        insertClient.shopifyStoreId, 
        insertClient.shopifyApiKey, 
        insertClient.shopifyApiSecret, 
        insertClient.shiprocketApiKey, 
        insertClient.logoUrl
      ]
    );
    return result.rows[0] as Client;
  }

  async updateClient(id: number, clientUpdate: Partial<InsertClient>): Promise<Client> {
    const client = await this.getClient(id);
    if (!client) {
      throw new Error('Client not found');
    }

    // Build the update query dynamically based on which fields are present
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (clientUpdate.clientName !== undefined) {
      updateFields.push(`client_name = $${paramIndex++}`);
      values.push(clientUpdate.clientName);
    }
    if (clientUpdate.shopifyStoreId !== undefined) {
      updateFields.push(`shopify_store_id = $${paramIndex++}`);
      values.push(clientUpdate.shopifyStoreId);
    }
    if (clientUpdate.shopifyApiKey !== undefined) {
      updateFields.push(`shopify_api_key = $${paramIndex++}`);
      values.push(clientUpdate.shopifyApiKey);
    }
    if (clientUpdate.shopifyApiSecret !== undefined) {
      updateFields.push(`shopify_api_secret = $${paramIndex++}`);
      values.push(clientUpdate.shopifyApiSecret);
    }
    if (clientUpdate.shiprocketApiKey !== undefined) {
      updateFields.push(`shiprocket_api_key = $${paramIndex++}`);
      values.push(clientUpdate.shiprocketApiKey);
    }
    if (clientUpdate.logoUrl !== undefined) {
      updateFields.push(`logo_url = $${paramIndex++}`);
      values.push(clientUpdate.logoUrl);
    }

    // Add the id as the last parameter
    values.push(id);

    const query = `UPDATE clients SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.client.query(query, values);
    return result.rows[0] as Client;
  }

  async getAllClients(): Promise<Client[]> {
    const result = await this.client.query('SELECT * FROM clients');
    return result.rows as Client[];
  }

  // Order operations
  async getOrder(id: number): Promise<Order | undefined> {
    const result = await this.client.query('SELECT * FROM orders WHERE id = $1', [id]);
    return result.rows[0] as Order;
  }

  async getOrderByOrderId(orderId: string): Promise<Order | undefined> {
    const result = await this.client.query('SELECT * FROM orders WHERE order_id = $1', [orderId]);
    return result.rows[0] as Order;
  }

  async getOrderByAWB(awb: string): Promise<Order | undefined> {
    const result = await this.client.query('SELECT * FROM orders WHERE awb = $1', [awb]);
    return result.rows[0] as Order;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    // Extract shipping details
    const shippingDetails = insertOrder.shippingDetails || {};
    
    const result = await this.client.query(
      `INSERT INTO orders(
        client_id, shopify_store_id, order_id, fulfillment_status, 
        shipping_name, shipping_email, shipping_phone, shipping_address, 
        shipping_city, shipping_state, shipping_pincode, shipping_phone_2,
        shipping_method, payment_mode, pickup_date, awb, 
        courier, order_date, last_remark
      ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *`,
      [
        insertOrder.clientId, 
        insertOrder.shopifyStoreId, 
        insertOrder.orderId, 
        insertOrder.fulfillmentStatus,
        shippingDetails.name, 
        shippingDetails.email, 
        shippingDetails.phone_1, 
        shippingDetails.address,
        shippingDetails.city, 
        shippingDetails.state, 
        shippingDetails.pincode, 
        shippingDetails.phone_2,
        insertOrder.shippingMethod, 
        insertOrder.paymentMode, 
        insertOrder.pickupDate, 
        insertOrder.awb,
        insertOrder.courier, 
        insertOrder.orderDate, 
        insertOrder.lastRemark
      ]
    );
    return result.rows[0] as Order;
  }

  async updateOrder(id: number, orderUpdate: Partial<InsertOrder>): Promise<Order> {
    const order = await this.getOrder(id);
    if (!order) {
      throw new Error('Order not found');
    }

    // Build the update query dynamically based on which fields are present
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    // Helper function to add fields to the update query
    const addField = (fieldName: string, value: any) => {
      if (value !== undefined) {
        updateFields.push(`${fieldName} = $${paramIndex++}`);
        values.push(value);
      }
    };

    // Add basic fields
    addField('client_id', orderUpdate.clientId);
    addField('shopify_store_id', orderUpdate.shopifyStoreId);
    addField('order_id', orderUpdate.orderId);
    addField('fulfillment_status', orderUpdate.fulfillmentStatus);
    addField('shipping_method', orderUpdate.shippingMethod);
    addField('payment_mode', orderUpdate.paymentMode);
    addField('pickup_date', orderUpdate.pickupDate);
    addField('awb', orderUpdate.awb);
    addField('courier', orderUpdate.courier);
    addField('order_date', orderUpdate.orderDate);
    addField('last_remark', orderUpdate.lastRemark);

    // Add shipping details if present
    if (orderUpdate.shippingDetails) {
      const shippingDetails = orderUpdate.shippingDetails;
      addField('shipping_name', shippingDetails.name);
      addField('shipping_email', shippingDetails.email);
      addField('shipping_phone', shippingDetails.phone_1);
      addField('shipping_address', shippingDetails.address);
      addField('shipping_city', shippingDetails.city);
      addField('shipping_state', shippingDetails.state);
      addField('shipping_pincode', shippingDetails.pincode);
      addField('shipping_phone_2', shippingDetails.phone_2);
    }

    // If no fields to update, return the current order
    if (updateFields.length === 0) {
      return order;
    }

    // Add the id as the last parameter
    values.push(id);

    const query = `UPDATE orders SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.client.query(query, values);
    return result.rows[0] as Order;
  }

  async getPendingOrders(clientId?: string): Promise<Order[]> {
    let query = 'SELECT * FROM orders WHERE awb IS NULL OR awb = \'\'';
    const values = [];

    if (clientId) {
      query += ' AND client_id = $1';
      values.push(clientId);
    }

    const result = await this.client.query(query, values);
    return result.rows as Order[];
  }

  async getOrdersByStatus(status: string, clientId?: string): Promise<Order[]> {
    let query = 'SELECT * FROM orders WHERE fulfillment_status = $1';
    const values = [status];

    if (clientId) {
      query += ' AND client_id = $2';
      values.push(clientId);
    }

    const result = await this.client.query(query, values);
    return result.rows as Order[];
  }

  async getAllOrders(clientId?: string): Promise<Order[]> {
    let query = 'SELECT * FROM orders';
    const values = [];

    if (clientId) {
      query += ' WHERE client_id = $1';
      values.push(clientId);
    }

    const result = await this.client.query(query, values);
    return result.rows as Order[];
  }

  async assignAWB(orderIds: string[], awbs: string[]): Promise<void> {
    if (orderIds.length !== awbs.length) {
      throw new Error("Mismatch between order IDs and AWBs");
    }

    for (let i = 0; i < orderIds.length; i++) {
      const orderId = orderIds[i];
      const awb = awbs[i];

      await this.client.query(
        'UPDATE orders SET awb = $1, fulfillment_status = $2 WHERE order_id = $3',
        [awb, 'In Transit', orderId]
      );
    }
  }

  async bulkUpdateOrders(updates: Array<{ orderId: string, data: Partial<InsertOrder> }>): Promise<void> {
    for (const update of updates) {
      const order = await this.getOrderByOrderId(update.orderId);
      if (order) {
        await this.updateOrder(order.id, update.data);
      }
    }
  }

  // Token blacklist operations
  async addTokenToBlacklist(insertToken: InsertToken): Promise<void> {
    await this.client.query(
      'INSERT INTO token_blacklist(token, expiry) VALUES($1, $2)',
      [insertToken.token, insertToken.expiry]
    );
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await this.client.query('SELECT * FROM token_blacklist WHERE token = $1', [token]);
    return result.rows.length > 0;
  }

  // Shiprocket CSV data operations
  async saveShiprocketData(data: ShiprocketData[]): Promise<void> {
    // First, clear existing data
    await this.client.query('DELETE FROM shiprocket_data');
    
    // Insert new data
    for (const item of data) {
      await this.client.query(
        `INSERT INTO shiprocket_data(
          awb, courier_type, client_order_id, order_confirmation, bfast_status,
          delivery_status, sale_channel, aggregator_partner, client_id, month,
          pickup_date, sale_order_number, order_date, delivery_center_name, transport_mode,
          payment_mode, cod_amount, customer_first_name, customer_last_name, customer_email,
          customer_phone, shipping_address, customer_alt_phone, shipping_address_2, shipping_city,
          shipping_state, shipping_pincode, item_category, item_sku_code, item_description, quantity
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)`,
        [
          item.awb, item.courier_type, item.client_order_id, item.order_confirmation, item.bfast_status,
          item.delivery_status, item.sale_channel, item.aggregator_partner, item.client_id, item.month,
          item.pickup_date, item.sale_order_number, item.order_date, item.delivery_center_name, item.transport_mode,
          item.payment_mode, item.cod_amount, item.customer_first_name, item.customer_last_name, item.customer_email,
          item.customer_phone, item.shipping_address, item.customer_alt_phone, item.shipping_address_2, item.shipping_city,
          item.shipping_state, item.shipping_pincode, item.item_category, item.item_sku_code, item.item_description, item.quantity
        ]
      );
    }
  }

  async getShiprocketData(filters?: Record<string, string>): Promise<ShiprocketData[]> {
    if (!filters || Object.keys(filters).length === 0) {
      const result = await this.client.query('SELECT * FROM shiprocket_data');
      return result.rows as ShiprocketData[];
    }
    
    // Build the query with filters
    const conditions = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(filters)) {
      conditions.push(`${key} ILIKE $${paramIndex++}`);
      values.push(`%${value}%`);
    }
    
    const query = `SELECT * FROM shiprocket_data WHERE ${conditions.join(' AND ')}`;
    const result = await this.client.query(query, values);
    return result.rows as ShiprocketData[];
  }
}

export const pgStorage = new PgStorage();