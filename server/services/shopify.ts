import axios from "axios";
import { IStorage } from "../storage";
import { Client, InsertOrder, OrderStatus, ShippingMethod, PaymentMode } from "@shared/schema";

export class ShopifyService {
  constructor(private storage: IStorage) {}

  // Fetch new orders from Shopify
  async fetchNewOrders(clientId: string): Promise<InsertOrder[]> {
    try {
      const client = await this.storage.getClientByClientId(clientId);
      
      if (!client) {
        throw new Error(`Client not found: ${clientId}`);
      }

      // Fetch orders with fulfillment_status: null (unfulfilled)
      const shopifyOrders = await this.getShopifyOrders(client);
      
      // Convert Shopify orders to our order schema
      const orders = this.transformOrders(shopifyOrders, client);
      
      // Return orders
      return orders;
    } catch (error) {
      console.error(`Error fetching orders for client ${clientId}:`, error);
      throw error;
    }
  }

  // Get orders from Shopify
  async getShopifyOrders(client: Client): Promise<any[]> {
    try {
      // In a real implementation, this would use the Shopify API
      // For now, simulate API call
      const url = `https://admin.shopify.com/store/${client.shopify_store_id}/orders.json?fulfillment_status=null`;
      
      const headers = {
        'X-Shopify-Access-Token': client.shopify_api_key,
        'Content-Type': 'application/json'
      };

      const response = await axios.get(url, { headers });
      return response.data.orders || [];
    } catch (error) {
      console.error("Error fetching orders from Shopify:", error);
      // For now, return empty array to prevent breaking the entire process
      return [];
    }
  }

  // Transform Shopify orders to our order schema
  private transformOrders(shopifyOrders: any[], client: Client): InsertOrder[] {
    return shopifyOrders.map(order => {
      const shipping_address = order.shipping_address || {};
      const line_items = order.line_items || [];
      
      // Extract the first product for basic details
      const firstProduct = line_items[0] || {};
      
      // Calculate total quantity across all items
      const totalQuantity = line_items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
      
      return {
        client_id: client.client_id,
        shopify_store_id: client.shopify_store_id,
        order_id: order.id.toString(),
        fulfillment_status: OrderStatus.PENDING,
        pickup_date: null,
        shipping_details: {
          name: shipping_address.name || '',
          phone_1: shipping_address.phone || '',
          email: order.email || '',
          address: [
            shipping_address.address1, 
            shipping_address.address2
          ].filter(Boolean).join(', '),
          pincode: shipping_address.zip || '',
          city: shipping_address.city || '',
          state: shipping_address.province || '',
          shipping_method: ShippingMethod.EXPRESS, // Default
          payment_mode: order.financial_status === 'paid' ? PaymentMode.PREPAID : PaymentMode.COD,
          amount: parseFloat(order.total_price) || 0
        },
        product_details: {
          category: firstProduct.product_type || 'General',
          product_name: firstProduct.title || 'Product',
          quantity: totalQuantity,
          dimensions: [10, 10, 10], // Default dimensions (L, B, H in cm)
          weight: 0.5 // Default weight in Kg
        },
        courier: null,
        awb: null,
        delivery_status: null,
        last_scan_location: null,
        last_timestamp: null,
        last_remark: null
      };
    });
  }

  // Save new orders to database
  async saveOrders(orders: InsertOrder[]): Promise<void> {
    for (const order of orders) {
      // Check if order already exists
      const existingOrder = await this.storage.getOrderByOrderId(order.order_id);
      
      if (!existingOrder) {
        await this.storage.createOrder(order);
      }
    }
  }

  // Fetch and save new orders for all clients
  async syncAllClientsOrders(): Promise<void> {
    try {
      const clients = await this.storage.getAllClients();
      
      for (const client of clients) {
        const orders = await this.fetchNewOrders(client.client_id);
        await this.saveOrders(orders);
      }
      
      console.log("Synced orders for all clients");
    } catch (error) {
      console.error("Error syncing all clients orders:", error);
    }
  }
}
