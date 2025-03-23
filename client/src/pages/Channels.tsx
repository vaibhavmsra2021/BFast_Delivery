import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getClients, syncShopifyOrders } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, CheckCircle } from "lucide-react";

export default function Channels() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [syncingClient, setSyncingClient] = useState<string | null>(null);
  
  // Fetch all clients
  const { data: clients, isLoading } = useQuery({
    queryKey: ['/api/clients'],
  });

  // Mutation for syncing orders
  const syncOrdersMutation = useMutation({
    mutationFn: syncShopifyOrders,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/summary'] });
      toast({
        title: "Orders Synced",
        description: "All orders have been synced successfully.",
      });
      setSyncingClient(null);
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync orders",
        variant: "destructive",
      });
      setSyncingClient(null);
    },
  });

  const handleSyncAll = async () => {
    setSyncingClient("all");
    await syncOrdersMutation.mutateAsync();
  };

  const handleSyncClient = async (clientId: string) => {
    setSyncingClient(clientId);
    await syncOrdersMutation.mutateAsync();
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Channels</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Manage Shopify and other sales channels
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        <Tabs defaultValue="shopify">
          <TabsList className="mb-6">
            <TabsTrigger value="shopify">Shopify</TabsTrigger>
            <TabsTrigger value="other" disabled>Other Channels</TabsTrigger>
          </TabsList>
          
          <TabsContent value="shopify">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Connected Shopify Stores</CardTitle>
                <Button 
                  onClick={handleSyncAll} 
                  disabled={syncingClient === "all" || isLoading}
                >
                  {syncingClient === "all" ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync All
                    </>
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Store Name</TableHead>
                        <TableHead>Store ID</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Connected Since</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array(3).fill(0).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                            <TableCell><Skeleton className="h-9 w-24 rounded-md" /></TableCell>
                          </TableRow>
                        ))
                      ) : clients && clients.length > 0 ? (
                        clients.map((client: any) => (
                          <TableRow key={client.id}>
                            <TableCell className="font-medium">{client.client_name} Store</TableCell>
                            <TableCell>{client.shopify_store_id}</TableCell>
                            <TableCell>{client.client_name}</TableCell>
                            <TableCell>{format(new Date(client.created_at), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button 
                                size="sm"
                                onClick={() => handleSyncClient(client.client_id)}
                                disabled={syncingClient === client.client_id}
                              >
                                {syncingClient === client.client_id ? (
                                  <>
                                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                    Syncing
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Sync
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-neutral-500">
                            No Shopify stores connected
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
