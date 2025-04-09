import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/custom-pagination';
import { Badge } from '@/components/ui/badge';
import { Loader2, Truck, RefreshCcw } from 'lucide-react';
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

interface ShiprocketOrdersListProps {
  maxItems?: number;
}

export function ShiprocketOrdersList({ maxItems = 5 }: ShiprocketOrdersListProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(maxItems);
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Shiprocket Orders</CardTitle>
          <CardDescription>
            Latest orders from Shiprocket
          </CardDescription>
        </div>
        <Button 
          onClick={handleSyncOrders}
          disabled={isSyncing}
          size="sm"
          variant="outline"
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
              Sync
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>AWB</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="text-right">Track</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data?.orders && data.data.orders.length > 0 ? (
                    data.data.orders.slice(0, maxItems).map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_id}</TableCell>
                        <TableCell>
                          <div className="font-medium">{order.shipping_customer_name}</div>
                          <div className="text-xs text-gray-500">{order.shipping_city}</div>
                        </TableCell>
                        <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {order.awb_code ? (
                            <div className="font-mono text-xs">{order.awb_code}</div>
                          ) : (
                            <span className="text-gray-400 text-xs">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>₹{parseFloat(order.total).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          {order.awb_code && (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                              <Link to={`/track/${order.awb_code}`}>
                                <Truck className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-gray-500">
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
      {totalPages > 1 && (
        <CardFooter className="flex justify-center space-x-2 border-t pt-4">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </CardFooter>
      )}
    </Card>
  );
}