import { forwardRef } from "react";
import { Separator } from "@/components/ui/separator";
import type { Sale, CartItem, BusinessSettings } from "@shared/schema";

interface ProfessionalInvoiceProps {
  sale: Sale;
  settings?: BusinessSettings | null;
}

const ProfessionalInvoice = forwardRef<HTMLDivElement, ProfessionalInvoiceProps>(
  ({ sale, settings }, ref) => {
    const items = sale.items ? (JSON.parse(sale.items) as CartItem[]) : [];
    const shopName = settings?.brandName || "The Moon Shoes & Slippers";
    const shopAddress = settings?.address || "Peshwa Nagar, Bithoor, Kanpur Nagar, Uttar Pradesh, 209217";
    const shopMobile = settings?.mobile || "9140886277";
    const shopLogo = "/favicon.png";
    const upiId = settings?.upiId;
    const signature = "/signature.png";

    return (
      <div
        ref={ref}
        className="bg-white text-black p-8 max-w-[210mm] mx-auto font-sans print:p-0 print:m-0"
        style={{ 
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          minHeight: "297mm",
          boxSizing: "border-box"
        }}
        data-testid="professional-invoice"
      >
        <div className="text-center mb-4">
          {shopLogo && (
            <div className="flex justify-center mb-2">
              <img
                src="/favicon.png"
                alt="Shop Logo"
                className="h-16 w-16 object-contain rounded-lg"
                data-testid="invoice-logo"
              />
            </div>
          )}
          <h1 className="text-xl font-bold uppercase tracking-wide" data-testid="invoice-shop-name">
            {shopName}
          </h1>
          {shopAddress && (
            <p className="text-xs text-gray-600 mt-1" data-testid="invoice-address">
              {shopAddress}
            </p>
          )}
          {shopMobile && (
            <p className="text-xs text-gray-600" data-testid="invoice-mobile">
              Tel: {shopMobile}
            </p>
          )}
        </div>

        <div className="border-t-2 border-b-2 border-gray-800 py-2 mb-4">
          <div className="flex justify-between text-sm">
            <div>
              <p className="font-semibold">Invoice No:</p>
              <p className="text-gray-700" data-testid="invoice-number">#{sale.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">Date:</p>
              <p className="text-gray-700" data-testid="invoice-date">
                {new Date(sale.createdAt).toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(sale.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </div>

        {(sale.customerName || sale.customerPhone) && (
          <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Bill To:</p>
            {sale.customerName && (
              <p className="font-medium" data-testid="invoice-customer-name">
                {sale.customerName}
              </p>
            )}
            {sale.customerPhone && (
              <p className="text-sm text-gray-600" data-testid="invoice-customer-phone">
                {sale.customerPhone}
              </p>
            )}
          </div>
        )}

        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-2 font-semibold">Item</th>
              <th className="text-center py-2 font-semibold">Size</th>
              <th className="text-center py-2 font-semibold">Qty</th>
              <th className="text-right py-2 font-semibold">Price</th>
              <th className="text-right py-2 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-b border-gray-200" data-testid={`invoice-item-${index}`}>
                <td className="py-2 text-left">{item.name}</td>
                <td className="py-2 text-center">{item.size}</td>
                <td className="py-2 text-center">{item.quantity}</td>
                <td className="py-2 text-right">₹{item.price.toFixed(2)}</td>
                <td className="py-2 text-right">₹{(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t-2 border-gray-300 pt-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span data-testid="invoice-subtotal">₹{sale.subtotal.toFixed(2)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between text-sm text-green-700">
              <span>Discount:</span>
              <span data-testid="invoice-discount">-₹{sale.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold border-t border-gray-300 pt-2 mt-2">
            <span>TOTAL:</span>
            <span data-testid="invoice-total">₹{sale.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Paid Amount:</span>
            <span className="text-green-700 font-medium" data-testid="invoice-paid">
              ₹{sale.paidAmount.toFixed(2)}
            </span>
          </div>
          {sale.paymentStatus === "DUE" && sale.dueAmount > 0 && (
            <div className="flex justify-between">
              <span>Due Amount:</span>
              <span className="text-red-600 font-bold" data-testid="invoice-due">
                ₹{sale.dueAmount.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span>Payment Status:</span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${
                sale.paymentStatus === "PAID"
                  ? "bg-green-100 text-green-800"
                  : "bg-orange-100 text-orange-800"
              }`}
              data-testid="invoice-status"
            >
              {sale.paymentStatus}
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Payment Method:</span>
            <span className="uppercase">{sale.paymentMethod}</span>
          </div>
        </div>

        {upiId && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-center">
            <p className="text-xs text-blue-700 font-medium">Pay via UPI</p>
            <p className="text-sm font-bold text-blue-900" data-testid="invoice-upi">
              {upiId}
            </p>
          </div>
        )}

        <div className="mt-6 text-center">
          <Separator className="mb-4" />
          <p className="text-sm font-medium">Thank you for shopping with us!</p>
          <p className="text-xs text-gray-500 mt-1">
            We appreciate your business.
          </p>
        </div>

        {signature && (
          <div className="mt-6 flex justify-end">
            <div className="text-center">
              <img
                src={signature}
                alt="Authorized Signature"
                className="h-12 w-auto object-contain"
                data-testid="invoice-signature"
              />
              <p className="text-xs text-gray-500 border-t border-gray-300 pt-1 mt-1">
                Authorized Signature
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }
);

ProfessionalInvoice.displayName = "ProfessionalInvoice";

export default ProfessionalInvoice;
