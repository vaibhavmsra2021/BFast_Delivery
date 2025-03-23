import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllOrders, updateOrder } from "@/lib/api";
import { OrderTable } from "@/components/orders/OrderTable";
import { OrderFilter, OrderFilters } from "@/components/orders/OrderFilter";
import { useToast } from "@/hooks/use-toast";

export default function OrderData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filters, setFilters] = useState<OrderFilters>({
    search: "",
    status: "",
    dateFrom: null,
    dateTo: null,
    courier: "",
    paymentMode: "",
  });

  // Fetch all orders
  const { data: ordersData = [], isLoading } = useQuery({
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

  const handleUpdateOrder = (orderId: string, data: any) => {
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

  const handleFilterChange = (newFilters: OrderFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Order Data</h1>
        <p className="mt-1 text-sm text-neutral-600">
          View and manage all orders in your system
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        <div className="mb-6">
          <OrderFilter onFilterChange={handleFilterChange} />
        </div>

        <OrderTable
          orders={ordersData}
          isLoading={isLoading}
          title="All Orders"
          totalCount={ordersData.length}
          onUpdateOrder={handleUpdateOrder}
        />
      </div>
    </div>
  );
}