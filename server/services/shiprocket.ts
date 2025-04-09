import axios from "axios";
import { IStorage } from "../storage";
import { Client, Order, OrderStatus } from "@shared/schema";

export class ShiprocketService {
  constructor(private storage: IStorage) {}

  // Get tracking information from Shiprocket
  async getTrackingInfo(awb: string, clientId: string): Promise<any> {
    try {
      const client = await this.storage.getClientByClientId(clientId);
      
      if (!client) {
        throw new Error(`Client not found: ${clientId}`);
      }

      // In a real implementation, this would use the Shiprocket API
      const url = `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awb}`;
      
      const headers = {
        'Authorization': `Bearer ${client.shiprocket_api_key}`,
        'Content-Type': 'application/json'
      };

      const response = await axios.get(url, { headers });
      return response.data;
    } catch (error) {
      console.error(`Error fetching tracking info for AWB ${awb}:`, error);
      throw error;
    }
  }

  // Map Shiprocket status to our status
  private mapStatusToOrderStatus(shiprocketStatus: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
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
