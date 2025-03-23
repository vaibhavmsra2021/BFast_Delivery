import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const clientSchema = z.object({
  client_id: z.string().min(3, "Client ID must be at least 3 characters"),
  client_name: z.string().min(1, "Client name is required"),
  shopify_store_id: z.string().min(1, "Shopify store ID is required"),
  shopify_api_key: z.string().min(1, "Shopify API key is required"),
  shopify_api_secret: z.string().min(1, "Shopify API secret is required"),
  shiprocket_api_key: z.string().min(1, "Shiprocket API key is required"),
  logo_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export default function AddClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
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

  // Mutation for creating client
  const createClientMutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setSuccess(true);
      setError(null);
      form.reset();
      toast({
        title: "Client Created",
        description: "The client has been created successfully.",
      });
    },
    onError: (error) => {
      setError(error instanceof Error ? error.message : "Failed to create client");
      setSuccess(false);
      toast({
        title: "Client Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create client",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ClientFormValues) => {
    setError(null);
    setSuccess(false);
    createClientMutation.mutate(data);
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Add Client</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Add a new client and connect their Shopify store
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-6 border-green-500 text-green-700 bg-green-50">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>Client created successfully!</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="client_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client ID</FormLabel>
                        <FormControl>
                          <Input placeholder="client123" {...field} />
                        </FormControl>
                        <FormDescription>
                          Unique identifier for the client
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="client_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Name</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC Retail" {...field} />
                        </FormControl>
                        <FormDescription>
                          Full name of the client
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="shopify_store_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shopify Store ID</FormLabel>
                        <FormControl>
                          <Input placeholder="abc-retail" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="logo_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/logo.png" {...field} />
                        </FormControl>
                        <FormDescription>
                          URL to the client's logo (optional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="shopify_api_key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shopify API Key</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shopify_api_secret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shopify API Secret</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shiprocket_api_key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shiprocket API Key</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={createClientMutation.isPending}
                >
                  {createClientMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Client"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
