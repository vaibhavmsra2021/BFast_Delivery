import { eq, and, like, or, sql } from 'drizzle-orm';
import { db } from './db';
import { 
  users, clients, orders, tokenBlacklist, shiprocketData,
  InsertUser, User, InsertClient, Client, 
  InsertOrder, Order, InsertToken, TokenBlacklist,
  ShiprocketData, shiprocketDataSchema, InsertShiprocketData, 
  UserRole, OrderStatus, UserRoleType, OrderStatusType,
  ShippingMethod, ShippingMethodType, PaymentMode, PaymentModeType
} from '@shared/schema';
import { IStorage } from './storage';

export class PgStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result.length > 0 ? result[0] : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Using values directly instead of creating intermediate object
    const result = await db.insert(users).values([{
      username: insertUser.username,
      password: insertUser.password,
      name: insertUser.name,
      email: insertUser.email,
      role: insertUser.role as UserRoleType, // Explicit cast to correct enum type
      client_id: insertUser.client_id
    }]).returning();
    return result[0];
  }

  async getUsersByClientId(clientId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.client_id, clientId));
  }

  // Client operations
  async getClient(id: number): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async getClientByClientId(clientId: string): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.client_id, clientId));
    return result.length > 0 ? result[0] : undefined;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    // Using array syntax for values to match drizzle's expected input format
    const result = await db.insert(clients).values([{
      client_id: insertClient.client_id,
      client_name: insertClient.client_name,
      shopify_store_id: insertClient.shopify_store_id,
      shopify_api_key: insertClient.shopify_api_key,
      shopify_api_secret: insertClient.shopify_api_secret,
      shiprocket_api_key: insertClient.shiprocket_api_key,
      logo_url: insertClient.logo_url
    }]).returning();
    return result[0];
  }

  async updateClient(id: number, clientUpdate: Partial<InsertClient>): Promise<Client> {
    // Remove any properties that don't exist in the table schema
    const sanitizedUpdate: any = {};
    
    if (clientUpdate.client_id !== undefined) sanitizedUpdate.client_id = clientUpdate.client_id;
    if (clientUpdate.client_name !== undefined) sanitizedUpdate.client_name = clientUpdate.client_name;
    if (clientUpdate.shopify_store_id !== undefined) sanitizedUpdate.shopify_store_id = clientUpdate.shopify_store_id;
    if (clientUpdate.shopify_api_key !== undefined) sanitizedUpdate.shopify_api_key = clientUpdate.shopify_api_key;
    if (clientUpdate.shopify_api_secret !== undefined) sanitizedUpdate.shopify_api_secret = clientUpdate.shopify_api_secret;
    if (clientUpdate.shiprocket_api_key !== undefined) sanitizedUpdate.shiprocket_api_key = clientUpdate.shiprocket_api_key;
    if (clientUpdate.logo_url !== undefined) sanitizedUpdate.logo_url = clientUpdate.logo_url;
    
    const result = await db.update(clients)
      .set(sanitizedUpdate)
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
    return result.length > 0 ? result[0] : undefined;
  }

  async getOrderByOrderId(orderId: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.order_id, orderId));
    return result.length > 0 ? result[0] : undefined;
  }

  async getOrderByAWB(awb: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.awb, awb));
    return result.length > 0 ? result[0] : undefined;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    // Create a properly typed shipping details object
    const { phone_2, ...restShippingDetails } = insertOrder.shipping_details;
    
    // Ensure phone_2 is properly typed
    const shippingDetails = {
      ...restShippingDetails,
      // Only include phone_2 if it's defined and cast it to string
      ...(phone_2 !== undefined ? { phone_2: String(phone_2) } : {}),
      shipping_method: insertOrder.shipping_details.shipping_method as ShippingMethodType,
      payment_mode: insertOrder.shipping_details.payment_mode as PaymentModeType
    };
    
    // Using array syntax for values with explicit casting of enum types
    const result = await db.insert(orders).values([{
      client_id: insertOrder.client_id,
      shopify_store_id: insertOrder.shopify_store_id,
      order_id: insertOrder.order_id,
      fulfillment_status: insertOrder.fulfillment_status as OrderStatusType,
      pickup_date: insertOrder.pickup_date,
      shipping_details: shippingDetails,
      product_details: insertOrder.product_details,
      courier: insertOrder.courier,
      awb: insertOrder.awb,
      delivery_status: insertOrder.delivery_status as OrderStatusType,
      last_scan_location: insertOrder.last_scan_location,
      last_timestamp: insertOrder.last_timestamp,
      last_remark: insertOrder.last_remark
    }]).returning();
    return result[0];
  }

  async updateOrder(id: number, orderUpdate: Partial<InsertOrder>): Promise<Order> {
    // Create a sanitized update object with proper type casting
    const sanitizedUpdate: Record<string, any> = {};
    
    if (orderUpdate.client_id !== undefined) sanitizedUpdate.client_id = orderUpdate.client_id;
    if (orderUpdate.shopify_store_id !== undefined) sanitizedUpdate.shopify_store_id = orderUpdate.shopify_store_id;
    if (orderUpdate.order_id !== undefined) sanitizedUpdate.order_id = orderUpdate.order_id;
    
    // Cast enum types correctly
    if (orderUpdate.fulfillment_status !== undefined) 
      sanitizedUpdate.fulfillment_status = orderUpdate.fulfillment_status as OrderStatusType;
    
    if (orderUpdate.pickup_date !== undefined) sanitizedUpdate.pickup_date = orderUpdate.pickup_date;
    
    // Handle shipping details with proper enum casting if it exists
    if (orderUpdate.shipping_details !== undefined) {
      // Extract phone_2 to handle it separately with proper type casting
      const { phone_2, ...restShippingDetails } = orderUpdate.shipping_details;
      
      const shippingDetails = {
        ...restShippingDetails,
        // Only include phone_2 if it's defined and cast it to string
        ...(phone_2 !== undefined ? { phone_2: String(phone_2) } : {}),
        shipping_method: orderUpdate.shipping_details.shipping_method as ShippingMethodType,
        payment_mode: orderUpdate.shipping_details.payment_mode as PaymentModeType
      };
      sanitizedUpdate.shipping_details = shippingDetails;
    }
    
    if (orderUpdate.product_details !== undefined) sanitizedUpdate.product_details = orderUpdate.product_details;
    if (orderUpdate.courier !== undefined) sanitizedUpdate.courier = orderUpdate.courier;
    if (orderUpdate.awb !== undefined) sanitizedUpdate.awb = orderUpdate.awb;
    
    // Cast enum types correctly
    if (orderUpdate.delivery_status !== undefined) 
      sanitizedUpdate.delivery_status = orderUpdate.delivery_status as OrderStatusType;
    
    if (orderUpdate.last_scan_location !== undefined) sanitizedUpdate.last_scan_location = orderUpdate.last_scan_location;
    if (orderUpdate.last_timestamp !== undefined) sanitizedUpdate.last_timestamp = orderUpdate.last_timestamp;
    if (orderUpdate.last_remark !== undefined) sanitizedUpdate.last_remark = orderUpdate.last_remark;
    
    const result = await db.update(orders)
      .set(sanitizedUpdate)
      .where(eq(orders.id, id))
      .returning();
    return result[0];
  }

  async getPendingOrders(clientId?: string): Promise<Order[]> {
    if (clientId) {
      return await db.select().from(orders)
        .where(and(
          eq(orders.client_id, clientId),
          eq(orders.awb, ''),
          eq(orders.fulfillment_status, OrderStatus.PENDING)
        ));
    } else {
      return await db.select().from(orders)
        .where(and(
          eq(orders.awb, ''),
          eq(orders.fulfillment_status, OrderStatus.PENDING)
        ));
    }
  }

  async getOrdersByStatus(status: string, clientId?: string): Promise<Order[]> {
    if (clientId) {
      return await db.select().from(orders)
        .where(and(
          eq(orders.client_id, clientId),
          eq(orders.delivery_status, status as any)
        ));
    } else {
      return await db.select().from(orders)
        .where(eq(orders.delivery_status, status as any));
    }
  }

  async getAllOrders(clientId?: string): Promise<Order[]> {
    if (clientId) {
      return await db.select().from(orders)
        .where(eq(orders.client_id, clientId));
    } else {
      return await db.select().from(orders);
    }
  }

  async assignAWB(orderIds: string[], awbs: string[]): Promise<void> {
    if (orderIds.length !== awbs.length) {
      throw new Error('Order IDs and AWBs arrays must have the same length');
    }

    // Use a transaction to ensure all updates succeed or fail together
    await db.transaction(async (tx) => {
      for (let i = 0; i < orderIds.length; i++) {
        const order = await tx.select().from(orders).where(eq(orders.order_id, orderIds[i]));
        if (order.length > 0) {
          await tx.update(orders)
            .set({ 
              awb: awbs[i], 
              fulfillment_status: OrderStatus.INPROCESS 
            })
            .where(eq(orders.order_id, orderIds[i]));
        }
      }
    });
  }

  async bulkUpdateOrders(updates: Array<{ orderId: string, data: Partial<InsertOrder> }>): Promise<void> {
    // Use a transaction to ensure all updates succeed or fail together
    await db.transaction(async (tx) => {
      for (const update of updates) {
        const order = await tx.select().from(orders).where(eq(orders.order_id, update.orderId));
        if (order.length > 0) {
          // Need to handle enums correctly
          const sanitizedData: Record<string, any> = {};
          
          // Only copy fields that are defined
          if (update.data.client_id !== undefined) sanitizedData.client_id = update.data.client_id;
          if (update.data.shopify_store_id !== undefined) sanitizedData.shopify_store_id = update.data.shopify_store_id;
          if (update.data.order_id !== undefined) sanitizedData.order_id = update.data.order_id;
          
          // Cast to OrderStatusType if fulfillment_status is provided
          if (update.data.fulfillment_status !== undefined) {
            sanitizedData.fulfillment_status = update.data.fulfillment_status as OrderStatusType;
          }
          
          if (update.data.pickup_date !== undefined) sanitizedData.pickup_date = update.data.pickup_date;
          
          // Handle shipping details with proper enum casting if it exists
          if (update.data.shipping_details !== undefined) {
            // Extract phone_2 to handle it separately with proper type casting
            const { phone_2, ...restShippingDetails } = update.data.shipping_details;
            
            const shippingDetails = {
              ...restShippingDetails,
              // Only include phone_2 if it's defined and cast it to string
              ...(phone_2 !== undefined ? { phone_2: String(phone_2) } : {}),
              shipping_method: update.data.shipping_details.shipping_method as ShippingMethodType,
              payment_mode: update.data.shipping_details.payment_mode as PaymentModeType
            };
            sanitizedData.shipping_details = shippingDetails;
          }
          
          if (update.data.product_details !== undefined) sanitizedData.product_details = update.data.product_details;
          if (update.data.courier !== undefined) sanitizedData.courier = update.data.courier;
          if (update.data.awb !== undefined) sanitizedData.awb = update.data.awb;
          
          // Cast to OrderStatusType if delivery_status is provided
          if (update.data.delivery_status !== undefined) {
            sanitizedData.delivery_status = update.data.delivery_status as OrderStatusType;
          }
          
          if (update.data.last_scan_location !== undefined) sanitizedData.last_scan_location = update.data.last_scan_location;
          if (update.data.last_timestamp !== undefined) sanitizedData.last_timestamp = update.data.last_timestamp;
          if (update.data.last_remark !== undefined) sanitizedData.last_remark = update.data.last_remark;
          
          await tx.update(orders)
            .set(sanitizedData)
            .where(eq(orders.order_id, update.orderId));
        }
      }
    });
  }

  // Token blacklist operations
  async addTokenToBlacklist(insertToken: InsertToken): Promise<void> {
    await db.insert(tokenBlacklist).values(insertToken);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await db.select().from(tokenBlacklist).where(eq(tokenBlacklist.token, token));
    return result.length > 0;
  }

  // Shiprocket CSV data operations
  async saveShiprocketData(data: ShiprocketData[]): Promise<void> {
    const insertData = data.map(item => ({
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
      quantity: item.quantity || null
    }));

    // Clear existing data and insert new data
    await db.transaction(async (tx) => {
      await tx.delete(shiprocketData);
      if (insertData.length > 0) {
        await tx.insert(shiprocketData).values(insertData);
      }
    });
  }

  async getShiprocketData(filters?: Record<string, string>): Promise<ShiprocketData[]> {
    if (!filters || Object.keys(filters).length === 0) {
      return await db.select().from(shiprocketData);
    }

    // Build conditions for the where clause based on filters
    const conditions: any[] = [];
    
    // Only add conditions for filters that are not 'all'
    for (const [key, value] of Object.entries(filters)) {
      if (value !== 'all') {
        conditions.push(eq(shiprocketData[key as keyof typeof shiprocketData] as any, value));
      }
    }
    
    // Execute the query with the appropriate conditions
    if (conditions.length > 0) {
      return await db.select().from(shiprocketData).where(and(...conditions));
    } else {
      return await db.select().from(shiprocketData);
    }
  }
}