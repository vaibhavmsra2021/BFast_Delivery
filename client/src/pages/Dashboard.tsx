import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrderSummary, getAllOrders, syncShopifyOrders } from "@/lib/api";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusChart } from "@/components/dashboard/StatusChart";
import { IndiaMap } from "@/components/dashboard/IndiaMap";
import { RecentOrders } from "@/components/dashboard/RecentOrders";
import { ShiprocketOrdersList } from "@/components/dashboard/ShiprocketOrdersList";
import { useAuth, UserRole } from "@/lib/auth";
import { 
  Package, 
  Clock, 
  CheckCircle, 
  RotateCcw,
  ArrowUp,
  RefreshCw,
  ShoppingBag
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// Define types for our data structure
interface OrderSummary {
  statusCounts: {
    total: number;
    Delivered: number;
    'In-Process': number;
    RTO: number;
    NDR: number;
    Lost: number;
    [key: string]: number;
  };
  pendingOrders: number;
  regionData: {
    [key: string]: number;
  };
}

interface StatusChartItem {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface RegionData {
  name: string;
  value: number;
  opacity: number;
}

export default function Dashboard() {
  // Fetch order summary data
  const { data: summaryData, isLoading: isSummaryLoading } = useQuery<OrderSummary>({
    queryKey: ['/api/orders/summary'],
    placeholderData: {
      statusCounts: {
        total: 0,
        Delivered: 0,
        'In-Process': 0,
        RTO: 0,
        NDR: 0,
        Lost: 0
      },
      pendingOrders: 0,
      regionData: {}
    }
  });

  // Fetch recent orders
  const { data: ordersData, isLoading: isOrdersLoading } = useQuery<any[]>({
    queryKey: ['/api/orders'],
    placeholderData: []
  });

  // Transform summary data for status chart
  const getStatusChartData = (): StatusChartItem[] => {
    if (!summaryData?.statusCounts) return [];
    
    const total = summaryData.statusCounts.total || 1; // Avoid division by zero
    
    return [
      {
        name: 'Delivered',
        value: summaryData.statusCounts.Delivered || 0,
        percentage: Math.round((summaryData.statusCounts.Delivered || 0) * 100 / total),
        color: 'hsl(122, 39%, 49%)' // status-delivered
      },
      {
        name: 'In Process',
        value: summaryData.statusCounts['In-Process'] || 0,
        percentage: Math.round((summaryData.statusCounts['In-Process'] || 0) * 100 / total),
        color: 'hsl(207, 90%, 54%)' // status-inprocess
      },
      {
        name: 'RTO',
        value: summaryData.statusCounts.RTO || 0,
        percentage: Math.round((summaryData.statusCounts.RTO || 0) * 100 / total),
        color: 'hsl(4, 90%, 58%)' // status-rto
      },
      {
        name: 'NDR',
        value: summaryData.statusCounts.NDR || 0,
        percentage: Math.round((summaryData.statusCounts.NDR || 0) * 100 / total),
        color: 'hsl(36, 100%, 50%)' // status-ndr
      },
      {
        name: 'Lost',
        value: summaryData.statusCounts.Lost || 0,
        percentage: Math.round((summaryData.statusCounts.Lost || 0) * 100 / total),
        color: 'hsl(0, 0%, 62%)' // status-lost
      }
    ];
  };

  // Transform region data for the map
  const getRegionData = (): RegionData[] => {
    if (!summaryData?.regionData) return [];
    
    return Object.entries(summaryData.regionData).map(([name, value], index) => ({
      name,
      value: Number(value), // Ensure the value is a number
      opacity: 0.9 - (index * 0.1) // Decrease opacity for each region
    }));
  };

  // Define type for recent orders to match the Order interface in RecentOrders component
  interface RecentOrder {
    id: string;
    orderId: string;
    customer: string;
    date: string;
    status: "Delivered" | "In Transit" | "NDR" | "RTO" | "Lost";
    awb: string;
    amount: string;
  }

  // Transform recent orders for display
  const getRecentOrders = (): RecentOrder[] => {
    if (!ordersData || ordersData.length === 0) return [];
    
    return ordersData.slice(0, 5).map((order: any) => {
      // Calculate order amount from product_details if available
      let amount = '₹0.00';
      if (order.product_details && Array.isArray(order.product_details)) {
        const totalAmount = order.product_details.reduce((sum: number, product: any) => {
          return sum + (product.total || 0);
        }, 0);
        amount = `₹${totalAmount.toFixed(2)}`;
      }
      
      // Convert status to one of the allowed values in the RecentOrder type
      let status: RecentOrder['status'] = "In Transit"; // Default value
      const rawStatus = order.delivery_status || order.fulfillment_status || '';
      
      if (rawStatus.includes("Delivered")) status = "Delivered";
      else if (rawStatus.includes("RTO") || rawStatus.includes("Return")) status = "RTO";
      else if (rawStatus.includes("NDR")) status = "NDR";
      else if (rawStatus.includes("Lost")) status = "Lost";
      else status = "In Transit";
      
      return {
        id: String(order.id), // Convert ID to string 
        orderId: `#${order.order_id.substring(0, 8)}`,
        customer: order.shipping_details?.customer_name || 'Unknown Customer',
        date: format(new Date(order.created_at), 'MMM dd, yyyy'),
        status: status,
        awb: order.awb || '-',
        amount: amount
      };
    });
  };

  const statusChartData = getStatusChartData();
  const regionData = getRegionData();
  const recentOrders = getRecentOrders();
  
  // Check if user has access to advanced features
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canViewShiprocketOrders = user?.role === UserRole.BFAST_ADMIN || user?.role === UserRole.BFAST_EXECUTIVE;
  
  // Mutation for syncing Shopify orders
  const syncShopifyMutation = useMutation({
    mutationFn: async () => {
      // If the user has a clientId, use it, otherwise if they're an admin, 
      // use the first available client's ID
      if (user?.clientId) {
        return syncShopifyOrders(user.clientId);
      } else if (user?.role === UserRole.BFAST_ADMIN || user?.role === UserRole.BFAST_EXECUTIVE) {
        // Get the client data
        const clientsResponse = await apiRequest('GET', '/api/clients');
        const clients = await clientsResponse.json();
        if (clients && clients.length > 0) {
          return syncShopifyOrders(clients[0].client_id);
        }
      }
      
      // If no client ID could be determined, show an error
      throw new Error("No client ID available for syncing Shopify orders");
    },
    onSuccess: (data) => {
      toast({
        title: "Orders synced successfully",
        description: data.message || `Synced ${data.total} orders from Shopify`,
        variant: "default",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/summary'] });
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync orders from Shopify",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Analytics and overview of your shipping operations.
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => syncShopifyMutation.mutate()}
            disabled={syncShopifyMutation.isPending}
            variant="outline"
            className="gap-2"
          >
            {syncShopifyMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingBag className="h-4 w-4" />
            )}
            Sync Shopify Orders
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Orders"
            value={summaryData?.statusCounts?.total || 0}
            icon={<Package className="h-6 w-6" />}
            trend={{
              value: "8.2% increase",
              isPositive: true
            }}
            footerContent={<span className="text-sm text-neutral-500">from last week</span>}
          />

          <StatCard
            title="Pending Fulfillment"
            value={summaryData?.pendingOrders || 0}
            icon={<Clock className="h-6 w-6" />}
            iconColor="accent"
            footerContent={
              <Link href="/pending-orders">
                <Button variant="ghost" size="sm" className="text-primary p-0">
                  Manage Orders
                  <ArrowUp className="h-4 w-4 ml-1 rotate-90" />
                </Button>
              </Link>
            }
          />

          <StatCard
            title="Delivered (Last 30 days)"
            value={summaryData?.statusCounts?.Delivered || 0}
            icon={<CheckCircle className="h-6 w-6" />}
            iconColor="status-delivered"
            footerContent={
              <span className="text-sm text-green-500 flex items-center">
                <ArrowUp className="h-4 w-4 mr-1" />
                95.4% success rate
              </span>
            }
          />

          <StatCard
            title="Returns (RTO)"
            value={summaryData?.statusCounts?.RTO || 0}
            icon={<RotateCcw className="h-6 w-6" />}
            iconColor="status-rto"
            footerContent={
              <span className="text-sm text-status-rto flex items-center">
                <ArrowUp className="h-4 w-4 mr-1 rotate-180" />
                3.1% return rate
              </span>
            }
          />
        </div>

        {/* Charts */}
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <StatusChart 
            data={statusChartData} 
            title="Shipment Status Distribution" 
          />
          
          <IndiaMap 
            regions={regionData} 
          />
        </div>

        {/* Recent Orders */}
        <div className="mt-8">
          <RecentOrders 
            orders={recentOrders}
            isLoading={isOrdersLoading}
          />
        </div>

        {/* Shiprocket Orders */}
        {canViewShiprocketOrders && (
          <div className="mt-8">
            <ShiprocketOrdersList maxItems={5} />
          </div>
        )}
      </div>
    </div>
  );
}
