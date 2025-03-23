import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OrderDetails } from "./OrderDetails";

interface Order {
  id: string;
  orderId: string;
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
  dimensions: number[];
  weight: number;
  lastUpdate: {
    timestamp: string;
    location: string;
    remark: string;
  };
}

interface OrderTableProps {
  orders: Order[];
  isLoading: boolean;
  title: string;
  totalCount: number;
  showActionButtons?: boolean;
  onAssignAWB?: (orderId: string) => void;
  onUpdateOrder?: (orderId: string, data: Partial<Order>) => void;
}

export function OrderTable({
  orders,
  isLoading,
  title,
  totalCount,
  showActionButtons = false,
  onAssignAWB,
  onUpdateOrder,
}: OrderTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
  };

  const handleCloseDetails = () => {
    setSelectedOrder(null);
  };

  const handleAssignAWB = (orderId: string) => {
    if (onAssignAWB) {
      onAssignAWB(orderId);
    }
  };

  const handleUpdateOrder = (orderId: string, data: Partial<Order>) => {
    if (onUpdateOrder) {
      onUpdateOrder(orderId, data);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-status-delivered bg-opacity-10 text-status-delivered";
      case "in-process":
      case "in transit":
        return "bg-status-inprocess bg-opacity-10 text-status-inprocess";
      case "ndr":
        return "bg-status-ndr bg-opacity-10 text-status-ndr";
      case "rto":
        return "bg-status-rto bg-opacity-10 text-status-rto";
      case "lost":
        return "bg-status-lost bg-opacity-10 text-status-lost";
      case "pending":
        return "bg-accent bg-opacity-10 text-accent";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="px-6 py-5 border-b border-neutral-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium">{title}</CardTitle>
            {showActionButtons && (
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  Export CSV
                </Button>
                <Button size="sm">Assign AWB</Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50">
                  <TableHead className="font-medium">Order ID</TableHead>
                  <TableHead className="font-medium">Customer</TableHead>
                  <TableHead className="font-medium">Date</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium">AWB</TableHead>
                  <TableHead className="font-medium">Amount</TableHead>
                  {showActionButtons && (
                    <TableHead className="font-medium">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5)
                    .fill(0)
                    .map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        {showActionButtons && (
                          <TableCell>
                            <Skeleton className="h-8 w-16" />
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                ) : orders.length > 0 ? (
                  orders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="hover:bg-neutral-50 cursor-pointer"
                      onClick={() => handleViewDetails(order)}
                    >
                      <TableCell className="font-medium">{order.orderId}</TableCell>
                      <TableCell>{order.customer.name}</TableCell>
                      <TableCell>{order.date}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusBadgeColor(order.status)}
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {order.awb || "-"}
                      </TableCell>
                      <TableCell>{order.amount}</TableCell>
                      {showActionButtons && (
                        <TableCell>
                          <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                            {!order.awb ? (
                              <Button
                                size="sm"
                                onClick={() => handleAssignAWB(order.orderId)}
                              >
                                Assign AWB
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(order)}
                              >
                                Edit
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={showActionButtons ? 7 : 6}
                      className="text-center py-8 text-neutral-500"
                    >
                      No orders found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {totalCount > 0 && (
            <div className="py-4 px-6 flex items-center justify-between">
              <p className="text-sm text-neutral-700">
                Showing{" "}
                <span className="font-medium">
                  {Math.min((page - 1) * pageSize + 1, totalCount)}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(page * pageSize, totalCount)}
                </span>{" "}
                of <span className="font-medium">{totalCount}</span> results
              </p>
              <Pagination
                currentPage={page}
                totalPages={Math.ceil(totalCount / pageSize)}
                onPageChange={setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedOrder} onOpenChange={() => handleCloseDetails()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <OrderDetails
              order={selectedOrder}
              onUpdate={(data) => {
                handleUpdateOrder(selectedOrder.orderId, data);
                handleCloseDetails();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
