import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "./lib/auth";

// Pages
import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";
import PendingOrders from "@/pages/PendingOrders";
import OrderData from "@/pages/OrderData";
import Track from "@/pages/Track";
import ManifestOrders from "@/pages/ManifestOrders";
import Channels from "@/pages/Channels";
import AddClient from "@/pages/AddClient";
import AddUser from "@/pages/AddUser";
import PublicTrack from "@/pages/PublicTrack";
import NotFound from "@/pages/not-found";

// Layouts
import { Layout } from "@/components/layout/Layout";
import { UserRole } from "./lib/auth";

function ProtectedRoute({ 
  component: Component, 
  roles = [] 
}: { 
  component: React.ComponentType<any>, 
  roles?: UserRole[] 
}) {
  const { isAuthenticated, checkAccess } = useAuth();
  
  if (!isAuthenticated) {
    return null; // Layout will redirect to login
  }
  
  if (roles.length > 0 && !checkAccess(roles)) {
    return <NotFound />;
  }
  
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={LoginPage} />
      <Route path="/track/:awb" component={PublicTrack} />
      
      {/* Protected routes with role-based access */}
      <Route path="/home">
        <ProtectedRoute component={Dashboard} />
      </Route>
      
      <Route path="/pending-orders">
        <ProtectedRoute component={PendingOrders} />
      </Route>
      
      <Route path="/order-data">
        <ProtectedRoute component={OrderData} />
      </Route>
      
      <Route path="/track">
        <ProtectedRoute component={Track} />
      </Route>
      
      <Route path="/manifest-orders">
        <ProtectedRoute 
          component={ManifestOrders} 
          roles={[UserRole.BFAST_ADMIN, UserRole.BFAST_EXECUTIVE, UserRole.CLIENT_ADMIN]} 
        />
      </Route>
      
      <Route path="/channels">
        <ProtectedRoute 
          component={Channels} 
          roles={[UserRole.BFAST_ADMIN]} 
        />
      </Route>
      
      <Route path="/add-client">
        <ProtectedRoute 
          component={AddClient} 
          roles={[UserRole.BFAST_ADMIN]} 
        />
      </Route>
      
      <Route path="/add-user">
        <ProtectedRoute 
          component={AddUser} 
          roles={[UserRole.BFAST_ADMIN, UserRole.CLIENT_ADMIN]} 
        />
      </Route>
      
      {/* Redirect from root to dashboard */}
      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
