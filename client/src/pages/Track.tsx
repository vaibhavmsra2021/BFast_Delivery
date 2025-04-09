import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTrackingInfo, getFallbackTrackingInfo } from "@/lib/api";
import { TrackingPage } from "@/components/track/TrackingPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function Track() {
  const [awb, setAwb] = useState("");
  const [searchedAwb, setSearchedAwb] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);
  const { toast } = useToast();

  // Fetch tracking info from Shiprocket API
  const { 
    data: trackingInfo, 
    isLoading, 
    error,
    refetch: refetchApi,
    isError
  } = useQuery({
    queryKey: ['/api/shiprocket/track', searchedAwb],
    queryFn: () => {
      if (!searchedAwb) return null;
      
      return getTrackingInfo(searchedAwb).catch(err => {
        toast({
          title: "API Error",
          description: "Falling back to database records for tracking information",
          variant: "default",
        });
        setUsingFallback(true);
        throw err;
      });
    },
    enabled: !!searchedAwb && !usingFallback,
    retry: 1
  });
  
  // Fallback query using our database
  const {
    data: fallbackTrackingInfo,
    isLoading: isFallbackLoading,
    refetch: refetchFallback,
    isError: isFallbackError,
    error: fallbackError
  } = useQuery({
    queryKey: ['/api/track', searchedAwb],
    queryFn: () => {
      if (!searchedAwb) return null;
      return getFallbackTrackingInfo(searchedAwb);
    },
    enabled: !!searchedAwb && usingFallback,
    retry: false
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!awb) {
      toast({
        title: "AWB Required",
        description: "Please enter an AWB number to track.",
        variant: "destructive",
      });
      return;
    }
    setSearchedAwb(awb);
  };

  const handleRefresh = () => {
    if (searchedAwb) {
      if (usingFallback) {
        refetchFallback();
      } else {
        refetchApi();
      }
    }
  };
  
  const handleSwitchToApi = () => {
    if (searchedAwb && usingFallback) {
      setUsingFallback(false);
    }
  };

  const handleToggleFallback = () => {
    setUsingFallback(!usingFallback);
  };

  // Determine which data source and error to use
  const currentTrackingInfo = usingFallback ? fallbackTrackingInfo : trackingInfo;
  const currentIsLoading = usingFallback ? isFallbackLoading : isLoading;
  const currentError = usingFallback 
    ? (isFallbackError && fallbackError instanceof Error ? fallbackError.message : "Tracking information not found in database") 
    : (isError && error instanceof Error ? error.message : "Tracking information not found from API");

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Track Shipment</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Track the status of any shipment using its AWB number
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Shipment Tracking</CardTitle>
              {searchedAwb && (
                <Badge 
                  variant={usingFallback ? "outline" : "default"}
                  className={usingFallback ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}
                >
                  {usingFallback ? (
                    <div className="flex items-center">
                      <Database className="h-3 w-3 mr-1" />
                      <span>Database</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <span>API</span>
                    </div>
                  )}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex space-x-2">
              <div className="flex-1">
                <Input
                  placeholder="Enter AWB Number"
                  value={awb}
                  onChange={(e) => setAwb(e.target.value)}
                />
              </div>
              <Button type="submit">
                <Search className="h-4 w-4 mr-2" />
                Track
              </Button>
              {searchedAwb && (
                <>
                  <Button type="button" variant="outline" onClick={handleRefresh}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleToggleFallback}
                    className={usingFallback ? "bg-orange-50" : ""}
                  >
                    <Database className="h-4 w-4" />
                  </Button>
                </>
              )}
            </form>
          </CardContent>
        </Card>

        <TrackingPage 
          trackingInfo={currentTrackingInfo} 
          isLoading={currentIsLoading} 
          error={currentError}
          dataSource={usingFallback ? "database" : "api"}
        />
      </div>
    </div>
  );
}
