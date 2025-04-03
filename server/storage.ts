import { 
  User, InsertUser, 
  Client, InsertClient, 
  Order, InsertOrder, 
  TokenBlacklist, InsertToken,
  UserRole, OrderStatus,
  ShiprocketData, shiprocketDataSchema,
  shiprocketData,
  InsertShiprocketData
} from "@shared/schema";

// Modify the interface with CRUD methods needed
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersByClientId(clientId: string): Promise<User[]>;
  
  // Client operations
  getClient(id: number): Promise<Client | undefined>;
  getClientByClientId(clientId: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client>;
  getAllClients(): Promise<Client[]>;
  
  // Order operations
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByOrderId(orderId: string): Promise<Order | undefined>;
  getOrderByAWB(awb: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order>;
  getPendingOrders(clientId?: string): Promise<Order[]>;
  getOrdersByStatus(status: string, clientId?: string): Promise<Order[]>;
  getAllOrders(clientId?: string): Promise<Order[]>;
  assignAWB(orderIds: string[], awbs: string[]): Promise<void>;
  bulkUpdateOrders(updates: Array<{ orderId: string, data: Partial<InsertOrder> }>): Promise<void>;
  
  // Token blacklist operations
  addTokenToBlacklist(token: InsertToken): Promise<void>;
  isTokenBlacklisted(token: string): Promise<boolean>;
  
  // Shiprocket CSV data operations
  saveShiprocketData(data: ShiprocketData[]): Promise<void>;
  getShiprocketData(filters?: Record<string, string>): Promise<ShiprocketData[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private clients: Map<number, Client>;
  private orders: Map<number, Order>;
  private tokenBlacklist: Map<string, TokenBlacklist>;
  private shiprocketData: ShiprocketData[] = [];
  
  currentUserId: number;
  currentClientId: number;
  currentOrderId: number;
  currentTokenId: number;

  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.orders = new Map();
    this.tokenBlacklist = new Map();
    
    this.currentUserId = 1;
    this.currentClientId = 1;
    this.currentOrderId = 1;
    this.currentTokenId = 1;
    
    // Initialize with default test users with password = "password"
    const hashedPassword = "$2b$10$yY3EGjLBlbMwXhip.0AZ8Os8JyJlTGc3ivdOeGDfbnIoRgiwxoCSq";
    
    // 1. BFAST Admin
    this.createUser({
      username: "admin",
      password: hashedPassword,
      name: "Admin User",
      email: "admin@bfast.com",
      role: UserRole.BFAST_ADMIN,
      client_id: null
    });
    
    // 2. BFAST Executive
    this.createUser({
      username: "exec",
      password: hashedPassword,
      name: "Executive User",
      email: "exec@bfast.com",
      role: UserRole.BFAST_EXECUTIVE,
      client_id: null
    });
    
    // Create a test client
    const testClientData = {
      client_id: "ACME001",
      client_name: "ACME Corp",
      shopify_store_id: "acme-store",
      shopify_api_key: "test-key",
      shopify_api_secret: "test-secret",
      shiprocket_api_key: "test-key",
      logo_url: null
    };
    
    // Add the client first
    this.createClient(testClientData);
    
    // 3. Client Admin
    this.createUser({
      username: "clientadmin",
      password: hashedPassword,
      name: "Client Admin",
      email: "admin@acme.com",
      role: UserRole.CLIENT_ADMIN,
      client_id: testClientData.client_id
    });
    
    // 4. Client Executive
    this.createUser({
      username: "clientexec",
      password: hashedPassword,
      name: "Client Executive",
      email: "exec@acme.com",
      role: UserRole.CLIENT_EXECUTIVE,
      client_id: testClientData.client_id
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id, created_at: new Date() };
    this.users.set(id, user);
    return user;
  }
  
  async getUsersByClientId(clientId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.client_id === clientId,
    );
  }
  
  // Client operations
  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }
  
  async getClientByClientId(clientId: string): Promise<Client | undefined> {
    return Array.from(this.clients.values()).find(
      (client) => client.client_id === clientId,
    );
  }
  
  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = this.currentClientId++;
    const client: Client = { ...insertClient, id, created_at: new Date() };
    this.clients.set(id, client);
    return client;
  }
  
  async updateClient(id: number, clientUpdate: Partial<InsertClient>): Promise<Client> {
    const existingClient = this.clients.get(id);
    if (!existingClient) {
      throw new Error(`Client with id ${id} not found`);
    }
    
    const updatedClient = { ...existingClient, ...clientUpdate };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }
  
  async getAllClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }
  
  // Order operations
  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }
  
  async getOrderByOrderId(orderId: string): Promise<Order | undefined> {
    return Array.from(this.orders.values()).find(
      (order) => order.order_id === orderId,
    );
  }
  
  async getOrderByAWB(awb: string): Promise<Order | undefined> {
    return Array.from(this.orders.values()).find(
      (order) => order.awb === awb,
    );
  }
  
  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = this.currentOrderId++;
    const created_at = new Date();
    const order: Order = { ...insertOrder, id, created_at };
    this.orders.set(id, order);
    return order;
  }
  
  async updateOrder(id: number, orderUpdate: Partial<InsertOrder>): Promise<Order> {
    const existingOrder = this.orders.get(id);
    if (!existingOrder) {
      throw new Error(`Order with id ${id} not found`);
    }
    
    const updatedOrder = { ...existingOrder, ...orderUpdate };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }
  
  async getPendingOrders(clientId?: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(order => 
      (order.fulfillment_status === OrderStatus.PENDING || 
       order.fulfillment_status === OrderStatus.INPROCESS) &&
      (!clientId || order.client_id === clientId)
    );
  }
  
  async getOrdersByStatus(status: string, clientId?: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(order => 
      order.delivery_status === status &&
      (!clientId || order.client_id === clientId)
    );
  }
  
  async getAllOrders(clientId?: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(order =>
      !clientId || order.client_id === clientId
    );
  }
  
  async assignAWB(orderIds: string[], awbs: string[]): Promise<void> {
    if (orderIds.length !== awbs.length) {
      throw new Error("The number of order IDs and AWBs must match");
    }
    
    for (let i = 0; i < orderIds.length; i++) {
      const order = Array.from(this.orders.values()).find(
        (o) => o.order_id === orderIds[i]
      );
      
      if (order) {
        const updatedOrder = { 
          ...order, 
          awb: awbs[i], 
          fulfillment_status: OrderStatus.INPROCESS 
        };
        this.orders.set(order.id, updatedOrder);
      }
    }
  }
  
  async bulkUpdateOrders(updates: Array<{ orderId: string, data: Partial<InsertOrder> }>): Promise<void> {
    for (const update of updates) {
      const order = Array.from(this.orders.values()).find(
        (o) => o.order_id === update.orderId
      );
      
      if (order) {
        const updatedOrder = { ...order, ...update.data };
        this.orders.set(order.id, updatedOrder);
      }
    }
  }
  
  // Token blacklist operations
  async addTokenToBlacklist(insertToken: InsertToken): Promise<void> {
    const id = this.currentTokenId++;
    const token: TokenBlacklist = { ...insertToken, id };
    this.tokenBlacklist.set(token.token, token);
  }
  
  async isTokenBlacklisted(token: string): Promise<boolean> {
    return this.tokenBlacklist.has(token);
  }

  // Shiprocket CSV data operations
  async saveShiprocketData(data: ShiprocketData[]): Promise<void> {
    // Replace existing data with new data
    this.shiprocketData = data;
  }

  async getShiprocketData(filters?: Record<string, string>): Promise<ShiprocketData[]> {
    if (!filters) {
      return this.shiprocketData;
    }

    return this.shiprocketData.filter(item => {
      // Check each filter against the corresponding property
      return Object.entries(filters).every(([key, value]) => {
        const itemValue = item[key as keyof ShiprocketData];
        // If the item has this property and it matches the filter value
        if (itemValue) {
          return itemValue.toString().toLowerCase().includes(value.toLowerCase());
        }
        return false;
      });
    });
  }
}

// Import the PostgreSQL storage via Drizzle ORM
import { eq, and, or, like, isNull, desc } from 'drizzle-orm';
import { users, clients, orders, tokenBlacklist } from '@shared/schema';
import { getDb } from './db';

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const db = await getDb();
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const db = await getDb();
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const db = await getDb();
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getUsersByClientId(clientId: string): Promise<User[]> {
    const db = await getDb();
    return db.select().from(users).where(eq(users.client_id, clientId));
  }

  async getClient(id: number): Promise<Client | undefined> {
    const db = await getDb();
    const result = await db.select().from(clients).where(eq(clients.id, id));
    return result[0];
  }

  async getClientByClientId(clientId: string): Promise<Client | undefined> {
    const db = await getDb();
    const result = await db.select().from(clients).where(eq(clients.client_id, clientId));
    return result[0];
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const db = await getDb();
    const result = await db.insert(clients).values(insertClient).returning();
    return result[0];
  }

  async updateClient(id: number, clientUpdate: Partial<InsertClient>): Promise<Client> {
    const db = await getDb();
    const result = await db.update(clients)
      .set(clientUpdate)
      .where(eq(clients.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Client with id ${id} not found`);
    }
    
    return result[0];
  }

  async getAllClients(): Promise<Client[]> {
    const db = await getDb();
    return db.select().from(clients);
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const db = await getDb();
    const result = await db.select().from(orders).where(eq(orders.id, id));
    return result[0];
  }

  async getOrderByOrderId(orderId: string): Promise<Order | undefined> {
    const db = await getDb();
    const result = await db.select().from(orders).where(eq(orders.order_id, orderId));
    return result[0];
  }

  async getOrderByAWB(awb: string): Promise<Order | undefined> {
    const db = await getDb();
    const result = await db.select().from(orders).where(eq(orders.awb, awb));
    return result[0];
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const db = await getDb();
    const result = await db.insert(orders).values(insertOrder).returning();
    return result[0];
  }

  async updateOrder(id: number, orderUpdate: Partial<InsertOrder>): Promise<Order> {
    const db = await getDb();
    const result = await db.update(orders)
      .set(orderUpdate)
      .where(eq(orders.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Order with id ${id} not found`);
    }
    
    return result[0];
  }

  async getPendingOrders(clientId?: string): Promise<Order[]> {
    const db = await getDb();
    
    if (clientId) {
      return db.select().from(orders).where(
        and(
          or(
            eq(orders.fulfillment_status, OrderStatus.PENDING),
            eq(orders.fulfillment_status, OrderStatus.INPROCESS)
          ),
          eq(orders.client_id, clientId)
        )
      );
    } else {
      return db.select().from(orders).where(
        or(
          eq(orders.fulfillment_status, OrderStatus.PENDING),
          eq(orders.fulfillment_status, OrderStatus.INPROCESS)
        )
      );
    }
  }

  async getOrdersByStatus(status: string, clientId?: string): Promise<Order[]> {
    const db = await getDb();
    
    if (clientId) {
      return db.select().from(orders).where(
        and(
          eq(orders.delivery_status, status),
          eq(orders.client_id, clientId)
        )
      );
    } else {
      return db.select().from(orders).where(eq(orders.delivery_status, status));
    }
  }

  async getAllOrders(clientId?: string): Promise<Order[]> {
    const db = await getDb();
    
    if (clientId) {
      return db.select().from(orders).where(eq(orders.client_id, clientId))
        .orderBy(desc(orders.created_at));
    } else {
      return db.select().from(orders).orderBy(desc(orders.created_at));
    }
  }

  async assignAWB(orderIds: string[], awbs: string[]): Promise<void> {
    const db = await getDb();
    
    if (orderIds.length !== awbs.length) {
      throw new Error("The number of order IDs and AWBs must match");
    }
    
    for (let i = 0; i < orderIds.length; i++) {
      await db.update(orders)
        .set({ 
          awb: awbs[i], 
          fulfillment_status: OrderStatus.INPROCESS 
        })
        .where(eq(orders.order_id, orderIds[i]));
    }
  }

  async bulkUpdateOrders(updates: Array<{ orderId: string, data: Partial<InsertOrder> }>): Promise<void> {
    const db = await getDb();
    
    for (const update of updates) {
      await db.update(orders)
        .set(update.data)
        .where(eq(orders.order_id, update.orderId));
    }
  }

  async addTokenToBlacklist(insertToken: InsertToken): Promise<void> {
    const db = await getDb();
    await db.insert(tokenBlacklist).values(insertToken);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.select().from(tokenBlacklist).where(eq(tokenBlacklist.token, token));
    return result.length > 0;
  }

  // Shiprocket CSV data operations using the database
  async saveShiprocketData(data: ShiprocketData[]): Promise<void> {
    const db = await getDb();
    
    // First, clear existing data
    // In a real production app, you might want to implement a more sophisticated
    // strategy like upserting or creating new records instead of clearing all
    // await db.delete(shiprocketData);
    
    // Insert all records
    if (data.length > 0) {
      for (const item of data) {
        const insertData = {
          awb: item.awb || null,
          courier_type: item.courier_type || null,
          client_order_id: item.client_order_id || null,
          order_confirmation: item.order_confirmation || null,
          bfast_status: item.bfast_status || null,
          delivery_status: item.delivery_status || null,
          sale_channel: item.sale_channel || null,
          aggregator_partner: item.aggregator_partner || null,
          client_id: item.client_id || null,
          month: item.month || null,
          pickup_date: item.pickup_date || null,
          sale_order_number: item.sale_order_number || null,
          order_date: item.order_date || null,
          delivery_center_name: item.delivery_center_name || null,
          transport_mode: item.transport_mode || null,
          payment_mode: item.payment_mode || null,
          cod_amount: item.cod_amount || null,
          customer_first_name: item.customer_first_name || null,
          customer_last_name: item.customer_last_name || null,
          customer_email: item.customer_email || null,
          customer_phone: item.customer_phone || null,
          shipping_address: item.shipping_address || null,
          customer_alt_phone: item.customer_alt_phone || null,
          shipping_address_2: item.shipping_address_2 || null,
          shipping_city: item.shipping_city || null,
          shipping_state: item.shipping_state || null,
          shipping_pincode: item.shipping_pincode || null,
          item_category: item.item_category || null,
          item_sku_code: item.item_sku_code || null,
          item_description: item.item_description || null,
          quantity: item.quantity || null,
        };
        
        await db.insert(shiprocketData).values(insertData);
      }
    }
  }

  async getShiprocketData(filters?: Record<string, string>): Promise<ShiprocketData[]> {
    const db = await getDb();
    
    if (!filters || Object.keys(filters).length === 0) {
      return db.select().from(shiprocketData).orderBy(desc(shiprocketData.created_at));
    }
    
    // Build a query with filters
    let query = db.select().from(shiprocketData);
    
    // Add filter conditions
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value.trim() !== '') {
        const column = shiprocketData[key as keyof typeof shiprocketData];
        if (column) {
          query = query.where(like(column as any, `%${value}%`));
        }
      }
    });
    
    return query.orderBy(desc(shiprocketData.created_at));
  }
}

// Use the new DatabaseStorage
export const storage = new DatabaseStorage();
