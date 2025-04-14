import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await res.json();
        errorMessage = errorData.message || JSON.stringify(errorData);
      } else {
        errorMessage = await res.text();
      }
    } catch (error) {
      console.error('Error parsing error response:', error);
    }
    throw new Error(errorMessage || `Request failed with status: ${res.status}`);
  }
}

// Get the auth token from storage
function getAuthToken(): string | null {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      return parsed?.state?.token || null;
    }
  } catch (e) {
    console.error('Error retrieving auth token:', e);
  }
  return null;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  isFormData?: boolean,
): Promise<Response> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  
  if (data && !isFormData) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const body = isFormData 
    ? data as FormData 
    : data ? JSON.stringify(data) : undefined;
    
  const res = await fetch(url, {
    method,
    headers,
    body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
