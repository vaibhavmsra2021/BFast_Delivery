import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, CheckCircle, AlertTriangle, TruckIcon, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TrackingStep {
  date: string;
  location: string;
  status_detail: string;
}

interface TrackingInfo {
  order: {
    order_id: string;
    awb: string;
    customer_name: string;
    delivery_address: string;
    city: string;
    state: string;
    pincode: string;
    amount: number;
    payment_mode: string;
    product_name: string;
    quantity: number;
  };
  tracking: {
    status: string;
    last_update: string;
    last_location: string;
    last_remark: string;
    tracking_history: TrackingStep[];
  };
  client: {
    name: string;
    logo: string;
  };
}

interface TrackingPageProps {
  trackingInfo: TrackingInfo | null;
  isLoading: boolean;
  error: string | null;
}

export function TrackingPage({ trackingInfo, isLoading, error }: TrackingPageProps) {
  const [statusPercentage, setStatusPercentage] = useState(0);

  useEffect(() => {
    if (trackingInfo?.tracking?.status) {
      const statusMap: Record<string, number> = {
        "Pending": 10,
        "In-Process": 40,
        "Delivered": 100,
        "RTO": 100,
        "NDR": 80,
        "Lost": 100
      };
      
      setStatusPercentage(statusMap[trackingInfo.tracking.status] || 0);
    }
  }, [trackingInfo]);

  const getStatusIcon = (status: string | undefined) => {
    switch(status) {
      case "Delivered":
        return <CheckCircle className="h-8 w-8 text-status-delivered" />;
      case "RTO":
        return <RefreshCw className="h-8 w-8 text-status-rto" />;
      case "NDR":
        return <AlertTriangle className="h-8 w-8 text-status-ndr" />;
      case "Lost":
        return <AlertTriangle className="h-8 w-8 text-status-lost" />;
      default:
        return <TruckIcon className="h-8 w-8 text-status-inprocess" />;
    }
  };

  const getStatusColor = (status: string | undefined) => {
    switch(status) {
      case "Delivered":
        return "text-status-delivered";
      case "RTO":
        return "text-status-rto";
      case "NDR":
        return "text-status-ndr";
      case "Lost":
        return "text-status-lost";
      default:
        return "text-status-inprocess";
    }
  };

  const getStatusBadgeColor = (status: string | undefined) => {
    switch(status) {
      case "Delivered":
        return "bg-status-delivered bg-opacity-10 text-status-delivered";
      case "RTO":
        return "bg-status-rto bg-opacity-10 text-status-rto";
      case "NDR":
        return "bg-status-ndr bg-opacity-10 text-status-ndr";
      case "Lost":
        return "bg-status-lost bg-opacity-10 text-status-lost";
      default:
        return "bg-status-inprocess bg-opacity-10 text-status-inprocess";
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[300px]">
          <AlertTriangle className="h-12 w-12 text-status-rto mb-4" />
          <h2 className="text-xl font-bold mb-2">Tracking Information Not Found</h2>
          <p className="text-neutral-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      {isLoading ? (
        <CardContent className="pt-6">
          <div className="flex justify-between items-start mb-8">
            <div>
              <Skeleton className="h-8 w-40 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
          
          <div className="mb-8">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          
          <div className="flex mb-8">
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
          
          <div className="space-y-8">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex">
                <Skeleton className="h-10 w-10 rounded-full mr-4" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-40 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      ) : trackingInfo ? (
        <>
          <CardHeader className="pb-0">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl">
                  Tracking #{trackingInfo.order.awb}
                </CardTitle>
                <p className="text-sm text-neutral-500">
                  Order #{trackingInfo.order.order_id}
                </p>
              </div>
              {trackingInfo.client.logo ? (
                <img 
                  src={trackingInfo.client.logo} 
                  alt={`${trackingInfo.client.name} logo`} 
                  className="h-12 w-auto"
                />
              ) : (
                <div className="h-12 w-12 bg-primary text-white rounded-full flex items-center justify-center text-lg font-bold">
                  {trackingInfo.client.name.charAt(0)}
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="pt-6">
            {/* Status */}
            <div className="mb-8">
              <div className="flex items-center mb-2">
                {getStatusIcon(trackingInfo.tracking.status)}
                <h2 className={`text-xl font-bold ml-2 ${getStatusColor(trackingInfo.tracking.status)}`}>
                  {trackingInfo.tracking.status}
                </h2>
                <Badge className={`ml-3 ${getStatusBadgeColor(trackingInfo.tracking.status)}`}>
                  {trackingInfo.order.payment_mode}
                </Badge>
              </div>
              
              <p className="text-neutral-600">
                {trackingInfo.tracking.last_remark || "Your package is on the way."}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="w-full bg-neutral-100 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${
                    trackingInfo.tracking.status === "RTO" 
                      ? "bg-status-rto" 
                      : trackingInfo.tracking.status === "NDR"
                      ? "bg-status-ndr"
                      : trackingInfo.tracking.status === "Lost"
                      ? "bg-status-lost"
                      : "bg-primary"
                  }`}
                  style={{ width: `${statusPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Shipment Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="text-sm font-medium text-neutral-500 mb-1">
                  Delivery Address
                </h3>
                <p className="font-medium">{trackingInfo.order.customer_name}</p>
                <p className="text-neutral-700">{trackingInfo.order.delivery_address}</p>
                <p className="text-neutral-700">
                  {trackingInfo.order.city}, {trackingInfo.order.state} {trackingInfo.order.pincode}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-neutral-500 mb-1">
                  Shipment Details
                </h3>
                <p className="font-medium">{trackingInfo.order.product_name}</p>
                <p className="text-neutral-700">Quantity: {trackingInfo.order.quantity}</p>
                <p className="text-neutral-700">Amount: ₹{trackingInfo.order.amount.toFixed(2)}</p>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Tracking History */}
            <div>
              <h3 className="text-lg font-medium mb-4">Tracking History</h3>
              
              {trackingInfo.tracking.tracking_history && trackingInfo.tracking.tracking_history.length > 0 ? (
                <div className="space-y-6 relative">
                  {trackingInfo.tracking.tracking_history.map((step, index) => (
                    <div 
                      key={index} 
                      className={`relative pl-8 ${
                        index !== trackingInfo.tracking.tracking_history.length - 1 
                          ? "pb-8 border-l-2 border-primary" 
                          : ""
                      }`}
                    >
                      <div className="absolute w-4 h-4 bg-primary rounded-full -left-[9px] top-0"></div>
                      <div>
                        <div className="font-medium">
                          {step.location}
                        </div>
                        <div className="text-sm mt-1">
                          {step.status_detail}
                        </div>
                        <div className="text-xs text-neutral-500 mt-1">
                          {step.date}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-500 flex flex-col items-center">
                  <Package className="h-12 w-12 text-neutral-300 mb-2" />
                  <p>No tracking history available yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </>
      ) : (
        <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[300px]">
          <Package className="h-12 w-12 text-neutral-300 mb-4" />
          <h2 className="text-xl font-bold mb-2">No Tracking Information</h2>
          <p className="text-neutral-600">Enter a valid AWB number to track your shipment</p>
        </CardContent>
      )}
    </Card>
  );
}
