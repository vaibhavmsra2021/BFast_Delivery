import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CSVUpload } from "@/components/orders/CSVUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getShiprocketCSVData, uploadShiprocketCSV } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { ShiprocketData as ShiprocketDataType } from "@shared/schema";

export default function ShiprocketData() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<Record<string, string>>({});
  const [currentTab, setCurrentTab] = useState("view");

  // Query to fetch Shiprocket data
  const { data, isLoading, isError } = useQuery({
    queryKey: ['/api/shiprocket/data', filter],
    queryFn: () => getShiprocketCSVData(filter),
    enabled: currentTab === "view"
  });

  // Mutation for uploading CSV
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Parse CSV on the client side
      const text = await file.text();
      const lines = text.split('\n');
      
      if (lines.length < 2) {
        throw new Error("CSV file is empty or invalid");
      }
      
      const headers = lines[0].split(',').map(header => 
        header.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')
      );
      
      const parsedData = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',');
        const entry: Record<string, string> = {};
        
        headers.forEach((header, index) => {
          entry[header] = values[index]?.trim() || "";
        });
        
        // Map CSV columns to our schema
        parsedData.push({
          awb: entry['awb_number'] || "",
          courier_type: entry['courier_type'] || "",
          client_order_id: entry['client_order_id'] || "",
          order_confirmation: entry['order_confirmation'] || "",
          bfast_status: entry['bfast_status'] || "",
          delivery_status: entry['delivery_status'] || "",
          sale_channel: entry['sale_channel'] || "",
          aggregator_partner: entry['aggregator_partner'] || "",
          client_id: entry['client_id'] || "",
          month: entry['month'] || "",
          pickup_date: entry['pick_up_date_dd_mm_yyyy'] || "",
          sale_order_number: entry['sale_order_number'] || "",
          order_date: entry['order_date'] || "",
          delivery_center_name: entry['delivery_center_name'] || "",
          transport_mode: entry['transport_mode'] || "",
          payment_mode: entry['payment_mode'] || "",
          cod_amount: entry['cod_amount'] || "",
          customer_first_name: entry['customer_first_name'] || "",
          customer_last_name: entry['customer_last_name'] || "",
          customer_email: entry['customer_email'] || "",
          customer_phone: entry['customer_phone'] || "",
          shipping_address: entry['shipping_address_line1'] || "",
          customer_alt_phone: entry['customer_alternate_phone'] || "",
          shipping_address_2: entry['shipping_address_line2'] || "",
          shipping_city: entry['shipping_city'] || "",
          shipping_state: entry['shipping_state'] || "",
          shipping_pincode: entry['shipping_pincode'] || "",
          item_category: entry['item_category'] || "",
          item_sku_code: entry['item_sku_code'] || "",
          item_description: entry['item_sku'] || "",
          quantity: entry['quantity'] || ""
        });
      }
      
      return uploadShiprocketCSV(parsedData);
    },
    onSuccess: () => {
      toast({
        title: "Upload Successful",
        description: "Shiprocket CSV data has been uploaded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/shiprocket/data'] });
      setCurrentTab("view");
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload Shiprocket CSV data.",
        variant: "destructive",
      });
    },
  });

  // Handler for CSV file upload
  const handleCsvUpload = async (file: File) => {
    uploadMutation.mutate(file);
  };

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    // If value is 'all', remove this filter
    if (value === 'all') {
      const newFilter = { ...filter };
      delete newFilter[key];
      setFilter(newFilter);
    } else {
      setFilter(prev => ({ ...prev, [key]: value }));
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setFilter({});
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Shiprocket Data</h1>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="view">View Data</TabsTrigger>
          <TabsTrigger value="upload">Upload CSV</TabsTrigger>
        </TabsList>

        <TabsContent value="view">
          <Card>
            <CardHeader>
              <CardTitle>Shiprocket CSV Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <Label htmlFor="delivery-status">Delivery Status</Label>
                  <Select
                    onValueChange={(value) => handleFilterChange('delivery_status', value)}
                    value={filter.delivery_status || "all"}
                  >
                    <SelectTrigger id="delivery-status">
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Delivered">Delivered</SelectItem>
                      <SelectItem value="RTO Delivered">RTO</SelectItem>
                      <SelectItem value="Damaged">Damaged</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="client-id">Client</Label>
                  <Select
                    onValueChange={(value) => handleFilterChange('client_id', value)}
                    value={filter.client_id || "all"}
                  >
                    <SelectTrigger id="client-id">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Dholkee">Dholkee</SelectItem>
                      <SelectItem value="INFUSION NOTES">INFUSION NOTES</SelectItem>
                      <SelectItem value="OBS">OBS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="month">Month</Label>
                  <Select
                    onValueChange={(value) => handleFilterChange('month', value)}
                    value={filter.month || "all"}
                  >
                    <SelectTrigger id="month">
                      <SelectValue placeholder="Select a month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="1">January</SelectItem>
                      <SelectItem value="2">February</SelectItem>
                      <SelectItem value="3">March</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="awb-search">AWB Number</Label>
                  <Input
                    id="awb-search"
                    placeholder="Search by AWB"
                    value={filter.awb || ""}
                    onChange={(e) => handleFilterChange('awb', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="city-search">City</Label>
                  <Input
                    id="city-search"
                    placeholder="Search by city"
                    value={filter.shipping_city || ""}
                    onChange={(e) => handleFilterChange('shipping_city', e.target.value)}
                  />
                </div>

                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={clearFilters}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="w-full h-12" />
                  <Skeleton className="w-full h-12" />
                  <Skeleton className="w-full h-12" />
                  <Skeleton className="w-full h-12" />
                  <Skeleton className="w-full h-12" />
                </div>
              ) : isError ? (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to load Shiprocket data. Please try again later.
                  </AlertDescription>
                </Alert>
              ) : data?.length === 0 ? (
                <Alert>
                  <AlertTitle>No data found</AlertTitle>
                  <AlertDescription>
                    No Shiprocket data matches your filters. Try different filters or upload new data.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>AWB</TableHead>
                        <TableHead>Client ID</TableHead>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.map((entry: ShiprocketDataType, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{entry.awb || '-'}</TableCell>
                          <TableCell>{entry.client_id || '-'}</TableCell>
                          <TableCell>{entry.client_order_id || '-'}</TableCell>
                          <TableCell>
                            {[entry.customer_first_name, entry.customer_last_name]
                              .filter(Boolean)
                              .join(' ') || '-'}
                          </TableCell>
                          <TableCell>{entry.shipping_city || '-'}</TableCell>
                          <TableCell>
                            <span className={
                              entry.delivery_status === 'Delivered' ? 'text-green-600' :
                              entry.delivery_status === 'RTO Delivered' ? 'text-orange-600' :
                              entry.delivery_status === 'Damaged' ? 'text-red-600' :
                              'text-gray-600'
                            }>
                              {entry.delivery_status || '-'}
                            </span>
                          </TableCell>
                          <TableCell>{entry.cod_amount || '-'}</TableCell>
                          <TableCell>{entry.order_date || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload Shiprocket CSV</CardTitle>
            </CardHeader>
            <CardContent>
              <CSVUpload
                title=""
                description="Upload your Shiprocket CSV file to view and analyze your shipping data."
                onUpload={handleCsvUpload}
                templateUrl="/samples/shiprocket-template.csv"
              />

              {uploadMutation.isPending && (
                <div className="mt-4">
                  <Skeleton className="w-full h-12" />
                  <p className="text-center mt-2">Uploading and processing data...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}