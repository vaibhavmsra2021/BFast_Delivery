import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth, UserRole } from "@/lib/auth";
import {
  Home,
  Clock,
  FileText,
  MapPin,
  FileBarChart,
  Globe,
  UserPlus,
  Users
} from "lucide-react";

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
}

const SidebarLink = ({ href, icon, children, active }: SidebarLinkProps) => {
  return (
    <div>
      <Link href={href}>
        <div
          className={cn(
            "group cursor-pointer flex items-center px-2 py-2 text-base font-medium rounded-md",
            active
              ? "bg-primary-light bg-opacity-10 text-primary"
              : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
          )}
        >
          <span className="h-6 w-6 mr-3">{icon}</span>
          {children}
        </div>
      </Link>
    </div>
  );
};

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  if (!user) return null;
  
  const isBfastAdmin = user.role === UserRole.BFAST_ADMIN;
  const isBfastExec = user.role === UserRole.BFAST_EXECUTIVE;
  const isClientAdmin = user.role === UserRole.CLIENT_ADMIN;
  
  // Determine which links to show based on user role
  const showHome = true;
  const showPendingOrders = true;
  const showOrderData = true;
  const showTrack = true;
  const showManifest = isBfastAdmin || isBfastExec || isClientAdmin;
  const showChannels = isBfastAdmin;
  const showAddClient = isBfastAdmin;
  const showAddUser = isBfastAdmin || isClientAdmin;
  
  return (
    <div className="w-64 bg-white shadow-md overflow-hidden hidden lg:block">
      <div className="px-4 py-5 flex items-center">
        <div className="h-10 w-10 rounded bg-primary text-white flex items-center justify-center">
          <span className="text-lg font-semibold">B</span>
        </div>
        <h1 className="ml-3 text-xl font-semibold text-neutral-800">BFast</h1>
      </div>
      
      <nav className="mt-4">
        <div className="px-2 space-y-1">
          {showHome && (
            <SidebarLink 
              href="/home" 
              icon={<Home className="text-current" />}
              active={location === "/home"}
            >
              Dashboard
            </SidebarLink>
          )}
          
          {showPendingOrders && (
            <SidebarLink 
              href="/pending-orders" 
              icon={<Clock className="text-current" />}
              active={location === "/pending-orders"}
            >
              Pending Orders
            </SidebarLink>
          )}
          
          {showOrderData && (
            <SidebarLink 
              href="/order-data" 
              icon={<FileText className="text-current" />}
              active={location === "/order-data"}
            >
              Order Data
            </SidebarLink>
          )}
          
          {showTrack && (
            <SidebarLink 
              href="/track" 
              icon={<MapPin className="text-current" />}
              active={location === "/track"}
            >
              Track
            </SidebarLink>
          )}
          
          {showManifest && (
            <SidebarLink 
              href="/manifest-orders" 
              icon={<FileBarChart className="text-current" />}
              active={location === "/manifest-orders"}
            >
              Manifest
            </SidebarLink>
          )}
          
          {/* Admin section */}
          {(showChannels || showAddClient || showAddUser) && (
            <div className="pt-4 border-t border-neutral-100">
              <h3 className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Administration
              </h3>
              <div className="mt-2 space-y-1">
                {showChannels && (
                  <SidebarLink 
                    href="/channels" 
                    icon={<Globe className="h-5 w-5 text-current" />}
                    active={location === "/channels"}
                  >
                    Channels
                  </SidebarLink>
                )}
                
                {showAddClient && (
                  <SidebarLink 
                    href="/add-client" 
                    icon={<UserPlus className="h-5 w-5 text-current" />}
                    active={location === "/add-client"}
                  >
                    Add Client
                  </SidebarLink>
                )}
                
                {showAddUser && (
                  <SidebarLink 
                    href="/add-user" 
                    icon={<Users className="h-5 w-5 text-current" />}
                    active={location === "/add-user"}
                  >
                    User Management
                  </SidebarLink>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
