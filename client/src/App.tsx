import React, { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
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
import ShiprocketData from "@/pages/ShiprocketData";
import ProfilePage from "@/pages/ProfilePage";
import NotFound from "@/pages/not-found";

// Layouts
import { Layout } from "@/components/layout/Layout";
import { UserRole, UserRoleType } from "./lib/auth";

function ProtectedRoute({ 
  component: Component, 
  roles = [] 
}: { 
  component: React.ComponentType<any>, 
  roles?: UserRoleType[] 
}) {
  const { isAuthenticated, checkAccess } = useAuth();
  const [, navigate] = useLocation();
  
  // Effect to handle redirection after render
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);
  
  // Don't render anything if not authenticated
  if (!isAuthenticated) {
    return null;
  }
  
  // Check role-based access
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
      <Route path="/login">
        <LoginPage />
      </Route>
      
      <Route path="/track/:awb">
        {(params) => <PublicTrack />}
      </Route>
      
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

      <Route path="/shiprocket-data">
        <ProtectedRoute 
          component={ShiprocketData} 
          roles={[UserRole.BFAST_ADMIN, UserRole.BFAST_EXECUTIVE, UserRole.CLIENT_ADMIN]}
        />
      </Route>
      


      <Route path="/profile">
        <ProtectedRoute component={ProfilePage} />
      </Route>
      
      {/* Root route */}
      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      
      {/* Fallback to 404 */}
      <Route path="/:rest*">
        <NotFound />
      </Route>
    </Switch>
  );
}

// Helper function to clear authentication storage when needed
export function clearAuthStorage() {
  localStorage.removeItem('auth-storage');
  window.location.href = '/login';
}

function App() {
  // Check if there's a URL parameter to clear auth storage
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('clearAuth') === 'true') {
    clearAuthStorage();
    return <div className="flex items-center justify-center min-h-screen">
      <div className="p-4 text-center">
        <h1 className="text-xl font-bold mb-2">Clearing Authentication Data</h1>
        <p>Redirecting to login page...</p>
      </div>
    </div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
