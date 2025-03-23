import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPendingOrders, updateOrder, bulkUpdateOrders } from "@/lib/api";
import { OrderTable } from "@/components/orders/OrderTable";
import { CSVUpload } from "@/components/orders/CSVUpload";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const awbAssignmentSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  awb: z.string().min(1, "AWB number is required"),
  courier: z.string().min(1, "Courier name is required"),
});

type AWBAssignmentFormValues = z.infer<typeof awbAssignmentSchema>;

export default function PendingOrders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAwbDialogOpen, setIsAwbDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [csvError, setCsvError] = useState<string | null>(null);

  // Form for AWB assignment
  const form = useForm<AWBAssignmentFormValues>({
    resolver: zodResolver(awbAssignmentSchema),
    defaultValues: {
      orderId: "",
      awb: "",
      courier: "",
    },
  });

  // Fetch pending orders
  const { data: pendingOrders, isLoading } = useQuery({
    queryKey: ['/api/orders/pending'],
  });

  // Mutation for updating order
  const updateOrderMutation = useMutation({
    mutationFn: ({ orderId, data }: { orderId: string, data: any }) =>
      updateOrder(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/summary'] });
      toast({
        title: "Order Updated",
        description: "The order has been updated successfully.",
      });
      setIsAwbDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update order",
        variant: "destructive",
      });
    },
  });

  // Mutation for bulk updates
  const bulkUpdateMutation = useMutation({
    mutationFn: (updates: any[]) => bulkUpdateOrders(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/summary'] });
      toast({
        title: "Orders Updated",
        description: "The orders have been updated successfully.",
      });
      setCsvError(null);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update orders",
        variant: "destructive",
      });
      setCsvError(error instanceof Error ? error.message : "Failed to update orders");
    },
  });

  // Transform pending orders for display
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
      status: order.fulfillment_status,
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

  const handleAssignAWB = (orderId: string) => {
    setSelectedOrderId(orderId);
    form.setValue("orderId", orderId);
    setIsAwbDialogOpen(true);
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
      apiData.fulfillment_status = data.status;
    }
    
    updateOrderMutation.mutate({ orderId, data: apiData });
  };

  const onSubmitAwb = (data: AWBAssignmentFormValues) => {
    updateOrderMutation.mutate({
      orderId: data.orderId,
      data: {
        awb: data.awb,
        courier: data.courier,
        fulfillment_status: "In-Process"
      }
    });
  };

  const handleCsvUpload = async (file: File) => {
    try {
      const text = await file.text();
      const rows = text.split('\n');
      
      // Skip header row and filter out empty rows
      const dataRows = rows.slice(1).filter(row => row.trim().length > 0);
      
      const updates = dataRows.map(row => {
        const columns = row.split(',');
        
        // Expecting: OrderId,AWB,Courier,Weight,Length,Width,Height
        if (columns.length < 3) {
          throw new Error(`Invalid row format: ${row}`);
        }
        
        const [orderId, awb, courier, weight, length, width, height] = columns.map(c => c.trim());
        
        const data: any = {
          awb,
          courier,
          fulfillment_status: "In-Process"
        };
        
        // Add dimensions and weight if provided
        if (weight || (length && width && height)) {
          data.product_details = {};
          
          if (weight) {
            data.product_details.weight = parseFloat(weight);
          }
          
          if (length && width && height) {
            data.product_details.dimensions = [
              parseFloat(length),
              parseFloat(width),
              parseFloat(height)
            ];
          }
        }
        
        return { orderId, data };
      });
      
      await bulkUpdateMutation.mutateAsync(updates);
    } catch (error) {
      console.error("CSV processing error:", error);
      throw error;
    }
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
        <Tabs defaultValue="orders">
          <TabsList className="mb-6">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="bulk-upload">Bulk Upload</TabsTrigger>
          </TabsList>
          
          <TabsContent value="orders">
            <div className="flex justify-end mb-4">
              <Button variant="outline" className="mr-2">
                Download CSV
              </Button>
            </div>
            
            <OrderTable
              orders={transformedOrders}
              isLoading={isLoading}
              title="Pending Orders"
              totalCount={transformedOrders.length}
              showActionButtons={true}
              onAssignAWB={handleAssignAWB}
              onUpdateOrder={handleUpdateOrder}
            />
          </TabsContent>
          
          <TabsContent value="bulk-upload">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CSVUpload
                title="Bulk AWB Assignment"
                description="Upload a CSV file with Order IDs and AWB numbers to assign them in bulk."
                onUpload={handleCsvUpload}
                templateUrl="/templates/awb-assignment-template.csv"
              />
              
              <CSVUpload
                title="Update Shipment Details"
                description="Update dimensions, weight, and transport mode for multiple orders at once."
                onUpload={handleCsvUpload}
                templateUrl="/templates/shipment-details-template.csv"
              />
            </div>
            
            {csvError && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{csvError}</AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* AWB Assignment Dialog */}
      <Dialog open={isAwbDialogOpen} onOpenChange={setIsAwbDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign AWB Number</DialogTitle>
            <DialogDescription>
              Enter the AWB number and courier details for this order.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitAwb)} className="space-y-4">
              <FormField
                control={form.control}
                name="orderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order ID</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="awb"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AWB Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter AWB number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="courier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Courier</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter courier name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAwbDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Assign AWB</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
