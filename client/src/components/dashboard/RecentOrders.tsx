import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

interface Order {
  id: string;
  orderId: string;
  customer: string;
  date: string;
  status: "Delivered" | "In Transit" | "NDR" | "RTO" | "Lost";
  awb: string;
  amount: string;
}

interface RecentOrdersProps {
  orders: Order[];
  isLoading: boolean;
}

const StatusBadge = ({ status }: { status: Order["status"] }) => {
  const color = useMemo(() => {
    switch (status) {
      case "Delivered":
        return "bg-status-delivered bg-opacity-10 text-status-delivered";
      case "In Transit":
        return "bg-status-inprocess bg-opacity-10 text-status-inprocess";
      case "NDR":
        return "bg-status-ndr bg-opacity-10 text-status-ndr";
      case "RTO":
        return "bg-status-rto bg-opacity-10 text-status-rto";
      case "Lost":
        return "bg-status-lost bg-opacity-10 text-status-lost";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }, [status]);

  return (
    <Badge variant="outline" className={`px-2 ${color}`}>
      {status}
    </Badge>
  );
};

export function RecentOrders({ orders, isLoading }: RecentOrdersProps) {
  return (
    <Card>
      <CardHeader className="px-4 py-5 sm:px-6 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium text-neutral-900">
            Recent Orders
          </CardTitle>
          <Link href="/order-data">
            <Button variant="ghost" className="text-sm text-primary font-medium">
              View All Orders
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 ml-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                >
                  Order ID
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                >
                  Customer
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                >
                  AWB
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                >
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {isLoading ? (
                // Loading skeleton
                Array(5)
                  .fill(0)
                  .map((_, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-4 w-16" />
                      </td>
                    </tr>
                  ))
              ) : orders.length > 0 ? (
                orders.map((order) => (
                  <tr key={order.id} className="table-row-hover">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                      {order.orderId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {order.customer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {order.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-neutral-600">
                      {order.awb}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {order.amount}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-neutral-500">
                    No orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {orders.length > 0 && (
          <nav className="bg-white px-4 py-3 flex items-center justify-between border-t border-neutral-200 sm:px-6">
            <div className="hidden sm:block">
              <p className="text-sm text-neutral-700">
                Showing <span className="font-medium">1</span> to{" "}
                <span className="font-medium">{Math.min(orders.length, 5)}</span> of{" "}
                <span className="font-medium">{orders.length}</span> results
              </p>
            </div>
            <div className="flex-1 flex justify-between sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                disabled
                className="relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md disabled:opacity-50"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="ml-3 relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md"
              >
                Next
              </Button>
            </div>
          </nav>
        )}
      </CardContent>
    </Card>
  );
}
