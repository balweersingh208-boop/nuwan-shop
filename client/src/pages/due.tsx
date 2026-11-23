import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Clock,
  IndianRupee,
  Users,
  Receipt,
  MessageCircle,
  CreditCard,
  Phone,
} from "lucide-react";
import type { Sale, DueCustomerSummary, DuePayment, CartItem, BusinessSettings } from "@shared/schema";

export default function DueManagement() {
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectPaymentMode, setCollectPaymentMode] = useState("cash");
  const [showCollectDialog, setShowCollectDialog] = useState(false);

  const { toast } = useToast();

  const { data: dueSales, isLoading: salesLoading } = useQuery<Sale[]>({
    queryKey: ["/api/due/sales"],
  });

  const { data: dueCustomers, isLoading: customersLoading } = useQuery<DueCustomerSummary[]>({
    queryKey: ["/api/due/customers"],
  });

  const { data: totalDue } = useQuery<{ total: number }>({
    queryKey: ["/api/due/total"],
  });

  const { data: settings } = useQuery<BusinessSettings>({
    queryKey: ["/api/settings"],
  });

  const collectPaymentMutation = useMutation({
    mutationFn: async (data: {
      saleId: string;
      invoiceNumber: string;
      customerPhone?: string;
      customerName?: string;
      paidAmount: number;
      paymentMode: string;
    }) => {
      const response = await apiRequest("POST", "/api/due/collect", data);
      return response.json();
    },
    onSuccess: (result) => {
      setShowCollectDialog(false);
      setSelectedSale(null);
      setCollectAmount("");
      setCollectPaymentMode("cash");
      queryClient.invalidateQueries({ queryKey: ["/api/due/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/due/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/due/total"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      const statusMsg = result.sale.paymentStatus === "PAID" 
        ? " Bill is now fully PAID!"
        : ` Remaining due: ₹${result.sale.dueAmount.toFixed(2)}`;
      
      toast({
        title: "Payment Collected",
        description: `₹${result.payment.paidAmount.toFixed(2)} collected successfully.${statusMsg}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to collect payment.",
        variant: "destructive",
      });
    },
  });

  const openCollectDialog = (sale: Sale) => {
    setSelectedSale(sale);
    setCollectAmount(sale.dueAmount.toFixed(2));
    setShowCollectDialog(true);
  };

  const handleCollectPayment = () => {
    if (!selectedSale) return;
    
    const amount = parseFloat(collectAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount.",
        variant: "destructive",
      });
      return;
    }

    // Use rounding to handle floating-point precision issues
    const roundedAmount = Math.round(amount * 100) / 100;
    const roundedDueAmount = Math.round(selectedSale.dueAmount * 100) / 100;
    
    if (roundedAmount > roundedDueAmount) {
      toast({
        title: "Invalid Amount",
        description: `Amount cannot exceed due amount (₹${roundedDueAmount.toFixed(2)}).`,
        variant: "destructive",
      });
      return;
    }

    collectPaymentMutation.mutate({
      saleId: selectedSale.id,
      invoiceNumber: selectedSale.invoiceNumber,
      customerPhone: selectedSale.customerPhone || undefined,
      customerName: selectedSale.customerName || undefined,
      paidAmount: roundedAmount,
      paymentMode: collectPaymentMode,
    });
  };

  const generateWhatsAppReminder = (sale: Sale) => {
    const shopName = settings?.brandName || "The Moon Shoes & Slippers";
    const upiId = settings?.upiId;
    const items = sale.items ? (JSON.parse(sale.items) as CartItem[]) : [];
    
    let message = `Dear ${sale.customerName || "Customer"},\n\n`;
    message += `This is a friendly reminder for your pending payment at ${shopName}.\n\n`;
    message += `*Invoice:* #${sale.invoiceNumber}\n`;
    message += `*Date:* ${new Date(sale.createdAt).toLocaleDateString()}\n\n`;
    message += `*Items:*\n`;
    items.forEach((item) => {
      message += `- ${item.name} (${item.size}) x${item.quantity}\n`;
    });
    message += `\n*Total Bill:* ₹${sale.total.toFixed(2)}`;
    message += `\n*Paid:* ₹${sale.paidAmount.toFixed(2)}`;
    message += `\n*Outstanding Due:* ₹${sale.dueAmount.toFixed(2)}`;
    if (upiId) {
      message += `\n\n*Please pay via UPI:* ${upiId}`;
    }
    message += `\n\nKindly clear the pending amount at your earliest convenience.`;
    message += `\n\nThank you for shopping at ${shopName}!`;

    const phone = sale.customerPhone?.replace(/\D/g, "") || "";
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const totalOutstandingDue = totalDue?.total || 0;

  return (
    <div className="p-6 space-y-6" data-testid="page-due">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Due Management</h1>
        <Card className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <IndianRupee className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <div>
              <p className="text-xs text-orange-600 dark:text-orange-400">Total Outstanding</p>
              <p className="text-xl font-bold text-orange-700 dark:text-orange-300" data-testid="text-total-due">
                ₹{totalOutstandingDue.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bills" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bills" data-testid="tab-due-bills">
            <Receipt className="h-4 w-4 mr-2" />
            Due Bills
          </TabsTrigger>
          <TabsTrigger value="customers" data-testid="tab-due-customers">
            <Users className="h-4 w-4 mr-2" />
            Due Customers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Outstanding Due Bills
              </CardTitle>
            </CardHeader>
            <CardContent>
              {salesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : dueSales && dueSales.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Due</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dueSales.map((sale) => (
                        <TableRow key={sale.id} data-testid={`due-bill-${sale.id}`}>
                          <TableCell className="font-medium">
                            {sale.invoiceNumber}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{sale.customerName || "Walk-in"}</p>
                              {sale.customerPhone && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {sale.customerPhone}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(sale.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            ₹{sale.total.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            ₹{sale.paidAmount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-orange-600 dark:text-orange-400">
                            ₹{sale.dueAmount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => openCollectDialog(sale)}
                                data-testid={`button-collect-${sale.id}`}
                              >
                                <CreditCard className="h-3 w-3 mr-1" />
                                Collect
                              </Button>
                              {sale.customerPhone && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(generateWhatsAppReminder(sale), "_blank")}
                                  data-testid={`button-remind-${sale.id}`}
                                >
                                  <MessageCircle className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Receipt className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No due bills</p>
                  <p className="text-sm">All bills are fully paid</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Customers with Outstanding Dues
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : dueCustomers && dueCustomers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="text-center">Bills</TableHead>
                        <TableHead className="text-right">Total Due</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dueCustomers.map((customer, idx) => (
                        <TableRow key={customer.customerPhone + idx} data-testid={`due-customer-${idx}`}>
                          <TableCell className="font-medium">
                            {customer.customerName}
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {customer.customerPhone}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{customer.billCount}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-orange-600 dark:text-orange-400">
                            ₹{customer.totalDue.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No customers with dues</p>
                  <p className="text-sm">All customers are cleared</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Collect Payment Dialog */}
      <Dialog open={showCollectDialog} onOpenChange={setShowCollectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Collect Due Payment</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-md p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Invoice</span>
                  <span className="font-medium">{selectedSale.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium">{selectedSale.customerName || "Walk-in"}</span>
                </div>
                {selectedSale.customerPhone && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Phone</span>
                    <span>{selectedSale.customerPhone}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Bill</span>
                  <span>₹{selectedSale.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Already Paid</span>
                  <span>₹{selectedSale.paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium text-orange-600 dark:text-orange-400">
                  <span>Outstanding Due</span>
                  <span>₹{selectedSale.dueAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Payment Amount
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      min="0.01"
                      max={selectedSale.dueAmount}
                      step="0.01"
                      value={collectAmount}
                      onChange={(e) => setCollectAmount(e.target.value)}
                      className="pl-9"
                      placeholder="Enter amount"
                      data-testid="input-collect-amount"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Payment Mode
                  </label>
                  <Select value={collectPaymentMode} onValueChange={setCollectPaymentMode}>
                    <SelectTrigger data-testid="select-payment-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCollectDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCollectPayment}
              disabled={collectPaymentMutation.isPending}
              data-testid="button-confirm-collect"
            >
              {collectPaymentMutation.isPending ? "Processing..." : "Collect Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
