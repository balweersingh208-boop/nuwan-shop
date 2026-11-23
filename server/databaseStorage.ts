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
  products,
  productVariants,
  customers,
  sales,
  users,
  duePayments,
  businessSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, lte, desc, and, sql, gt } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { IStorage } from "./storage";

const DEFAULT_BUSINESS_SETTINGS_ID = "default";

export class DatabaseStorage implements IStorage {
  private invoiceCounter: number = 1000;

  constructor() {
    this.initializeInvoiceCounter();
    // Seed on first startup
    setImmediate(() => this.seedDatabaseIfEmpty());
  }

  private async initializeInvoiceCounter() {
    try {
      const result = await db.select({ invoiceNumber: sales.invoiceNumber })
        .from(sales)
        .orderBy(desc(sales.createdAt))
        .limit(1);
      
      if (result.length > 0) {
        const lastNumber = parseInt(result[0].invoiceNumber.replace("INV-", ""));
        if (!isNaN(lastNumber)) {
          this.invoiceCounter = lastNumber;
        }
      }
    } catch (error) {
      console.log("Initializing invoice counter to 1000");
    }
  }

  private async seedDatabaseIfEmpty() {
    try {
      const existingProducts = await this.getProducts();
      if (existingProducts.length > 0) {
        return; // Database already seeded
      }

      // Seed sample products
      const sampleProducts: InsertProduct[] = [
        { name: "Air Max 90", brand: "Nike", size: "9", color: "Black", price: 129.99, stock: 15, category: "Sports", imageUrl: null, imageUrls: null },
        { name: "Classic Leather", brand: "Reebok", size: "10", color: "White", price: 89.99, stock: 8, category: "Casual", imageUrl: null, imageUrls: null },
        { name: "Ultraboost 22", brand: "Adidas", size: "8", color: "Grey", price: 179.99, stock: 3, category: "Sports", imageUrl: null, imageUrls: null },
        { name: "Chuck Taylor", brand: "Converse", size: "7", color: "Black", price: 59.99, stock: 25, category: "Casual", imageUrl: null, imageUrls: null },
        { name: "Old Skool", brand: "Vans", size: "9", color: "Black", price: 69.99, stock: 12, category: "Casual", imageUrl: null, imageUrls: null },
        { name: "Jordan 1 Retro", brand: "Nike", size: "10", color: "Red", price: 169.99, stock: 5, category: "Sports", imageUrl: null, imageUrls: null },
        { name: "Gel-Kayano 29", brand: "ASICS", size: "11", color: "Blue", price: 159.99, stock: 2, category: "Sports", imageUrl: null, imageUrls: null },
        { name: "574 Core", brand: "New Balance", size: "9", color: "Grey", price: 84.99, stock: 18, category: "Casual", imageUrl: null, imageUrls: null },
        { name: "Oxford Dress", brand: "Cole Haan", size: "10", color: "Brown", price: 149.99, stock: 7, category: "Formal", imageUrl: null, imageUrls: null },
        { name: "Loafer Classic", brand: "Clarks", size: "9", color: "Black", price: 119.99, stock: 4, category: "Formal", imageUrl: null, imageUrls: null },
        { name: "Kids Runner", brand: "Nike", size: "5", color: "Blue", price: 49.99, stock: 20, category: "Kids", imageUrl: null, imageUrls: null },
        { name: "Little Star", brand: "Adidas", size: "6", color: "White", price: 44.99, stock: 15, category: "Kids", imageUrl: null, imageUrls: null },
      ];

      for (const product of sampleProducts) {
        await this.createProduct(product);
      }

      // Seed sample customers
      const sampleCustomers: InsertCustomer[] = [
        { name: "John Smith", phone: "+1234567890", email: "john@email.com" },
        { name: "Sarah Johnson", phone: "+1987654321", email: "sarah@email.com" },
        { name: "Mike Williams", phone: "+1122334455", email: "mike@email.com" },
      ];

      for (const customer of sampleCustomers) {
        await this.createCustomer(customer);
      }

      console.log("Database seeded with sample data successfully");
    } catch (error) {
      console.log("Database seeding skipped or already seeded");
    }
  }

  async getProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id));
    return result[0];
  }

  async getLowStockProducts(threshold = 1): Promise<Product[]> {
    return await db.select().from(products).where(lte(products.stock, 1));
  }

  async getConnectionStatus() {
    return { connected: true, latency: 0, tablesExist: true };
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const newProduct: Product = { 
      ...product, 
      id,
      stock: product.stock ?? 0,
      imageUrl: product.imageUrl ?? null,
      imageUrls: product.imageUrls ?? null
    };
    await db.insert(products).values(newProduct);
    return newProduct;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const existing = await this.getProduct(id);
    if (!existing) return undefined;
    
    await db.update(products).set(product).where(eq(products.id, id));
    return { ...existing, ...product };
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async updateStock(id: string, quantity: number): Promise<Product | undefined> {
    const existing = await this.getProduct(id);
    if (!existing) return undefined;
    
    const newStock = existing.stock + quantity;
    if (newStock < 0) {
      throw new Error(`Insufficient stock for product ${existing.name}. Available: ${existing.stock}, Requested: ${Math.abs(quantity)}`);
    }
    
    await db.update(products).set({ stock: newStock }).where(eq(products.id, id));
    return { ...existing, stock: newStock };
  }

  // Product Variants
  async getProductsWithVariants(): Promise<ProductWithVariants[]> {
    const allProducts = await this.getProducts();
    return Promise.all(allProducts.map(async (product) => {
      const variants = await this.getVariantsByProduct(product.id);
      return { ...product, variants };
    }));
  }

  async getProductWithVariants(id: string): Promise<ProductWithVariants | undefined> {
    const product = await this.getProduct(id);
    if (!product) return undefined;
    const variants = await this.getVariantsByProduct(id);
    return { ...product, variants };
  }

  async getVariantsByProduct(productId: string): Promise<ProductVariant[]> {
    return await db.select().from(productVariants).where(eq(productVariants.productId, productId));
  }

  async getVariant(id: string): Promise<ProductVariant | undefined> {
    const result = await db.select().from(productVariants).where(eq(productVariants.id, id));
    return result[0];
  }

  async createVariant(variant: InsertProductVariant): Promise<ProductVariant> {
    const id = randomUUID();
    const newVariant: ProductVariant = { ...variant, id, stock: variant.stock ?? 0 };
    await db.insert(productVariants).values(newVariant);
    return newVariant;
  }

  async updateVariant(id: string, variant: Partial<InsertProductVariant>): Promise<ProductVariant | undefined> {
    const existing = await this.getVariant(id);
    if (!existing) return undefined;
    await db.update(productVariants).set(variant).where(eq(productVariants.id, id));
    return { ...existing, ...variant };
  }

  async deleteVariant(id: string): Promise<boolean> {
    const result = await db.delete(productVariants).where(eq(productVariants.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteVariantsByProduct(productId: string): Promise<boolean> {
    await db.delete(productVariants).where(eq(productVariants.productId, productId));
    return true;
  }

  async updateVariantStock(id: string, quantity: number): Promise<ProductVariant | undefined> {
    const existing = await this.getVariant(id);
    if (!existing) return undefined;
    
    const newStock = existing.stock + quantity;
    if (newStock < 0) {
      throw new Error(`Insufficient stock for size ${existing.size}. Available: ${existing.stock}, Requested: ${Math.abs(quantity)}`);
    }
    
    await db.update(productVariants).set({ stock: newStock }).where(eq(productVariants.id, id));
    return { ...existing, stock: newStock };
  }

  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers);
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(eq(customers.id, id));
    return result[0];
  }

  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    const allCustomers = await this.getCustomers();
    const normalizedPhone = phone.replace(/\D/g, "");
    return allCustomers.find(
      (c) => c.phone.replace(/\D/g, "") === normalizedPhone
    );
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const newCustomer: Customer = {
      ...customer,
      id,
      email: customer.email ?? null,
      totalSpent: 0,
      purchaseCount: 0,
    };
    await db.insert(customers).values(newCustomer);
    return newCustomer;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const existing = await this.getCustomer(id);
    if (!existing) return undefined;
    
    await db.update(customers).set(customer).where(eq(customers.id, id));
    return { ...existing, ...customer };
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const result = await db.delete(customers).where(eq(customers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async updateCustomerStats(id: string, amount: number): Promise<Customer | undefined> {
    const existing = await this.getCustomer(id);
    if (!existing) return undefined;
    
    const updated = {
      totalSpent: existing.totalSpent + amount,
      purchaseCount: existing.purchaseCount + 1,
    };
    
    await db.update(customers).set(updated).where(eq(customers.id, id));
    return { ...existing, ...updated };
  }

  async getSales(): Promise<Sale[]> {
    return await db.select().from(sales).orderBy(desc(sales.createdAt));
  }

  async getRecentSales(limit = 10): Promise<Sale[]> {
    return await db.select().from(sales).orderBy(desc(sales.createdAt)).limit(limit);
  }

  async getSale(id: string): Promise<Sale | undefined> {
    const result = await db.select().from(sales).where(eq(sales.id, id));
    return result[0];
  }

  async createSale(sale: InsertSale): Promise<Sale> {
    const id = randomUUID();
    this.invoiceCounter++;
    
    const newSale: Sale = {
      ...sale,
      id,
      invoiceNumber: `INV-${this.invoiceCounter}`,
      createdAt: new Date(),
      customerId: sale.customerId ?? null,
      customerName: sale.customerName ?? null,
      customerPhone: sale.customerPhone ?? null,
      discount: sale.discount ?? 0,
      paidAmount: sale.paidAmount ?? 0,
      dueAmount: sale.dueAmount ?? 0,
    };
    
    await db.insert(sales).values(newSale);

    const items = JSON.parse(sale.items) as CartItem[];
    for (const item of items) {
      if (item.variantId) {
        await this.updateVariantStock(item.variantId, -item.quantity);
      }
      // Always update product stock to keep it in sync
      await this.updateStock(item.productId, -item.quantity);
    }

    if (sale.customerId) {
      await this.updateCustomerStats(sale.customerId, sale.total);
    }

    return newSale;
  }

  async updateSale(id: string, updates: Partial<Sale>): Promise<Sale | undefined> {
    const existing = await this.getSale(id);
    if (!existing) return undefined;
    
    await db.update(sales).set(updates).where(eq(sales.id, id));
    return { ...existing, ...updates };
  }

  async cancelSale(id: string): Promise<boolean> {
    const sale = await this.getSale(id);
    if (!sale) return false;

    const items = JSON.parse(sale.items) as CartItem[];
    for (const item of items) {
      if (item.variantId) {
        await this.updateVariantStock(item.variantId, item.quantity);
      }
      await this.updateStock(item.productId, item.quantity);
    }

    if (sale.customerId) {
      const customer = await this.getCustomer(sale.customerId);
      if (customer) {
        await db.update(customers).set({
          totalSpent: Math.max(0, customer.totalSpent - sale.total),
          purchaseCount: Math.max(0, customer.purchaseCount - 1)
        }).where(eq(customers.id, sale.customerId));
      }
    }

    const result = await db.delete(sales).where(eq(sales.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getDueSales(): Promise<Sale[]> {
    return await db.select()
      .from(sales)
      .where(and(eq(sales.paymentStatus, "DUE"), gt(sales.dueAmount, 0)))
      .orderBy(desc(sales.createdAt));
  }

  async getDueCustomerSummaries(): Promise<DueCustomerSummary[]> {
    const dueSales = await this.getDueSales();
    const summaryMap = new Map<string, DueCustomerSummary>();

    for (const sale of dueSales) {
      const phone = sale.customerPhone || "Unknown";
      const existing = summaryMap.get(phone);
      if (existing) {
        existing.totalDue += sale.dueAmount;
        existing.billCount += 1;
      } else {
        summaryMap.set(phone, {
          customerPhone: phone,
          customerName: sale.customerName || "Walk-in",
          totalDue: sale.dueAmount,
          billCount: 1,
        });
      }
    }

    return Array.from(summaryMap.values()).sort((a, b) => b.totalDue - a.totalDue);
  }

  async getDuePayments(): Promise<DuePayment[]> {
    return await db.select().from(duePayments).orderBy(desc(duePayments.paymentDate));
  }

  async getDuePaymentsBySale(saleId: string): Promise<DuePayment[]> {
    return await db.select()
      .from(duePayments)
      .where(eq(duePayments.saleId, saleId))
      .orderBy(desc(duePayments.paymentDate));
  }

  async createDuePayment(payment: InsertDuePayment): Promise<DuePayment> {
    const id = randomUUID();
    const newPayment: DuePayment = {
      ...payment,
      id,
      paymentDate: new Date(),
      customerName: payment.customerName ?? null,
      customerPhone: payment.customerPhone ?? null,
    };
    
    await db.insert(duePayments).values(newPayment);

    const sale = await this.getSale(payment.saleId);
    if (sale) {
      const newPaidAmount = sale.paidAmount + payment.paidAmount;
      const newDueAmount = sale.total - newPaidAmount;
      const newStatus = newDueAmount <= 0 ? "PAID" : "DUE";
      await this.updateSale(payment.saleId, {
        paidAmount: newPaidAmount,
        dueAmount: Math.max(0, newDueAmount),
        paymentStatus: newStatus,
      });
    }

    return newPayment;
  }

  async getTotalOutstandingDue(): Promise<number> {
    const dueSales = await this.getDueSales();
    return dueSales.reduce((sum, s) => sum + s.dueAmount, 0);
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const allProducts = await this.getProducts();
    const allCustomers = await this.getCustomers();
    const allSales = await this.getSales();
    const totalOutstandingDue = await this.getTotalOutstandingDue();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySales = allSales.filter((s) => new Date(s.createdAt) >= today);

    return {
      todaySales: todaySales.length,
      todayRevenue: todaySales.reduce((sum, s) => sum + s.total, 0),
      totalRevenue: allSales.reduce((sum, s) => sum + s.total, 0),
      lowStockCount: allProducts.filter((p) => p.stock <= 5).length,
      totalCustomers: allCustomers.length,
      totalProducts: allProducts.length,
      totalOutstandingDue,
    };
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    await db.insert(users).values(user);
    return user;
  }

  async getBusinessSettings(): Promise<BusinessSettings> {
    const result = await db.select().from(businessSettings).where(eq(businessSettings.id, DEFAULT_BUSINESS_SETTINGS_ID));
    
    if (result.length === 0) {
      const defaultSettings: BusinessSettings = {
        id: DEFAULT_BUSINESS_SETTINGS_ID,
        brandName: "The Moon Shoes & Slippers",
        brandLogo: null,
        taxPercent: 18,
        address: null,
        mobile: null,
        email: null,
        signature: null,
        upiId: null,
        supabaseUrl: null,
        supabaseAnonKey: null,
      };
      await db.insert(businessSettings).values(defaultSettings);
      return defaultSettings;
    }
    
    return result[0];
  }

  async updateBusinessSettings(settings: Partial<BusinessSettings>): Promise<BusinessSettings> {
    const existing = await this.getBusinessSettings();
    
    const updateData: Record<string, any> = {};
    if (settings.brandName !== undefined) updateData.brandName = settings.brandName;
    if (settings.brandLogo !== undefined) updateData.brandLogo = settings.brandLogo;
    if (settings.taxPercent !== undefined) updateData.taxPercent = settings.taxPercent;
    if (settings.address !== undefined) updateData.address = settings.address;
    if (settings.mobile !== undefined) updateData.mobile = settings.mobile;
    if (settings.email !== undefined) updateData.email = settings.email;
    if (settings.signature !== undefined) updateData.signature = settings.signature;
    
    await db.update(businessSettings).set(updateData).where(eq(businessSettings.id, DEFAULT_BUSINESS_SETTINGS_ID));
    
    return { ...existing, ...updateData };
  }
}
