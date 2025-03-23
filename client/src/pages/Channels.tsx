import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getClients, 
  syncShopifyOrders, 
  updateClient, 
  testShopifyConnection, 
  testShiprocketConnection,
  createClient
} from "@/lib/api";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { 
  RefreshCw, 
  CheckCircle, 
  Plus, 
  Edit2,
  AlertCircle, 
  ExternalLink, 
  ShoppingBag, 
  Truck
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { UserRole } from "@/lib/auth";

// Schema for the Shopify connection form
const shopifyConnectionSchema = z.object({
  shopify_store_id: z.string().min(2, "Store ID is required"),
  shopify_api_key: z.string().min(5, "API key is required"),
  shopify_api_secret: z.string().min(5, "API secret is required"),
});

// Schema for the Shiprocket connection form
const shiprocketConnectionSchema = z.object({
  shiprocket_api_key: z.string().min(5, "API key is required"),
});

// Schema for creating a new client
const newClientSchema = z.object({
  client_id: z.string().min(2, "Client ID is required"),
  client_name: z.string().min(2, "Client name is required"),
  shopify_store_id: z.string().min(2, "Store ID is required"),
  shopify_api_key: z.string().min(5, "API key is required"),
  shopify_api_secret: z.string().min(5, "API secret is required"),
  shiprocket_api_key: z.string().min(5, "API key is required"),
  logo_url: z.string().optional(),
});

export default function Channels() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [syncingClient, setSyncingClient] = useState<string | null>(null);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isEditShopifyOpen, setIsEditShopifyOpen] = useState(false);
  const [isEditShiprocketOpen, setIsEditShiprocketOpen] = useState(false);
  const [currentClientId, setCurrentClientId] = useState<string | null>(null);
  const [testingShopify, setTestingShopify] = useState(false);
  const [testingShiprocket, setTestingShiprocket] = useState(false);

  // For client admins, use their client ID
  const clientIdFilter = user?.role === UserRole.CLIENT_ADMIN || user?.role === UserRole.CLIENT_EXECUTIVE 
    ? user.clientId 
    : undefined;

  // Fetch all clients (or just the current client for client users)
  const { data: clients, isLoading } = useQuery({
    queryKey: ['/api/clients', clientIdFilter],
    enabled: !!user,
  });

  // Form for editing Shopify connection
  const shopifyForm = useForm<z.infer<typeof shopifyConnectionSchema>>({
    resolver: zodResolver(shopifyConnectionSchema),
    defaultValues: {
      shopify_store_id: "",
      shopify_api_key: "",
      shopify_api_secret: "",
    },
  });

  // Form for editing Shiprocket connection
  const shiprocketForm = useForm<z.infer<typeof shiprocketConnectionSchema>>({
    resolver: zodResolver(shiprocketConnectionSchema),
    defaultValues: {
      shiprocket_api_key: "",
    },
  });

  // Form for adding a new client
  const newClientForm = useForm<z.infer<typeof newClientSchema>>({
    resolver: zodResolver(newClientSchema),
    defaultValues: {
      client_id: "",
      client_name: "",
      shopify_store_id: "",
      shopify_api_key: "",
      shopify_api_secret: "",
      shiprocket_api_key: "",
      logo_url: "",
    },
  });

  // Open Shopify edit dialog for a client
  const handleEditShopify = (client: any) => {
    setCurrentClientId(client.client_id);
    shopifyForm.reset({
      shopify_store_id: client.shopify_store_id,
      shopify_api_key: client.shopify_api_key,
      shopify_api_secret: client.shopify_api_secret,
    });
    setIsEditShopifyOpen(true);
  };

  // Open Shiprocket edit dialog for a client
  const handleEditShiprocket = (client: any) => {
    setCurrentClientId(client.client_id);
    shiprocketForm.reset({
      shiprocket_api_key: client.shiprocket_api_key,
    });
    setIsEditShiprocketOpen(true);
  };

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

  // Mutation for updating client credentials
  const updateClientMutation = useMutation({
    mutationFn: ({clientId, data}: {clientId: string, data: any}) => 
      updateClient(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setIsEditShopifyOpen(false);
      setIsEditShiprocketOpen(false);
      toast({
        title: "Connection Updated",
        description: "API credentials have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update API credentials",
        variant: "destructive",
      });
    },
  });

  // Mutation for creating a new client
  const createClientMutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setIsAddClientOpen(false);
      newClientForm.reset();
      toast({
        title: "Client Created",
        description: "New client has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create new client",
        variant: "destructive",
      });
    },
  });

  // Mutation for testing Shopify connection
  const testShopifyMutation = useMutation({
    mutationFn: (credentials: any) => testShopifyConnection(credentials),
    onSuccess: () => {
      setTestingShopify(false);
      toast({
        title: "Connection Successful",
        description: "Successfully connected to Shopify",
      });
    },
    onError: (error) => {
      setTestingShopify(false);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to Shopify",
        variant: "destructive",
      });
    },
  });

  // Mutation for testing Shiprocket connection
  const testShiprocketMutation = useMutation({
    mutationFn: (credentials: any) => testShiprocketConnection(credentials),
    onSuccess: () => {
      setTestingShiprocket(false);
      toast({
        title: "Connection Successful",
        description: "Successfully connected to Shiprocket",
      });
    },
    onError: (error) => {
      setTestingShiprocket(false);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to Shiprocket",
        variant: "destructive",
      });
    },
  });

  // Handle syncing all clients
  const handleSyncAll = async () => {
    setSyncingClient("all");
    await syncOrdersMutation.mutateAsync();
  };

  // Handle syncing a specific client
  const handleSyncClient = async (clientId: string) => {
    setSyncingClient(clientId);
    await syncOrdersMutation.mutateAsync();
  };

  // Handle Shopify connection form submission
  const onShopifySubmit = async (data: z.infer<typeof shopifyConnectionSchema>) => {
    if (!currentClientId) return;
    await updateClientMutation.mutateAsync({
      clientId: currentClientId,
      data
    });
  };

  // Handle Shiprocket connection form submission
  const onShiprocketSubmit = async (data: z.infer<typeof shiprocketConnectionSchema>) => {
    if (!currentClientId) return;
    await updateClientMutation.mutateAsync({
      clientId: currentClientId,
      data
    });
  };

  // Handle new client form submission
  const onNewClientSubmit = async (data: z.infer<typeof newClientSchema>) => {
    await createClientMutation.mutateAsync(data);
  };

  // Test Shopify connection
  const handleTestShopify = async () => {
    const data = shopifyForm.getValues();
    setTestingShopify(true);
    await testShopifyMutation.mutateAsync(data);
  };

  // Test Shiprocket connection
  const handleTestShiprocket = async () => {
    const data = shiprocketForm.getValues();
    setTestingShiprocket(true);
    await testShiprocketMutation.mutateAsync(data);
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Integration Channels</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Manage connections to Shopify and Shiprocket for order management and tracking
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        <Tabs defaultValue="shopify">
          <TabsList className="mb-6">
            <TabsTrigger value="shopify">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Shopify
            </TabsTrigger>
            <TabsTrigger value="shiprocket">
              <Truck className="h-4 w-4 mr-2" />
              Shiprocket
            </TabsTrigger>
          </TabsList>
          
          {/* Shopify Tab */}
          <TabsContent value="shopify">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Shopify Connections</CardTitle>
                  <CardDescription>
                    Manage your connected Shopify stores for order synchronization
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  {user?.role === UserRole.BFAST_ADMIN && (
                    <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Client
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[625px]">
                        <DialogHeader>
                          <DialogTitle>Add New Client</DialogTitle>
                          <DialogDescription>
                            Create a new client with Shopify and Shiprocket integration
                          </DialogDescription>
                        </DialogHeader>
                        
                        <Form {...newClientForm}>
                          <form onSubmit={newClientForm.handleSubmit(onNewClientSubmit)} className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={newClientForm.control}
                                name="client_id"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Client ID</FormLabel>
                                    <FormControl>
                                      <Input placeholder="ACME001" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={newClientForm.control}
                                name="client_name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Client Name</FormLabel>
                                    <FormControl>
                                      <Input placeholder="ACME Corp" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <div className="space-y-4">
                              <h4 className="text-sm font-medium">Shopify Credentials</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={newClientForm.control}
                                  name="shopify_store_id"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Store ID</FormLabel>
                                      <FormControl>
                                        <Input placeholder="your-store" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={newClientForm.control}
                                  name="shopify_api_key"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>API Key</FormLabel>
                                      <FormControl>
                                        <Input type="password" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={newClientForm.control}
                                  name="shopify_api_secret"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>API Secret</FormLabel>
                                      <FormControl>
                                        <Input type="password" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              <h4 className="text-sm font-medium">Shiprocket Credentials</h4>
                              <FormField
                                control={newClientForm.control}
                                name="shiprocket_api_key"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>API Key</FormLabel>
                                    <FormControl>
                                      <Input type="password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <FormField
                              control={newClientForm.control}
                              name="logo_url"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Logo URL (Optional)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="https://example.com/logo.png" {...field} />
                                  </FormControl>
                                  <FormDescription>
                                    URL to the client's logo image
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <DialogFooter>
                              <Button
                                type="button" 
                                variant="outline"
                                onClick={() => setIsAddClientOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button 
                                type="submit"
                                disabled={createClientMutation.isPending}
                              >
                                {createClientMutation.isPending && (
                                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Create Client
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  )}
                  
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
                </div>
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
                      ) : clients && Array.isArray(clients) && clients.length > 0 ? (
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
                              <div className="flex space-x-2">
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditShopify(client)}
                                >
                                  <Edit2 className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
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
                              </div>
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

                {/* Edit Shopify Dialog */}
                <Dialog open={isEditShopifyOpen} onOpenChange={setIsEditShopifyOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Shopify Connection</DialogTitle>
                      <DialogDescription>
                        Update your Shopify store credentials to maintain connection
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...shopifyForm}>
                      <form onSubmit={shopifyForm.handleSubmit(onShopifySubmit)} className="space-y-6 py-4">
                        <FormField
                          control={shopifyForm.control}
                          name="shopify_store_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Store ID</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormDescription>
                                Your Shopify store identifier (e.g., your-store)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={shopifyForm.control}
                          name="shopify_api_key"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>API Key</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormDescription>
                                Find this in your Shopify store's API credentials
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={shopifyForm.control}
                          name="shopify_api_secret"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>API Secret</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormDescription>
                                The secret key from your Shopify API credentials
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <DialogFooter className="flex justify-between">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleTestShopify}
                            disabled={testingShopify}
                          >
                            {testingShopify ? (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              <>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Test Connection
                              </>
                            )}
                          </Button>
                          
                          <div className="flex space-x-2">
                            <Button
                              type="button" 
                              variant="outline"
                              onClick={() => setIsEditShopifyOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="submit"
                              disabled={updateClientMutation.isPending}
                            >
                              {updateClientMutation.isPending && (
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              Save Changes
                            </Button>
                          </div>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shiprocket Tab */}
          <TabsContent value="shiprocket">
            <Card>
              <CardHeader>
                <CardTitle>Shiprocket Connections</CardTitle>
                <CardDescription>
                  Manage your Shiprocket API keys for shipment tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
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
                            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                            <TableCell><Skeleton className="h-9 w-24 rounded-md" /></TableCell>
                          </TableRow>
                        ))
                      ) : clients && Array.isArray(clients) && clients.length > 0 ? (
                        clients.map((client: any) => (
                          <TableRow key={client.id}>
                            <TableCell className="font-medium">{client.client_name}</TableCell>
                            <TableCell>{format(new Date(client.created_at), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              {client.shiprocket_api_key ? (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Not Configured
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button 
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditShiprocket(client)}
                              >
                                <Edit2 className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-neutral-500">
                            No Shiprocket connections found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Edit Shiprocket Dialog */}
                <Dialog open={isEditShiprocketOpen} onOpenChange={setIsEditShiprocketOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Shiprocket Connection</DialogTitle>
                      <DialogDescription>
                        Update your Shiprocket API key for shipment tracking
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...shiprocketForm}>
                      <form onSubmit={shiprocketForm.handleSubmit(onShiprocketSubmit)} className="space-y-6 py-4">
                        <FormField
                          control={shiprocketForm.control}
                          name="shiprocket_api_key"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>API Key</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormDescription>
                                Your Shiprocket authentication token
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <DialogFooter className="flex justify-between">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleTestShiprocket}
                            disabled={testingShiprocket}
                          >
                            {testingShiprocket ? (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              <>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Test Connection
                              </>
                            )}
                          </Button>
                          
                          <div className="flex space-x-2">
                            <Button
                              type="button" 
                              variant="outline"
                              onClick={() => setIsEditShiprocketOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="submit"
                              disabled={updateClientMutation.isPending}
                            >
                              {updateClientMutation.isPending && (
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              Save Changes
                            </Button>
                          </div>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardContent>
              <CardFooter className="flex flex-col items-start">
                <h4 className="text-sm font-medium mb-2">About Shiprocket Integration</h4>
                <p className="text-sm text-neutral-600">
                  Connect your Shiprocket account to enable real-time tracking of shipments. The system will 
                  automatically update order status based on information from Shiprocket.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
