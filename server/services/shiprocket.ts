import axios from "axios";
import { IStorage } from "../storage";
import { Client, Order, OrderStatus } from "@shared/schema";

export class ShiprocketService {
  private token: string | null = null;
  private tokenExpiry: Date | null = null;
  
  constructor(private storage: IStorage) {}

  // Authenticate with Shiprocket API
  async authenticate(): Promise<string> {
    try {
      // Check if we have a valid token
      if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
        return this.token;
      }
      
      const url = "https://apiv2.shiprocket.in/v1/external/auth/login";
      const response = await axios.post(url, {
        email: "bfast.technology@gmail.com",
        password: "FuTe@e4HIDrub"
      });
      
      if (response.data && response.data.token) {
        this.token = response.data.token;
        
        // Set token expiry (usually 24 hours for Shiprocket)
        this.tokenExpiry = new Date();
        this.tokenExpiry.setHours(this.tokenExpiry.getHours() + 23); // Set expiry to 23 hours to be safe
        
        return this.token;
      } else {
        throw new Error("Authentication failed: No token received");
      }
    } catch (error) {
      console.error("Error authenticating with Shiprocket:", error);
      throw error;
    }
  }

  // Get tracking information from Shiprocket
  async getTrackingInfo(awb: string, clientId: string): Promise<any> {
    try {
      // Get client for context/logging
      const client = await this.storage.getClientByClientId(clientId);
      
      if (!client) {
        throw new Error(`Client not found: ${clientId}`);
      }

      // Get authentication token
      const token = await this.authenticate();
      
      const url = `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awb}`;
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await axios.get(url, { headers });
      return response.data;
    } catch (error) {
      console.error(`Error fetching tracking info for AWB ${awb}:`, error);
      throw error;
    }
  }
  
  // Fetch all orders from Shiprocket
  async fetchAllOrders(): Promise<any> {
    try {
      const token = await this.authenticate();
      
      const url = "https://apiv2.shiprocket.in/v1/external/orders";
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const response = await axios.get(url, { headers });
      return response.data;
    } catch (error) {
      console.error("Error fetching orders from Shiprocket:", error);
      throw error;
    }
  }
  
  // Fetch all shipments from Shiprocket
  async fetchAllShipments(): Promise<any> {
    try {
      const token = await this.authenticate();
      
      const url = "https://apiv2.shiprocket.in/v1/external/shipments";
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const response = await axios.get(url, { headers });
      return response.data;
    } catch (error) {
      console.error("Error fetching shipments from Shiprocket:", error);
      throw error;
    }
  }

  // Map Shiprocket status to our status
  private mapStatusToOrderStatus(shiprocketStatus: string): typeof OrderStatus[keyof typeof OrderStatus] {
    const statusMap: Record<string, typeof OrderStatus[keyof typeof OrderStatus]> = {
      'Delivered': OrderStatus.DELIVERED,
      'RTO Delivered': OrderStatus.RTO,
      'Return Initiated': OrderStatus.RTO,
      'Out for Delivery': OrderStatus.INPROCESS,
      'In Transit': OrderStatus.INPROCESS,
      'Pickup Generated': OrderStatus.INPROCESS,
      'Pickup Scheduled': OrderStatus.INPROCESS,
      'Pickup Error': OrderStatus.NDR,
      'Undelivered': OrderStatus.NDR,
      'Cancelled': OrderStatus.LOST,
      'Lost': OrderStatus.LOST
    };

    return statusMap[shiprocketStatus] || OrderStatus.INPROCESS;
  }

  // Update order status based on tracking information
  async updateOrderStatus(order: Order): Promise<void> {
    try {
      // Skip if no AWB
      if (!order.awb) {
        return;
      }

      const trackingInfo = await this.getTrackingInfo(order.awb, order.client_id);
      
      if (!trackingInfo || !trackingInfo.tracking_data) {
        return;
      }

      const { tracking_data } = trackingInfo;
      const status = this.mapStatusToOrderStatus(tracking_data.shipment_status);
      
      // Get the latest scan from the tracking history
      const latestScan = tracking_data.shipment_track && tracking_data.shipment_track[0];
      
      await this.storage.updateOrder(order.id, {
        delivery_status: status,
        last_scan_location: latestScan?.location || order.last_scan_location,
        last_timestamp: latestScan?.date ? new Date(latestScan.date) : order.last_timestamp,
        last_remark: latestScan?.status_detail || order.last_remark
      });
    } catch (error) {
      console.error(`Error updating status for order ${order.order_id}:`, error);
    }
  }

  // Update all orders with AWB
  async updateAllOrdersStatus(): Promise<void> {
    try {
      const allOrders = await this.storage.getAllOrders();
      const ordersWithAwb = allOrders.filter(order => !!order.awb);
      
      // Update each order (limit concurrency by processing in batches)
      for (const order of ordersWithAwb) {
        await this.updateOrderStatus(order);
      }
      
      console.log(`Updated status for ${ordersWithAwb.length} orders`);
    } catch (error) {
      console.error("Error updating all orders status:", error);
    }
  }
}
