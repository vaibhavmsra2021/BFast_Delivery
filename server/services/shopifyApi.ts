import axios from 'axios';
import { IStorage } from '../storage';
import { OrderStatus, OrderStatusType, ShippingMethod, PaymentMode } from '@shared/schema';

interface ShopifyOrdersResponse {
  orders: ShopifyOrder[];
}

interface ShopifyOrder {
  id: number;
  name: string;
  order_number: number;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  shipping_address: {
    address1: string;
    city: string;
    province: string;
    zip: string;
    country: string;
  };
  line_items: {
    id: number;
    title: string;
    quantity: number;
    price: string;
    sku: string;
    product_id: number;
    variant_id: number;
  }[];
  financial_status: string;
  fulfillment_status: string | null;
  processed_at: string;
  total_price: string;
  created_at: string;
  updated_at: string;
}

interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

interface ShopifyProduct {
  id: number;
  title: string;
  variants: {
    id: number;
    price: string;
    sku: string;
    weight: number;
    weight_unit: string;
    inventory_quantity: number;
  }[];
  images: {
    id: number;
    src: string;
  }[];
}

export class ShopifyApiService {
  private baseUrl: string;
  private apiKey: string;
  private apiSecret: string;

  constructor(private storage: IStorage) {
    const shopName = process.env.SHOPIFY_SHOP_NAME;
    this.apiKey = process.env.SHOPIFY_API_KEY || '';
    this.apiSecret = process.env.SHOPIFY_API_SECRET || '';
    
    if (!shopName || !this.apiKey || !this.apiSecret) {
      console.warn('Shopify credentials not fully configured');
    }
    
    this.baseUrl = `https://${shopName}.myshopify.com/admin/api/2023-10`;
  }

  /**
   * Get all orders from Shopify
   */
  async getOrders(limit = 50, status = 'any', createdAtMin?: string): Promise<ShopifyOrder[]> {
    try {
      // Build query parameters
      const params = new URLSearchParams({
        limit: limit.toString(),
        status,
      });
      
      if (createdAtMin) {
        params.append('created_at_min', createdAtMin);
      }

      const response = await axios.get<ShopifyOrdersResponse>(`${this.baseUrl}/orders.json?${params.toString()}`, {
        auth: {
          username: this.apiKey,
          password: this.apiSecret
        }
      });

      return response.data.orders;
    } catch (error) {
      console.error('Error fetching orders from Shopify:', error);
      throw error;
    }
  }

  /**
   * Get a specific order by ID
   */
  async getOrderById(orderId: string): Promise<ShopifyOrder> {
    try {
      const response = await axios.get<{ order: ShopifyOrder }>(`${this.baseUrl}/orders/${orderId}.json`, {
        auth: {
          username: this.apiKey,
          password: this.apiSecret
        }
      });

      return response.data.order;
    } catch (error) {
      console.error(`Error fetching order ${orderId} from Shopify:`, error);
      throw error;
    }
  }

  /**
   * Get all products from Shopify
   */
  async getProducts(limit = 50): Promise<ShopifyProduct[]> {
    try {
      const response = await axios.get<ShopifyProductsResponse>(`${this.baseUrl}/products.json?limit=${limit}`, {
        auth: {
          username: this.apiKey,
          password: this.apiSecret
        }
      });

      return response.data.products;
    } catch (error) {
      console.error('Error fetching products from Shopify:', error);
      throw error;
    }
  }

  /**
   * Map Shopify order status to our application status
   */
  private mapShopifyStatusToOrderStatus(fulfillmentStatus: string | null, financialStatus: string): OrderStatusType {
    if (fulfillmentStatus === 'fulfilled') {
      return OrderStatus.DELIVERED;
    } else if (fulfillmentStatus === 'partial') {
      return OrderStatus.INPROCESS;
    } else if (financialStatus === 'paid' && !fulfillmentStatus) {
      return OrderStatus.PENDING;
    } else if (financialStatus === 'pending') {
      return OrderStatus.PENDING;
    } else if (financialStatus === 'refunded') {
      return OrderStatus.RTO;
    } else {
      return OrderStatus.PENDING;
    }
  }

  /**
   * Convert a Shopify order to our application's order format
   */
  private convertShopifyOrderToAppFormat(shopifyOrder: ShopifyOrder, clientId: string) {
    // Extract the first line item for product details
    const firstItem = shopifyOrder.line_items[0] || {
      title: 'Unknown Product',
      quantity: 1,
      price: '0.00',
      sku: ''
    };

    // Calculate dimensions (placeholder values)
    const dimensions: [number, number, number] = [10, 10, 5]; // Example dimensions in cm

    // Calculate weight (placeholder value if not available)
    const weight = 0.5; // Example weight in kg

    // Get client details to find the Shopify store ID
    const shopifyStoreId = process.env.SHOPIFY_SHOP_NAME || 'default-store';

    return {
      order_id: shopifyOrder.name,
      shopify_store_id: shopifyStoreId,
      client_id: clientId,
      fulfillment_status: this.mapShopifyStatusToOrderStatus(
        shopifyOrder.fulfillment_status, 
        shopifyOrder.financial_status
      ),
      delivery_status: null,
      shipping_details: {
        name: `${shopifyOrder.customer?.first_name || ''} ${shopifyOrder.customer?.last_name || ''}`.trim() || 'Unknown Customer',
        phone_1: shopifyOrder.customer?.phone || '',
        email: shopifyOrder.customer?.email || '',
        address: shopifyOrder.shipping_address?.address1 || '',
        pincode: shopifyOrder.shipping_address?.zip || '',
        city: shopifyOrder.shipping_address?.city || '',
        state: shopifyOrder.shipping_address?.province || '',
        shipping_method: ShippingMethod.SURFACE,
        payment_mode: shopifyOrder.financial_status === 'paid' ? PaymentMode.PREPAID : PaymentMode.COD,
        amount: parseFloat(shopifyOrder.total_price),
      },
      product_details: {
        category: 'General',
        product_name: firstItem.title,
        quantity: firstItem.quantity,
        dimensions: dimensions,
        weight: weight,
      },
      courier: null,
      awb: null, // This will be assigned later
      last_scan_location: null,
      last_timestamp: null,
      last_remark: null,
    };
  }

  /**
   * Sync Shopify orders to our database
   */
  async syncOrdersToDatabase(clientId: string): Promise<{
    created: number;
    updated: number;
    total: number;
  }> {
    try {
      console.log(`Fetching orders from Shopify for client ${clientId}...`);
      
      // Get orders from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const shopifyOrders = await this.getOrders(
        100, 
        'any', 
        thirtyDaysAgo.toISOString()
      );
      
      console.log(`Found ${shopifyOrders.length} orders from Shopify to sync`);
      
      let created = 0;
      let updated = 0;
      
      // Process each order
      for (const shopifyOrder of shopifyOrders) {
        // Convert to our format
        const orderData = this.convertShopifyOrderToAppFormat(shopifyOrder, clientId);
        
        // Check if order already exists in our database
        const existingOrder = await this.storage.getOrderByOrderId(orderData.order_id);
        
        if (existingOrder) {
          // Update existing order
          await this.storage.updateOrder(existingOrder.id, orderData);
          updated++;
        } else {
          // Create new order
          await this.storage.createOrder(orderData);
          created++;
        }
      }
      
      console.log(`Synced ${shopifyOrders.length} orders from Shopify: ${created} created, ${updated} updated`);
      
      return {
        created,
        updated,
        total: shopifyOrders.length
      };
    } catch (error) {
      console.error('Error syncing orders from Shopify:', error);
      throw error;
    }
  }
}