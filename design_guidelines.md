# Shoe Shop Management Web App - Design Guidelines

## Design Approach

**Selected Approach:** Design System Approach (Material Design)
**Justification:** This is a utility-focused, information-dense retail management application where efficiency, data clarity, and learnability are paramount. Material Design provides excellent patterns for data tables, forms, dashboards, and action-oriented interfaces.

**Key Design Principles:**
- Clarity over decoration
- Data hierarchy and scannability
- Fast task completion
- Professional, trustworthy aesthetic

---

## Typography System

**Font Family:** 
- Primary: 'Inter' or 'Roboto' via Google Fonts (clean, readable at small sizes)
- Fallback: system-ui, sans-serif

**Type Scale:**
- Page Titles: text-3xl font-semibold (Dashboard, Inventory, etc.)
- Section Headers: text-xl font-semibold (Today's Sales, Low Stock)
- Card Titles: text-lg font-medium
- Data Labels: text-sm font-medium uppercase tracking-wide
- Body Text: text-base
- Table Data: text-sm
- Metadata/Captions: text-xs

---

## Layout System

**Spacing Primitives:** Use Tailwind units of **2, 4, 6, 8, 12, 16**
- Component padding: p-4 or p-6
- Card spacing: p-6
- Section gaps: gap-6 or gap-8
- Page margins: p-6 to p-8

**Grid Structure:**
- Dashboard: 4-column grid on desktop (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
- Main content area: max-w-7xl mx-auto
- Two-panel layouts: 70/30 split for billing (cart on right)

---

## Component Library

### Navigation
**Top App Bar:**
- Fixed header with store name/logo left, navigation center, user/date right
- Height: h-16
- Navigation links with active state indicators
- Sections: Dashboard, Billing, Inventory, Customers, Sales History

### Dashboard Cards
**Metric Cards (Stats):**
- Elevated cards with rounded corners (rounded-lg shadow-md)
- Large number display (text-4xl font-bold)
- Label below (text-sm)
- Icon top-right corner
- Grid layout: 4 cards across (Today's Sales, Total Revenue, Low Stock Alert Count, Active Customers)

**Data Tables:**
- Clean, striped rows for readability
- Sticky headers
- Action buttons right-aligned per row
- Sortable column headers
- Compact padding (py-3 px-4)
- Used for: Sales History, Customer List, Inventory List

**Quick Actions Panel:**
- Prominent card showing most-used actions
- Large buttons with icons (New Sale, Add Stock, View Reports)
- 3-column grid layout

### Billing Interface
**Two-Column Layout:**
- Left (70%): Product search, item selection grid
- Right (30%): Shopping cart sidebar with sticky position
- Product cards in grid (grid-cols-2 lg:grid-cols-3)
- Each card: image placeholder, name, price, size selector, add button

**Cart Component:**
- Line items list with quantity controls
- Subtotal, tax breakdown, total (emphasized)
- Customer selection dropdown
- Primary action buttons: Clear Cart, Generate Bill
- WhatsApp share button (icon + text)

### Forms
**Customer/Product Forms:**
- Single-column layout, max-w-2xl
- Grouped fields with section headers
- Input fields: h-10 or h-12, rounded-md border
- Labels above inputs (text-sm font-medium mb-2)
- Required field indicators
- Submit button: prominent, right-aligned

### Inventory Management
**Stock Cards:**
- Compact card design with shoe image placeholder
- Product name, brand, size, quantity displayed
- Low stock visual indicator (badge or border treatment)
- Quick action buttons: Edit, Restock, Delete
- Grid layout: 3-4 columns

### Invoice/Receipt
**Print Layout:**
- Centered, max-w-2xl
- Store header with name and contact
- Invoice number and date
- Customer details section
- Itemized table (Item, Qty, Price, Total)
- Footer with totals and thank you message
- Print and WhatsApp share buttons

---

## Responsive Behavior

**Desktop (lg and above):**
- Full multi-column layouts
- Side-by-side forms and data
- Dashboard: 4 metric cards across

**Tablet (md):**
- Dashboard: 2 cards across
- Billing: Maintain two-column with adjusted ratios
- Inventory: 2-3 columns

**Mobile Fallback (if accessed):**
- Single column stack
- Persistent bottom navigation bar
- Drawer for secondary navigation

---

## Images

**Product Images:**
- Placeholder shoe images in inventory cards (aspect-ratio-square)
- Small thumbnails in billing cart items (w-12 h-12)
- Larger preview in product selection (w-full aspect-video or aspect-square)

**No Hero Section:** This is a business application - users land directly on functional dashboard

**Icon Usage:**
- Use Heroicons (solid and outline variants via CDN)
- Icons for: Dashboard metrics, navigation items, action buttons, status indicators
- Size: w-5 h-5 for inline, w-6 h-6 for buttons, w-8 h-8 for large displays

---

## Animations

**Minimal, Functional Only:**
- Smooth transitions on tab switching (transition-all duration-200)
- Button hover states (no custom animations needed)
- Modal/dialog fade-in
- No decorative animations

---

## Key Interactions

**Primary Actions:** Elevated buttons with clear labels (Generate Bill, Add Customer, Print Invoice)
**Secondary Actions:** Outlined buttons (Cancel, Clear)
**Destructive Actions:** Distinct styling with confirmation dialogs (Delete Product)

**Data Entry Flow:**
1. Minimal clicks to complete tasks
2. Keyboard shortcuts for power users (Enter to submit, Esc to cancel)
3. Auto-focus on search/input fields
4. Instant validation feedback

**WhatsApp Integration:**
- Dedicated share button with WhatsApp icon
- Pre-filled message template
- Opens in new tab

This design creates a professional, efficient retail management interface optimized for daily business operations.