import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, CheckCircle, AlertTriangle, TruckIcon, RefreshCw, Database, Radio } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Common interface for tracking steps
interface TrackingStep {
  date: string;
  location: string;
  status: string;
  activity: string;
}

// Combined tracking info type to handle both API and DB responses
interface TrackingInfo {
  source?: 'api' | 'database';
  
  // Order info
  order_id?: string;
  awb?: string;
  customer_name?: string;
  courier_name?: string;
  etd?: string;
  delivery_address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  amount?: number;
  payment_mode?: string;
  product_name?: string;
  quantity?: number;
  
  // Tracking info
  status?: string;
  current_status?: string;
  last_update?: string;
  current_timestamp?: string;
  last_location?: string;
  last_remark?: string;
  shipment_track_activities?: TrackingStep[];
  track_url?: string;
  
  // Client info
  client_name?: string;
  client_logo?: string;
}

interface TrackingPageProps {
  trackingInfo: any;
  isLoading: boolean;
  error: string | null;
  dataSource?: 'api' | 'database';
}

export function TrackingPage({ trackingInfo, isLoading, error, dataSource = 'api' }: TrackingPageProps) {
  const [showAllSteps, setShowAllSteps] = useState(false);

  if (isLoading) {
    return <TrackingPageSkeleton />;
  }

  if (error || !trackingInfo) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
            <h3 className="text-xl font-medium mb-2">Tracking Information Not Found</h3>
            <p className="text-neutral-600 text-center max-w-md">
              {error || "We couldn't find tracking information for this AWB number. Please check the number and try again."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determine data source
  const actualSource = trackingInfo.source || dataSource;
  
  // Extract tracking info based on response structure
  let parsedInfo: TrackingInfo = {};
  let trackingHistory: TrackingStep[] = [];
  
  // API response format
  if (trackingInfo.tracking_data) {
    // Extract customer name from the shipment track data
    const shipmentTrack = trackingInfo.tracking_data.shipment_track?.[0] || {};
    
    parsedInfo = {
      source: 'api',
      order_id: trackingInfo.order?.order_id,
      awb: trackingInfo.order?.awb || shipmentTrack.awb_code,
      customer_name: shipmentTrack.consignee_name,
      courier_name: shipmentTrack.courier_name || trackingInfo.order?.courier_name,
      status: shipmentTrack.current_status || trackingInfo.order?.current_status || trackingInfo.order?.shipment_status,
      current_status: shipmentTrack.current_status || trackingInfo.order?.current_status,
      delivery_address: shipmentTrack.destination,
      city: shipmentTrack.destination,
      state: null,
      etd: shipmentTrack.edd || trackingInfo.tracking_data?.etd || trackingInfo.order?.etd,
      current_timestamp: shipmentTrack.updated_time_stamp || trackingInfo.order?.current_timestamp,
      track_url: trackingInfo.tracking_data?.track_url
    };
    
    // Extract tracking history from API response
    trackingHistory = (trackingInfo.tracking_data.shipment_track_activities || []).map((activity: any) => ({
      date: activity.date,
      location: activity.location || 'Unknown',
      status: activity.status,
      activity: activity.activity
    }));
  } 
  // Database response format
  else if (trackingInfo.order && trackingInfo.tracking) {
    parsedInfo = {
      source: 'database',
      order_id: trackingInfo.order.order_id,
      awb: trackingInfo.order.awb,
      customer_name: trackingInfo.order.customer_name,
      delivery_address: trackingInfo.order.delivery_address,
      city: trackingInfo.order.city,
      state: trackingInfo.order.state,
      pincode: trackingInfo.order.pincode,
      amount: trackingInfo.order.amount,
      payment_mode: trackingInfo.order.payment_mode,
      product_name: trackingInfo.order.product_name,
      quantity: trackingInfo.order.quantity,
      status: trackingInfo.tracking.status,
      last_update: trackingInfo.tracking.last_update,
      last_location: trackingInfo.tracking.last_location,
      last_remark: trackingInfo.tracking.last_remark,
      client_name: trackingInfo.client?.name,
      client_logo: trackingInfo.client?.logo
    };
    
    // Extract tracking history from database response
    trackingHistory = trackingInfo.tracking?.tracking_history || [];
  }
  
  // Display limited history initially
  const displayHistory = showAllSteps ? trackingHistory : trackingHistory.slice(0, 5);
  const hasMoreSteps = trackingHistory.length > 5;

  // Format status for display
  const getStatusBadge = (status: string = '') => {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('delivered')) {
      return <Badge className="bg-green-100 text-green-800">Delivered</Badge>;
    } else if (statusLower.includes('transit') || statusLower.includes('pickup') || statusLower.includes('shipped')) {
      return <Badge className="bg-blue-100 text-blue-800">In Transit</Badge>;
    } else if (statusLower.includes('return') || statusLower.includes('rto')) {
      return <Badge className="bg-red-100 text-red-800">Returned</Badge>;
    } else if (statusLower.includes('pending') || statusLower.includes('created')) {
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    } else {
      return <Badge>{status}</Badge>;
    }
  };

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Shipment Details {parsedInfo.awb && `(AWB: ${parsedInfo.awb})`}</CardTitle>
            <Badge 
              variant="outline"
              className={actualSource === 'database' ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}
            >
              <div className="flex items-center gap-1">
                {actualSource === 'database' ? <Database className="h-3 w-3" /> : <Radio className="h-3 w-3" />}
                <span>Source: {actualSource === 'database' ? 'Database' : 'API'}</span>
              </div>
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Order Information */}
            <div>
              <h3 className="font-medium mb-3">Order Information</h3>
              <div className="space-y-2">
                {parsedInfo.order_id && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Order ID:</span>
                    <span className="font-medium">{parsedInfo.order_id}</span>
                  </div>
                )}
                {parsedInfo.awb && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">AWB Number:</span>
                    <span className="font-medium">{parsedInfo.awb}</span>
                  </div>
                )}
                {parsedInfo.courier_name && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Courier:</span>
                    <span>{parsedInfo.courier_name}</span>
                  </div>
                )}
                {parsedInfo.status && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Status:</span>
                    <span>{getStatusBadge(parsedInfo.status)}</span>
                  </div>
                )}
                {parsedInfo.etd && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Expected Delivery:</span>
                    <span>{new Date(parsedInfo.etd).toLocaleDateString()}</span>
                  </div>
                )}
                {parsedInfo.payment_mode && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Payment Mode:</span>
                    <span>{parsedInfo.payment_mode}</span>
                  </div>
                )}
                {typeof parsedInfo.amount === 'number' && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Amount:</span>
                    <span className="font-medium">₹{parsedInfo.amount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Shipping Information */}
            <div>
              <h3 className="font-medium mb-3">Shipping Information</h3>
              <div className="space-y-2">
                {parsedInfo.customer_name && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Customer:</span>
                    <span className="font-medium">{parsedInfo.customer_name}</span>
                  </div>
                )}
                {parsedInfo.delivery_address && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Address:</span>
                    <span className="text-right">{parsedInfo.delivery_address}</span>
                  </div>
                )}
                {(parsedInfo.city || parsedInfo.state || parsedInfo.pincode) && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Location:</span>
                    <span>
                      {parsedInfo.city ? `${parsedInfo.city}, ` : ''}
                      {parsedInfo.state ? `${parsedInfo.state} ` : ''}
                      {parsedInfo.pincode ? `- ${parsedInfo.pincode}` : ''}
                    </span>
                  </div>
                )}
                {parsedInfo.product_name && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Product:</span>
                    <span>{parsedInfo.product_name}</span>
                  </div>
                )}
                {parsedInfo.quantity && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Quantity:</span>
                    <span>{parsedInfo.quantity}</span>
                  </div>
                )}
                {parsedInfo.last_update && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Last Update:</span>
                    <span>{new Date(parsedInfo.last_update).toLocaleString()}</span>
                  </div>
                )}
                {parsedInfo.current_timestamp && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Last Update:</span>
                    <span>{new Date(parsedInfo.current_timestamp).toLocaleString()}</span>
                  </div>
                )}
                {parsedInfo.track_url && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Track On:</span>
                    <a 
                      href={parsedInfo.track_url} 
                      target="_blank"
                      rel="noopener noreferrer" 
                      className="text-primary hover:underline"
                    >
                      Courier Website
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Client details if available */}
          {parsedInfo.client_name && (
            <div className="mt-4 pt-4 border-t border-neutral-200">
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Shipped By:</span>
                <div className="flex items-center">
                  {parsedInfo.client_logo && (
                    <img 
                      src={parsedInfo.client_logo} 
                      alt={parsedInfo.client_name} 
                      className="h-6 mr-2" 
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  )}
                  <span className="font-medium">{parsedInfo.client_name}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tracking History</CardTitle>
        </CardHeader>
        <CardContent>
          {displayHistory.length > 0 ? (
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-neutral-200" />
              
              <div className="space-y-6">
                {displayHistory.map((step, index) => (
                  <div key={index} className="relative pl-8">
                    <div className="absolute left-0 top-1.5 rounded-full bg-primary p-1">
                      {index === 0 ? (
                        <Package className="h-3 w-3 text-primary-foreground" />
                      ) : index === displayHistory.length - 1 && step.status && step.status.toLowerCase().includes('delivered') ? (
                        <CheckCircle className="h-3 w-3 text-primary-foreground" />
                      ) : (
                        <TruckIcon className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <div className="mb-1 sm:mb-0">
                        <h4 className="font-medium">{step.status || 'Status Update'}</h4>
                        <p className="text-sm text-neutral-600">{step.activity || ''}</p>
                      </div>
                      <div className="text-sm text-neutral-500 sm:text-right">
                        <div>{step.date ? new Date(step.date).toLocaleDateString() : 'Unknown date'}</div>
                        <div>{step.date ? new Date(step.date).toLocaleTimeString() : ''}</div>
                        <div>{step.location || 'Unknown location'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {hasMoreSteps && (
                <div className="mt-4 text-center">
                  <button
                    className="inline-flex items-center text-sm text-primary hover:underline"
                    onClick={() => setShowAllSteps(!showAllSteps)}
                  >
                    {showAllSteps ? "Show Less" : `Show All (${trackingHistory.length})`}
                    <RefreshCw className="ml-1 h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 text-center text-neutral-500">
              No tracking history available
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function TrackingPageSkeleton() {
  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Skeleton className="h-5 w-40 mb-4" />
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Skeleton className="h-5 w-40 mb-4" />
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="relative pl-8">
                <Skeleton className="absolute left-0 top-1.5 h-5 w-5 rounded-full" />
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <div className="mb-1 sm:mb-0">
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}