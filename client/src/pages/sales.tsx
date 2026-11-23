import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Receipt,
  Calendar,
  Printer,
  MessageCircle,
  TrendingUp,
  ShoppingBag,
  Trash2,
  Edit2,
} from "lucide-react";
import type { Sale, CartItem, BusinessSettings } from "@shared/schema";
import ProfessionalInvoice from "@/components/ProfessionalInvoice";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Sales() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editForm, setEditForm] = useState({
    customerName: "",
    customerPhone: "",
    paymentMethod: "",
    paymentStatus: "",
  });

  const { data: sales, isLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });

  const { data: settings } = useQuery<BusinessSettings>({
    queryKey: ["/api/settings"],
  });

  const cancelSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/sales/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/with-variants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setSelectedSale(null);
      toast({
        title: "Invoice Cancelled",
        description: "The invoice has been cancelled and stock has been restored.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel invoice",
        variant: "destructive",
      });
    },
  });

  const updateSaleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Sale> }) => {
      const res = await apiRequest("PATCH", `/api/sales/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      setEditingSale(null);
      toast({
        title: "Sale Updated",
        description: "The sale details have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update sale",
        variant: "destructive",
      });
    },
  });

  const handleEditClick = (sale: Sale) => {
    setEditingSale(sale);
    setEditForm({
      customerName: sale.customerName || "",
      customerPhone: sale.customerPhone || "",
      paymentMethod: sale.paymentMethod,
      paymentStatus: sale.paymentStatus,
    });
  };

  const handleUpdateSale = () => {
    if (!editingSale) return;
    updateSaleMutation.mutate({
      id: editingSale.id,
      data: editForm,
    });
  };

  const filteredSales = useMemo(() => {
    if (!sales) return [];

    let result = [...sales];

    // Date filtering
    const now = new Date();
    if (dateFilter === "today") {
      result = result.filter((sale) => {
        const saleDate = new Date(sale.createdAt);
        return saleDate.toDateString() === now.toDateString();
      });
    } else if (dateFilter === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      result = result.filter((sale) => new Date(sale.createdAt) >= weekAgo);
    } else if (dateFilter === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      result = result.filter((sale) => new Date(sale.createdAt) >= monthAgo);
    }

    // Search filtering
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (sale) =>
          sale.invoiceNumber.toLowerCase().includes(query) ||
          sale.customerName?.toLowerCase().includes(query) ||
          sale.customerPhone?.includes(query)
      );
    }

    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [sales, dateFilter, searchQuery]);

  const stats = useMemo(() => {
    if (!filteredSales.length) return { totalRevenue: 0, avgSale: 0, totalSales: 0 };
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    return {
      totalRevenue,
      avgSale: totalRevenue / filteredSales.length,
      totalSales: filteredSales.length,
    };
  }, [filteredSales]);

  const generateWhatsAppLink = (sale: Sale) => {
    const items = JSON.parse(sale.items) as CartItem[];
    const shopName = settings?.brandName || "The Moon Shoes & Slippers";
    const upiId = settings?.upiId;
    
    let message = `*${shopName} Invoice #${sale.invoiceNumber}*\n\n`;
    message += `Date: ${new Date(sale.createdAt).toLocaleDateString()}\n\n`;
    message += `*Items:*\n`;
    items.forEach((item) => {
      message += `${item.name} (${item.size}) x${item.quantity} - ₹${(item.price * item.quantity).toFixed(2)}\n`;
    });
    message += `\n*Subtotal:* ₹${sale.subtotal.toFixed(2)}`;
    if (sale.discount > 0) {
      message += `\n*Discount:* ₹${sale.discount.toFixed(2)}`;
    }
    message += `\n*Total:* ₹${sale.total.toFixed(2)}`;
    message += `\n*Paid:* ₹${sale.paidAmount.toFixed(2)}`;
    if (sale.paymentStatus === "DUE" && sale.dueAmount > 0) {
      message += `\n*Due:* ₹${sale.dueAmount.toFixed(2)}`;
    }
    message += `\n*Status:* ${sale.paymentStatus}`;
    if (upiId) {
      message += `\n\n*Pay via UPI:* ${upiId}`;
    }
    message += `\n\nThank you for shopping at ${shopName}!`;

    const phone = sale.customerPhone?.replace(/\D/g, "") || "";
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-sales">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Sales History</h1>
        <p className="text-muted-foreground">View and manage all transactions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold" data-testid="text-total-sales">
                  {stats.totalSales}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold" data-testid="text-total-revenue">
                  ₹{stats.totalRevenue.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Sale</p>
                <p className="text-2xl font-bold" data-testid="text-avg-sale">
                  ₹{stats.avgSale.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice #, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-sales"
          />
        </div>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-date-filter">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sales Table */}
      <Card>
        <ScrollArea className="h-[calc(100vh-440px)]">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredSales.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id} data-testid={`row-sale-${sale.id}`}>
                    <TableCell className="font-medium">
                      #{sale.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{sale.customerName || "Walk-in Customer"}</p>
                        {sale.customerPhone && (
                          <p className="text-sm text-muted-foreground">
                            {sale.customerPhone}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{new Date(sale.createdAt).toLocaleDateString()}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(sale.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {sale.paymentMethod.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ₹{sale.total.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSale(sale)}
                          data-testid={`button-view-sale-${sale.id}`}
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(sale)}
                          data-testid={`button-edit-sale-${sale.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              data-testid={`button-cancel-sale-${sale.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Invoice</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel invoice #{sale.invoiceNumber}? This will restore the stock and cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>No, Keep It</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => cancelSaleMutation.mutate(sale.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Yes, Cancel Invoice
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Receipt className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No sales found</p>
              <p className="text-sm">Sales will appear here after checkout</p>
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Sale Detail Dialog */}
      <Dialog open={!!selectedSale} onOpenChange={(open) => !open && setSelectedSale(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Invoice Details</DialogTitle>
            </DialogHeader>
            {selectedSale && (
              <div className="print:block p-4">
                <ProfessionalInvoice sale={selectedSale} settings={settings} />
              </div>
            )}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              {selectedSale && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      data-testid="button-cancel-invoice-detail"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Cancel Invoice
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Invoice</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to cancel invoice #{selectedSale.invoiceNumber}? This will restore the stock and cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>No, Keep It</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => cancelSaleMutation.mutate(selectedSale.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Yes, Cancel Invoice
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.print()}
                data-testid="button-print-invoice-detail"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print / Save PDF
              </Button>
              {selectedSale?.customerPhone && (
                <Button
                  className="flex-1"
                  onClick={() =>
                    window.open(generateWhatsAppLink(selectedSale), "_blank")
                  }
                  data-testid="button-whatsapp-share-detail"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Edit Sale Dialog */}
      <Dialog open={!!editingSale} onOpenChange={(open) => !open && setEditingSale(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Sale Details</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">Customer Name</label>
              <Input
                id="name"
                value={editForm.customerName}
                onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                placeholder="Walk-in Customer"
                data-testid="input-edit-customer-name"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="phone" className="text-sm font-medium">Customer Phone</label>
              <Input
                id="phone"
                value={editForm.customerPhone}
                onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })}
                placeholder="Phone Number"
                data-testid="input-edit-customer-phone"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="method" className="text-sm font-medium">Payment Method</label>
              <Select
                value={editForm.paymentMethod}
                onValueChange={(value) => setEditForm({ ...editForm, paymentMethod: value })}
              >
                <SelectTrigger id="method" data-testid="select-edit-payment-method">
                  <SelectValue placeholder="Select Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">CASH</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="CARD">CARD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="status" className="text-sm font-medium">Payment Status</label>
              <Select
                value={editForm.paymentStatus}
                onValueChange={(value) => setEditForm({ ...editForm, paymentStatus: value })}
              >
                <SelectTrigger id="status" data-testid="select-edit-payment-status">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAID">PAID</SelectItem>
                  <SelectItem value="DUE">DUE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingSale(null)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateSale}
              disabled={updateSaleMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateSaleMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
