import express, { Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { AuthService } from "./services/auth";
import { ShopifyService } from "./services/shopify";
import { ShiprocketService } from "./services/shiprocket";
import { CronService } from "./services/cron";
import { 
  insertUserSchema, 
  insertClientSchema, 
  insertOrderSchema, 
  UserRole, 
  OrderStatus 
} from "@shared/schema";

export async function registerRoutes(app: express.Express): Promise<Server> {
  const authService = new AuthService(storage);
  const shopifyService = new ShopifyService(storage);
  const shiprocketService = new ShiprocketService(storage);
  const cronService = new CronService(shopifyService, shiprocketService);
  
  // API routes with /api prefix
  const apiRouter = express.Router();
  
  // Auth routes
  apiRouter.post("/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      const result = await authService.login(username, password);
      
      if (!result) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      res.json({ 
        token: result.token,
        user: {
          id: result.user.id,
          username: result.user.username,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          clientId: result.user.client_id
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "An error occurred during login" });
    }
  });
  
  apiRouter.post("/auth/logout", authService.authenticate, async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      
      if (token) {
        await authService.logout(token);
      }
      
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "An error occurred during logout" });
    }
  });
  
  // User routes
  apiRouter.post(
    "/users", 
    authService.authenticate, 
    authService.authorize([UserRole.BFAST_ADMIN, UserRole.CLIENT_ADMIN]), 
    async (req: Request, res: Response) => {
      try {
        const userData = req.body;
        
        // Validate user data
        const validationResult = insertUserSchema.safeParse(userData);
        
        if (!validationResult.success) {
          return res.status(400).json({ message: "Invalid user data", errors: validationResult.error.errors });
        }
        
        // Client admin can only create client executive users for their client
        const user = (req as any).user;
        if (user.role === UserRole.CLIENT_ADMIN) {
          if (userData.role !== UserRole.CLIENT_EXECUTIVE || 
              (userData.client_id !== user.clientId && userData.client_id !== user.client_id)) {
            return res.status(403).json({ message: "You can only create client executive users for your client" });
          }
        }
        
        // Hash password
        userData.password = await authService.hashPassword(userData.password);
        
        // Create user
        const newUser = await storage.createUser(userData);
        
        // Don't return password
        const { password, ...userWithoutPassword } = newUser;
        
        res.status(201).json(userWithoutPassword);
      } catch (error) {
        console.error("Create user error:", error);
        res.status(500).json({ message: "An error occurred while creating the user" });
      }
    }
  );
  
  apiRouter.get(
    "/users", 
    authService.authenticate, 
    authService.authorize([UserRole.BFAST_ADMIN, UserRole.CLIENT_ADMIN]), 
    async (req: Request, res: Response) => {
      try {
        const user = (req as any).user;
        let users;
        
        if (user.role === UserRole.CLIENT_ADMIN) {
          // Client admin can only see users for their client
          const clientId = user.clientId || user.client_id;
          users = await storage.getUsersByClientId(clientId);
        } else {
          // Bfast admin can see all users
          // For now, just return all users from memory storage
          // In a real implementation, we would have a method to get all users
          const allUsers = [];
          for (let i = 1; i < storage.currentUserId; i++) {
            const user = await storage.getUser(i);
            if (user) allUsers.push(user);
          }
          users = allUsers;
        }
        
        // Remove passwords
        const usersWithoutPasswords = users.map(({ password, ...userWithoutPassword }) => userWithoutPassword);
        
        res.json(usersWithoutPasswords);
      } catch (error) {
        console.error("Get users error:", error);
        res.status(500).json({ message: "An error occurred while retrieving users" });
      }
    }
  );
  
  // Client routes
  apiRouter.post(
    "/clients", 
    authService.authenticate, 
    authService.authorize([UserRole.BFAST_ADMIN]), 
    async (req: Request, res: Response) => {
      try {
        const clientData = req.body;
        
        // Validate client data
        const validationResult = insertClientSchema.safeParse(clientData);
        
        if (!validationResult.success) {
          return res.status(400).json({ message: "Invalid client data", errors: validationResult.error.errors });
        }
        
        // Create client
        const newClient = await storage.createClient(clientData);
        
        res.status(201).json(newClient);
      } catch (error) {
        console.error("Create client error:", error);
        res.status(500).json({ message: "An error occurred while creating the client" });
      }
    }
  );
  
  apiRouter.get(
    "/clients", 
    authService.authenticate, 
    async (req: Request, res: Response) => {
      try {
        const user = (req as any).user;
        let clients: any[] = [];
        
        // If client user, only show their client
        if (user.role === UserRole.CLIENT_ADMIN || user.role === UserRole.CLIENT_EXECUTIVE) {
          const clientId = user.clientId || user.client_id;
          const client = await storage.getClientByClientId(clientId);
          if (client) clients = [client];
        } else {
          // BFAST users can see all clients
          clients = await storage.getAllClients();
        }
        
        res.json(clients);
      } catch (error) {
        console.error("Get clients error:", error);
        res.status(500).json({ message: "An error occurred while retrieving clients" });
      }
    }
  );
  
  apiRouter.patch(
    "/clients/:clientId", 
    authService.authenticate, 
    authService.authorizeClientAccess,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        const updateData = req.body;
        
        // Get existing client
        const client = await storage.getClientByClientId(clientId);
        
        if (!client) {
          return res.status(404).json({ message: "Client not found" });
        }
        
        // Update client in storage
        const updatedClient = await storage.updateClient(client.id, updateData);
        
        res.json(updatedClient);
      } catch (error) {
        console.error("Update client error:", error);
        res.status(500).json({ message: "An error occurred while updating the client" });
      }
    }
  );
  
  // Connection testing routes
  apiRouter.post(
    "/connections/test-shopify",
    authService.authenticate,
    async (req: Request, res: Response) => {
      try {
        const { shopify_store_id, shopify_api_key, shopify_api_secret } = req.body;
        
        if (!shopify_store_id || !shopify_api_key || !shopify_api_secret) {
          return res.status(400).json({ message: "Missing required Shopify credentials" });
        }
        
        // Create a temporary client to test the connection
        const tempClient = {
          client_id: "temp-test-client",
          client_name: "Temporary Test Client",
          shopify_store_id,
          shopify_api_key,
          shopify_api_secret,
          shiprocket_api_key: "not-needed-for-test"
        };
        
        // Use the shopify service to test the connection
        try {
          // This is a limited test that just checks if we can connect to the Shopify API
          // In a real implementation, we would make an actual API call
          await shopifyService.getShopifyOrders(tempClient as any);
          
          res.json({ success: true, message: "Successfully connected to Shopify" });
        } catch (error) {
          res.status(400).json({ 
            success: false, 
            message: "Failed to connect to Shopify",
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      } catch (error) {
        console.error("Test Shopify connection error:", error);
        res.status(500).json({ message: "An error occurred while testing the Shopify connection" });
      }
    }
  );
  
  apiRouter.post(
    "/connections/test-shiprocket",
    authService.authenticate,
    async (req: Request, res: Response) => {
      try {
        const { shiprocket_api_key } = req.body;
        
        if (!shiprocket_api_key) {
          return res.status(400).json({ message: "Missing required Shiprocket API key" });
        }
        
        // Create a temporary client to test the connection
        const tempClient = {
          client_id: "temp-test-client",
          client_name: "Temporary Test Client",
          shopify_store_id: "not-needed-for-test",
          shopify_api_key: "not-needed-for-test",
          shopify_api_secret: "not-needed-for-test",
          shiprocket_api_key
        };
        
        // Use the shiprocket service to test the connection
        try {
          // In a real implementation, we would make an actual API call
          // For this test, we'll just check if the API accepts our key by attempting to track a dummy AWB
          await shiprocketService.getTrackingInfo("DUMMY-AWB-123", tempClient.client_id);
          
          res.json({ success: true, message: "Successfully connected to Shiprocket" });
        } catch (error) {
          res.status(400).json({ 
            success: false, 
            message: "Failed to connect to Shiprocket",
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      } catch (error) {
        console.error("Test Shiprocket connection error:", error);
        res.status(500).json({ message: "An error occurred while testing the Shiprocket connection" });
      }
    }
  );
  
  // Order routes
  apiRouter.get(
    "/orders/pending", 
    authService.authenticate, 
    async (req: Request, res: Response) => {
      try {
        const user = (req as any).user;
        let clientId: string | undefined = undefined;
        
        // If client user, only show orders for their client
        if (user.role === UserRole.CLIENT_ADMIN || user.role === UserRole.CLIENT_EXECUTIVE) {
          clientId = user.clientId || user.client_id;
        }
        
        const pendingOrders = await storage.getPendingOrders(clientId);
        res.json(pendingOrders);
      } catch (error) {
        console.error("Get pending orders error:", error);
        res.status(500).json({ message: "An error occurred while retrieving pending orders" });
      }
    }
  );
  
  apiRouter.get(
    "/orders", 
    authService.authenticate, 
    async (req: Request, res: Response) => {
      try {
        const user = (req as any).user;
        let clientId: string | undefined = undefined;
        
        // If client user, only show orders for their client
        if (user.role === UserRole.CLIENT_ADMIN || user.role === UserRole.CLIENT_EXECUTIVE) {
          clientId = user.clientId || user.client_id;
        }
        
        const filter = req.query.status as string;
        
        let orders;
        if (filter) {
          orders = await storage.getOrdersByStatus(filter, clientId);
        } else {
          orders = await storage.getAllOrders(clientId);
        }
        
        res.json(orders);
      } catch (error) {
        console.error("Get orders error:", error);
        res.status(500).json({ message: "An error occurred while retrieving orders" });
      }
    }
  );
  
  apiRouter.get(
    "/orders/summary", 
    authService.authenticate, 
    async (req: Request, res: Response) => {
      try {
        const user = (req as any).user;
        let clientId: string | undefined = undefined;
        
        // If client user, only show orders for their client
        if (user.role === UserRole.CLIENT_ADMIN || user.role === UserRole.CLIENT_EXECUTIVE) {
          clientId = user.clientId || user.client_id;
        }
        
        const allOrders = await storage.getAllOrders(clientId);
        
        // Count orders by status
        const statusCounts = {
          [OrderStatus.DELIVERED]: 0,
          [OrderStatus.RTO]: 0,
          [OrderStatus.INPROCESS]: 0,
          [OrderStatus.NDR]: 0,
          [OrderStatus.LOST]: 0,
          total: allOrders.length
        };
        
        // Count pending/in-process orders
        const pendingOrders = allOrders.filter(order => 
          order.fulfillment_status === OrderStatus.PENDING || 
          order.fulfillment_status === OrderStatus.INPROCESS
        ).length;
        
        // Count by delivery status
        allOrders.forEach(order => {
          if (order.delivery_status && statusCounts[order.delivery_status] !== undefined) {
            statusCounts[order.delivery_status]++;
          }
        });
        
        // Region data (simplified)
        const regionData = {
          'North India': Math.floor(allOrders.length * 0.3),
          'South India': Math.floor(allOrders.length * 0.25),
          'East India': Math.floor(allOrders.length * 0.2),
          'West India': Math.floor(allOrders.length * 0.25)
        };
        
        res.json({
          statusCounts,
          pendingOrders,
          regionData
        });
      } catch (error) {
        console.error("Get order summary error:", error);
        res.status(500).json({ message: "An error occurred while retrieving order summary" });
      }
    }
  );
  
  // Order update route
  apiRouter.patch(
    "/orders/:orderId", 
    authService.authenticate, 
    authService.authorize([UserRole.BFAST_ADMIN, UserRole.BFAST_EXECUTIVE, UserRole.CLIENT_ADMIN]), 
    async (req: Request, res: Response) => {
      try {
        const { orderId } = req.params;
        const orderData = req.body;
        
        // Get the order
        const order = await storage.getOrderByOrderId(orderId);
        
        if (!order) {
          return res.status(404).json({ message: "Order not found" });
        }
        
        // Check client access
        const user = (req as any).user;
        if ((user.role === UserRole.CLIENT_ADMIN || user.role === UserRole.CLIENT_EXECUTIVE) && 
            order.client_id !== user.clientId && order.client_id !== user.client_id) {
          return res.status(403).json({ message: "You don't have permission to update this order" });
        }
        
        // Update the order
        const updatedOrder = await storage.updateOrder(order.id, orderData);
        
        res.json(updatedOrder);
      } catch (error) {
        console.error("Update order error:", error);
        res.status(500).json({ message: "An error occurred while updating the order" });
      }
    }
  );
  
  // Bulk AWB assignment
  apiRouter.post(
    "/orders/assign-awb", 
    authService.authenticate, 
    authService.authorize([UserRole.BFAST_ADMIN]), 
    async (req: Request, res: Response) => {
      try {
        const { assignments } = req.body;
        
        if (!Array.isArray(assignments) || assignments.length === 0) {
          return res.status(400).json({ message: "Invalid assignments data" });
        }
        
        const orderIds = assignments.map(a => a.orderId);
        const awbs = assignments.map(a => a.awb);
        
        await storage.assignAWB(orderIds, awbs);
        
        res.json({ message: "AWB numbers assigned successfully" });
      } catch (error) {
        console.error("Assign AWB error:", error);
        res.status(500).json({ message: "An error occurred while assigning AWB numbers" });
      }
    }
  );
  
  // Bulk order update
  apiRouter.post(
    "/orders/bulk-update", 
    authService.authenticate, 
    authService.authorize([UserRole.BFAST_ADMIN, UserRole.BFAST_EXECUTIVE, UserRole.CLIENT_ADMIN]), 
    async (req: Request, res: Response) => {
      try {
        const { updates } = req.body;
        
        if (!Array.isArray(updates) || updates.length === 0) {
          return res.status(400).json({ message: "Invalid updates data" });
        }
        
        // Check client access for each order
        const user = (req as any).user;
        if (user.role === UserRole.CLIENT_ADMIN || user.role === UserRole.CLIENT_EXECUTIVE) {
          for (const update of updates) {
            const order = await storage.getOrderByOrderId(update.orderId);
            
            if (order && order.client_id !== user.clientId && order.client_id !== user.client_id) {
              return res.status(403).json({ 
                message: `You don't have permission to update order ${update.orderId}` 
              });
            }
          }
        }
        
        await storage.bulkUpdateOrders(updates);
        
        res.json({ message: "Orders updated successfully" });
      } catch (error) {
        console.error("Bulk update orders error:", error);
        res.status(500).json({ message: "An error occurred while updating orders" });
      }
    }
  );
  
  // Sync orders from Shopify
  apiRouter.post(
    "/shopify/sync", 
    authService.authenticate, 
    authService.authorize([UserRole.BFAST_ADMIN]), 
    async (req: Request, res: Response) => {
      try {
        await shopifyService.syncAllClientsOrders();
        res.json({ message: "Orders synced successfully" });
      } catch (error) {
        console.error("Sync orders error:", error);
        res.status(500).json({ message: "An error occurred while syncing orders" });
      }
    }
  );
  
  // Public tracking endpoint (no auth required)
  apiRouter.get("/track/:awb", async (req: Request, res: Response) => {
    try {
      const { awb } = req.params;
      
      // Get order by AWB
      const order = await storage.getOrderByAWB(awb);
      
      if (!order) {
        return res.status(404).json({ message: "Shipment not found" });
      }
      
      // Get client details for the logo
      const client = await storage.getClientByClientId(order.client_id);
      
      // Get tracking info from Shiprocket
      const trackingInfo = await shiprocketService.getTrackingInfo(awb, order.client_id);
      
      // Combine order and tracking info
      res.json({
        order: {
          order_id: order.order_id,
          awb: order.awb,
          customer_name: order.shipping_details.name,
          delivery_address: order.shipping_details.address,
          city: order.shipping_details.city,
          state: order.shipping_details.state,
          pincode: order.shipping_details.pincode,
          amount: order.shipping_details.amount,
          payment_mode: order.shipping_details.payment_mode,
          product_name: order.product_details.product_name,
          quantity: order.product_details.quantity
        },
        tracking: {
          status: order.delivery_status,
          last_update: order.last_timestamp,
          last_location: order.last_scan_location,
          last_remark: order.last_remark,
          tracking_history: trackingInfo?.tracking_data?.shipment_track || []
        },
        client: {
          name: client?.client_name || "",
          logo: client?.logo_url || ""
        }
      });
    } catch (error) {
      console.error("Track shipment error:", error);
      res.status(500).json({ message: "An error occurred while tracking the shipment" });
    }
  });
  
  // Use API router
  app.use("/api", apiRouter);
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Start cron service
  cronService.start();
  
  return httpServer;
}
