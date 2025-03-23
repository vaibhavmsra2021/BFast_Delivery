import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTrackingInfo } from "@/lib/api";
import { TrackingPage } from "@/components/track/TrackingPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Track() {
  const [awb, setAwb] = useState("");
  const [searchedAwb, setSearchedAwb] = useState("");
  const { toast } = useToast();

  // Fetch tracking info
  const { 
    data: trackingInfo, 
    isLoading, 
    error,
    refetch,
    isError
  } = useQuery({
    queryKey: ['/api/track', searchedAwb],
    queryFn: () => searchedAwb ? getTrackingInfo(searchedAwb) : null,
    enabled: !!searchedAwb,
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
      refetch();
    }
  };

  const errorMessage = isError 
    ? (error instanceof Error ? error.message : "Tracking information not found")
    : null;

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
            <CardTitle>Shipment Tracking</CardTitle>
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
                <Button type="button" variant="outline" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        <TrackingPage 
          trackingInfo={trackingInfo} 
          isLoading={isLoading} 
          error={errorMessage}
        />
      </div>
    </div>
  );
}
