import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  Phone,
  Printer,
  MessageCircle,
  X,
  Check,
} from "lucide-react";
import type { Product, Customer, CartItem, Sale, BusinessSettings, ProductWithVariants, ProductVariant } from "@shared/schema";
import { ImageCarousel } from "@/components/ImageCarousel";
import ProfessionalInvoice from "@/components/ProfessionalInvoice";

export default function Billing() {
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("+91");
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentStatus, setPaymentStatus] = useState<"PAID" | "DUE">("PAID");
  const [paidAmountInput, setPaidAmountInput] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [showInvoice, setShowInvoice] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [selectedProductForSize, setSelectedProductForSize] = useState<ProductWithVariants | null>(null);

  const { toast } = useToast();

  const { data: products, isLoading: productsLoading } = useQuery<ProductWithVariants[]>({
    queryKey: ["/api/products/with-variants"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: settings } = useQuery<BusinessSettings>({
    queryKey: ["/api/settings"],
  });

  const createSaleMutation = useMutation({
    mutationFn: async (saleData: {
      customerId?: string;
      customerName?: string;
      customerPhone?: string;
      items: CartItem[];
      subtotal: number;
      discount: number;
      total: number;
      paymentMethod: string;
      paymentStatus: "PAID" | "DUE";
      paidAmount: number;
    }) => {
      const response = await apiRequest("POST", "/api/sales", saleData);
      return response.json() as Promise<Sale>;
    },
    onSuccess: (sale) => {
      setCompletedSale(sale);
      setShowInvoice(true);
      setCart([]);
      setSelectedCustomer(null);
      setWalkInName("");
      setWalkInPhone("");
      setPaymentStatus("PAID");
      setPaidAmountInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/with-variants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/due/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/due/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/due/total"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      const statusMessage = sale.paymentStatus === "DUE" 
        ? ` (Due: ₹${sale.dueAmount.toFixed(2)})`
        : "";
      toast({
        title: "Sale Complete",
        description: `Invoice #${sale.invoiceNumber} generated successfully.${statusMessage}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete sale. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const hasAvailableStock = (p: ProductWithVariants) => {
      if (p.variants && p.variants.length > 0) {
        return p.variants.some(v => v.stock > 0);
      }
      return p.stock > 0;
    };
    if (!searchQuery) return products.filter(hasAvailableStock);
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        hasAvailableStock(p) &&
        (p.name.toLowerCase().includes(query) ||
          p.brand.toLowerCase().includes(query) ||
          p.size.toLowerCase().includes(query) ||
          p.color.toLowerCase().includes(query))
    );
  }, [products, searchQuery]);

  const filteredCustomerSuggestions = useMemo(() => {
    if (!customers || !walkInPhone) return [];
    const query = walkInPhone.replace(/\D/g, "");
    if (query.length < 3) return [];
    return customers.filter(
      (c) => c.phone.replace(/\D/g, "").includes(query) || 
             c.name.toLowerCase().includes(walkInPhone.toLowerCase())
    ).slice(0, 5);
  }, [customers, walkInPhone]);

  const selectCustomerSuggestion = (customer: Customer) => {
    setWalkInName(customer.name);
    setWalkInPhone(customer.phone);
    setShowCustomerSuggestions(false);
  };

  const handleProductClick = (product: ProductWithVariants) => {
    if (product.variants && product.variants.length > 0) {
      setSelectedProductForSize(product);
    } else {
      addToCartWithoutVariant(product);
    }
  };

  const addToCartWithoutVariant = (product: ProductWithVariants) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id && !item.variantId);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast({
            title: "Stock Limit",
            description: `Only ${product.stock} units available.`,
            variant: "destructive",
          });
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id && !item.variantId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          brand: product.brand,
          size: product.size,
          color: product.color,
          price: product.price,
          quantity: 1,
        },
      ];
    });
  };

  const addToCartWithVariant = (product: ProductWithVariants, variant: ProductVariant) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id && item.variantId === variant.id);
      if (existing) {
        if (existing.quantity >= variant.stock) {
          toast({
            title: "Stock Limit",
            description: `Only ${variant.stock} units available for size ${variant.size}.`,
            variant: "destructive",
          });
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id && item.variantId === variant.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          brand: product.brand,
          size: variant.size,
          color: product.color,
          price: product.price,
          quantity: 1,
        },
      ];
    });
    setSelectedProductForSize(null);
  };

  const updateQuantity = (productId: string, variantId: string | undefined, delta: number) => {
    const product = products?.find((p) => p.id === productId);
    const variant = variantId ? product?.variants?.find(v => v.id === variantId) : null;
    const maxStock = variant ? variant.stock : (product?.stock || 0);
    
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId && item.variantId === variantId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > maxStock) {
              toast({
                title: "Stock Limit",
                description: `Only ${maxStock} units available.`,
                variant: "destructive",
              });
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string, variantId: string | undefined) => {
    setCart((prev) => prev.filter((item) => !(item.productId === productId && item.variantId === variantId)));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setWalkInName("");
    setWalkInPhone("");
    setPaymentStatus("PAID");
    setPaidAmountInput("");
    setDiscountInput("");
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = parseFloat(discountInput) || 0;
  const total = Math.max(0, subtotal - discount);

  const paidAmount = paymentStatus === "PAID" 
    ? total 
    : (parseFloat(paidAmountInput) || 0);
  const dueAmount = total - paidAmount;

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Add items to cart before checkout.",
        variant: "destructive",
      });
      return;
    }

    if (paymentStatus === "DUE") {
      if (paidAmount < 0) {
        toast({
          title: "Invalid Amount",
          description: "Paid amount cannot be negative.",
          variant: "destructive",
        });
        return;
      }
      if (paidAmount > total) {
        toast({
          title: "Invalid Amount", 
          description: "Paid amount cannot exceed total.",
          variant: "destructive",
        });
        return;
      }
      if (!walkInPhone && !selectedCustomer?.phone) {
        toast({
          title: "Phone Required",
          description: "Customer phone is required for due bills.",
          variant: "destructive",
        });
        return;
      }
    }

    createSaleMutation.mutate({
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name || walkInName || undefined,
      customerPhone: selectedCustomer?.phone || walkInPhone || undefined,
      items: cart,
      subtotal,
      discount,
      total,
      paymentMethod,
      paymentStatus,
      paidAmount,
    });
  };

  const generateWhatsAppLink = (sale: Sale) => {
    if (!sale.items) return "";
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
    message += `\n\nFollow us on WhatsApp: https://whatsapp.com/channel/0029Vb72FLR8qIzjcq64Iz1i`;

    const phone = sale.customerPhone?.replace(/\D/g, "") || "";
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 p-6" data-testid="page-billing">
      {/* Product Selection Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex flex-col gap-4 mb-4">
          <h1 className="text-3xl font-semibold">Point of Sale</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, brand, size, or color..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-product-search"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={() => handleProductClick(product)}
                  cart={cart}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No products found</p>
              <p className="text-sm">Try adjusting your search</p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Cart Sidebar */}
      <Card className="w-full lg:w-96 shrink-0 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0">
          {/* Customer Selection */}
          <div className="space-y-3 mb-4">
            <Select
              value={selectedCustomer?.id || "walk-in"}
              onValueChange={(value) => {
                if (value === "walk-in") {
                  setSelectedCustomer(null);
                } else {
                  const customer = customers?.find((c) => c.id === value);
                  if (customer) {
                    setSelectedCustomer(customer);
                    setWalkInName("");
                    setWalkInPhone("");
                  }
                }
              }}
            >
              <SelectTrigger data-testid="select-customer">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                {customers?.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} - {customer.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!selectedCustomer && (
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <User className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Name"
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    className="pl-8 h-9"
                    data-testid="input-walkin-name"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={phoneInputRef}
                    placeholder="Phone"
                    value={walkInPhone}
                    onChange={(e) => {
                      setWalkInPhone(e.target.value);
                      setShowCustomerSuggestions(true);
                    }}
                    onFocus={() => setShowCustomerSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
                    className="pl-8 h-9"
                    data-testid="input-walkin-phone"
                  />
                  {showCustomerSuggestions && filteredCustomerSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredCustomerSuggestions.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex flex-col"
                          onClick={() => selectCustomerSuggestion(customer)}
                          data-testid={`suggestion-customer-${customer.id}`}
                        >
                          <span className="font-medium">{customer.name}</span>
                          <span className="text-xs text-muted-foreground">{customer.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <Separator className="mb-4" />

          {/* Cart Items */}
          <ScrollArea className="flex-1 -mx-1 px-1">
            {cart.length > 0 ? (
              <div className="space-y-3">
                {cart.map((item) => {
                  const cartKey = item.variantId ? `${item.productId}-${item.variantId}` : item.productId;
                  return (
                    <div
                      key={cartKey}
                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-md"
                      data-testid={`cart-item-${cartKey}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.brand} - Size {item.size}
                        </p>
                        <p className="text-sm font-medium mt-1">
                          ₹{item.price.toFixed(2)} x {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.productId, item.variantId, -1)}
                          data-testid={`button-decrease-${cartKey}`}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.productId, item.variantId, 1)}
                          data-testid={`button-increase-${cartKey}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeFromCart(item.productId, item.variantId)}
                          data-testid={`button-remove-${cartKey}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">Cart is empty</p>
              </div>
            )}
          </ScrollArea>

          <Separator className="my-4" />

          {/* Totals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Discount</span>
              <Input
                type="number"
                min="0"
                max={subtotal}
                step="1"
                placeholder="0"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                className="w-24 h-8 text-right"
                data-testid="input-discount"
              />
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span data-testid="text-cart-total">₹{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger className="mt-4" data-testid="select-payment-method">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="upi">UPI</SelectItem>
            </SelectContent>
          </Select>

          {/* Payment Status */}
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={paymentStatus === "PAID" ? "default" : "outline"}
                className="flex-1"
                onClick={() => {
                  setPaymentStatus("PAID");
                  setPaidAmountInput("");
                }}
                data-testid="button-status-paid"
              >
                PAID
              </Button>
              <Button
                type="button"
                variant={paymentStatus === "DUE" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setPaymentStatus("DUE")}
                data-testid="button-status-due"
              >
                DUE
              </Button>
            </div>

            {paymentStatus === "DUE" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Paid:</span>
                  <Input
                    type="number"
                    min="0"
                    max={total}
                    step="0.01"
                    placeholder="0.00"
                    value={paidAmountInput}
                    onChange={(e) => setPaidAmountInput(e.target.value)}
                    className="flex-1"
                    data-testid="input-paid-amount"
                  />
                </div>
                <div className="flex justify-between text-sm font-medium text-orange-600 dark:text-orange-400">
                  <span>Due Amount:</span>
                  <span data-testid="text-due-amount">₹{dueAmount.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button
              variant="outline"
              onClick={clearCart}
              disabled={cart.length === 0}
              data-testid="button-clear-cart"
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={cart.length === 0 || createSaleMutation.isPending}
              data-testid="button-checkout"
            >
              <Check className="h-4 w-4 mr-2" />
              {createSaleMutation.isPending ? "Processing..." : "Checkout"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Dialog */}
      <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {completedSale && (
            <div className="print:block p-4">
              <ProfessionalInvoice sale={completedSale} settings={settings} />
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.print()}
              data-testid="button-print-invoice"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print / Save PDF
            </Button>
            {completedSale?.customerPhone && (
              <Button
                className="flex-1"
                onClick={() =>
                  window.open(generateWhatsAppLink(completedSale), "_blank")
                }
                data-testid="button-whatsapp-share"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Size Selection Dialog */}
      <Dialog open={!!selectedProductForSize} onOpenChange={(open) => !open && setSelectedProductForSize(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Size</DialogTitle>
          </DialogHeader>
          {selectedProductForSize && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">{selectedProductForSize.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedProductForSize.brand} - {selectedProductForSize.color}</p>
                <p className="text-lg font-bold mt-2">₹{selectedProductForSize.price.toFixed(2)}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {selectedProductForSize.variants
                  .filter(v => v.stock > 0)
                  .sort((a, b) => parseFloat(a.size) - parseFloat(b.size) || a.size.localeCompare(b.size))
                  .map((variant) => {
                    const inCartQty = cart.find(c => c.variantId === variant.id)?.quantity || 0;
                    return (
                      <Button
                        key={variant.id}
                        variant="outline"
                        className="flex flex-col py-3"
                        onClick={() => addToCartWithVariant(selectedProductForSize, variant)}
                        data-testid={`button-size-${variant.size}`}
                      >
                        <span className="font-medium">{variant.size}</span>
                        <span className="text-xs text-muted-foreground">
                          {variant.stock - inCartQty} left
                        </span>
                      </Button>
                    );
                  })}
              </div>
              {selectedProductForSize.variants.filter(v => v.stock > 0).length === 0 && (
                <p className="text-center text-muted-foreground">No sizes available</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ProductCardProps {
  product: ProductWithVariants;
  onAdd: () => void;
  cart: CartItem[];
}

function ProductCard({ product, onAdd, cart }: ProductCardProps) {
  const hasVariants = product.variants && product.variants.length > 0;
  const totalInCart = cart
    .filter(c => c.productId === product.id)
    .reduce((sum, c) => sum + c.quantity, 0);
  
  const availableSizes = hasVariants
    ? product.variants.filter(v => v.stock > 0).map(v => v.size).sort((a, b) => parseFloat(a) - parseFloat(b) || a.localeCompare(b))
    : [];
  
  const totalStock = hasVariants
    ? product.variants.reduce((sum, v) => sum + v.stock, 0)
    : product.stock;

  return (
    <Card
      className="overflow-visible hover-elevate active-elevate-2 cursor-pointer transition-all"
      onClick={onAdd}
      data-testid={`product-card-${product.id}`}
    >
      <CardContent className="p-4">
        {(product.imageUrls || product.imageUrl) && (
          <div className="mb-3 -mx-1">
            {(() => {
              const images = product.imageUrls 
                ? JSON.parse(product.imageUrls) as string[]
                : product.imageUrl ? [product.imageUrl] : [];
              return images.length > 0 ? (
                <ImageCarousel 
                  images={images} 
                  alt={product.name} 
                  height="h-28"
                  onImageClick={(e) => e.stopPropagation()}
                />
              ) : null;
            })()}
          </div>
        )}
        <div className="flex justify-between items-start gap-2 mb-2">
          <div className="min-w-0">
            <h3 className="font-medium truncate">{product.name}</h3>
            <p className="text-sm text-muted-foreground">{product.brand}</p>
          </div>
          {totalInCart > 0 && (
            <Badge variant="default" className="shrink-0">
              {totalInCart} in cart
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-3">
          <div className="flex flex-wrap gap-2">
            {hasVariants ? (
              <Badge variant="outline">
                Sizes: {availableSizes.length > 3 
                  ? `${availableSizes.slice(0, 3).join(", ")}...` 
                  : availableSizes.join(", ")}
              </Badge>
            ) : (
              <Badge variant="outline">Size {product.size}</Badge>
            )}
            <Badge variant="outline">{product.color}</Badge>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 mt-3">
          <span className="text-lg font-bold">₹{product.price.toFixed(2)}</span>
          <span className="text-sm text-muted-foreground">
            {totalStock} in stock
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
