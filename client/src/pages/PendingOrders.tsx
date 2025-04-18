import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { updateOrder } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { OrderTable } from "@/components/orders/OrderTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function PendingOrders() {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  
  // Fetch pending orders
  const { data: pendingOrders = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/orders/pending'],
  });

  // Mutation for updating order
  const updateOrderMutation = useMutation({
    mutationFn: ({ orderId, data }: { orderId: string, data: any }) => {
      console.log("Updating order:", orderId, data);
      return updateOrder(orderId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/summary'] });
      toast({
        title: "Order Updated",
        description: "The order has been updated successfully.",
      });
      setSelectedOrder(null);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update order",
        variant: "destructive",
      });
    },
  });

  // Transform pending orders for display
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
        orderId: order.order_id,  // Using raw order_id without prefix for API calls
        displayOrderId: `#${order.order_id}`.substring(0, 9),  // Only for display
        customer: {
          name: order.shipping_details?.customer_name || 'Unknown Customer',
          phone: order.shipping_details?.customer_phone || '',
          email: order.shipping_details?.customer_email || '',
        },
        date: format(new Date(order.created_at), 'MMM dd, yyyy'),
        status: order.fulfillment_status,
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
        raw: order, // Keep the raw order data for the CSV export
      };
    });
  };

  const handleUpdateOrder = (orderId: string, data: any) => {
    console.log("Updating order in PendingOrders:", orderId, data);
    
    // Make sure we have the raw orderId without any formatting
    const cleanOrderId = orderId.replace(/^#/, '');
    
    // Map UI data back to API format
    const apiData: any = {};
    
    if (data.product) {
      apiData.product_details = [
        {
          dimensions: data.dimensions,
          weight: data.weight,
        }
      ];
    }
    
    if (data.status) {
      apiData.fulfillment_status = data.status;
    }
    
    // Add any other fields that might have been updated
    if (data.courier) {
      apiData.courier = data.courier;
    }
    
    if (data.awb) {
      apiData.awb = data.awb;
    }
    
    console.log("API data being sent:", apiData);
    updateOrderMutation.mutate({ orderId: cleanOrderId, data: apiData });
  };
  
  // Function to download pending orders in the Bfast AWB template format
  const handleDownloadCSV = () => {
    const today = new Date();
    const formattedDate = format(today, 'dd/MM/yyyy');
    
    // CSV Header (from template)
    const header = "AWB Number,Courier Type,Client Order ID,Order Confirmation,Bfast Status,Delivery Status,Sale Channel,Aggregator Partner,Client ID,Month,Pick Up Date (dd/mm/yyyy),*Sale Order Number,Order Date,Delivery Center Name,*Transport Mode,*Payment Mode,COD Amount,*Customer First Name,*Customer Last Name,Customer Email,*Customer Phone,*Shipping Address Line1,Customer Alternate Phone,Shipping Address Line2,*Shipping City,*Shipping State,*Shipping Pincode,Item Category,*Item Sku Code,*Item Sku Name,*Quantity Ordered,Packaging Type,*Unit Item Price,Length (cm),Breadth (cm),Height (cm),Weight (gm),ConsigneeName,ConsigneeAddress,ShipmentWeight (Kg),Product Name Aggregator,*Payment Method (COD/Prepaid),Volumetric Weight,Charged Weight,Fragile,Item Description,Zone,Lost / Damaged Credit Value,Settlement Status,Delivery TAT,Tracking Link,Tracking Message,Delivery Date,Delivery Confirmation,Customer Remarks,NDR Remarks,RTO Remarks,COD Charge,Forward Charge,RTO Charge,Total Bill,Total Bill with GST,Remittance Number,Remittance Date,Remittance Status,Billing Number,Biiling Date,Bill Status";
    
    // Generate rows for each pending order
    const rows = pendingOrders.map((order) => {
      // Split customer name into first and last name
      const nameParts = (order.shipping_details?.customer_name || 'Unknown').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Extract product details
      const product = Array.isArray(order.product_details) && order.product_details.length > 0
        ? order.product_details[0]
        : {};
      
      // Extract dimensions and weight
      const dimensions = product.dimensions || [];
      const length = Array.isArray(dimensions) && dimensions.length > 0 ? dimensions[0] : '';
      const breadth = Array.isArray(dimensions) && dimensions.length > 1 ? dimensions[1] : '';
      const height = Array.isArray(dimensions) && dimensions.length > 2 ? dimensions[2] : '';
      const weight = product.weight || '';
      
      // Extract payment mode
      const paymentMode = order.shipping_details?.payment_mode || 'Prepaid';
      const codAmount = paymentMode.toLowerCase().includes('cod') ? 
        (order.shipping_details?.amount || '0') : '0';
      
      // Format order date
      const orderDate = order.created_at ? format(new Date(order.created_at), 'dd/MM/yyyy') : '';
      const month = order.created_at ? format(new Date(order.created_at), 'MMMM') : '';
      
      // Map all values to the BFast AWB Format template
      return [
        order.awb || '', // AWB Number
        order.courier || '', // Courier Type
        order.order_id || '', // Client Order ID
        'Confirmed', // Order Confirmation
        order.fulfillment_status || 'Pending', // Bfast Status
        order.delivery_status || '', // Delivery Status
        'Website', // Sale Channel
        '', // Aggregator Partner
        order.client_id || '', // Client ID
        month, // Month
        formattedDate, // Pick Up Date
        order.order_id || '', // Sale Order Number
        orderDate, // Order Date
        '', // Delivery Center Name
        order.shipping_details?.shipping_method || 'Surface', // Transport Mode
        paymentMode, // Payment Mode
        codAmount, // COD Amount
        firstName, // Customer First Name
        lastName, // Customer Last Name
        order.shipping_details?.customer_email || '', // Customer Email
        order.shipping_details?.customer_phone || '', // Customer Phone
        order.shipping_details?.address || '', // Shipping Address Line1
        '', // Customer Alternate Phone
        '', // Shipping Address Line2
        order.shipping_details?.city || '', // Shipping City
        order.shipping_details?.state || '', // Shipping State
        order.shipping_details?.pin_code || '', // Shipping Pincode
        '', // Item Category
        product.sku || '', // Item Sku Code
        product.name || '', // Item Sku Name
        product.quantity || '1', // Quantity Ordered
        '', // Packaging Type
        product.price || '', // Unit Item Price
        length, // Length (cm)
        breadth, // Breadth (cm)
        height, // Height (cm)
        weight, // Weight (gm)
        order.shipping_details?.customer_name || '', // ConsigneeName
        order.shipping_details?.address || '', // ConsigneeAddress
        weight ? (parseFloat(weight) / 1000).toFixed(2) : '', // ShipmentWeight (Kg)
        product.name || '', // Product Name Aggregator
        paymentMode.toLowerCase().includes('cod') ? 'COD' : 'Prepaid', // Payment Method
        '', // Volumetric Weight
        '', // Charged Weight
        'No', // Fragile
        product.description || '', // Item Description
        '', // Zone
        '', // Lost / Damaged Credit Value
        '', // Settlement Status
        '', // Delivery TAT
        '', // Tracking Link
        '', // Tracking Message
        '', // Delivery Date
        '', // Delivery Confirmation
        '', // Customer Remarks
        '', // NDR Remarks
        '', // RTO Remarks
        '', // COD Charge
        '', // Forward Charge
        '', // RTO Charge
        '', // Total Bill
        '', // Total Bill with GST
        '', // Remittance Number
        '', // Remittance Date
        '', // Remittance Status
        '', // Billing Number
        '', // Biiling Date
        ''  // Bill Status
      ].map(value => {
        // Escape commas and quotes in values
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',');
    });
    
    // Combine header and rows to create the full CSV content
    const csvContent = [header, ...rows].join('\n');
    
    // Create a Blob with the CSV data
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create a link element and trigger download
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pending_orders_${format(today, 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "CSV Downloaded",
      description: "Pending orders exported to CSV successfully.",
    });
  };

  const transformedOrders = transformOrders(pendingOrders);

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Pending Orders</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Manage orders with fulfillment status "Pending" or "In-Process"
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        <div className="flex justify-end mb-4">
          <Button 
            variant="outline"
            onClick={handleDownloadCSV}
          >
            Download CSV
          </Button>
        </div>
        
        <OrderTable
          orders={transformedOrders}
          isLoading={isLoading}
          title="Pending Orders"
          totalCount={transformedOrders.length}
          showActionButtons={false}
          onUpdateOrder={handleUpdateOrder}
        />
      </div>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              View and edit order details
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div>
              {/* Order details content would go here */}
              <p>Order ID: {selectedOrder.orderId}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}