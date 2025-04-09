import axios from 'axios';
import { storage } from '../storage';
import { OrderStatus, OrderStatusType } from '@shared/schema';

interface ShiprocketAuthResponse {
  token: string;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  company_name: string;
  created_at: string;
}

interface ShiprocketOrder {
  id: number;
  order_id: string;
  order_number: string;
  channel_order_id: string;
  company_id: number;
  order_date: string;
  pickup_date: string;
  channel_id: number;
  pickup_address_id: number;
  status: string;
  status_code: number;
  awb_code: string;
  courier_name: string;
  payment_method: string;
  total: string;
  shipment_id: string;
  subtotal: string;
  channel: string;
  billing_customer_name: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_country: string;
  billing_pincode: string;
  billing_email: string;
  billing_phone: string;
  shipping_customer_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_country: string;
  shipping_pincode: string;
  shipping_email: string;
  shipping_phone: string;
  // Add any other fields needed
}

interface ShiprocketOrdersResponse {
  data: {
    orders: ShiprocketOrder[];
    total_pages: number;
    current_page: number;
    from: number;
    to: number;
    total: number;
  };
}

export class ShiprocketApiService {
  private baseUrl = 'https://apiv2.shiprocket.in/v1/external';
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {}

  /**
   * Test authentication with provided credentials
   */
  async testAuthentication(email: string, password: string): Promise<boolean> {
    try {
      const response = await axios.post<ShiprocketAuthResponse>(
        `${this.baseUrl}/auth/login`,
        { email, password }
      );
      
      return !!response.data.token;
    } catch (error) {
      console.error('Error testing authentication with Shiprocket:', error);
      throw new Error('Failed to authenticate with Shiprocket: Invalid credentials');
    }
  }

  /**
   * Authenticate with Shiprocket API and get token
   */
  private async authenticate(): Promise<string> {
    // If token exists and is not expired, return it
    if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.token;
    }

    try {
      const response = await axios.post<ShiprocketAuthResponse>(
        `${this.baseUrl}/auth/login`,
        {
          email: 'bfast.technology@gmail.com',
          password: 'FuTe@e4HIDrub',
        }
      );

      this.token = response.data.token;
      // Token is valid for 10 days according to the documentation
      this.tokenExpiry = new Date();
      this.tokenExpiry.setDate(this.tokenExpiry.getDate() + 10);

      return this.token;
    } catch (error) {
      console.error('Error authenticating with Shiprocket:', error);
      throw new Error('Failed to authenticate with Shiprocket');
    }
  }

  /**
   * Get headers with authentication token
   */
  private async getHeaders() {
    const token = await this.authenticate();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Get all orders from Shiprocket
   */
  async getOrders(page = 1, pageSize = 20): Promise<ShiprocketOrdersResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get<ShiprocketOrdersResponse>(
        `${this.baseUrl}/orders?page=${page}&per_page=${pageSize}`,
        { headers }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching orders from Shiprocket:', error);
      throw new Error('Failed to fetch orders from Shiprocket');
    }
  }

  /**
   * Get order details from Shiprocket by order ID
   */
  async getOrderById(orderId: string): Promise<ShiprocketOrder> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get<{ data: ShiprocketOrder }>(
        `${this.baseUrl}/orders/show/${orderId}`,
        { headers }
      );
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching order ${orderId} from Shiprocket:`, error);
      throw new Error(`Failed to fetch order ${orderId} from Shiprocket`);
    }
  }

  /**
   * Track shipment using AWB number
   */
  async trackShipment(awb: string): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(
        `${this.baseUrl}/courier/track/awb/${awb}`,
        { headers }
      );
      return response.data;
    } catch (error) {
      console.error(`Error tracking shipment with AWB ${awb}:`, error);
      throw new Error(`Failed to track shipment with AWB ${awb}`);
    }
  }

  /**
   * Get all pickup locations
   */
  async getPickupLocations(): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(
        `${this.baseUrl}/settings/company/pickup`,
        { headers }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching pickup locations:', error);
      throw new Error('Failed to fetch pickup locations');
    }
  }

  /**
   * Get all channels
   */
  async getChannels(): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(
        `${this.baseUrl}/channels`,
        { headers }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching channels:', error);
      throw new Error('Failed to fetch channels');
    }
  }

  /**
   * Sync orders from Shiprocket to our database
   */
  async syncOrdersToDatabase(): Promise<void> {
    try {
      // Get orders from Shiprocket
      const shiprocketOrdersData = await this.getOrders(1, 100);
      const shiprocketOrders = shiprocketOrdersData.data.orders;
      
      // For each order, check if it exists in our database
      for (const order of shiprocketOrders) {
        // Check if order exists by AWB
        const existingOrder = await storage.getOrderByAWB(order.awb_code);
        
        if (!existingOrder) {
          // Create new order if it doesn't exist
          // Map Shiprocket order format to our database format
          const newOrder = {
            client_id: 'SHIPROCKET', // Default client ID for Shiprocket orders
            shopify_store_id: order.channel || 'shiprocket',
            order_id: order.order_id,
            awb: order.awb_code,
            fulfillment_status: this.mapShiprocketStatusToOurStatus(order.status),
            shipping_details: {
              name: order.shipping_customer_name,
              email: order.shipping_email,
              phone_1: order.shipping_phone,
              address: order.shipping_address,
              city: order.shipping_city,
              state: order.shipping_state,
              country: order.shipping_country,
              pincode: order.shipping_pincode,
              payment_mode: order.payment_method,
              shipping_method: 'Standard', // Default shipping method
              amount: parseFloat(order.total) || 0
            },
            product_details: {
              product_name: `Order from ${order.channel || 'Shiprocket'}`,
              category: 'Default',
              quantity: 1, // Default quantity
              price: parseFloat(order.subtotal) || 0,
              dimensions: [10, 10, 10], // Default dimensions [length, width, height]
              weight: 0.5 // Default weight in kg
            },
            pickup_date: order.pickup_date,
            created_at: new Date(order.order_date)
          };
          
          await storage.createOrder(newOrder);
        } else {
          // Update existing order
          const updatedOrder = {
            fulfillment_status: this.mapShiprocketStatusToOurStatus(order.status),
            awb: order.awb_code
          };
          
          await storage.updateOrder(existingOrder.id, updatedOrder);
        }
      }
      
      console.log(`Synced ${shiprocketOrders.length} orders from Shiprocket`);
    } catch (error) {
      console.error('Error syncing orders from Shiprocket:', error);
      throw new Error('Failed to sync orders from Shiprocket');
    }
  }

  /**
   * Map Shiprocket status to our status format
   */
  private mapShiprocketStatusToOurStatus(shiprocketStatus: string): OrderStatusType {
    // Map Shiprocket status to our status format
    const statusMap: Record<string, OrderStatusType> = {
      'PENDING': OrderStatus.PENDING,
      'NEW': OrderStatus.PENDING,
      'PICKUP SCHEDULED': OrderStatus.PENDING,
      'PICKUP BOOKED': OrderStatus.PENDING,
      'READY TO SHIP': OrderStatus.PENDING,
      'SHIPPED': OrderStatus.INPROCESS,
      'IN TRANSIT': OrderStatus.INPROCESS,
      'OUT FOR DELIVERY': OrderStatus.INPROCESS,
      'DELIVERED': OrderStatus.DELIVERED,
      'RTO INITIATED': OrderStatus.RTO,
      'RTO IN TRANSIT': OrderStatus.RTO,
      'RTO DELIVERED': OrderStatus.RTO,
      'CANCELLED': OrderStatus.PENDING, // Map to PENDING since we don't have CANCELLED
      'LOST': OrderStatus.LOST,
      'DAMAGED': OrderStatus.PENDING, // Map to PENDING since we don't have DAMAGED
      'NDR': OrderStatus.NDR
    };
    
    const upperStatus = shiprocketStatus.toUpperCase();
    return statusMap[upperStatus] || OrderStatus.PENDING;
  }
}

export const shiprocketApiService = new ShiprocketApiService();