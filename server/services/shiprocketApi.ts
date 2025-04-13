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
  private email: string | null = null;
  private password: string | null = null;
  // Maintain a counter for auto-generated AWBs
  private static awbCounter = 1000000;

  constructor(email?: string, password?: string) {
    if (email && password) {
      this.email = email;
      this.password = password;
    }
  }
  
  /**
   * Auto-generate AWB feature has been removed
   * This method is kept as a stub to maintain compatibility with existing code
   * but will not be used for new orders
   */
  generateUniqueAWB(): string {
    console.warn('generateUniqueAWB is deprecated and should not be used');
    return '';
  }

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
      console.log('Using cached token, expiry:', this.tokenExpiry);
      return this.token;
    }

    try {
      console.log('Authenticating with Shiprocket API using credentials:', 
        this.email ? 'Custom email' : 'Default email',
        this.password ? 'Custom password' : 'Default password');
      
      const credentials = {
        email: this.email || 'bfast.technology@gmail.com',
        password: this.password || 'FuTe@e4HIDrub',
      };
      
      const response = await axios.post<ShiprocketAuthResponse>(
        `${this.baseUrl}/auth/login`,
        credentials
      );

      if (response.data && response.data.token) {
        console.log('Successfully authenticated with Shiprocket API');
        this.token = response.data.token;
        // Token is valid for 10 days according to the documentation
        this.tokenExpiry = new Date();
        this.tokenExpiry.setDate(this.tokenExpiry.getDate() + 10);
        return this.token;
      } else {
        console.error('Shiprocket API returned no token in the response:', response.data);
        throw new Error('Failed to obtain token from Shiprocket');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error('Error authenticating with Shiprocket:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        
        // Provide a more helpful error message based on the status code
        if (error.response.status === 401) {
          throw new Error('Shiprocket API authentication failed: Invalid email or password. Please update your credentials in client settings.');
        } else if (error.response.status === 429) {
          throw new Error('Shiprocket API rate limit exceeded. Please try again later.');
        } else {
          throw new Error(`Shiprocket API error (${error.response.status}): ${error.response.data?.message || error.message}`);
        }
      } else {
        console.error('Error authenticating with Shiprocket:', error);
        throw new Error('Failed to connect to Shiprocket API. Please check your internet connection and try again.');
      }
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
   * Force refresh the token
   */
  public async refreshToken(): Promise<void> {
    // Clear current token details
    this.token = undefined;
    this.tokenExpiry = undefined;
    
    // Force a new authentication
    try {
      console.log('Forcing Shiprocket API token refresh...');
      await this.authenticate();
      console.log('Successfully refreshed Shiprocket API token, new expiry:', this.tokenExpiry);
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw new Error('Failed to refresh Shiprocket API token');
    }
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
   * Get all orders from the external Shiprocket API endpoint (v1/external/orders)
   * Note: Shiprocket API seems to have issues with the 'orders' endpoint,
   * so we're trying multiple approaches to get the data.
   */
  async getAllOrders(page = 1, pageSize = 20): Promise<ShiprocketOrdersResponse> {
    try {
      // Direct API approach using the new format you shared
      try {
        const headers = await this.getHeaders();
        console.log('Attempting to fetch orders from direct API with your format');
        
        const response = await axios.get(
          `${this.baseUrl}/orders`,
          { 
            headers,
            params: {
              page,
              per_page: pageSize,
              sort: 'created_at',
              direction: 'desc'
            }
          }
        );
        
        console.log('Successfully fetched from Shiprocket API with status:', response.status);
        
        // Check if data is in the format from your example (an array directly in data field)
        if (response.data && Array.isArray(response.data.data)) {
          console.log(`Found ${response.data.data.length} orders in array format`);
          
          // Transform the data to match our expected format
          const transformedData = {
            data: {
              orders: response.data.data.map((order: any) => ({
                id: order.id || 0,
                order_id: order.channel_order_id || String(order.id),
                order_number: order.channel_order_id || String(order.id),
                channel_order_id: order.channel_order_id || '',
                channel: order.channel_name || 'Custom',
                order_date: order.created_at || new Date().toISOString(),
                pickup_date: null,
                status: order.status || 'unfulfilled',
                status_code: order.status_code || 1,
                awb_code: order.awb || order.last_mile_awb || '',
                courier_name: order.courier_name || order.last_mile_courier_name || 'Unknown',
                payment_method: order.payment_method || 'COD',
                total: order.total || '0',
                billing_customer_name: order.customer_name || '',
                shipping_customer_name: order.customer_name || '',
                shipping_address: order.customer_address || '',
                shipping_city: order.customer_city || '',
                shipping_state: order.customer_state || '',
                shipping_country: order.customer_country || 'India',
                shipping_pincode: order.customer_pincode || ''
              })),
              total_pages: Math.ceil(response.data.data.length / pageSize) || 1,
              current_page: page || 1,
              from: 1,
              to: response.data.data.length,
              total: response.data.data.length
            }
          };
          
          return transformedData as ShiprocketOrdersResponse;
        }
        
        // Try standard format as fallback
        if (response.data && response.data.data && response.data.data.orders) {
          console.log(`Found ${response.data.data.orders.length} orders in standard format`);
          return response.data;
        } else {
          console.log('No orders found in standard response or unexpected structure');
        }
      } catch (directApiError) {
        console.error('Error with direct API:', directApiError);
      }
      
      // If the above fails, let's try the "shipments" endpoint instead, which might be more reliable
      try {
        const headers = await this.getHeaders();
        console.log('Attempting to fetch orders using shipments endpoint');
        
        const response = await axios.get(
          `${this.baseUrl}/shipments`,
          { 
            headers,
            params: {
              page,
              per_page: pageSize,
              sort: 'created_at',
              direction: 'desc'
            }
          }
        );
        
        console.log('Successfully fetched shipments data:', 
          response.status, 
          JSON.stringify(Object.keys(response.data || {})));
        
        // Convert shipments format to match orders format
        if (response.data && response.data.data && Array.isArray(response.data.data.shipments)) {
          console.log(`Found ${response.data.data.shipments.length} shipments`);
          
          // Transform the shipments to match the orders format
          const transformedData = {
            data: {
              orders: response.data.data.shipments.map((shipment: any) => ({
                id: shipment.id,
                order_id: shipment.order_id,
                order_number: shipment.order_id,
                channel_order_id: shipment.channel_order_id,
                channel: shipment.channel || 'shiprocket',
                order_date: shipment.created_at,
                pickup_date: shipment.pickup_scheduled_date,
                status: shipment.status,
                status_code: 1,
                awb_code: shipment.awb,
                courier_name: shipment.courier_name,
                payment_method: shipment.payment_method,
                total: shipment.total,
                shipping_customer_name: shipment.customer_name,
                shipping_address: shipment.customer_address,
                shipping_city: shipment.customer_city,
                shipping_state: shipment.customer_state,
                shipping_country: shipment.customer_country || 'India',
                shipping_pincode: shipment.customer_pincode
              })),
              total_pages: response.data.meta?.pagination?.total_pages || 1,
              current_page: response.data.meta?.pagination?.current_page || 1,
              from: response.data.meta?.pagination?.from || 1,
              to: response.data.meta?.pagination?.to || response.data.data.shipments.length,
              total: response.data.meta?.pagination?.total || response.data.data.shipments.length
            }
          };
          
          return transformedData as ShiprocketOrdersResponse;
        } else {
          console.log('No shipments found in response or unexpected structure');
        }
      } catch (shipmentEndpointError) {
        console.error('Error with shipments endpoint:', shipmentEndpointError);
      }
      
      // If all fails, throw an error that will be caught by the outer catch block
      throw new Error('All attempts to fetch Shiprocket data failed');
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('Error fetching all orders from Shiprocket API:', {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            headers: error.response.headers,
            config: {
              url: error.config?.url,
              method: error.config?.method,
              params: error.config?.params
            }
          });
        } else if (error.request) {
          console.error('Error fetching all orders from Shiprocket API: No response received', {
            request: error.request
          });
        } else {
          console.error('Error fetching all orders from Shiprocket API:', error.message);
        }
      } else {
        console.error('Error fetching all orders from Shiprocket API:', error);
      }
      throw new Error('Failed to fetch all orders from Shiprocket');
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
  async trackShipment(awb: string, clientId?: string): Promise<any> {
    try {
      let headers;
      
      // If clientId is provided, try to use that client's credentials
      if (clientId) {
        const client = await storage.getClientByClientId(clientId);
        if (client && (client.shiprocket_email && client.shiprocket_password)) {
          // Create a new instance with the client credentials
          const clientApi = new ShiprocketApiService(
            client.shiprocket_email, 
            client.shiprocket_password
          );
          try {
            return await clientApi.trackShipment(awb);
          } catch (clientError) {
            console.warn(`Client-specific credentials failed for AWB ${awb}, trying default credentials:`, clientError);
            // If client credentials fail, fall back to default credentials
          }
        }
      }
      
      // Get headers (this will throw if token refresh fails)
      headers = await this.getHeaders();
      
      // Make the API request with proper error handling
      const response = await axios.get(
        `${this.baseUrl}/courier/track/awb/${awb}`,
        { headers }
      );
      
      // Check if the response has the expected structure
      if (response.data && (response.data.tracking_data || response.data.status === 200)) {
        return response.data;
      } else if (response.data && response.data.message) {
        throw new Error(response.data.message);
      } else {
        console.warn(`Unexpected response format for AWB ${awb}:`, response.data);
        throw new Error(`Invalid response format from Shiprocket API for AWB ${awb}`);
      }
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        // Log the specific error response
        console.error(`Shiprocket API error for AWB ${awb}:`, error.response.status, error.response.data);
        
        // Handle specific status codes with more informative messages
        if (error.response.status === 401) {
          // Attempt to refresh token and provide specific guidance
          await this.refreshToken();
          throw new Error(`Shiprocket API authentication failed for AWB ${awb}. Please verify your Shiprocket credentials in client settings or contact support.`);
        } else if (error.response.status === 404) {
          throw new Error(`AWB ${awb} not found in Shiprocket system. Please verify the AWB number is correct.`);
        } else if (error.response.status === 429) {
          throw new Error(`Shiprocket API rate limit exceeded. Please try again in a few minutes.`);
        } else if (error.response.status >= 500) {
          throw new Error(`Shiprocket API server error (${error.response.status}). This is an issue with Shiprocket's servers, please try again later.`);
        } else {
          throw new Error(error.response.data?.message || `Shiprocket API error (${error.response.status}) while tracking AWB ${awb}`);
        }
      } else {
        console.error(`Error tracking shipment with AWB ${awb}:`, error);
        throw new Error(error.message || `Failed to track shipment with AWB ${awb}`);
      }
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
      // Get orders from Shiprocket using the updated getAllOrders method that handles the new format
      const shiprocketOrdersData = await this.getAllOrders(1, 100);
      
      // Check if we have valid data
      if (!shiprocketOrdersData || !shiprocketOrdersData.data || !shiprocketOrdersData.data.orders) {
        console.warn('No orders data returned from Shiprocket API');
        return;
      }
      
      const shiprocketOrders = shiprocketOrdersData.data.orders;
      
      // Additional safety check
      if (!Array.isArray(shiprocketOrders)) {
        console.warn('Orders data from Shiprocket is not an array:', shiprocketOrders);
        return;
      }
      
      console.log(`Found ${shiprocketOrders.length} orders from Shiprocket to sync to database`);
      let created = 0;
      let updated = 0;
      
      // For each order, check if it exists in our database
      for (const order of shiprocketOrders) {
        // Generate order ID from Shiprocket data
        const orderId = order.order_id || order.channel_order_id || String(order.id);
        
        // Check if order exists by order ID
        const existingOrderById = await storage.getOrderByOrderId(orderId);
        let existingOrder = existingOrderById;
        
        // If not found by ID, try AWB if available
        if (!existingOrder && order.awb_code) {
          existingOrder = await storage.getOrderByAWB(order.awb_code);
        }
        
        // Create a standard order object from Shiprocket data
        // Note: Auto-generate AWB feature has been removed
        
        const orderData = {
          client_id: 'SHIPROCKET', // Default client ID for Shiprocket orders
          shopify_store_id: order.channel || 'Custom',
          order_id: orderId,
          awb: order.awb_code || '',
          fulfillment_status: this.mapShiprocketStatusToOurStatus(order.status),
          shipping_details: {
            name: order.shipping_customer_name || order.billing_customer_name || '',
            email: order.shipping_email || '',
            phone_1: order.shipping_phone || '',
            address: order.shipping_address || '',
            city: order.shipping_city || '',
            state: order.shipping_state || '',
            country: order.shipping_country || 'India',
            pincode: order.shipping_pincode || '',
            payment_mode: order.payment_method || 'COD',
            shipping_method: 'Standard', // Default shipping method
            amount: parseFloat(order.total) || 0
          },
          product_details: {
            product_name: `Order from ${order.channel || 'Shiprocket'}`,
            category: 'Default',
            quantity: 1, // Default quantity
            price: parseFloat(order.total) || 0,
            dimensions: [10, 10, 10] as [number, number, number], // Default dimensions [length, width, height]
            weight: 0.5 // Default weight in kg
          },
          pickup_date: order.pickup_date ? new Date(order.pickup_date) : null,
          created_at: order.order_date ? new Date(order.order_date) : new Date()
        };
        
        if (!existingOrder) {
          // Create new order if it doesn't exist
          await storage.createOrder(orderData);
          created++;
        } else {
          // Update existing order with new data
          // If we already have an AWB (including auto-assigned ones), don't overwrite it with empty string
          const newAwb = order.awb_code || existingOrder.awb || autoAssignedAwb;
          
          await storage.updateOrder(existingOrder.id, {
            awb: newAwb,
            fulfillment_status: this.mapShiprocketStatusToOurStatus(order.status),
            shipping_details: {
              ...existingOrder.shipping_details,
              ...orderData.shipping_details
            },
            product_details: {
              ...existingOrder.product_details,
              price: parseFloat(order.total) || existingOrder.product_details.price
            }
          });
          updated++;
        }
      }
      
      console.log(`Synced ${shiprocketOrders.length} orders from Shiprocket: ${created} created, ${updated} updated`);
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