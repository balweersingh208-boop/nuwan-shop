import { pgTable, text, varchar, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Products table - shoes in inventory
export const products = pgTable("products", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  size: text("size").notNull(),
  color: text("color").notNull(),
  price: real("price").notNull(),
  stock: integer("stock").notNull().default(0),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  imageUrls: text("image_urls"), // JSON array of image URLs for multiple images
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Product Variants table - size-wise inventory tracking
export const productVariants = pgTable("product_variants", {
  id: varchar("id").primaryKey(),
  productId: varchar("product_id").notNull(),
  size: text("size").notNull(),
  stock: integer("stock").notNull().default(0),
});

export const insertProductVariantSchema = createInsertSchema(productVariants).omit({ id: true });
export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;
export type ProductVariant = typeof productVariants.$inferSelect;

// Product with variants type (for API responses)
export interface ProductWithVariants extends Product {
  variants: ProductVariant[];
}

// Customers table
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  totalSpent: real("total_spent").notNull().default(0),
  purchaseCount: integer("purchase_count").notNull().default(0),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, totalSpent: true, purchaseCount: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// Sales/Invoices table
export const sales = pgTable("sales", {
  id: varchar("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  customerId: varchar("customer_id"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  items: text("items").notNull(), // JSON string of cart items
  subtotal: real("subtotal").notNull(),
  discount: real("discount").notNull().default(0),
  total: real("total").notNull(),
  paymentMethod: text("payment_method").notNull(),
  paymentStatus: text("payment_status").notNull().default("PAID"), // PAID or DUE
  paidAmount: real("paid_amount").notNull().default(0),
  dueAmount: real("due_amount").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSaleSchema = createInsertSchema(sales).omit({ id: true, createdAt: true });
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof sales.$inferSelect;

// Due Payments table - for tracking due recovery entries
export const duePayments = pgTable("due_payments", {
  id: varchar("id").primaryKey(),
  saleId: varchar("sale_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  customerPhone: text("customer_phone"),
  customerName: text("customer_name"),
  paidAmount: real("paid_amount").notNull(),
  paymentMode: text("payment_mode").notNull(),
  paymentDate: timestamp("payment_date").notNull().defaultNow(),
});

export const insertDuePaymentSchema = createInsertSchema(duePayments).omit({ id: true, paymentDate: true });
export type InsertDuePayment = z.infer<typeof insertDuePaymentSchema>;
export type DuePayment = typeof duePayments.$inferSelect;

// Cart item type for billing
export const cartItemSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  name: z.string(),
  brand: z.string(),
  size: z.string(),
  color: z.string(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
});
export type CartItem = z.infer<typeof cartItemSchema>;

// Dashboard stats type
export interface DashboardStats {
  todaySales: number;
  todayRevenue: number;
  totalRevenue: number;
  lowStockCount: number;
  totalCustomers: number;
  totalProducts: number;
  totalOutstandingDue: number;
}

// Due Customer summary type
export interface DueCustomerSummary {
  customerPhone: string;
  customerName: string;
  totalDue: number;
  billCount: number;
}

// Users table (keeping original)
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Business Settings table (for About page)
export const businessSettings = pgTable("business_settings", {
  id: varchar("id").primaryKey(),
  brandName: text("brand_name").notNull().default("The Moon Shoes & Slippers"),
  brandLogo: text("brand_logo"),
  taxPercent: real("tax_percent").notNull().default(18),
  address: text("address"),
  mobile: text("mobile"),
  email: text("email"),
  signature: text("signature"),
  upiId: text("upi_id"),
  supabaseUrl: text("supabase_url"),
  supabaseAnonKey: text("supabase_anon_key"),
});

export const insertBusinessSettingsSchema = createInsertSchema(businessSettings).omit({ id: true });
export type InsertBusinessSettings = z.infer<typeof insertBusinessSettingsSchema>;
export type BusinessSettings = typeof businessSettings.$inferSelect;

// Business Settings validation schema (for forms)
export const businessSettingsFormSchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  brandLogo: z.string().nullable().optional(),
  taxPercent: z.number().min(0).max(100).default(18),
  address: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  signature: z.string().nullable().optional(),
  upiId: z.string().optional(),
  supabaseUrl: z.string().optional(),
  supabaseAnonKey: z.string().optional(),
});
