import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createUser, getUsers, getClients } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Input } from "@/components/ui/input";
import { AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth, UserRole } from "@/lib/auth";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: passwordSchema,
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Must be a valid email"),
  role: z.enum([
    UserRole.BFAST_ADMIN,
    UserRole.BFAST_EXECUTIVE,
    UserRole.CLIENT_ADMIN,
    UserRole.CLIENT_EXECUTIVE,
  ]),
  client_id: z.string().nullable(),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function AddUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get current user role and client
  const isBfastAdmin = user?.role === UserRole.BFAST_ADMIN;
  const clientId = user?.clientId || null;

  // Fetch users
  const { data: users, isLoading: isUsersLoading } = useQuery({
    queryKey: ['/api/users'],
  });

  // Fetch clients (for Bfast admin)
  const { data: clients, isLoading: isClientsLoading } = useQuery({
    queryKey: ['/api/clients'],
    enabled: isBfastAdmin,
  });

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      role: isBfastAdmin ? UserRole.BFAST_EXECUTIVE : UserRole.CLIENT_EXECUTIVE,
      client_id: clientId,
    },
  });

  // Update the client_id field when role changes
  const watchedRole = form.watch("role");
  
  // Mutation for creating user
  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setSuccess(true);
      setError(null);
      form.reset({
        username: "",
        password: "",
        name: "",
        email: "",
        role: isBfastAdmin ? UserRole.BFAST_EXECUTIVE : UserRole.CLIENT_EXECUTIVE,
        client_id: clientId,
      });
      toast({
        title: "User Created",
        description: "The user has been created successfully.",
      });
    },
    onError: (error) => {
      setError(error instanceof Error ? error.message : "Failed to create user");
      setSuccess(false);
      toast({
        title: "User Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UserFormValues) => {
    setError(null);
    setSuccess(false);
    
    // If role is Bfast Admin or Executive, set client_id to null
    if (data.role === UserRole.BFAST_ADMIN || data.role === UserRole.BFAST_EXECUTIVE) {
      data.client_id = null;
    }
    
    // Client admin can only create client executive for their client
    if (!isBfastAdmin && data.role !== UserRole.CLIENT_EXECUTIVE) {
      setError("You can only create Client Executive users");
      return;
    }
    
    createUserMutation.mutate(data);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case UserRole.BFAST_ADMIN:
        return "bg-red-100 text-red-800";
      case UserRole.BFAST_EXECUTIVE:
        return "bg-blue-100 text-blue-800";
      case UserRole.CLIENT_ADMIN:
        return "bg-purple-100 text-purple-800";
      case UserRole.CLIENT_EXECUTIVE:
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case UserRole.BFAST_ADMIN:
        return "BFast Admin";
      case UserRole.BFAST_EXECUTIVE:
        return "BFast Executive";
      case UserRole.CLIENT_ADMIN:
        return "Client Admin";
      case UserRole.CLIENT_EXECUTIVE:
        return "Client Executive";
      default:
        return role;
    }
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-neutral-900">User Management</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Add and manage users in the system
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        <Tabs defaultValue="add">
          <TabsList className="mb-6">
            <TabsTrigger value="add">Add User</TabsTrigger>
            <TabsTrigger value="manage">Manage Users</TabsTrigger>
          </TabsList>
          
          <TabsContent value="add">
            <Card className="max-w-3xl mx-auto">
              <CardHeader>
                <CardTitle>Create New User</CardTitle>
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
                    <AlertDescription>User created successfully!</AlertDescription>
                  </Alert>
                )}

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="johndoe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="john.doe@example.com" 
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
                              placeholder="••••••••" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Must be at least 8 characters with uppercase, lowercase, and numbers
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isBfastAdmin && (
                                  <>
                                    <SelectItem value={UserRole.BFAST_ADMIN}>
                                      BFast Admin
                                    </SelectItem>
                                    <SelectItem value={UserRole.BFAST_EXECUTIVE}>
                                      BFast Executive
                                    </SelectItem>
                                    <SelectItem value={UserRole.CLIENT_ADMIN}>
                                      Client Admin
                                    </SelectItem>
                                    <SelectItem value={UserRole.CLIENT_EXECUTIVE}>
                                      Client Executive
                                    </SelectItem>
                                  </>
                                )}
                                {!isBfastAdmin && (
                                  <SelectItem value={UserRole.CLIENT_EXECUTIVE}>
                                    Client Executive
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {(watchedRole === UserRole.CLIENT_ADMIN || 
                        watchedRole === UserRole.CLIENT_EXECUTIVE) && 
                        isBfastAdmin && (
                        <FormField
                          control={form.control}
                          name="client_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Client</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value || undefined}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a client" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isClientsLoading ? (
                                    <SelectItem value="loading" disabled>
                                      Loading clients...
                                    </SelectItem>
                                  ) : clients && clients.length > 0 ? (
                                    clients.map((client: any) => (
                                      <SelectItem key={client.client_id} value={client.client_id}>
                                        {client.client_name}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="none" disabled>
                                      No clients available
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={createUserMutation.isPending}
                    >
                      {createUserMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create User"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="manage">
            <Card>
              <CardHeader>
                <CardTitle>User List</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Client</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isUsersLoading ? (
                        Array(5).fill(0).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          </TableRow>
                        ))
                      ) : users && users.length > 0 ? (
                        users.map((user: any) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge className={getRoleBadgeColor(user.role)}>
                                {getRoleLabel(user.role)}
                              </Badge>
                            </TableCell>
                            <TableCell>{user.client_id || "—"}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-neutral-500">
                            No users found
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
