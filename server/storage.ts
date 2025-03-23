import { 
  User, InsertUser, 
  Client, InsertClient, 
  Order, InsertOrder, 
  TokenBlacklist, InsertToken,
  UserRole, OrderStatus 
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private clients: Map<number, Client>;
  private orders: Map<number, Order>;
  private tokenBlacklist: Map<string, TokenBlacklist>;
  
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
}

export const storage = new MemStorage();
