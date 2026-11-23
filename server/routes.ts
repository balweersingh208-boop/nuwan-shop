import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProductSchema, insertCustomerSchema, insertSaleSchema, cartItemSchema, businessSettingsFormSchema, insertDuePaymentSchema, insertProductVariantSchema } from "@shared/schema";
import { z } from "zod";
import { randomUUID } from "crypto";

const VALID_TOKEN = "Nihal2010";
const sessions = new Map<string, { expiresAt: number }>();

// Auth middleware
function verifySession(sessionToken: string): boolean {
  const session = sessions.get(sessionToken);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionToken);
    return false;
  }
  return true;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth endpoints
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }
      if (token !== VALID_TOKEN) {
        return res.status(401).json({ error: "Invalid token" });
      }
      const sessionToken = randomUUID();
      sessions.set(sessionToken, { expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 }); // 30 days
      res.json({ sessionToken });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/auth/verify-session", (req, res) => {
    try {
      const sessionToken = req.headers.authorization?.replace("Bearer ", "");
      if (!sessionToken || !verifySession(sessionToken)) {
        return res.status(401).json({ error: "Invalid session" });
      }
      res.json({ valid: true });
    } catch (error) {
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // Dashboard
  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/storage/status", async (_req, res) => {
    try {
      const status = await (storage as any).getConnectionStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch storage status" });
    }
  });

  app.get("/api/storage/sql", (_req, res) => {
    const sql = `
-- Create Products table
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  size TEXT NOT NULL,
  color TEXT NOT NULL,
  price REAL NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  image_url TEXT,
  image_urls TEXT
);

-- Create Product Variants table
CREATE TABLE product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0
);

-- Create Customers table
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  total_spent REAL NOT NULL DEFAULT 0,
  purchase_count INTEGER NOT NULL DEFAULT 0
);

-- Create Sales table
CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  customer_id TEXT REFERENCES customers(id),
  customer_name TEXT,
  customer_phone TEXT,
  items TEXT NOT NULL,
  subtotal REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'PAID',
  paid_amount REAL NOT NULL DEFAULT 0,
  due_amount REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Due Payments table
CREATE TABLE due_payments (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_phone TEXT,
  customer_name TEXT,
  paid_amount REAL NOT NULL,
  payment_mode TEXT NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

-- Create Business Settings table
CREATE TABLE business_settings (
  id TEXT PRIMARY KEY,
  brand_name TEXT NOT NULL DEFAULT 'The Moon Shoes & Slippers',
  brand_logo TEXT,
  tax_percent REAL NOT NULL DEFAULT 18,
  address TEXT,
  mobile TEXT,
  email TEXT,
  signature TEXT,
  upi_id TEXT,
  supabase_url TEXT,
  supabase_anon_key TEXT
);
    `;
    res.json({ sql });
  });

  // Products
  app.get("/api/products", async (_req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error("GET /api/products error:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/low-stock", async (_req, res) => {
    try {
      const products = await storage.getLowStockProducts(5);
      res.json(products);
    } catch (error) {
      console.error("GET /api/products/low-stock error:", error);
      res.status(500).json({ error: "Failed to fetch low stock products" });
    }
  });

  // Products with Variants (must be before /api/products/:id to avoid route conflict)
  app.get("/api/products/with-variants", async (_req, res) => {
    try {
      const products = await storage.getProductsWithVariants();
      res.json(products);
    } catch (error) {
      console.error("GET /api/products/with-variants error:", error);
      res.status(500).json({ error: "Failed to fetch products with variants" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("GET /api/products/:id error:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const parsed = insertProductSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const product = await storage.createProduct(parsed.data);
      res.status(201).json(product);
    } catch (error) {
      console.error("POST /api/products error:", error);
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const parsed = insertProductSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const product = await storage.updateProduct(req.params.id, parsed.data);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      // Delete variants first
      await storage.deleteVariantsByProduct(req.params.id);
      const deleted = await storage.deleteProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  app.get("/api/products/:id/with-variants", async (req, res) => {
    try {
      const product = await storage.getProductWithVariants(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product with variants" });
    }
  });

  // Product Variants
  app.get("/api/products/:id/variants", async (req, res) => {
    try {
      const variants = await storage.getVariantsByProduct(req.params.id);
      res.json(variants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch variants" });
    }
  });

  app.post("/api/products/:id/variants", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      const parsed = insertProductVariantSchema.safeParse({
        ...req.body,
        productId: req.params.id,
      });
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const variant = await storage.createVariant(parsed.data);
      res.status(201).json(variant);
    } catch (error) {
      res.status(500).json({ error: "Failed to create variant" });
    }
  });

  app.patch("/api/products/:id/variants/:variantId", async (req, res) => {
    try {
      const parsed = insertProductVariantSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const variant = await storage.updateVariant(req.params.variantId, parsed.data);
      if (!variant) {
        return res.status(404).json({ error: "Variant not found" });
      }
      res.json(variant);
    } catch (error) {
      res.status(500).json({ error: "Failed to update variant" });
    }
  });

  app.delete("/api/products/:id/variants/:variantId", async (req, res) => {
    try {
      const deleted = await storage.deleteVariant(req.params.variantId);
      if (!deleted) {
        return res.status(404).json({ error: "Variant not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete variant" });
    }
  });

  // Customers
  app.get("/api/customers", async (_req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const parsed = insertCustomerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const customer = await storage.createCustomer(parsed.data);
      res.status(201).json(customer);
    } catch (error) {
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const parsed = insertCustomerSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const customer = await storage.updateCustomer(req.params.id, parsed.data);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCustomer(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  // Sales
  app.get("/api/sales", async (_req, res) => {
    try {
      const sales = await storage.getSales();
      res.json(sales);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales" });
    }
  });

  app.get("/api/sales/recent", async (_req, res) => {
    try {
      const sales = await storage.getRecentSales(10);
      res.json(sales);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent sales" });
    }
  });

  app.get("/api/sales/:id", async (req, res) => {
    try {
      const sale = await storage.getSale(req.params.id);
      if (!sale) {
        return res.status(404).json({ error: "Sale not found" });
      }
      res.json(sale);
    } catch (error) {
      console.error("GET /api/sales/:id error:", error);
      res.status(500).json({ error: "Failed to fetch sale" });
    }
  });

  app.patch("/api/sales/:id", async (req, res) => {
    try {
      const parsed = insertSaleSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const sale = await storage.updateSale(req.params.id, parsed.data);
      if (!sale) {
        return res.status(404).json({ error: "Sale not found" });
      }
      res.json(sale);
    } catch (error) {
      console.error("PATCH /api/sales/:id error:", error);
      res.status(500).json({ error: "Failed to update sale" });
    }
  });

  app.delete("/api/sales/:id", async (req, res) => {
    try {
      const success = await storage.cancelSale(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Sale not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("DELETE /api/sales/:id error:", error);
      res.status(500).json({ error: "Failed to cancel sale" });
    }
  });

  const createSaleSchema = z.object({
    customerId: z.string().optional(),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    items: z.array(cartItemSchema),
    subtotal: z.number(),
    discount: z.number().min(0).default(0),
    total: z.number(),
    paymentMethod: z.string(),
    paymentStatus: z.enum(["PAID", "DUE"]).default("PAID"),
    paidAmount: z.number().min(0).default(0),
  });

  app.post("/api/sales", async (req, res) => {
    try {
      const parsed = createSaleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      // Validate cart is not empty
      if (parsed.data.items.length === 0) {
        return res.status(400).json({ error: "Cart cannot be empty" });
      }

      // Validate total is positive
      if (parsed.data.total <= 0) {
        return res.status(400).json({ error: "Sale total must be positive" });
      }

      // Validate payment amounts
      const { paymentStatus, paidAmount, total, customerPhone, customerName, customerId } = parsed.data;
      if (paymentStatus === "PAID" && paidAmount !== total) {
        return res.status(400).json({ error: "For PAID status, paid amount must equal total" });
      }
      if (paidAmount > total) {
        return res.status(400).json({ error: "Paid amount cannot exceed total" });
      }
      if (paidAmount < 0) {
        return res.status(400).json({ error: "Paid amount cannot be negative" });
      }

      const dueAmount = total - paidAmount;

      // Auto-create or find customer if phone is provided and no customerId
      let finalCustomerId = customerId;
      if (!customerId && customerPhone && customerPhone.trim()) {
        const existingCustomer = await storage.getCustomerByPhone(customerPhone);
        if (existingCustomer) {
          finalCustomerId = existingCustomer.id;
          // Update customer stats will be handled by createSale
        } else {
          // Create new customer
          const newCustomer = await storage.createCustomer({
            name: customerName || "Walk-in Customer",
            phone: customerPhone,
          });
          finalCustomerId = newCustomer.id;
        }
      }

      const saleData = {
        ...parsed.data,
        customerId: finalCustomerId,
        items: JSON.stringify(parsed.data.items),
        invoiceNumber: "", // Will be set by storage
        dueAmount,
      };

      const sale = await storage.createSale(saleData);
      res.status(201).json(sale);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create sale";
      res.status(400).json({ error: message });
    }
  });

  // Due Management
  app.get("/api/due/sales", async (_req, res) => {
    try {
      const dueSales = await storage.getDueSales();
      res.json(dueSales);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch due sales" });
    }
  });

  app.get("/api/due/customers", async (_req, res) => {
    try {
      const summaries = await storage.getDueCustomerSummaries();
      res.json(summaries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch due customer summaries" });
    }
  });

  app.get("/api/due/total", async (_req, res) => {
    try {
      const total = await storage.getTotalOutstandingDue();
      res.json({ total });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch total outstanding due" });
    }
  });

  app.get("/api/due/payments", async (_req, res) => {
    try {
      const payments = await storage.getDuePayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch due payments" });
    }
  });

  app.get("/api/due/payments/:saleId", async (req, res) => {
    try {
      const payments = await storage.getDuePaymentsBySale(req.params.saleId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments for sale" });
    }
  });

  const collectDuePaymentSchema = z.object({
    saleId: z.string(),
    invoiceNumber: z.string(),
    customerPhone: z.string().optional(),
    customerName: z.string().optional(),
    paidAmount: z.number().positive("Payment amount must be positive"),
    paymentMode: z.string(),
  });

  app.post("/api/due/collect", async (req, res) => {
    try {
      const parsed = collectDuePaymentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      // Get the sale to validate payment amount
      const sale = await storage.getSale(parsed.data.saleId);
      if (!sale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      if (sale.dueAmount <= 0) {
        return res.status(400).json({ error: "No due amount remaining on this bill" });
      }

      // Use rounding to handle floating-point precision issues
      const roundedPaidAmount = Math.round(parsed.data.paidAmount * 100) / 100;
      const roundedDueAmount = Math.round(sale.dueAmount * 100) / 100;
      
      if (roundedPaidAmount > roundedDueAmount) {
        return res.status(400).json({ error: `Payment amount cannot exceed due amount (₹${roundedDueAmount.toFixed(2)})` });
      }

      const payment = await storage.createDuePayment(parsed.data);
      
      // Get the updated sale
      const updatedSale = await storage.getSale(parsed.data.saleId);
      
      res.status(201).json({ payment, sale: updatedSale });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to collect payment";
      res.status(400).json({ error: message });
    }
  });

  // Business Settings
  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await storage.getBusinessSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.patch("/api/settings", async (req, res) => {
    try {
      const parsed = businessSettingsFormSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const settings = await storage.updateBusinessSettings(parsed.data);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Stock Images Search (using Unsplash)
  app.get("/api/stock-images", async (req, res) => {
    try {
      const query = (req.query.q as string) || "shoes";
      const page = parseInt(req.query.page as string) || 1;
      
      // Use Unsplash Source API for free stock images
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=12&client_id=demo`,
        { headers: { "Accept-Version": "v1" } }
      );
      
      if (!response.ok) {
        // Fallback to static shoe images if Unsplash fails
        const fallbackImages = [
          { id: "1", url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400", alt: "Red Nike shoe" },
          { id: "2", url: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400", alt: "White sneaker" },
          { id: "3", url: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400", alt: "Colorful sneaker" },
          { id: "4", url: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=400", alt: "Nike Air Force" },
          { id: "5", url: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400", alt: "Colorful running shoe" },
          { id: "6", url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400", alt: "Jordan sneaker" },
          { id: "7", url: "https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?w=400", alt: "Nike sneaker side view" },
          { id: "8", url: "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=400", alt: "Running shoes" },
          { id: "9", url: "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=400", alt: "New Balance shoe" },
          { id: "10", url: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400", alt: "Adidas shoe" },
          { id: "11", url: "https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=400", alt: "White sneakers" },
          { id: "12", url: "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=400", alt: "High top sneaker" },
        ];
        return res.json({ images: fallbackImages });
      }
      
      const data = await response.json();
      const images = data.results?.map((img: any) => ({
        id: img.id,
        url: img.urls?.small || img.urls?.regular,
        alt: img.alt_description || "Stock shoe image",
      })) || [];
      
      res.json({ images });
    } catch (error) {
      // Return fallback images on error
      const fallbackImages = [
        { id: "1", url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400", alt: "Red Nike shoe" },
        { id: "2", url: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400", alt: "White sneaker" },
        { id: "3", url: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400", alt: "Colorful sneaker" },
        { id: "4", url: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=400", alt: "Nike Air Force" },
        { id: "5", url: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400", alt: "Colorful running shoe" },
        { id: "6", url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400", alt: "Jordan sneaker" },
        { id: "7", url: "https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?w=400", alt: "Nike sneaker side view" },
        { id: "8", url: "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=400", alt: "Running shoes" },
        { id: "9", url: "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=400", alt: "New Balance shoe" },
        { id: "10", url: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400", alt: "Adidas shoe" },
        { id: "11", url: "https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=400", alt: "White sneakers" },
        { id: "12", url: "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=400", alt: "High top sneaker" },
      ];
      res.json({ images: fallbackImages });
    }
  });

  return httpServer;
}
