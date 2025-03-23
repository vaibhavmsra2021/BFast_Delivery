import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getPublicTrackingInfo } from "@/lib/api";
import { TrackingPage } from "@/components/track/TrackingPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function PublicTrack() {
  const [, params] = useRoute<{ awb: string }>("/track/:awb");
  const [awb, setAwb] = useState("");
  const [searchedAwb, setSearchedAwb] = useState("");
  
  // Set initial AWB from URL params
  useEffect(() => {
    if (params?.awb) {
      setAwb(params.awb);
      setSearchedAwb(params.awb);
    }
  }, [params]);

  // Fetch tracking info for public tracking
  const { 
    data: trackingInfo, 
    isLoading, 
    error,
    isError
  } = useQuery({
    queryKey: ['/api/track', searchedAwb],
    queryFn: () => searchedAwb ? getPublicTrackingInfo(searchedAwb) : null,
    enabled: !!searchedAwb,
    retry: false
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (awb) {
      setSearchedAwb(awb);
      // Update URL without page reload
      window.history.pushState(null, "", `/track/${awb}`);
    }
  };

  const errorMessage = isError 
    ? (error instanceof Error ? error.message : "Tracking information not found")
    : null;

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Track Your Shipment</h1>
          <p className="text-neutral-600">Enter your AWB number to track your shipment status</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-center">Shipment Tracking</CardTitle>
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
