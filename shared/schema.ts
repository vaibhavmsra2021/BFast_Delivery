import { pgTable, text, serial, integer, timestamp, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles
export const UserRole = {
  BFAST_ADMIN: "bfast_admin", 
  BFAST_EXECUTIVE: "bfast_executive",
  CLIENT_ADMIN: "client_admin",
  CLIENT_EXECUTIVE: "client_executive"
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// Order status
export const OrderStatus = {
  PENDING: "Pending",
  INPROCESS: "In-Process",
  DELIVERED: "Delivered",
  RTO: "RTO",
  NDR: "NDR",
  LOST: "Lost"
} as const;

export type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus];

// Shipping method
export const ShippingMethod = {
  EXPRESS: "Express",
  SURFACE: "Surface"
} as const;

export type ShippingMethodType = typeof ShippingMethod[keyof typeof ShippingMethod];

// Payment mode
export const PaymentMode = {
  COD: "COD",
  PREPAID: "Prepaid"
} as const;

export type PaymentModeType = typeof PaymentMode[keyof typeof PaymentMode];

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").$type<UserRoleType>().notNull(),
  client_id: text("client_id"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  role: true,
  client_id: true,
});

// Clients table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  client_id: text("client_id").notNull().unique(),
  client_name: text("client_name").notNull(),
  shopify_store_id: text("shopify_store_id").notNull(),
  shopify_api_key: text("shopify_api_key").notNull(),
  shopify_api_secret: text("shopify_api_secret").notNull(),
  shiprocket_api_key: text("shiprocket_api_key").notNull(),
  logo_url: text("logo_url"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertClientSchema = createInsertSchema(clients).pick({
  client_id: true,
  client_name: true,
  shopify_store_id: true,
  shopify_api_key: true,
  shopify_api_secret: true,
  shiprocket_api_key: true,
  logo_url: true,
});

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  client_id: text("client_id").notNull(),
  shopify_store_id: text("shopify_store_id").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  order_id: text("order_id").notNull().unique(),
  fulfillment_status: text("fulfillment_status").$type<OrderStatusType>().notNull(),
  pickup_date: timestamp("pickup_date"),
  shipping_details: json("shipping_details").$type<{
    name: string;
    phone_1: string;
    phone_2?: string;
    email: string;
    address: string;
    pincode: string;
    city: string;
    state: string;
    shipping_method: ShippingMethodType;
    payment_mode: PaymentModeType;
    amount: number;
  }>().notNull(),
  product_details: json("product_details").$type<{
    category: string;
    product_name: string;
    quantity: number;
    dimensions: [number, number, number]; // L, B, H in cm
    weight: number; // in Kg
  }>().notNull(),
  courier: text("courier"),
  awb: text("awb"),
  delivery_status: text("delivery_status").$type<OrderStatusType>(),
  last_scan_location: text("last_scan_location"),
  last_timestamp: timestamp("last_timestamp"),
  last_remark: text("last_remark")
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  client_id: true,
  shopify_store_id: true,
  order_id: true,
  fulfillment_status: true,
  pickup_date: true,
  shipping_details: true,
  product_details: true,
  courier: true,
  awb: true,
  delivery_status: true,
  last_scan_location: true,
  last_timestamp: true,
  last_remark: true,
});

// Token blacklist table for JWT
export const tokenBlacklist = pgTable("token_blacklist", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  expiry: timestamp("expiry").notNull(),
});

export const insertTokenSchema = createInsertSchema(tokenBlacklist).pick({
  token: true,
  expiry: true,
});

// Define types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertToken = z.infer<typeof insertTokenSchema>;
export type TokenBlacklist = typeof tokenBlacklist.$inferSelect;
