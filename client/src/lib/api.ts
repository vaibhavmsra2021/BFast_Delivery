import { apiRequest } from "./queryClient";
import { OrderFilters } from "@/components/orders/OrderFilter";

// Auth API
export const loginUser = async (username: string, password: string) => {
  const response = await apiRequest('POST', '/api/auth/login', { username, password });
  return response.json();
};

// Users API
export const createUser = async (userData: any) => {
  const response = await apiRequest('POST', '/api/users', userData);
  return response.json();
};

export const getUsers = async () => {
  const response = await apiRequest('GET', '/api/users');
  return response.json();
};

// Clients API
export const createClient = async (clientData: any) => {
  const response = await apiRequest('POST', '/api/clients', clientData);
  return response.json();
};

export const getClients = async () => {
  const response = await apiRequest('GET', '/api/clients');
  return response.json();
};

export const updateClient = async (clientId: string, clientData: any) => {
  const response = await apiRequest('PATCH', `/api/clients/${clientId}`, clientData);
  return response.json();
};

export const testShopifyConnection = async (credentials: any) => {
  const response = await apiRequest('POST', '/api/connections/test-shopify', credentials);
  return response.json();
};

export const testShiprocketConnection = async (credentials: any) => {
  const response = await apiRequest('POST', '/api/connections/test-shiprocket', credentials);
  return response.json();
};

// Orders API
export const getPendingOrders = async () => {
  const response = await apiRequest('GET', '/api/orders/pending');
  return response.json();
};

export const getOrderSummary = async () => {
  const response = await apiRequest('GET', '/api/orders/summary');
  return response.json();
};

export const getAllOrders = async (filters?: OrderFilters) => {
  let url = '/api/orders';
  
  if (filters) {
    const params = new URLSearchParams();
    
    if (filters.status) {
      params.append('status', filters.status);
    }
    
    if (filters.dateFrom) {
      params.append('dateFrom', filters.dateFrom.toISOString());
    }
    
    if (filters.dateTo) {
      params.append('dateTo', filters.dateTo.toISOString());
    }
    
    if (filters.courier) {
      params.append('courier', filters.courier);
    }
    
    if (filters.paymentMode) {
      params.append('paymentMode', filters.paymentMode);
    }
    
    if (filters.search) {
      params.append('search', filters.search);
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
  }
  
  const response = await apiRequest('GET', url);
  return response.json();
};

export const updateOrder = async (orderId: string, orderData: any) => {
  const response = await apiRequest('PATCH', `/api/orders/${orderId}`, orderData);
  return response.json();
};

export const assignAWB = async (assignments: Array<{ orderId: string, awb: string }>) => {
  const response = await apiRequest('POST', '/api/orders/assign-awb', { assignments });
  return response.json();
};

export const bulkUpdateOrders = async (updates: Array<{ orderId: string, data: any }>) => {
  const response = await apiRequest('POST', '/api/orders/bulk-update', { updates });
  return response.json();
};

// Shopify API
export const syncShopifyOrders = async () => {
  const response = await apiRequest('POST', '/api/shopify/sync');
  return response.json();
};

// Tracking API
export const getTrackingInfo = async (awb: string) => {
  const response = await apiRequest('GET', `/api/track/${awb}`);
  return response.json();
};

// Public tracking (no authentication required)
export const getPublicTrackingInfo = async (awb: string) => {
  const response = await fetch(`/api/track/${awb}`);
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  
  return response.json();
};
