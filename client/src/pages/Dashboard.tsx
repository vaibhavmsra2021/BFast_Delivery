import { useQuery } from "@tanstack/react-query";
import { getOrderSummary, getAllOrders } from "@/lib/api";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusChart } from "@/components/dashboard/StatusChart";
import { IndiaMap } from "@/components/dashboard/IndiaMap";
import { RecentOrders } from "@/components/dashboard/RecentOrders";
import { 
  Package, 
  Clock, 
  CheckCircle, 
  RotateCcw,
  ArrowUp
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function Dashboard() {
  // Fetch order summary data
  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['/api/orders/summary'],
  });

  // Fetch recent orders
  const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['/api/orders'],
  });

  // Transform summary data for status chart
  const getStatusChartData = () => {
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
  const getRegionData = () => {
    if (!summaryData?.regionData) return [];
    
    return Object.entries(summaryData.regionData).map(([name, value], index) => ({
      name,
      value,
      opacity: 0.9 - (index * 0.1) // Decrease opacity for each region
    }));
  };

  // Transform recent orders for display
  const getRecentOrders = () => {
    if (!ordersData) return [];
    
    return ordersData.slice(0, 5).map((order: any) => ({
      id: order.id,
      orderId: `#${order.order_id.substring(0, 8)}`,
      customer: order.shipping_details.name,
      date: format(new Date(order.created_at), 'MMM dd, yyyy'),
      status: order.delivery_status || order.fulfillment_status,
      awb: order.awb || '-',
      amount: `₹${order.shipping_details.amount.toFixed(2)}`
    }));
  };

  const statusChartData = getStatusChartData();
  const regionData = getRegionData();
  const recentOrders = getRecentOrders();

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Analytics and overview of your shipping operations.
        </p>
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
      </div>
    </div>
  );
}
