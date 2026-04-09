# Dairy Management App (Next.js + Supabase)

Full‑stack dairy management web app built with **Next.js App Router** and **Supabase (Postgres)**.

## What you can do
- **Customers**: create/edit customers and take payments/advances
- **Entries**: record daily sales (milk/ghee etc.) with date + shift + qty + rate
- **Ledger**: view a customer timeline of sales + payments with a running balance
- **Billing**: generate a bill for a customer for a date range and optionally upload/share the PDF
- **Settings**: maintain your dairy/business profile (appears on bills)
- **Analytics**: dashboard totals for a date range

## Tech stack
- **Next.js** (App Router)
- **Supabase**: database + auth + storage
- **Tailwind CSS**

## Setup

### 1) Install dependencies
```bash
npm install
```

### 2) Environment variables
Create `.env` with:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BILLS_BUCKET` (optional, defaults to `bills`)

### 3) Database schema (Supabase SQL)
Run migrations in `scripts/` in order:
- `scripts/2026040501_initial_core_tables.sql`
- `scripts/2026040502_dairy_profile_bill_shares.sql`
- `scripts/2026040503_rls_and_storage.sql`
- `scripts/2026040504_relax_products_name.sql`
- `scripts/2026040701_unique_customer_phone.sql`

### 4) Run locally
```bash
npm run dev
```
Open `http://localhost:3000`.

## Ledger & balance logic (important)

We model two money flows for a customer:
- **Sales** come from `entries.total_amount` (debit)
- **Payments/advances/adjustments** come from `transactions.amount` (credit)

Balance is computed as:
\[
\text{balance} = \text{totalSales} - \text{totalPaid}
\]

In the Ledger UI:
- **Previous Balance**: balance *before* the 1st day of the current month
- **This Month Sales**: sum of entry totals within the current month
- **This Month Paid/Advance**: sum of transaction amounts within the current month
- **Net Payable (This Month)**: `previousBalance + thisMonthSales - thisMonthPaid`

Positive means **customer owes you**; negative means **you owe/hold advance** for the customer.

## Useful scripts
Create users (for local/testing):
```bash
npm run create-user demo@gmail.com 123456
npm run create-demo-user
```