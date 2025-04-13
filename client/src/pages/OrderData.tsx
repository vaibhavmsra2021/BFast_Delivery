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

  // Fetch all orders from both database and Shiprocket API
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['/api/orders', filters],
    queryFn: () => getAllOrders(filters),
  });
  
  // Fetch additional orders from Shiprocket API
  const { data: shiprocketOrdersData, isLoading: isLoadingShiprocket } = useQuery({
    queryKey: ['/api/shiprocket/all-orders'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/shiprocket/all-orders');
        if (!response.ok) {
          throw new Error('Failed to fetch Shiprocket orders');
        }
        const data = await response.json();
        return data.data?.orders || [];
      } catch (error) {
        console.error('Error fetching Shiprocket orders:', error);
        return [];
      }
    }
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
    return orders.map((order) => {
      // Calculate order amount from product_details if available
      let amount = '₹0.00';
      if (order.product_details && Array.isArray(order.product_details)) {
        const totalAmount = order.product_details.reduce((sum: number, product: any) => {
          return sum + (product.total || 0);
        }, 0);
        amount = `₹${totalAmount.toFixed(2)}`;
      }
      
      return {
        id: order.id,
        orderId: `#${order.order_id.substring(0, 8)}`,
        customer: {
          name: order.shipping_details?.customer_name || 'Unknown Customer',
          phone: order.shipping_details?.customer_phone || '',
          email: order.shipping_details?.customer_email || '',
        },
        date: format(new Date(order.created_at), 'MMM dd, yyyy'),
        status: order.delivery_status || order.fulfillment_status,
        awb: order.awb || '',
        courier: order.courier || '',
        amount: amount,
        paymentMode: order.shipping_details?.payment_mode || 'Unknown',
        product: {
          name: Array.isArray(order.product_details) && order.product_details.length > 0 
            ? order.product_details[0].name 
            : 'Unknown Product',
          quantity: Array.isArray(order.product_details) && order.product_details.length > 0 
            ? order.product_details[0].quantity 
            : 0,
        },
        shippingAddress: {
          address: order.shipping_details?.address || '',
          city: order.shipping_details?.city || '',
          state: order.shipping_details?.state || '',
          pincode: order.shipping_details?.pin_code || '',
        },
        dimensions: Array.isArray(order.product_details) && order.product_details.length > 0 
          ? order.product_details[0].dimensions || '' 
          : '',
        weight: Array.isArray(order.product_details) && order.product_details.length > 0 
          ? order.product_details[0].weight || '' 
          : '',
        lastUpdate: {
          timestamp: order.last_timestamp ? format(new Date(order.last_timestamp), 'MMM dd, yyyy HH:mm') : '',
          location: order.last_scan_location || '',
          remark: order.last_remark || '',
        },
      };
    });
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

  // Transform Shiprocket orders for display
  const transformShiprocketOrders = (orders: any[] = []) => {
    return orders.map((order) => {
      // Create shipping details object structure
      const shippingDetails = {
        customer_name: order.customer_name || 'Unknown Customer',
        customer_phone: order.customer_phone || '',
        customer_email: order.customer_email || '',
        address: order.customer_address || '',
        city: order.customer_city || '',
        state: order.customer_state || '',
        pin_code: order.customer_pincode || '',
        payment_mode: order.payment_method || 'Unknown',
      };
      
      // Create product details array
      const productDetails = order.products ? order.products.map((product: any) => ({
        name: product.name || 'Unknown Product',
        quantity: product.quantity || 0,
        total: parseFloat(product.price || '0'),
        dimensions: product.dimensions || '',
        weight: product.weight || '',
      })) : [];
      
      return {
        id: order.id || Math.random().toString(),
        order_id: order.order_id || '',
        created_at: order.created_at || new Date().toISOString(),
        delivery_status: order.status || 'Pending',
        fulfillment_status: order.status || 'Pending',
        awb: order.awb || '',
        courier: order.courier_name || '',
        shipping_details: shippingDetails,
        product_details: productDetails,
        source: 'shiprocket' // Add a source indicator
      };
    });
  };
  
  // Process database orders
  const dbOrders = transformOrders(ordersData || []);
  
  // Process Shiprocket orders
  const shiprocketOrders = transformOrders(transformShiprocketOrders(shiprocketOrdersData || []));
  
  // Combine both sets of orders, removing duplicates by AWB number
  const allOrders = [...dbOrders];
  
  // Add Shiprocket orders if they don't already exist in dbOrders
  if (shiprocketOrders && shiprocketOrders.length > 0) {
    shiprocketOrders.forEach(shiprocketOrder => {
      if (shiprocketOrder.awb && !dbOrders.some(dbOrder => dbOrder.awb === shiprocketOrder.awb)) {
        allOrders.push(shiprocketOrder);
      }
    });
  }
  
  const transformedOrders = allOrders;

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
