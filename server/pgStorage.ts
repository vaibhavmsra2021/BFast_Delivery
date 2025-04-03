import { db, pool } from "./db";
import { 
  users, clients, orders, tokenBlacklist, shiprocketDataSchema,
  User, InsertUser, Client, InsertClient, Order, InsertOrder, TokenBlacklist, InsertToken, 
  ShiprocketData, OrderStatus, OrderStatusType, UserRole, UserRoleType
} from "../shared/schema";
import { eq, and, desc, asc, like, sql, or, isNull } from "drizzle-orm";
import { IStorage } from "./storage";

export class PgStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Ensure role is a valid UserRoleType
    if (typeof insertUser.role === 'string') {
      const roleKey = Object.entries(UserRole).find(
        ([_, value]) => value === insertUser.role
      )?.[0];
      
      if (roleKey) {
        const typedRole = UserRole[roleKey as keyof typeof UserRole] as UserRoleType;
        const typedUser = {
          ...insertUser,
          role: typedRole
        };
        
        const result = await db.insert(users).values(typedUser).returning();
        return result[0];
      }
    }
    
    // If we can't properly type the role, insert it as is and let the DB handle it
    const result = await db.insert(users).values(insertUser as any).returning();
    return result[0];
  }

  async getUsersByClientId(clientId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.client_id, clientId));
  }

  // Client operations
  async getClient(id: number): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.id, id));
    return result[0];
  }

  async getClientByClientId(clientId: string): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.client_id, clientId));
    return result[0];
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const result = await db.insert(clients).values(insertClient).returning();
    return result[0];
  }

  async updateClient(id: number, clientUpdate: Partial<InsertClient>): Promise<Client> {
    const result = await db.update(clients)
      .set(clientUpdate)
      .where(eq(clients.id, id))
      .returning();
    return result[0];
  }

  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }

  // Order operations
  async getOrder(id: number): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.id, id));
    return result[0];
  }

  async getOrderByOrderId(orderId: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.order_id, orderId));
    return result[0];
  }

  async getOrderByAWB(awb: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.awb, awb));
    return result[0];
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    // Convert status strings to OrderStatusType
    const orderData = { ...insertOrder };
    
    // Ensure fulfillment_status is a valid OrderStatusType
    if (typeof orderData.fulfillment_status === 'string') {
      const statusKey = Object.entries(OrderStatus).find(
        ([_, value]) => value === orderData.fulfillment_status
      )?.[0];
      
      if (statusKey) {
        orderData.fulfillment_status = OrderStatus[statusKey as keyof typeof OrderStatus] as OrderStatusType;
      }
    }
    
    // Handle delivery_status if provided
    if (orderData.delivery_status && typeof orderData.delivery_status === 'string') {
      const statusKey = Object.entries(OrderStatus).find(
        ([_, value]) => value === orderData.delivery_status
      )?.[0];
      
      if (statusKey) {
        orderData.delivery_status = OrderStatus[statusKey as keyof typeof OrderStatus] as OrderStatusType;
      }
    }
    
    // Insert with casting to handle any type issues
    const result = await db.insert(orders).values(orderData as any).returning();
    return result[0];
  }

  async updateOrder(id: number, orderUpdate: Partial<InsertOrder>): Promise<Order> {
    // Handle OrderStatusType conversions
    const updateData = { ...orderUpdate };
    
    // Ensure fulfillment_status is a valid OrderStatusType
    if (updateData.fulfillment_status && typeof updateData.fulfillment_status === 'string') {
      const statusKey = Object.entries(OrderStatus).find(
        ([_, value]) => value === updateData.fulfillment_status
      )?.[0];
      
      if (statusKey) {
        updateData.fulfillment_status = OrderStatus[statusKey as keyof typeof OrderStatus] as OrderStatusType;
      }
    }
    
    // Handle delivery_status if provided
    if (updateData.delivery_status && typeof updateData.delivery_status === 'string') {
      const statusKey = Object.entries(OrderStatus).find(
        ([_, value]) => value === updateData.delivery_status
      )?.[0];
      
      if (statusKey) {
        updateData.delivery_status = OrderStatus[statusKey as keyof typeof OrderStatus] as OrderStatusType;
      }
    }
    
    const result = await db.update(orders)
      .set(updateData as any)
      .where(eq(orders.id, id))
      .returning();
    return result[0];
  }

  async getPendingOrders(clientId?: string): Promise<Order[]> {
    const pendingStatus = OrderStatus.PENDING as OrderStatusType;
    let results;
    
    if (clientId) {
      results = await db.select().from(orders)
        .where(
          and(
            eq(orders.fulfillment_status, pendingStatus),
            eq(orders.client_id, clientId)
          )
        );
    } else {
      results = await db.select().from(orders)
        .where(eq(orders.fulfillment_status, pendingStatus));
    }
    
    return results;
  }

  async getOrdersByStatus(status: string, clientId?: string): Promise<Order[]> {
    // Convert status to correct type
    const orderStatus = status as OrderStatusType;
    let results;
    
    if (clientId) {
      results = await db.select().from(orders)
        .where(
          and(
            eq(orders.fulfillment_status, orderStatus),
            eq(orders.client_id, clientId)
          )
        );
    } else {
      results = await db.select().from(orders)
        .where(eq(orders.fulfillment_status, orderStatus));
    }
    
    return results;
  }

  async getAllOrders(clientId?: string): Promise<Order[]> {
    let results;
    
    if (clientId) {
      results = await db.select().from(orders)
        .where(eq(orders.client_id, clientId));
    } else {
      results = await db.select().from(orders);
    }
    
    return results;
  }

  async assignAWB(orderIds: string[], awbs: string[]): Promise<void> {
    // Use a transaction to ensure all updates happen or none do
    await pool.query('BEGIN');
    
    try {
      for (let i = 0; i < orderIds.length; i++) {
        const orderId = orderIds[i];
        const awb = awbs[i];
        
        await db.update(orders)
          .set({
            awb: awb,
            fulfillment_status: OrderStatus.INPROCESS as OrderStatusType
          })
          .where(eq(orders.order_id, orderId));
      }
      
      await pool.query('COMMIT');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  }

  async bulkUpdateOrders(updates: Array<{ orderId: string, data: Partial<InsertOrder> }>): Promise<void> {
    // Use a transaction to ensure all updates happen or none do
    await pool.query('BEGIN');
    
    try {
      for (const update of updates) {
        // Handle any status type conversions if needed
        const updateData = { ...update.data };
        
        // If fulfillment_status is provided as a string, convert it to OrderStatusType
        if (updateData.fulfillment_status) {
          // Ensure it's a valid OrderStatusType
          const statusKey = Object.entries(OrderStatus).find(
            ([_, value]) => value === updateData.fulfillment_status
          )?.[0];
          
          if (statusKey) {
            updateData.fulfillment_status = OrderStatus[statusKey as keyof typeof OrderStatus] as OrderStatusType;
          }
        }
        
        // Same for delivery_status if it exists
        if (updateData.delivery_status) {
          const statusKey = Object.entries(OrderStatus).find(
            ([_, value]) => value === updateData.delivery_status
          )?.[0];
          
          if (statusKey) {
            updateData.delivery_status = OrderStatus[statusKey as keyof typeof OrderStatus] as OrderStatusType;
          }
        }
        
        await db.update(orders)
          .set(updateData as any)
          .where(eq(orders.order_id, update.orderId));
      }
      
      await pool.query('COMMIT');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  }

  // Token blacklist operations
  async addTokenToBlacklist(insertToken: InsertToken): Promise<void> {
    await db.insert(tokenBlacklist).values(insertToken);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await db.select().from(tokenBlacklist)
      .where(eq(tokenBlacklist.token, token));
    return result.length > 0;
  }

  // Shiprocket CSV data operations
  async saveShiprocketData(data: ShiprocketData[]): Promise<void> {
    if (data.length === 0) return;
    
    // Use raw query for bulk insert
    const values = data.map(item => {
      return `(
        ${item.awb ? `'${item.awb}'` : 'NULL'},
        ${item.courier_type ? `'${item.courier_type}'` : 'NULL'},
        ${item.client_order_id ? `'${item.client_order_id}'` : 'NULL'},
        ${item.order_confirmation ? `'${item.order_confirmation}'` : 'NULL'},
        ${item.bfast_status ? `'${item.bfast_status}'` : 'NULL'},
        ${item.delivery_status ? `'${item.delivery_status}'` : 'NULL'},
        ${item.sale_channel ? `'${item.sale_channel}'` : 'NULL'},
        ${item.aggregator_partner ? `'${item.aggregator_partner}'` : 'NULL'},
        ${item.client_id ? `'${item.client_id}'` : 'NULL'},
        ${item.month ? `'${item.month}'` : 'NULL'},
        ${item.pickup_date ? `'${item.pickup_date}'` : 'NULL'},
        ${item.sale_order_number ? `'${item.sale_order_number}'` : 'NULL'},
        ${item.order_date ? `'${item.order_date}'` : 'NULL'},
        ${item.delivery_center_name ? `'${item.delivery_center_name}'` : 'NULL'},
        ${item.transport_mode ? `'${item.transport_mode}'` : 'NULL'},
        ${item.payment_mode ? `'${item.payment_mode}'` : 'NULL'},
        ${item.cod_amount ? `'${item.cod_amount}'` : 'NULL'},
        ${item.customer_first_name ? `'${item.customer_first_name}'` : 'NULL'},
        ${item.customer_last_name ? `'${item.customer_last_name}'` : 'NULL'},
        ${item.customer_email ? `'${item.customer_email}'` : 'NULL'},
        ${item.customer_phone ? `'${item.customer_phone}'` : 'NULL'},
        ${item.shipping_address ? `'${item.shipping_address}'` : 'NULL'},
        ${item.customer_alt_phone ? `'${item.customer_alt_phone}'` : 'NULL'},
        ${item.shipping_address_2 ? `'${item.shipping_address_2}'` : 'NULL'},
        ${item.shipping_city ? `'${item.shipping_city}'` : 'NULL'},
        ${item.shipping_state ? `'${item.shipping_state}'` : 'NULL'},
        ${item.shipping_pincode ? `'${item.shipping_pincode}'` : 'NULL'},
        ${item.item_category ? `'${item.item_category}'` : 'NULL'},
        ${item.item_sku_code ? `'${item.item_sku_code}'` : 'NULL'},
        ${item.item_description ? `'${item.item_description}'` : 'NULL'},
        ${item.quantity ? `'${item.quantity}'` : 'NULL'},
        NOW()
      )`;
    }).join(',');
    
    const query = `
      INSERT INTO shiprocket_data (
        awb, courier_type, client_order_id, order_confirmation, 
        bfast_status, delivery_status, sale_channel, aggregator_partner,
        client_id, month, pickup_date, sale_order_number, order_date,
        delivery_center_name, transport_mode, payment_mode, cod_amount,
        customer_first_name, customer_last_name, customer_email, customer_phone,
        shipping_address, customer_alt_phone, shipping_address_2, shipping_city,
        shipping_state, shipping_pincode, item_category, item_sku_code,
        item_description, quantity, created_at
      ) VALUES ${values}
    `;
    
    await pool.query(query);
  }

  async getShiprocketData(filters?: Record<string, string>): Promise<ShiprocketData[]> {
    // Start the query
    let query = 'SELECT * FROM shiprocket_data';
    const params: any[] = [];
    let paramIndex = 1;
    
    // Apply filters if provided
    if (filters && Object.keys(filters).length > 0) {
      query += ' WHERE';
      const conditions: string[] = [];
      
      Object.entries(filters).forEach(([key, value]) => {
        conditions.push(` ${key} ILIKE $${paramIndex}`);
        params.push(`%${value}%`);
        paramIndex++;
      });
      
      query += conditions.join(' AND');
    }
    
    // Order by created_at
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    return result.rows;
  }
}