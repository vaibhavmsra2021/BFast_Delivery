import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllOrders } from "@/lib/api";
import { OrderTable } from "@/components/orders/OrderTable";
import { CSVUpload } from "@/components/orders/CSVUpload";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { Download } from "lucide-react";

export default function ManifestOrders() {
  const [manifestDate, setManifestDate] = useState<Date | undefined>(new Date());
  
  // Fetch all in-process orders
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['/api/orders', { status: 'In-Process' }],
    queryFn: () => getAllOrders({ status: 'In-Process', search: '', dateFrom: null, dateTo: null, courier: '', paymentMode: '' }),
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

  const handleCsvUpload = async (file: File) => {
    // In a real implementation, this would send the file to the server
    // and process it to create a manifest
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1500);
    });
  };

  const transformedOrders = transformOrders(ordersData);

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Manifest Orders</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Generate and manage shipment manifests
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        <Tabs defaultValue="generate">
          <TabsList className="mb-6">
            <TabsTrigger value="generate">Generate Manifest</TabsTrigger>
            <TabsTrigger value="upload">Upload Manifest</TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate">
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h2 className="text-lg font-medium mb-4">Generate New Manifest</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Manifest Date
                  </label>
                  <DatePicker date={manifestDate} setDate={setManifestDate} />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Courier
                  </label>
                  <select className="w-full rounded-md border border-neutral-300 p-2 focus:ring-primary focus:border-primary">
                    <option value="">All Couriers</option>
                    <option value="fedex">FedEx</option>
                    <option value="dhl">DHL</option>
                    <option value="bluedart">BlueDart</option>
                  </select>
                </div>
                
                <div className="flex items-end">
                  <Button className="w-full md:w-auto">
                    <Download className="h-4 w-4 mr-2" />
                    Generate Manifest
                  </Button>
                </div>
              </div>
            </div>
            
            <OrderTable
              orders={transformedOrders}
              isLoading={isLoading}
              title="Ready for Manifest"
              totalCount={transformedOrders.length}
            />
          </TabsContent>
          
          <TabsContent value="upload">
            <CSVUpload
              title="Upload Manifest File"
              description="Upload a manifest file received from courier partners to update order statuses automatically."
              onUpload={handleCsvUpload}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
