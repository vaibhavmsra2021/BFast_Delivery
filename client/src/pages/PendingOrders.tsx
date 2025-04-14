import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { updateOrder } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { OrderTable } from "@/components/orders/OrderTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
        orderId: order.order_id,
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
    console.log("Updating order with data:", data);
    
    // Map UI data back to API format
    const apiData: any = {};
    
    // Single fields mapping
    if (data.status) {
      apiData.fulfillment_status = data.status;
    }
    
    if (data.awb !== undefined) {
      apiData.awb = data.awb;
    }
    
    if (data.courier !== undefined) {
      apiData.courier = data.courier;
    }
    
    // Handle product details - need to preserve the original structure and update only what changed
    if (data.weight !== undefined) {
      // Get the original order first
      const originalOrder = pendingOrders.find(order => order.order_id === orderId);
      
      // Create a properly formatted product_details object
      if (originalOrder) {
        let productDetails = originalOrder.product_details || [];
        
        // If it's an array, update the first item or create a new one
        if (Array.isArray(productDetails)) {
          if (productDetails.length > 0) {
            // Update existing product details
            apiData.product_details = productDetails.map(item => ({
              ...item,
              weight: data.weight
            }));
          } else {
            // Create new product details
            apiData.product_details = [{
              product_name: "Product",
              quantity: 1,
              weight: data.weight,
              dimensions: [10, 10, 10] // Default dimensions
            }];
          }
        } else {
          // If it's not an array (shouldn't happen but just in case)
          apiData.product_details = [{
            product_name: "Product",
            quantity: 1,
            weight: data.weight,
            dimensions: [10, 10, 10] // Default dimensions
          }];
        }
      } else {
        // If we can't find the original order, create a basic product details object
        apiData.product_details = [{
          product_name: "Product",
          quantity: 1,
          weight: data.weight,
          dimensions: [10, 10, 10] // Default dimensions
        }];
      }
    }
    
    console.log("Sending API data:", apiData);
    updateOrderMutation.mutate({ orderId, data: apiData });
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
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    defaultValue={selectedOrder.status}
                    onValueChange={(value) => {
                      // Create an updated order with the new status
                      const updatedOrder = { ...selectedOrder, status: value };
                      setSelectedOrder(updatedOrder);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="In-Process">In Process</SelectItem>
                      <SelectItem value="Delivered">Delivered</SelectItem>
                      <SelectItem value="RTO">RTO</SelectItem>
                      <SelectItem value="NDR">NDR</SelectItem>
                      <SelectItem value="Lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="awb">AWB Number</Label>
                  <Input 
                    id="awb"
                    value={selectedOrder.awb || ''}
                    onChange={(e) => {
                      const updatedOrder = { ...selectedOrder, awb: e.target.value };
                      setSelectedOrder(updatedOrder);
                    }}
                  />
                </div>
                
                <div>
                  <Label htmlFor="courier">Courier</Label>
                  <Input 
                    id="courier"
                    value={selectedOrder.courier || ''}
                    onChange={(e) => {
                      const updatedOrder = { ...selectedOrder, courier: e.target.value };
                      setSelectedOrder(updatedOrder);
                    }}
                  />
                </div>
                
                <div>
                  <Label htmlFor="weight">Weight (g)</Label>
                  <Input 
                    id="weight"
                    type="number"
                    value={selectedOrder.weight || ''}
                    onChange={(e) => {
                      const updatedOrder = { ...selectedOrder, weight: e.target.value };
                      setSelectedOrder(updatedOrder);
                    }}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  // Save changes
                  const orderData = {
                    status: selectedOrder.status,
                    awb: selectedOrder.awb,
                    courier: selectedOrder.courier,
                    weight: selectedOrder.weight
                  };
                  
                  // Update the order with the new data
                  handleUpdateOrder(selectedOrder.orderId, orderData);
                }}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}