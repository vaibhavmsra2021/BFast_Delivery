import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/custom-pagination';
import { Badge } from '@/components/ui/badge';
import { Loader2, Truck, Plus, RefreshCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ShiprocketOrder {
  id: number;
  order_id: string;
  order_number: string;
  channel_order_id: string;
  channel: string;
  order_date: string;
  pickup_date: string;
  status: string;
  status_code: number;
  awb_code: string;
  courier_name: string;
  payment_method: string;
  total: string;
  billing_customer_name: string;
  shipping_customer_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_country: string;
  shipping_pincode: string;
}

function ShiprocketOrders() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data, isLoading, refetch } = useQuery<{
    data: {
      orders: ShiprocketOrder[];
      total_pages: number;
      current_page: number;
    }
  }>({
    queryKey: ['/api/shiprocket/orders', page, pageSize],
    queryFn: () => 
      fetch(`/api/shiprocket/orders?page=${page}&pageSize=${pageSize}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch orders');
          return res.json();
        }),
  });

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('delivered')) return 'bg-green-100 text-green-800';
    if (statusLower.includes('transit') || statusLower.includes('shipped')) return 'bg-blue-100 text-blue-800';
    if (statusLower.includes('rto')) return 'bg-red-100 text-red-800';
    if (statusLower.includes('out for delivery')) return 'bg-purple-100 text-purple-800';
    if (statusLower.includes('pickup')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const handleSyncOrders = async () => {
    setIsSyncing(true);
    try {
      const response = await apiRequest('POST', '/api/shiprocket/sync');
      if (!response.ok) {
        throw new Error('Failed to sync orders');
      }
      
      toast({
        title: 'Success',
        description: 'Orders synced successfully from Shiprocket',
      });
      
      // Refetch orders after successful sync
      refetch();
    } catch (error) {
      console.error('Error syncing orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync orders from Shiprocket',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Calculate total pages
  const totalPages = data?.data?.total_pages || 1;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Shiprocket Orders</h1>
          <p className="text-gray-500">View and manage orders from Shiprocket</p>
        </div>
        <div className="flex space-x-4">
          <Button 
            onClick={handleSyncOrders}
            disabled={isSyncing}
            className="flex items-center gap-2"
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCcw className="h-4 w-4" />
                Sync Orders
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>
            Displaying page {page} of {totalPages} ({data?.data?.orders?.length || 0} orders)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>AWB</TableHead>
                      <TableHead>Courier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.data?.orders && data.data.orders.length > 0 ? (
                      data.data.orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.order_id}</TableCell>
                          <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="font-medium">{order.shipping_customer_name}</div>
                            <div className="text-xs text-gray-500">{order.shipping_city}, {order.shipping_state}</div>
                          </TableCell>
                          <TableCell>{order.channel}</TableCell>
                          <TableCell>
                            {order.awb_code ? (
                              <div className="font-mono text-xs">{order.awb_code}</div>
                            ) : (
                              <span className="text-gray-400 text-xs">Not assigned</span>
                            )}
                          </TableCell>
                          <TableCell>{order.courier_name || '-'}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                          </TableCell>
                          <TableCell>₹{parseFloat(order.total).toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            {order.awb_code && (
                              <Button variant="outline" size="sm" asChild>
                                <Link to={`/track/${order.awb_code}`}>
                                  <Truck className="h-4 w-4 mr-1" />
                                  Track
                                </Link>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          No orders found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-center space-x-2">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </CardFooter>
      </Card>
    </div>
  );
}

export default ShiprocketOrders;