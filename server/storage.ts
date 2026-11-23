import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  type Product,
  type InsertProduct,
  type ProductVariant,
  type InsertProductVariant,
  type ProductWithVariants,
  type Customer,
  type InsertCustomer,
  type Sale,
  type InsertSale,
  type CartItem,
  type DashboardStats,
  type User,
  type InsertUser,
  type BusinessSettings,
  type DuePayment,
  type InsertDuePayment,
  type DueCustomerSummary,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getProducts(): Promise<Product[]>;
  getProductsWithVariants(): Promise<ProductWithVariants[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductWithVariants(id: string): Promise<ProductWithVariants | undefined>;
  getLowStockProducts(threshold?: number): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  updateStock(id: string, quantity: number): Promise<Product | undefined>;

  getVariantsByProduct(productId: string): Promise<ProductVariant[]>;
  getVariant(id: string): Promise<ProductVariant | undefined>;
  createVariant(variant: InsertProductVariant): Promise<ProductVariant>;
  updateVariant(id: string, variant: Partial<InsertProductVariant>): Promise<ProductVariant | undefined>;
  deleteVariant(id: string): Promise<boolean>;
  deleteVariantsByProduct(productId: string): Promise<boolean>;
  updateVariantStock(id: string, quantity: number): Promise<ProductVariant | undefined>;

  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByPhone(phone: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;
  updateCustomerStats(id: string, amount: number): Promise<Customer | undefined>;

  getSales(): Promise<Sale[]>;
  getRecentSales(limit?: number): Promise<Sale[]>;
  getSale(id: string): Promise<Sale | undefined>;
  createSale(sale: InsertSale): Promise<Sale>;
  updateSale(id: string, sale: Partial<Sale>): Promise<Sale | undefined>;
  cancelSale(id: string): Promise<boolean>;

  getDueSales(): Promise<Sale[]>;
  getDueCustomerSummaries(): Promise<DueCustomerSummary[]>;
  getDuePayments(): Promise<DuePayment[]>;
  getDuePaymentsBySale(saleId: string): Promise<DuePayment[]>;
  createDuePayment(payment: InsertDuePayment): Promise<DuePayment>;
  getTotalOutstandingDue(): Promise<number>;

  getDashboardStats(): Promise<DashboardStats>;

  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getBusinessSettings(): Promise<BusinessSettings>;
  updateBusinessSettings(settings: Partial<BusinessSettings>): Promise<BusinessSettings>;
  
  getConnectionStatus(): Promise<{ connected: boolean; latency: number; tablesExist: boolean; error?: string }>;
}

export class SupabaseStorage implements IStorage {
  private client: SupabaseClient | null = null;
  private settings: BusinessSettings;
  private invoiceCounter: number = 1000;

  constructor() {
    this.settings = {
      id: "default",
      brandName: "The Moon Shoes & Slippers",
      brandLogo: "https://raw.githubusercontent.com/moon07k/moon/refs/heads/main/Moon.png",
      taxPercent: 18,
      address: "Peshwa Nagar, Bithoor, Kanpur Nagar, Uttar Pradesh, 209217",
      mobile: "9140886277",
      email: "khanrazzak1204@gmail.com",
      signature: "https://raw.githubusercontent.com/moon07k/moon/refs/heads/main/Nihal2.png",
      upiId: null,
      supabaseUrl: process.env.SUPABASE_URL || "https://lfgmvrdsvmibrtedlyhl.supabase.co",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZ212cmRzdm1pYnJ0ZWRseWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNTI4OTIsImV4cCI6MjA4NDYyODg5Mn0.cCOIf3NIrfu5CvapICxSRLi4DQ8qCDA06qfg8isbhik",
    };
    this.initClient();
  }

  private initClient() {
    if (this.settings.supabaseUrl && this.settings.supabaseAnonKey) {
      this.client = createClient(this.settings.supabaseUrl, this.settings.supabaseAnonKey);
    }
  }

  async getConnectionStatus() {
    if (!this.client) return { connected: false, latency: 0, tablesExist: false, error: "Supabase client not initialized" };
    const start = Date.now();
    try {
      const { data, error } = await this.client.from('products').select('id').limit(1);
      const latency = Date.now() - start;
      if (error) {
        if (error.code === '42P01') {
          return { connected: true, latency, tablesExist: false, error: "Tables not created" };
        }
        return { connected: false, latency, tablesExist: false, error: error.message };
      }
      return { connected: true, latency, tablesExist: true };
    } catch (e: any) {
      return { connected: false, latency: Date.now() - start, tablesExist: false, error: e.message };
    }
  }

  // Helper to map snake_case from DB to camelCase for app
  private mapProduct(p: any): Product {
    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      size: p.size,
      color: p.color,
      price: p.price,
      stock: p.stock,
      category: p.category,
      imageUrl: p.image_url,
      imageUrls: p.image_urls
    };
  }

  private mapCustomer(c: any): Customer {
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      totalSpent: c.total_spent,
      purchaseCount: c.purchase_count
    };
  }

  private mapSale(s: any): Sale {
    return {
      id: s.id,
      invoiceNumber: s.invoice_number,
      customerId: s.customer_id,
      customerName: s.customer_name,
      customerPhone: s.customer_phone,
      items: s.items,
      subtotal: s.subtotal,
      discount: s.discount,
      total: s.total,
      paymentMethod: s.payment_method,
      paymentStatus: s.payment_status as "PAID" | "DUE",
      paidAmount: s.paid_amount,
      dueAmount: s.due_amount,
      createdAt: new Date(s.created_at)
    };
  }

  private mapDuePayment(p: any): DuePayment {
    return {
      id: p.id,
      saleId: p.sale_id,
      invoiceNumber: p.invoice_number,
      customerPhone: p.customer_phone,
      customerName: p.customer_name,
      paidAmount: p.paid_amount,
      paymentMode: p.payment_mode,
      paymentDate: new Date(p.payment_date)
    };
  }

  private mapSettings(s: any): BusinessSettings {
    return {
      id: s.id,
      brandName: s.brand_name,
      brandLogo: s.brand_logo,
      taxPercent: s.tax_percent,
      address: s.address,
      mobile: s.mobile,
      email: s.email,
      signature: s.signature,
      upiId: s.upi_id,
      supabaseUrl: s.supabase_url,
      supabaseAnonKey: s.supabase_anon_key
    };
  }

  async getProducts(): Promise<Product[]> {
    const { data } = await this.client!.from('products').select('*');
    return (data || []).map(p => this.mapProduct(p));
  }

  async getProductsWithVariants(): Promise<ProductWithVariants[]> {
    const products = await this.getProducts();
    const { data: variants } = await this.client!.from('product_variants').select('*');
    return products.map(p => ({
      ...p,
      variants: (variants || []).filter(v => v.product_id === p.id).map(v => ({
        id: v.id,
        productId: v.product_id,
        size: v.size,
        stock: v.stock
      }))
    }));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const { data } = await this.client!.from('products').select('*').eq('id', id).single();
    return data ? this.mapProduct(data) : undefined;
  }

  async getProductWithVariants(id: string): Promise<ProductWithVariants | undefined> {
    const product = await this.getProduct(id);
    if (!product) return undefined;
    const { data: variants } = await this.client!.from('product_variants').select('*').eq('product_id', id);
    return { 
      ...product, 
      variants: (variants || []).map(v => ({
        id: v.id,
        productId: v.product_id,
        size: v.size,
        stock: v.stock
      }))
    };
  }

  async getLowStockProducts(threshold = 1): Promise<Product[]> {
    const { data } = await this.client!.from('products').select('*').lte('stock', threshold);
    return (data || []).map(p => this.mapProduct(p));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const dbProduct = {
      id,
      name: product.name,
      brand: product.brand,
      size: product.size,
      color: product.color,
      price: product.price,
      stock: product.stock,
      category: product.category,
      image_url: product.imageUrl,
      image_urls: product.imageUrls
    };
    const { data, error } = await this.client!.from('products').insert([dbProduct]).select().single();
    if (error) throw error;
    return this.mapProduct(data);
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const dbUpdate: any = {};
    if (product.name !== undefined) dbUpdate.name = product.name;
    if (product.brand !== undefined) dbUpdate.brand = product.brand;
    if (product.size !== undefined) dbUpdate.size = product.size;
    if (product.color !== undefined) dbUpdate.color = product.color;
    if (product.price !== undefined) dbUpdate.price = product.price;
    if (product.stock !== undefined) dbUpdate.stock = product.stock;
    if (product.category !== undefined) dbUpdate.category = product.category;
    if (product.imageUrl !== undefined) dbUpdate.image_url = product.imageUrl;
    if (product.imageUrls !== undefined) dbUpdate.image_urls = product.imageUrls;

    const { data } = await this.client!.from('products').update(dbUpdate).eq('id', id).select().single();
    return data ? this.mapProduct(data) : undefined;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const { error } = await this.client!.from('products').delete().eq('id', id);
    return !error;
  }

  async updateStock(id: string, quantity: number): Promise<Product | undefined> {
    const product = await this.getProduct(id);
    if (!product) return undefined;
    const newStock = product.stock + quantity;
    return this.updateProduct(id, { stock: newStock });
  }

  // Variants
  async getVariantsByProduct(productId: string): Promise<ProductVariant[]> {
    const { data } = await this.client!.from('product_variants').select('*').eq('product_id', productId);
    return (data || []).map(v => ({
      id: v.id,
      productId: v.product_id,
      size: v.size,
      stock: v.stock
    }));
  }

  async getVariant(id: string): Promise<ProductVariant | undefined> {
    const { data } = await this.client!.from('product_variants').select('*').eq('id', id).single();
    return data ? {
      id: data.id,
      productId: data.product_id,
      size: data.size,
      stock: data.stock
    } : undefined;
  }

  async createVariant(variant: InsertProductVariant): Promise<ProductVariant> {
    const id = randomUUID();
    const dbVariant = {
      id,
      product_id: variant.productId,
      size: variant.size,
      stock: variant.stock ?? 0
    };
    const { data, error } = await this.client!.from('product_variants').insert([dbVariant]).select().single();
    if (error) throw error;
    return {
      id: data.id,
      productId: data.product_id,
      size: data.size,
      stock: data.stock
    };
  }

  async updateVariant(id: string, variant: Partial<InsertProductVariant>): Promise<ProductVariant | undefined> {
    const dbUpdate: any = {};
    if (variant.productId !== undefined) dbUpdate.product_id = variant.productId;
    if (variant.size !== undefined) dbUpdate.size = variant.size;
    if (variant.stock !== undefined) dbUpdate.stock = variant.stock;

    const { data } = await this.client!.from('product_variants').update(dbUpdate).eq('id', id).select().single();
    return data ? {
      id: data.id,
      productId: data.product_id,
      size: data.size,
      stock: data.stock
    } : undefined;
  }

  async deleteVariant(id: string): Promise<boolean> {
    const { error } = await this.client!.from('product_variants').delete().eq('id', id);
    return !error;
  }

  async deleteVariantsByProduct(productId: string): Promise<boolean> {
    const { error } = await this.client!.from('product_variants').delete().eq('product_id', productId);
    return !error;
  }

  async updateVariantStock(id: string, quantity: number): Promise<ProductVariant | undefined> {
    const variant = await this.getVariant(id);
    if (!variant) return undefined;
    return this.updateVariant(id, { stock: variant.stock + quantity });
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    const { data } = await this.client!.from('customers').select('*');
    return (data || []).map(c => this.mapCustomer(c));
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const { data } = await this.client!.from('customers').select('*').eq('id', id).single();
    return data ? this.mapCustomer(data) : undefined;
  }

  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    const { data } = await this.client!.from('customers').select('*').eq('phone', phone).single();
    return data ? this.mapCustomer(data) : undefined;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const dbCustomer = {
      id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      total_spent: 0,
      purchase_count: 0
    };
    const { data, error } = await this.client!.from('customers').insert([dbCustomer]).select().single();
    if (error) throw error;
    return this.mapCustomer(data);
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const dbUpdate: any = {};
    if (customer.name !== undefined) dbUpdate.name = customer.name;
    if (customer.phone !== undefined) dbUpdate.phone = customer.phone;
    if (customer.email !== undefined) dbUpdate.email = customer.email;
    if ((customer as any).totalSpent !== undefined) dbUpdate.total_spent = (customer as any).totalSpent;
    if ((customer as any).purchaseCount !== undefined) dbUpdate.purchase_count = (customer as any).purchaseCount;

    const { data } = await this.client!.from('customers').update(dbUpdate).eq('id', id).select().single();
    return data ? this.mapCustomer(data) : undefined;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const { error } = await this.client!.from('customers').delete().eq('id', id);
    return !error;
  }

  async updateCustomerStats(id: string, amount: number): Promise<Customer | undefined> {
    const customer = await this.getCustomer(id);
    if (!customer) return undefined;
    return this.updateCustomer(id, {
      totalSpent: (customer.totalSpent || 0) + amount,
      purchaseCount: (customer.purchaseCount || 0) + 1
    } as any);
  }

  // Sales
  async getSales(): Promise<Sale[]> {
    const { data } = await this.client!.from('sales').select('*').order('created_at', { ascending: false });
    return (data || []).map(s => this.mapSale(s));
  }

  async getRecentSales(limit = 10): Promise<Sale[]> {
    const { data } = await this.client!.from('sales').select('*').order('created_at', { ascending: false }).limit(limit);
    return (data || []).map(s => this.mapSale(s));
  }

  async getSale(id: string): Promise<Sale | undefined> {
    const { data } = await this.client!.from('sales').select('*').eq('id', id).single();
    return data ? this.mapSale(data) : undefined;
  }

  async createSale(sale: InsertSale): Promise<Sale> {
    const id = randomUUID();
    this.invoiceCounter++;
    const invoiceNumber = `INV-${this.invoiceCounter}`;
    const dbSale = {
      id,
      invoice_number: invoiceNumber,
      customer_id: sale.customerId,
      customer_name: sale.customerName,
      customer_phone: sale.customerPhone,
      items: sale.items,
      subtotal: sale.subtotal,
      discount: sale.discount,
      total: sale.total,
      payment_method: sale.paymentMethod,
      payment_status: sale.paymentStatus,
      paid_amount: sale.paidAmount,
      due_amount: sale.dueAmount
    };
    const { data, error } = await this.client!.from('sales').insert([dbSale]).select().single();
    if (error) throw error;
    
    const items = JSON.parse(sale.items) as CartItem[];
    for (const item of items) {
      if (item.variantId) await this.updateVariantStock(item.variantId, -item.quantity);
      await this.updateStock(item.productId, -item.quantity);
    }
    if (sale.customerId) await this.updateCustomerStats(sale.customerId, sale.total);
    
    return this.mapSale(data);
  }

  async updateSale(id: string, sale: Partial<Sale>): Promise<Sale | undefined> {
    const dbUpdate: any = {};
    if (sale.invoiceNumber !== undefined) dbUpdate.invoice_number = sale.invoiceNumber;
    if (sale.customerId !== undefined) dbUpdate.customer_id = sale.customerId;
    if (sale.customerName !== undefined) dbUpdate.customer_name = sale.customerName;
    if (sale.customerPhone !== undefined) dbUpdate.customer_phone = sale.customerPhone;
    if (sale.items !== undefined) dbUpdate.items = sale.items;
    if (sale.subtotal !== undefined) dbUpdate.subtotal = sale.subtotal;
    if (sale.discount !== undefined) dbUpdate.discount = sale.discount;
    if (sale.total !== undefined) dbUpdate.total = sale.total;
    if (sale.paymentMethod !== undefined) dbUpdate.payment_method = sale.paymentMethod;
    if (sale.paymentStatus !== undefined) dbUpdate.payment_status = sale.paymentStatus;
    if (sale.paidAmount !== undefined) dbUpdate.paid_amount = sale.paidAmount;
    if (sale.dueAmount !== undefined) dbUpdate.due_amount = sale.dueAmount;

    const { data } = await this.client!.from('sales').update(dbUpdate).eq('id', id).select().single();
    return data ? this.mapSale(data) : undefined;
  }

  async cancelSale(id: string): Promise<boolean> {
    const sale = await this.getSale(id);
    if (!sale) return false;

    const items = JSON.parse(sale.items) as CartItem[];
    for (const item of items) {
      if (item.variantId) await this.updateVariantStock(item.variantId, item.quantity);
      await this.updateStock(item.productId, item.quantity);
    }

    if (sale.customerId) {
      await this.updateCustomerStats(sale.customerId, -sale.total);
    }

    const { error } = await this.client!.from('sales').delete().eq('id', id);
    return !error;
  }

  async getDueSales(): Promise<Sale[]> {
    const { data } = await this.client!.from('sales').select('*').eq('payment_status', 'DUE').gt('due_amount', 0);
    return (data || []).map(s => this.mapSale(s));
  }

  async getDueCustomerSummaries(): Promise<DueCustomerSummary[]> {
    const sales = await this.getDueSales();
    const summaryMap = new Map<string, DueCustomerSummary>();
    for (const s of sales) {
      const phone = s.customerPhone || "Unknown";
      const existing = summaryMap.get(phone);
      if (existing) {
        existing.totalDue += s.dueAmount;
        existing.billCount += 1;
      } else {
        summaryMap.set(phone, { customerPhone: phone, customerName: s.customerName || "Walk-in", totalDue: s.dueAmount, billCount: 1 });
      }
    }
    return Array.from(summaryMap.values());
  }

  async getDuePayments(): Promise<DuePayment[]> {
    const { data } = await this.client!.from('due_payments').select('*').order('payment_date', { ascending: false });
    return (data || []).map(p => this.mapDuePayment(p));
  }

  async getDuePaymentsBySale(saleId: string): Promise<DuePayment[]> {
    const { data } = await this.client!.from('due_payments').select('*').eq('sale_id', saleId);
    return (data || []).map(p => this.mapDuePayment(p));
  }

  async createDuePayment(payment: InsertDuePayment): Promise<DuePayment> {
    const id = randomUUID();
    const dbPayment = {
      id,
      sale_id: payment.saleId,
      invoice_number: payment.invoiceNumber,
      customer_phone: payment.customerPhone,
      customer_name: payment.customerName,
      paid_amount: payment.paidAmount,
      payment_mode: payment.paymentMode
    };
    const { data, error } = await this.client!.from('due_payments').insert([dbPayment]).select().single();
    if (error) throw error;
    
    const sale = await this.getSale(payment.saleId);
    if (sale) {
      const newPaid = sale.paidAmount + payment.paidAmount;
      const newDue = sale.total - newPaid;
      await this.updateSale(payment.saleId, {
        paidAmount: newPaid,
        dueAmount: Math.max(0, newDue),
        paymentStatus: newDue <= 0 ? 'PAID' : 'DUE'
      });
    }
    return this.mapDuePayment(data);
  }

  async getTotalOutstandingDue(): Promise<number> {
    const sales = await this.getDueSales();
    return sales.reduce((sum, s) => sum + s.dueAmount, 0);
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const [products, customers, sales, totalDue] = await Promise.all([
      this.getProducts(),
      this.getCustomers(),
      this.getSales(),
      this.getTotalOutstandingDue()
    ]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySales = sales.filter(s => new Date(s.createdAt) >= today);
    return {
      todaySales: todaySales.length,
      todayRevenue: todaySales.reduce((sum, s) => sum + s.total, 0),
      totalRevenue: sales.reduce((sum, s) => sum + s.total, 0),
      lowStockCount: products.filter(p => p.stock <= 1).length,
      totalCustomers: customers.length,
      totalProducts: products.length,
      totalOutstandingDue: totalDue
    };
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const { data } = await this.client!.from('users').select('*').eq('id', id).single();
    return data || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data } = await this.client!.from('users').select('*').eq('username', username).single();
    return data || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = randomUUID();
    const { data, error } = await this.client!.from('users').insert([{ ...user, id }]).select().single();
    if (error) throw error;
    return data;
  }

  async getBusinessSettings(): Promise<BusinessSettings> {
    if (!this.client) return this.settings;
    const { data, error } = await this.client.from('business_settings').select('*').eq('id', 'default').single();
    if (error) {
      return this.settings;
    }
    return data ? this.mapSettings(data) : this.settings;
  }

  async updateBusinessSettings(settings: Partial<BusinessSettings>): Promise<BusinessSettings> {
    const updated = { ...this.settings, ...settings };
    this.settings = updated;
    this.initClient();
    
    if (this.client) {
      const dbSettings = {
        id: 'default',
        brand_name: updated.brandName,
        brand_logo: updated.brandLogo,
        tax_percent: updated.taxPercent,
        address: updated.address,
        mobile: updated.mobile,
        email: updated.email,
        signature: updated.signature,
        upi_id: updated.upiId,
        supabase_url: updated.supabaseUrl,
        supabase_anon_key: updated.supabaseAnonKey
      };
      const { data } = await this.client.from('business_settings').upsert(dbSettings).select().single();
      if (data) return this.mapSettings(data);
    }
    return updated;
  }
}

export const storage = new SupabaseStorage();
