import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllOrders, updateOrder } from "@/lib/api";
import { OrderTable } from "@/components/orders/OrderTable";
import { OrderFilter, OrderFilters } from "@/components/orders/OrderFilter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function OrderData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filters, setFilters] = useState<OrderFilters>({
    search: "",
    status: "all",
    dateFrom: null,
    dateTo: null,
    courier: "",
    paymentMode: "",
  });

  // Fetch all orders
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['/api/orders', filters],
    queryFn: () => getAllOrders(filters),
  });

  // Mutation for updating order
  const updateOrderMutation = useMutation({
    mutationFn: ({ orderId, data }: { orderId: string, data: any }) =>
      updateOrder(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/summary'] });
      toast({
        title: "Order Updated",
        description: "The order has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update order",
        variant: "destructive",
      });
    },
  });

  // Transform orders for display
  const transformOrders = (orders: any[] = []) => {
    return orders.map((order) => ({
      id: order.id,
      orderId: `#${order.order_id.substring(0, 8)}`,
      customer: {
        name: order.shipping_details.name,
        phone: order.shipping_details.phone_1,
        email: order.shipping_details.email,
      },
      date: format(new Date(order.created_at), 'MMM dd, yyyy'),
      status: order.delivery_status || order.fulfillment_status,
      awb: order.awb || '',
      courier: order.courier || '',
      amount: `₹${order.shipping_details.amount.toFixed(2)}`,
      paymentMode: order.shipping_details.payment_mode,
      product: {
        name: order.product_details.product_name,
        quantity: order.product_details.quantity,
      },
      shippingAddress: {
        address: order.shipping_details.address,
        city: order.shipping_details.city,
        state: order.shipping_details.state,
        pincode: order.shipping_details.pincode,
      },
      dimensions: order.product_details.dimensions,
      weight: order.product_details.weight,
      lastUpdate: {
        timestamp: order.last_timestamp ? format(new Date(order.last_timestamp), 'MMM dd, yyyy HH:mm') : '',
        location: order.last_scan_location || '',
        remark: order.last_remark || '',
      },
    }));
  };

  const handleFilterChange = (newFilters: OrderFilters) => {
    setFilters(newFilters);
  };

  const handleUpdateOrder = (orderId: string, data: any) => {
    // Map UI data back to API format
    const apiData: any = {};
    
    if (data.product) {
      apiData.product_details = {
        dimensions: data.dimensions,
        weight: data.weight,
      };
    }
    
    if (data.status) {
      apiData.delivery_status = data.status;
    }
    
    updateOrderMutation.mutate({ orderId, data: apiData });
  };

  const transformedOrders = transformOrders(ordersData);

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Order Data</h1>
        <p className="mt-1 text-sm text-neutral-600">
          View and manage all orders in your system
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        {/* Filter Section */}
        <div className="mb-6">
          <OrderFilter onFilterChange={handleFilterChange} />
        </div>

        {/* Order Table */}
        <OrderTable
          orders={transformedOrders}
          isLoading={isLoading}
          title="All Orders"
          totalCount={transformedOrders.length}
          onUpdateOrder={handleUpdateOrder}
        />
      </div>
    </div>
  );
}
