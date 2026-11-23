import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DollarSign, 
  Package, 
  Users, 
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  Plus,
  BarChart3,
  Clock,
  Database,
  CheckCircle2,
  XCircle,
  FileCode
} from "lucide-react";
import { Link } from "wouter";
import type { DashboardStats, Product, Sale } from "@shared/schema";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: dbStatus, isLoading: dbLoading } = useQuery<{ connected: boolean; latency: number; tablesExist: boolean; error?: string }>({
    queryKey: ["/api/storage/status"],
    refetchInterval: 5000,
  });

  const { data: lowStockProducts, isLoading: lowStockLoading } = useQuery<Product[]>({
    queryKey: ["/api/products/low-stock"],
  });

  const { data: recentSales, isLoading: salesLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales/recent"],
  });

  const { toast } = useToast();

  const getSql = async () => {
    const res = await fetch("/api/storage/sql");
    const data = await res.json();
    navigator.clipboard.writeText(data.sql);
    toast({
      title: "SQL Copied",
      description: "Paste this into Supabase SQL Editor to create tables.",
    });
  };

  return (
    <div className="p-6 space-y-8 bg-gradient-to-br from-background via-background to-muted/30 min-h-screen" data-testid="page-dashboard">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-primary/10 rounded-xl flex items-center justify-center p-2 overflow-hidden shadow-sm">
            <img 
              src="/favicon.png" 
              alt="Moon Shoes Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl font-bold text-foreground" data-testid="text-dashboard-title">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Welcome back Nihal Babu! Here's your store overview.</p>
          </div>
        </div>

        <Card className="bg-background/50 backdrop-blur-sm border-primary/10">
          <CardContent className="p-3 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Supabase:</span>
              {dbLoading ? (
                <Skeleton className="h-4 w-16" />
              ) : dbStatus?.connected ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200 gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected ({dbStatus.latency}ms)
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Disconnected
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 border-l pl-4">
              <span className="text-sm font-medium">Tables:</span>
              {dbLoading ? (
                <Skeleton className="h-4 w-16" />
              ) : dbStatus?.tablesExist ? (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">Created</Badge>
              ) : (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={getSql}>
                  <FileCode className="h-3 w-3" />
                  Get SQL
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 auto-rows-max">
        <MetricCard
          title="Today's Sales"
          value={stats?.todaySales ?? 0}
          prefix=""
          icon={<ShoppingCart className="h-5 w-5" />}
          loading={statsLoading}
          testId="metric-today-sales"
        />
        <MetricCard
          title="Today's Revenue"
          value={stats?.todayRevenue ?? 0}
          prefix="₹"
          icon={<DollarSign className="h-5 w-5" />}
          loading={statsLoading}
          testId="metric-today-revenue"
        />
        <MetricCard
          title="Total Revenue"
          value={stats?.totalRevenue ?? 0}
          prefix="₹"
          icon={<TrendingUp className="h-5 w-5" />}
          loading={statsLoading}
          testId="metric-total-revenue"
        />
        <MetricCard
          title="Low Stock Items"
          value={stats?.lowStockCount ?? 0}
          prefix=""
          icon={<AlertTriangle className="h-5 w-5" />}
          loading={statsLoading}
          variant={stats?.lowStockCount && stats.lowStockCount > 0 ? "warning" : "default"}
          testId="metric-low-stock"
        />
        <MetricCard
          title="Outstanding Due"
          value={stats?.totalOutstandingDue ?? 0}
          prefix="₹"
          icon={<Clock className="h-5 w-5" />}
          loading={statsLoading}
          variant={stats?.totalOutstandingDue && stats.totalOutstandingDue > 0 ? "warning" : "default"}
          testId="metric-outstanding-due"
        />
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/2 dark:from-primary/10 dark:to-primary/5 border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-foreground">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/billing">
              <Button className="w-full justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all" data-testid="button-new-sale">
                <ShoppingCart className="h-4 w-4" />
                New Sale
              </Button>
            </Link>
            <Link href="/inventory">
              <Button variant="outline" className="w-full justify-center gap-2 border-primary/20 hover:bg-primary/5 transition-all" data-testid="button-add-stock">
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            </Link>
            <Link href="/sales">
              <Button variant="outline" className="w-full justify-center gap-2 border-primary/20 hover:bg-primary/5 transition-all" data-testid="button-view-reports">
                <BarChart3 className="h-4 w-4" />
                View Sales
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <Card className="border-0">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg font-semibold text-foreground">Low Stock Alerts</CardTitle>
            <Link href="/inventory">
              <Button variant="ghost" size="sm" data-testid="link-view-all-stock">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {lowStockLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : lowStockProducts && lowStockProducts.length > 0 ? (
              <div className="space-y-3">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-md"
                    data-testid={`row-low-stock-${product.id}`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.brand} - Size {product.size}
                      </p>
                    </div>
                    <Badge variant="destructive" className="shrink-0">
                      {product.stock} left
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>All products are well stocked</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="border-0">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg font-semibold text-foreground">Recent Sales</CardTitle>
            <Link href="/sales">
              <Button variant="ghost" size="sm" data-testid="link-view-all-sales">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {salesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentSales && recentSales.length > 0 ? (
              <div className="space-y-3">
                {recentSales.slice(0, 5).map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-md"
                    data-testid={`row-recent-sale-${sale.id}`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium">#{sale.invoiceNumber}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {sale.customerName || "Walk-in Customer"}
                      </p>
                    </div>
                    <p className="font-semibold text-primary shrink-0">
                      ₹{sale.total.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No sales yet today</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Products</p>
              <div className="text-xl font-semibold" data-testid="text-total-products">
                {statsLoading ? <Skeleton className="h-6 w-12" /> : stats?.totalProducts ?? 0}
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Customers</p>
              <div className="text-xl font-semibold" data-testid="text-total-customers">
                {statsLoading ? <Skeleton className="h-6 w-12" /> : stats?.totalCustomers ?? 0}
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Today's Orders</p>
              <div className="text-xl font-semibold" data-testid="text-today-orders">
                {statsLoading ? <Skeleton className="h-6 w-12" /> : stats?.todaySales ?? 0}
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md">
              <AlertTriangle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Low Stock</p>
              <div className="text-xl font-semibold" data-testid="text-low-stock-count">
                {statsLoading ? <Skeleton className="h-6 w-12" /> : stats?.lowStockCount ?? 0}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number;
  prefix?: string;
  icon: React.ReactNode;
  loading?: boolean;
  variant?: "default" | "warning";
  testId?: string;
}

function MetricCard({ title, value, prefix = "", icon, loading, variant = "default", testId }: MetricCardProps) {
  return (
    <Card data-testid={testId} className={`transition-all hover:shadow-lg border-0 ${variant === "warning" ? "bg-gradient-to-br from-destructive/5 to-destructive/2 dark:from-destructive/10 dark:to-destructive/5" : "bg-gradient-to-br from-card to-card/50"}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4 mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${variant === "warning" ? "bg-destructive/15 dark:bg-destructive/20 text-destructive" : "bg-primary/12 text-primary"}`}>
            {icon}
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-10 w-28" />
        ) : (
          <p className={`text-3xl font-bold text-foreground`}>
            {prefix}{typeof value === "number" ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
