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
  fromCsv?: boolean; // Flag to indicate if order was parsed from CSV
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
      // Parse the CSV file directly in the browser
      const csvText = await file.text();
      const csvRows = csvText.split('\n');
      
      // Extract headers (first row)
      const headers = csvRows[0].split(',').map(header => header.trim());
      
      // Extract order data from the remaining rows
      const parsedOrders: Order[] = [];
      
      // Find index of relevant columns
      const orderIdIndex = headers.findIndex(h => h.toLowerCase().includes('order') || h.toLowerCase().includes('id'));
      const customerNameIndex = headers.findIndex(h => h.toLowerCase().includes('customer') || h.toLowerCase().includes('name'));
      const awbIndex = headers.findIndex(h => h.toLowerCase().includes('awb') || h.toLowerCase().includes('tracking'));
      const courierIndex = headers.findIndex(h => h.toLowerCase().includes('courier') || h.toLowerCase().includes('partner'));
      const amountIndex = headers.findIndex(h => h.toLowerCase().includes('amount') || h.toLowerCase().includes('value'));
      
      // Process rows (skip header)
      for (let i = 1; i < csvRows.length; i++) {
        if (!csvRows[i].trim()) continue; // Skip empty rows
        
        const rowData = csvRows[i].split(',').map(cell => cell.trim());
        
        if (rowData.length < 3) continue; // Skip malformed rows
        
        // Create a new order object from CSV data
        // Use default values when specific columns are not found
        const csvOrder: Order = {
          id: `csv-${i}`, // Generate an ID for the CSV row
          orderId: orderIdIndex >= 0 ? rowData[orderIdIndex] : `CSV-${i}`,
          displayOrderId: orderIdIndex >= 0 ? `#${rowData[orderIdIndex].substring(0, 8)}` : `CSV-${i}`,
          customer: {
            name: customerNameIndex >= 0 ? rowData[customerNameIndex] : "Customer from CSV",
            phone: "N/A",
            email: "N/A"
          },
          date: format(new Date(), "MMM dd, yyyy"),
          status: "Pending",
          awb: awbIndex >= 0 ? rowData[awbIndex] : "",
          courier: courierIndex >= 0 ? rowData[courierIndex] : "",
          amount: amountIndex >= 0 ? `₹${rowData[amountIndex]}` : "N/A",
          paymentMode: "N/A",
          product: {
            name: "Product from CSV",
            quantity: 1
          },
          shippingAddress: {
            address: "N/A",
            city: "N/A",
            state: "N/A",
            pincode: "N/A"
          },
          dimensions: [],
          weight: 0,
          lastUpdate: {
            timestamp: "",
            location: "",
            remark: ""
          },
          selected: false,
          fromCsv: true // Mark as being from CSV
        };
        
        parsedOrders.push(csvOrder);
      }
      
      // Reset any previously selected orders
      setSelectedOrders([]);
      
      // Load the parsed orders from the CSV
      if (parsedOrders.length > 0) {
        setSelectedOrders(parsedOrders);
        
        toast({
          title: "CSV file uploaded successfully",
          description: `${file.name} (${(file.size / 1024).toFixed(2)} KB) has been processed. ${parsedOrders.length} orders loaded.`,
        });
      } else {
        // Fallback to showing all available orders if CSV parsing failed
        const availableOrders = transformedOrders.map(order => ({
          ...order,
          selected: false,
          fromCsv: false
        }));
        
        setSelectedOrders(availableOrders);
        
        toast({
          title: "CSV processing incomplete",
          description: "Could not find specific order data in the CSV. Showing all available orders instead.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("CSV processing error:", error);
      setUploadError("Failed to process the CSV file. Please check the format and try again.");
      toast({
        title: "Error processing CSV",
        description: "There was an error processing the uploaded file.",
        variant: "destructive"
      });
      
      // Fallback to showing all available orders
      const availableOrders = transformedOrders.map(order => ({
        ...order,
        selected: false,
        fromCsv: false
      }));
      
      setSelectedOrders(availableOrders);
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
      // If we already have orders (from CSV or database), mark them all as selected
      if (selectedOrders.length > 0) {
        const updatedOrders = selectedOrders.map(order => ({
          ...order,
          selected: true
        }));
        setSelectedOrders(updatedOrders);
      } else {
        // If no orders loaded yet, use the database orders
        const allSelectedOrders = transformedOrders.map(order => ({
          ...order,
          selected: true,
          fromCsv: false
        }));
        setSelectedOrders(allSelectedOrders);
      }
    } else {
      // Unselect all orders but keep them in the list
      const updatedOrders = selectedOrders.map(order => ({
        ...order,
        selected: false
      }));
      setSelectedOrders(updatedOrders);
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
                  checked={selectedOrders.length > 0 && selectedOrders.every(o => o.selected)}
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
                ) : selectedOrders.length > 0 ? (
                  // Show the uploaded CSV orders if available
                  selectedOrders.map((order) => {
                    return (
                      <tr 
                        key={order.id} 
                        className={`hover:bg-neutral-50 ${order.selected ? 'bg-primary/5' : ''} ${order.fromCsv ? 'bg-blue-50/30' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Checkbox 
                            checked={order.selected}
                            onCheckedChange={() => handleToggleOrderSelection(order.orderId)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">
                          {order.displayOrderId || order.orderId}
                          {order.fromCsv && <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-1 py-0.5 rounded">CSV</span>}
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
                ) : transformedOrders.length > 0 ? (
                  // Fallback to showing database orders when no CSV is uploaded
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
                      No orders found for manifest. Upload a CSV file to get started.
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
