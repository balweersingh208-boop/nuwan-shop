# Project Overview

## Architecture
- Full-stack JavaScript application using Express backend and React frontend
- Vite for frontend build and development
- TanStack Query for state management
- Tailwind CSS for styling
- Shadcn UI components

## Database
- **Type:** PostgreSQL (Replit managed)
- **Schema:** Defined in `shared/schema.ts` using Drizzle ORM
- **Storage Implementation:** `server/databaseStorage.ts` - DatabaseStorage class
- **Migrations:** Managed via `drizzle-kit` with `npm run db:push`
- **Persistence:** All data is persisted in Replit's PostgreSQL database and survives restarts
- **Tables Created:**
  - products
  - product_variants
  - customers
  - sales
  - due_payments
  - users
  - business_settings

## Recent Changes
- **Dec 21, 2025:** Migrated from in-memory storage to Replit PostgreSQL database
  - Database automatically seeded with sample products and customers on first run
  - All CRUD operations now persist to database
  - Data will not be lost after Replit project restarts

## Features
- Inventory Management: Add, edit, delete products with size variants (sizes 1-15)
- Customer Management: Track customers and their purchase history
- Sales/Billing: Create invoices and manage payments
- Due Management: Track outstanding payments from customers
- Dashboard: View sales metrics and inventory status
- Business Settings: Configure brand information and tax rates

## Project Structure
```
.
├── server/
│   ├── index.ts          # Express server setup
│   ├── routes.ts         # API endpoints
│   ├── storage.ts        # Storage interface definition
│   ├── databaseStorage.ts # PostgreSQL implementation with seeding
│   ├── db.ts            # Database connection
│   └── vite.ts          # Vite dev server
├── shared/
│   └── schema.ts        # Drizzle ORM tables and schemas
├── client/
│   ├── src/
│   │   ├── pages/       # React pages
│   │   ├── components/  # React components
│   │   └── lib/         # Utilities
│   └── index.html       # Entry point
└── package.json         # Dependencies
```

## Running the Project
```bash
npm run dev       # Start development server (frontend + backend)
npm run db:push   # Apply database schema migrations
npm run build     # Build for production
npm start         # Run production build
```

## Credentials
- Login Token: `Nihal2010`
- Default Tax Rate: 18%
- Default Brand: "The Moon Shoes & Slippers"
