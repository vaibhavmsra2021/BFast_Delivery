import express, { Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { AuthService } from "./services/auth";
import { ShopifyService } from "./services/shopify";
import { ShiprocketService } from "./services/shiprocket";
import { ShiprocketApiService, shiprocketApiService } from "./services/shiprocketApi";
import { CronService } from "./services/cron";
import busboy from "busboy";
import { 
  insertUserSchema, 
  insertClientSchema, 
  insertOrderSchema, 
  UserRole, 
  OrderStatus,
  shiprocketDataSchema,
  ShiprocketData
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
              (userData.client_id !== user.clientId)) {
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
          const clientId = user.clientId;
          users = await storage.getUsersByClientId(clientId);
        } else {
          // Bfast admin can see all users
          users = await storage.getAllUsers();
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
          const clientId = user.clientId;
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
        const { shiprocket_email, shiprocket_password } = req.body;
        
        if (!shiprocket_email || !shiprocket_password) {
          return res.status(400).json({ message: "Missing required Shiprocket credentials" });
        }
        
        // Use the shiprocket API service to test the connection
        try {
          // Create a temporary instance of the ShiprocketApiService with the provided credentials
          const tempShiprocketApi = new ShiprocketApiService(shiprocket_email, shiprocket_password);
          
          // Test authentication with the provided credentials
          await tempShiprocketApi.testAuthentication(shiprocket_email, shiprocket_password);
          
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
          clientId = user.clientId;
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
          clientId = user.clientId;
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
          clientId = user.clientId;
        }
        
        const allOrders = await storage.getAllOrders(clientId);
        
        // Count orders by status
        const statusCounts: Record<string, number> = {
          [OrderStatus.DELIVERED]: 0,
          [OrderStatus.RTO]: 0,
          [OrderStatus.INPROCESS]: 0,
          [OrderStatus.NDR]: 0,
          [OrderStatus.LOST]: 0,
          [OrderStatus.PENDING]: 0,
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
            order.client_id !== user.clientId) {
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
            
            if (order && order.client_id !== user.clientId) {
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
  
  // Shiprocket API Integration
  
  // Get orders from Shiprocket API
  apiRouter.get(
    "/shiprocket/orders",
    authService.authenticate,
    async (req: Request, res: Response) => {
      try {
        const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
        const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;
        
        try {
          // First try to get data from Shiprocket API
          const orders = await shiprocketApiService.getOrders(page, pageSize);
          // If successful, return the data
          return res.json(orders);
        } catch (apiError) {
          console.warn("Shiprocket API unavailable, falling back to database:", apiError);
          
          // If API fails, get orders from our database that are from Shiprocket
          const dbOrders = await storage.getOrdersByClientId('SHIPROCKET');
          
          // Format database orders to match Shiprocket API response format
          const formattedOrders = dbOrders.map(order => ({
            id: order.id,
            order_id: order.order_id,
            order_number: order.order_id,
            channel_order_id: order.order_id,
            channel: order.shopify_store_id,
            order_date: order.created_at?.toISOString() || new Date().toISOString(),
            pickup_date: order.pickup_date?.toISOString() || new Date().toISOString(),
            status: order.fulfillment_status,
            status_code: 1,
            awb_code: order.awb || '',
            courier_name: 'Unknown',
            payment_method: order.shipping_details?.payment_mode || 'COD',
            total: String(order.shipping_details?.amount || 0),
            billing_customer_name: order.shipping_details?.name || 'Customer',
            shipping_customer_name: order.shipping_details?.name || 'Customer',
            shipping_address: order.shipping_details?.address || '',
            shipping_city: order.shipping_details?.city || '',
            shipping_state: order.shipping_details?.state || '',
            shipping_country: order.shipping_details?.country || 'India',
            shipping_pincode: order.shipping_details?.pincode || '',
          }));
          
          // Paginate the data
          const startIndex = (page - 1) * pageSize;
          const endIndex = startIndex + pageSize;
          const paginatedOrders = formattedOrders.slice(startIndex, endIndex);
          
          // Return the fallback data in the same format as the Shiprocket API
          return res.json({
            data: {
              orders: paginatedOrders,
              total_pages: Math.ceil(formattedOrders.length / pageSize),
              current_page: page,
            }
          });
        }
      } catch (error) {
        console.error("Get Shiprocket orders error:", error);
        res.status(500).json({ 
          message: "An error occurred while retrieving orders from Shiprocket",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  );
  
  // Sync orders from Shiprocket to our database
  apiRouter.post(
    "/shiprocket/sync",
    authService.authenticate,
    authService.authorize([UserRole.BFAST_ADMIN, UserRole.BFAST_EXECUTIVE]),
    async (req: Request, res: Response) => {
      try {
        await shiprocketApiService.syncOrdersToDatabase();
        res.json({ message: "Orders synced successfully from Shiprocket" });
      } catch (error) {
        console.error("Sync Shiprocket orders error:", error);
        res.status(500).json({ 
          message: "An error occurred while syncing orders from Shiprocket",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  );
  
  // Track shipment using AWB number via Shiprocket API
  apiRouter.get(
    "/shiprocket/track/:awb",
    authService.authenticate,
    async (req: Request, res: Response) => {
      try {
        const { awb } = req.params;
        const trackingInfo = await shiprocketApiService.trackShipment(awb);
        res.json(trackingInfo);
      } catch (error) {
        console.error(`Error tracking shipment with AWB ${req.params.awb}:`, error);
        res.status(500).json({ 
          message: `Failed to track shipment with AWB ${req.params.awb}`,
          error: error instanceof Error ? error.message : "Unknown error"
        });
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

  // Shiprocket CSV data routes
  apiRouter.post(
    "/shiprocket/upload-csv",
    authService.authenticate,
    authService.authorize([UserRole.BFAST_ADMIN, UserRole.BFAST_EXECUTIVE, UserRole.CLIENT_ADMIN]),
    async (req: Request, res: Response) => {
      try {
        // Get the JSON data from the request body
        const shiprocketData = req.body;
        
        if (!Array.isArray(shiprocketData)) {
          return res.status(400).json({ message: "Invalid data format. Expected array of shiprocket entries" });
        }
        
        const parsedData: ShiprocketData[] = [];
        
        for (const entry of shiprocketData) {
          // Validate against schema
          const validationResult = shiprocketDataSchema.safeParse(entry);
          if (validationResult.success) {
            parsedData.push(validationResult.data);
          } else {
            console.error("Error validating entry:", validationResult.error);
          }
        }
        
        // Save the parsed data
        await storage.saveShiprocketData(parsedData);
        
        res.status(200).json({ 
          message: "Shiprocket data uploaded successfully", 
          count: parsedData.length 
        });
      } catch (error) {
        console.error("Upload Shiprocket data error:", error);
        res.status(500).json({ message: "An error occurred while uploading Shiprocket data" });
      }
    }
  );
  
  apiRouter.get(
    "/shiprocket/data",
    authService.authenticate,
    async (req: Request, res: Response) => {
      try {
        const filters: Record<string, string> = {};
        
        // Extract filters from query params
        const allowedFilters = [
          'delivery_status', 'client_id', 'month', 'awb', 'courier_type',
          'payment_mode', 'shipping_city', 'shipping_state', 'item_category'
        ];
        
        allowedFilters.forEach(filter => {
          if (req.query[filter]) {
            filters[filter] = req.query[filter] as string;
          }
        });
        
        const data = await storage.getShiprocketData(Object.keys(filters).length > 0 ? filters : undefined);
        
        res.json(data);
      } catch (error) {
        console.error("Get Shiprocket data error:", error);
        res.status(500).json({ message: "An error occurred while retrieving Shiprocket data" });
      }
    }
  );
  
  // Use API router
  app.use("/api", apiRouter);
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Start cron service
  cronService.start();
  
  return httpServer;
}
