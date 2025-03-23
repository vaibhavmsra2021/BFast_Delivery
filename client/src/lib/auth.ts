import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiRequest } from './queryClient';

// User roles
export const UserRole = {
  BFAST_ADMIN: "bfast_admin", 
  BFAST_EXECUTIVE: "bfast_executive",
  CLIENT_ADMIN: "client_admin",
  CLIENT_EXECUTIVE: "client_executive"
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: UserRoleType;
  clientId: string | null;
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
          const response = await apiRequest('POST', '/api/auth/login', { username, password });
          const data = await response.json();
          
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true
          });
        } catch (error) {
          console.error('Login error:', error);
          throw error;
        }
      },
      
      logout: async () => {
        try {
          if (get().token) {
            await apiRequest('POST', '/api/auth/logout');
          }
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clear state even if API request fails
          set({
            user: null,
            token: null,
            isAuthenticated: false
          });
        }
      },
      
      checkAccess: (allowedRoles: UserRoleType[]) => {
        const { user } = get();
        if (!user) return false;
        return allowedRoles.includes(user.role);
      }
    }),
    {
      name: 'auth-storage',
      // Only store the token and auth state, not the functions
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);

// Hook to check route access
export function useRouteAccess(allowedRoles: UserRoleType[]) {
  const { isAuthenticated, checkAccess } = useAuth();
  
  if (!isAuthenticated) return false;
  return checkAccess(allowedRoles);
}
