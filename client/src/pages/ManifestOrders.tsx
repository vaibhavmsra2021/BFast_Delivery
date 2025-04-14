import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllOrders } from "@/lib/api";
import { OrderTable } from "@/components/orders/OrderTable";
import { CSVUpload } from "@/components/orders/CSVUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { Download, FileCheck, AlertCircle, ArrowRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface Order {
  id: string;
  orderId: string;
  displayOrderId?: string;
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  date: string;
  status: string;
  awb: string;
  courier: string;
  amount: string;
  paymentMode: string;
  product: {
    name: string;
    quantity: number;
  };
  shippingAddress: {
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  dimensions: number[] | string;
  weight: number;
  lastUpdate: {
    timestamp: string;
    location: string;
    remark: string;
  };
  selected?: boolean;
}

export default function ManifestOrders() {
  const [manifestDate, setManifestDate] = useState<Date | undefined>(new Date());
  const [selectedCourier, setSelectedCourier] = useState<string>("shiprocket");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([]);
  const [generatingManifest, setGeneratingManifest] = useState<boolean>(false);

  // Fetch all in-process orders
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["/api/orders", { status: "In-Process" }],
    queryFn: () =>
      getAllOrders({
        status: "In-Process",
        search: "",
        dateFrom: null,
        dateTo: null,
        courier: "",
        paymentMode: "",
      }),
  });

  // Transform orders for display
  const transformOrders = (orders: any[] = []): Order[] => {
    return orders.map((order) => ({
      id: order.id,
      orderId: order.order_id,
      displayOrderId: `#${order.order_id.substring(0, 8)}`,
      customer: {
        name: order.shipping_details.name,
        phone: order.shipping_details.phone_1,
        email: order.shipping_details.email,
      },
      date: format(new Date(order.created_at), "MMM dd, yyyy"),
      status: order.delivery_status || order.fulfillment_status,
      awb: order.awb || "",
      courier: order.courier || "",
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
        timestamp: order.last_timestamp
          ? format(new Date(order.last_timestamp), "MMM dd, yyyy HH:mm")
          : "",
        location: order.last_scan_location || "",
        remark: order.last_remark || "",
      },
      selected: false,
    }));
  };

  const transformedOrders = transformOrders(ordersData || []);

  const handleCsvUpload = async (file: File) => {
    setUploadedFile(file);
    setUploadSuccess(true);
    setUploadError(null);
    setGeneratingManifest(true);
    
    try {
      // In a real implementation, this would send the file to the server
      // for parsing and return the orders to be manifested
      
      // For demonstration, we'll simulate loading all available orders
      // from the database, which would normally be filtered by the CSV content
      
      // Reset any previously selected orders
      setSelectedOrders([]);
      
      // Set all available orders as selectable (but not selected by default)
      const availableOrders = transformedOrders.map(order => ({
        ...order,
        selected: false // Initially not selected
      }));
      
      setSelectedOrders(availableOrders);
      
      toast({
        title: "CSV file uploaded successfully",
        description: `${file.name} (${(file.size / 1024).toFixed(2)} KB) has been processed. Please select orders to include in the manifest.`,
      });
    } catch (error) {
      setUploadError("Failed to process the CSV file. Please try again.");
      toast({
        title: "Error processing CSV",
        description: "There was an error processing the uploaded file.",
        variant: "destructive"
      });
    } finally {
      setGeneratingManifest(false);
    }
  };

  const handleToggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => {
      // If we already have this order in selectedOrders, toggle its selection
      const existingOrderIndex = prev.findIndex(o => o.orderId === orderId);
      if (existingOrderIndex >= 0) {
        const newOrders = [...prev];
        newOrders[existingOrderIndex] = {
          ...newOrders[existingOrderIndex],
          selected: !newOrders[existingOrderIndex].selected
        };
        return newOrders;
      }
      
      // If we don't have it yet, find it in transformedOrders and add it
      const orderToAdd = transformedOrders.find(o => o.orderId === orderId);
      if (orderToAdd) {
        return [...prev, { ...orderToAdd, selected: true }];
      }
      
      return prev;
    });
  };

  const handleSelectAllOrders = (selected: boolean) => {
    if (selected) {
      const allSelectedOrders = transformedOrders.map(order => ({
        ...order,
        selected: true
      }));
      setSelectedOrders(allSelectedOrders);
    } else {
      setSelectedOrders([]);
    }
  };

  const handleGenerateManifest = async () => {
    setGeneratingManifest(true);
    
    // Filter only selected orders
    const ordersForManifest = selectedOrders.filter(order => order.selected);
    
    if (ordersForManifest.length === 0) {
      toast({
        title: "No orders selected",
        description: "Please select at least one order to generate a manifest.",
        variant: "destructive"
      });
      setGeneratingManifest(false);
      return;
    }
    
    // Simulate API request delay
    setTimeout(() => {
      toast({
        title: "Manifest generated successfully",
        description: `Manifest for ${ordersForManifest.length} orders has been generated.`,
      });
      
      // In a real implementation, this would trigger a download of the manifest
      // or redirect to a page with the manifest details
      
      setGeneratingManifest(false);
    }, 1500);
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Manifest Orders
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Generate and manage shipment manifests
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Manifest Configuration Card */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Manifest Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manifest-date">Manifest Date</Label>
                <div>
                  <DatePicker 
                    date={manifestDate} 
                    setDate={setManifestDate}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="courier-select">Courier</Label>
                <Select 
                  value={selectedCourier} 
                  onValueChange={setSelectedCourier}
                >
                  <SelectTrigger id="courier-select">
                    <SelectValue placeholder="Select courier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shiprocket">Shiprocket</SelectItem>
                    <SelectItem value="ecom">Ecom</SelectItem>
                    <SelectItem value="delhivery">Delhivery</SelectItem>
                    <SelectItem value="bluedart">Bluedart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="pt-4">
                <Button 
                  className="w-full" 
                  disabled={generatingManifest || selectedOrders.filter(o => o.selected).length === 0}
                  onClick={handleGenerateManifest}
                >
                  {generatingManifest ? (
                    <>Generating...</>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Generate Manifest
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* CSV Upload Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Upload Orders for Manifest</CardTitle>
            </CardHeader>
            <CardContent>
              <CSVUpload
                title="Upload CSV"
                description="Upload a CSV file containing order information for manifest generation."
                onUpload={handleCsvUpload}
              />
              
              {uploadedFile && (
                <div className="mt-4">
                  <Alert className="bg-green-50 border-green-100">
                    <FileCheck className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-600">File Uploaded</AlertTitle>
                    <AlertDescription>
                      {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(2)} KB)
                      <p className="mt-1 text-xs text-green-700">
                        Selected {selectedOrders.filter(o => o.selected).length} orders for manifest generation
                      </p>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader className="border-b border-neutral-200 px-6 py-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">Orders for Manifest</CardTitle>
              <div className="flex items-center">
                <Checkbox 
                  id="select-all" 
                  checked={transformedOrders.length > 0 && selectedOrders.length === transformedOrders.length && selectedOrders.every(o => o.selected)}
                  onCheckedChange={handleSelectAllOrders}
                />
                <label htmlFor="select-all" className="ml-2 text-sm font-medium">
                  Select All
                </label>
              </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Select
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    AWB
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Courier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {isLoading ? (
                  Array(5).fill(0).map((_, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 w-4 bg-neutral-200 rounded animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 w-24 bg-neutral-200 rounded animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 w-28 bg-neutral-200 rounded animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 w-24 bg-neutral-200 rounded animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 w-28 bg-neutral-200 rounded animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 w-20 bg-neutral-200 rounded animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 w-16 bg-neutral-200 rounded animate-pulse"></div>
                      </td>
                    </tr>
                  ))
                ) : transformedOrders.length > 0 ? (
                  transformedOrders.map((order) => {
                    const isSelected = selectedOrders.some(o => o.orderId === order.orderId && o.selected);
                    
                    return (
                      <tr 
                        key={order.id} 
                        className={`hover:bg-neutral-50 ${isSelected ? 'bg-primary/5' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={() => handleToggleOrderSelection(order.orderId)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">
                          {order.displayOrderId || order.orderId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {order.customer.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {order.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono">
                          {order.awb || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {order.courier || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {order.amount}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-neutral-500">
                      No orders found for manifest
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-neutral-200">
            <p className="text-sm text-neutral-500">
              {selectedOrders.filter(o => o.selected).length} orders selected for manifest
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
