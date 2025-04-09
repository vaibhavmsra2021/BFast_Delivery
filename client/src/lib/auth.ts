import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiRequest } from "./queryClient";

// User roles
export const UserRole = {
  BFAST_ADMIN: "bfast_admin",
  BFAST_EXECUTIVE: "bfast_executive",
  CLIENT_ADMIN: "client_admin",
  CLIENT_EXECUTIVE: "client_executive",
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: UserRoleType;
  clientId: string | null;
  client_id?: string | null; // Added for compatibility with server response
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAccess: (allowedRoles: UserRoleType[]) => boolean;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (username: string, password: string) => {
        try {
          console.log("Attempting to log in with username:", username);
          
          // Don't use apiRequest here as it depends on the auth token which isn't set yet
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
            credentials: "include",
          });

          if (!response.ok) {
            const text = await response.text();
            console.error(`Login failed with status ${response.status}: ${text}`);
            throw new Error(
              `${response.status}: ${text || response.statusText}`,
            );
          }

          const data = await response.json();
          
          if (!data.token) {
            console.error("No token received in login response:", data);
            throw new Error("Authentication failed: No token received");
          }
          
          console.log("Login successful, saving token and user data");

          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
          });
          
          console.log("Token and user data saved successfully");

          // Allow time for state to be updated and persisted before redirecting
          return Promise.resolve();
        } catch (error) {
          console.error("Login error:", error);
          throw error;
        }
      },

      logout: async () => {
        try {
          const token = get().token;
          if (token) {
            await fetch("/api/auth/logout", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              credentials: "include",
            });
          }
        } catch (error) {
          console.error("Logout error:", error);
        } finally {
          // Clear state even if API request fails
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });

          // Force a reload on logout
          setTimeout(() => {
            window.location.href = "/login";
          }, 100);
        }
      },

      checkAccess: (allowedRoles: UserRoleType[]) => {
        const { user } = get();
        if (!user) return false;
        return allowedRoles.includes(user.role);
      },
    }),
    {
      name: "auth-storage",
      // Only store the token and auth state, not the functions
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// Hook to check route access
export function useRouteAccess(allowedRoles: UserRoleType[]) {
  const { isAuthenticated, checkAccess } = useAuth();

  if (!isAuthenticated) return false;
  return checkAccess(allowedRoles);
}
