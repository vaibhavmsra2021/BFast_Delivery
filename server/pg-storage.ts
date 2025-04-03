import {
  InsertUser, User, 
  InsertClient, Client, 
  InsertOrder, Order, 
  InsertToken, TokenBlacklist,
  ShiprocketData
} from '@shared/schema';
import { IStorage } from './storage';
import { getDb } from './db';
import { eq, and, or, like, isNull, notLike } from 'drizzle-orm';
import { users, clients, orders, tokenBlacklist } from '@shared/schema';
import { PgTable } from 'drizzle-orm/pg-core';

export class PgStorage implements IStorage {
  private shiprocketData: ShiprocketData[] = [];

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const db = await getDb();
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const db = await getDb();
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const db = await getDb();
    const created_at = new Date();
    const [user] = await db.insert(users).values({
      ...insertUser,
      created_at
    }).returning();
    return user;
  }

  async getUsersByClientId(clientId: string): Promise<User[]> {
    const db = await getDb();
    return await db.select().from(users).where(eq(users.clientId, clientId));
  }

  // Client operations
  async getClient(id: number): Promise<Client | undefined> {
    const db = await getDb();
    const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    return result[0];
  }

  async getClientByClientId(clientId: string): Promise<Client | undefined> {
    const db = await getDb();
    const result = await db.select().from(clients).where(eq(clients.clientId, clientId)).limit(1);
    return result[0];
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const db = await getDb();
    const created_at = new Date();
    const [client] = await db.insert(clients).values({
      ...insertClient,
      created_at
    }).returning();
    return client;
  }

  async updateClient(id: number, clientUpdate: Partial<InsertClient>): Promise<Client> {
    const db = await getDb();
    const [client] = await db.update(clients)
      .set(clientUpdate)
      .where(eq(clients.id, id))
      .returning();
    return client;
  }

  async getAllClients(): Promise<Client[]> {
    const db = await getDb();
    return await db.select().from(clients);
  }

  // Order operations
  async getOrder(id: number): Promise<Order | undefined> {
    const db = await getDb();
    const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return result[0];
  }

  async getOrderByOrderId(orderId: string): Promise<Order | undefined> {
    const db = await getDb();
    const result = await db.select().from(orders).where(eq(orders.orderId, orderId)).limit(1);
    return result[0];
  }

  async getOrderByAWB(awb: string): Promise<Order | undefined> {
    const db = await getDb();
    const result = await db.select().from(orders).where(eq(orders.awb, awb)).limit(1);
    return result[0];
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const db = await getDb();
    const created_at = new Date();
    const [order] = await db.insert(orders).values({
      ...insertOrder,
      created_at
    }).returning();
    return order;
  }

  async updateOrder(id: number, orderUpdate: Partial<InsertOrder>): Promise<Order> {
    const db = await getDb();
    const [order] = await db.update(orders)
      .set(orderUpdate)
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async getPendingOrders(clientId?: string): Promise<Order[]> {
    const db = await getDb();
    const conditions = [isNull(orders.awb)];
    
    if (clientId) {
      conditions.push(eq(orders.clientId, clientId));
    }
    
    return await db.select().from(orders).where(and(...conditions));
  }

  async getOrdersByStatus(status: string, clientId?: string): Promise<Order[]> {
    const db = await getDb();
    let conditions = [eq(orders.status, status)];
    
    if (clientId) {
      conditions.push(eq(orders.clientId, clientId));
    }
    
    return await db.select().from(orders).where(and(...conditions));
  }

  async getAllOrders(clientId?: string): Promise<Order[]> {
    const db = await getDb();
    
    if (clientId) {
      return await db.select().from(orders).where(eq(orders.clientId, clientId));
    }
    
    return await db.select().from(orders);
  }

  async assignAWB(orderIds: string[], awbs: string[]): Promise<void> {
    const db = await getDb();
    
    if (orderIds.length !== awbs.length) {
      throw new Error("Mismatch between order IDs and AWBs");
    }
    
    for (let i = 0; i < orderIds.length; i++) {
      const orderId = orderIds[i];
      const awb = awbs[i];
      
      const order = await this.getOrderByOrderId(orderId);
      if (order) {
        await db.update(orders)
          .set({ awb, status: 'In Transit' })
          .where(eq(orders.id, order.id));
      }
    }
  }

  async bulkUpdateOrders(updates: Array<{ orderId: string, data: Partial<InsertOrder> }>): Promise<void> {
    const db = await getDb();
    
    for (const update of updates) {
      const order = await this.getOrderByOrderId(update.orderId);
      if (order) {
        await db.update(orders)
          .set(update.data)
          .where(eq(orders.id, order.id));
      }
    }
  }

  // Token blacklist operations
  async addTokenToBlacklist(insertToken: InsertToken): Promise<void> {
    const db = await getDb();
    await db.insert(tokenBlacklist).values({
      ...insertToken,
      created_at: new Date()
    });
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.select().from(tokenBlacklist).where(eq(tokenBlacklist.token, token)).limit(1);
    return result.length > 0;
  }

  // Shiprocket CSV data operations - temporary in-memory implementation until we create a table for it
  async saveShiprocketData(data: ShiprocketData[]): Promise<void> {
    this.shiprocketData = data;
  }

  async getShiprocketData(filters?: Record<string, string>): Promise<ShiprocketData[]> {
    if (!filters || Object.keys(filters).length === 0) {
      return this.shiprocketData;
    }
    
    return this.shiprocketData.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (!item[key as keyof ShiprocketData]) return false;
        return (item[key as keyof ShiprocketData] as string).includes(value);
      });
    });
  }
}

export const pgStorage = new PgStorage();