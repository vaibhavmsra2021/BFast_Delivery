import { useState } from "react";
import { useLocation } from "wouter";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    setLocation("/home");
    return null;
  }

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Submitting login form with username:', data.username);
      await login(data.username, data.password);
      
      toast({
        title: "Login Successful",
        description: "Welcome to Bfast Shipment Management",
      });
      
      // Add a short delay for the token to be stored in local storage
      console.log('Login successful, redirecting to dashboard...');
      setTimeout(() => {
        window.location.href = "/home"; // Use direct navigation to force reload
      }, 300);
    } catch (err) {
      console.error("Login form error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Invalid username or password. Please try again."
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-6">
            <div className="h-12 w-12 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mr-3">
              B
            </div>
            <h1 className="text-2xl font-bold">BFast</h1>
          </div>
          <CardTitle className="text-2xl text-center">Sign In</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
          </CardDescription>
          <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-950 border-l-4 border-yellow-500 rounded text-sm">
            <p className="font-medium">Notice:</p>
            <p className="text-xs">If you're experiencing login issues between development and deployed environments, <a 
              href="/?clearAuth=true" 
              className="text-primary font-medium underline"
            >
              click here to clear stored tokens
            </a></p>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <>
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="text-xs text-muted-foreground mb-4 p-2 border rounded bg-muted/20">
                <p className="mb-1">Having trouble signing in? Try clearing your stored tokens:</p>
                <a 
                  href="/?clearAuth=true" 
                  className="text-primary underline hover:text-primary/80"
                >
                  Click here to reset authentication
                </a>
              </div>
            </>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your username" 
                        disabled={isLoading}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter your password" 
                        disabled={isLoading}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-neutral-500">
            Shopify Order Management System
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
