import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCcw, Search, CheckCircle2, XCircle } from "lucide-react";

function ShiprocketApiData() {
  const { toast } = useToast();
  const [search, setSearch] = useState<string>('');
  
  // Test auth endpoint to ensure we can connect to Shiprocket
  const authTest = useQuery({
    queryKey: ['/api/shiprocket/api/test-auth'],
    queryFn: async () => {
      const response = await fetch('/api/shiprocket/api/test-auth');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to authenticate with Shiprocket');
      }
      return response.json();
    },
    retry: 1,
  });
  
  // Query to fetch Shiprocket orders
  const ordersQuery = useQuery({
    queryKey: ['/api/shiprocket/api/orders'],
    queryFn: async () => {
      const response = await fetch('/api/shiprocket/api/orders');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch Shiprocket orders');
      }
      return response.json();
    },
    enabled: authTest.isSuccess,
    retry: 1,
  });
  
  // Query to fetch Shiprocket shipments
  const shipmentsQuery = useQuery({
    queryKey: ['/api/shiprocket/api/shipments'],
    queryFn: async () => {
      const response = await fetch('/api/shiprocket/api/shipments');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch Shiprocket shipments');
      }
      return response.json();
    },
    enabled: authTest.isSuccess,
    retry: 1,
  });
  
  // Show error toast when queries fail
  useEffect(() => {
    if (authTest.error) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: authTest.error instanceof Error ? authTest.error.message : "Failed to connect to Shiprocket",
      });
    }
    if (ordersQuery.error) {
      toast({
        variant: "destructive",
        title: "Orders Error",
        description: ordersQuery.error instanceof Error ? ordersQuery.error.message : "Failed to fetch orders",
      });
    }
    if (shipmentsQuery.error) {
      toast({
        variant: "destructive",
        title: "Shipments Error",
        description: shipmentsQuery.error instanceof Error ? shipmentsQuery.error.message : "Failed to fetch shipments",
      });
    }
  }, [authTest.error, ordersQuery.error, shipmentsQuery.error, toast]);
  
  // Filter orders based on search term
  const filteredOrders = ordersQuery.data?.data?.filter((order: any) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      order.order_id?.toString().toLowerCase().includes(searchLower) ||
      order.channel_order_id?.toString().toLowerCase().includes(searchLower) ||
      order.customer_name?.toLowerCase().includes(searchLower) ||
      order.customer_email?.toLowerCase().includes(searchLower) ||
      order.awb?.toLowerCase().includes(searchLower)
    );
  });
  
  // Filter shipments based on search term
  const filteredShipments = shipmentsQuery.data?.data?.filter((shipment: any) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      shipment.shipment_id?.toString().toLowerCase().includes(searchLower) ||
      shipment.order_id?.toString().toLowerCase().includes(searchLower) ||
      shipment.channel_order_id?.toString().toLowerCase().includes(searchLower) ||
      shipment.awb?.toLowerCase().includes(searchLower) ||
      shipment.customer_name?.toLowerCase().includes(searchLower)
    );
  });
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Shiprocket Integration</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">API Status:</span>
            {authTest.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : authTest.isSuccess ? (
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                <XCircle className="h-3 w-3 mr-1" /> Error
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              authTest.refetch();
              ordersQuery.refetch();
              shipmentsQuery.refetch();
            }}
            disabled={authTest.isFetching || ordersQuery.isFetching || shipmentsQuery.isFetching}
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shiprocket API Data</CardTitle>
          <CardDescription>
            View live data from your Shiprocket account
          </CardDescription>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders or shipments..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="orders">
            <TabsList className="mb-4">
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="shipments">Shipments</TabsTrigger>
            </TabsList>
            
            <TabsContent value="orders" className="space-y-4">
              {ordersQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : ordersQuery.isError ? (
                <div className="text-center py-8 text-red-500">
                  <p>Failed to load orders from Shiprocket</p>
                  <p className="text-sm text-muted-foreground">{ordersQuery.error?.toString()}</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Channel Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead>AWB</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders?.length ? (
                        filteredOrders.map((order: any) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.order_id}</TableCell>
                            <TableCell>{order.channel_order_id}</TableCell>
                            <TableCell>
                              <div>{order.customer_name}</div>
                              <div className="text-xs text-muted-foreground">{order.customer_email}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={order.status === 'COMPLETE' ? 'default' : 'secondary'}>
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(order.created_at).toLocaleString()}</TableCell>
                            <TableCell>{order.awb || '-'}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            {search ? 'No orders match your search' : 'No orders found'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="shipments" className="space-y-4">
              {shipmentsQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : shipmentsQuery.isError ? (
                <div className="text-center py-8 text-red-500">
                  <p>Failed to load shipments from Shiprocket</p>
                  <p className="text-sm text-muted-foreground">{shipmentsQuery.error?.toString()}</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Shipment ID</TableHead>
                        <TableHead>Order ID</TableHead>
                        <TableHead>AWB</TableHead>
                        <TableHead>Courier</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Pickup Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredShipments?.length ? (
                        filteredShipments.map((shipment: any) => (
                          <TableRow key={shipment.id}>
                            <TableCell className="font-medium">{shipment.shipment_id}</TableCell>
                            <TableCell>{shipment.order_id}</TableCell>
                            <TableCell>{shipment.awb}</TableCell>
                            <TableCell>{shipment.courier_name}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  shipment.status === 'DELIVERED' 
                                    ? 'default' 
                                    : shipment.status === 'CANCELED' || shipment.status === 'CANCELLATION REQUESTED'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                              >
                                {shipment.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {shipment.pickup_scheduled_date 
                                ? new Date(shipment.pickup_scheduled_date).toLocaleDateString() 
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            {search ? 'No shipments match your search' : 'No shipments found'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default ShiprocketApiData;