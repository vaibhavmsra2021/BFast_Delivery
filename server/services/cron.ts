import { ShopifyService } from "./shopify";
import { ShiprocketService } from "./shiprocket";

export class CronService {
  private shopifyService: ShopifyService;
  private shiprocketService: ShiprocketService;
  private hourlyJobInterval: NodeJS.Timeout | null = null;

  constructor(shopifyService: ShopifyService, shiprocketService: ShiprocketService) {
    this.shopifyService = shopifyService;
    this.shiprocketService = shiprocketService;
  }

  // Start cron jobs
  start(): void {
    console.log("Starting cron service");
    
    // Run immediately on startup
    this.runHourlyJobs();
    
    // Then schedule hourly
    this.hourlyJobInterval = setInterval(() => {
      this.runHourlyJobs();
    }, 60 * 60 * 1000); // 1 hour
  }

  // Stop cron jobs
  stop(): void {
    if (this.hourlyJobInterval) {
      clearInterval(this.hourlyJobInterval);
      this.hourlyJobInterval = null;
    }
  }

  // Run hourly jobs
  private async runHourlyJobs(): Promise<void> {
    console.log("Running hourly jobs");
    
    try {
      // Sync new orders from Shopify
      await this.shopifyService.syncAllClientsOrders();
      
      // Update order status from Shiprocket
      await this.shiprocketService.updateAllOrdersStatus();
    } catch (error) {
      console.error("Error running hourly jobs:", error);
    }
  }
}
