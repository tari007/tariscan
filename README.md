# TariScan POS

**TariScan POS** is an offline-first retail point-of-sale and inventory management application in development.

The project is being built as a responsive web application that can be installed on supported devices. The planned architecture uses Next.js, TypeScript, Tailwind CSS, Supabase and browser-based local storage for offline workflows.

> **Development status:** Build 2 adds Supabase email/password authentication screens, owner onboarding, a business profile table with row-level security, and session-aware route protection. The dashboard still displays sample figures. Live inventory, checkout, synchronisation and production offline support are not yet implemented.

## Current technology

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- Lucide icons

## Supabase setup (Build 2)

1. Create a Supabase project.
2. In Project Settings, copy the project URL and publishable/anon key.
3. Add them as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in a local `.env.local` file and in the Vercel project environment settings.
4. Open the Supabase SQL Editor and run `supabase/migrations/202611170001_initial_business_setup.sql`.
5. In Supabase Authentication settings, configure the allowed site URL and redirect URLs for your local and deployed app domains.
6. Redeploy the app after adding environment variables.

Never put a Supabase service-role key in a `NEXT_PUBLIC_` variable or browser code. The application uses the publishable/anon key with row-level security.

## Run locally

Requirements: Node.js 20.9 or later and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

To create a production build:

```bash
npm run build
npm start
```

## Planned capabilities

- Business setup and secure staff access
- Product catalogue, barcodes and inventory control
- Point-of-sale checkout and receipts
- Sales history, refunds and shift reconciliation
- Customers, suppliers, purchases and expenses
- Business reports and analytics
- Offline transaction capture with controlled synchronisation
- Installable Progressive Web App experience
- Supabase-backed cloud data and authentication

Features will be marked as available only after their implementation and testing.

## Architecture direction

- **Web application:** Next.js and TypeScript
- **Cloud services:** Supabase (PostgreSQL, authentication and storage)
- **Hosting:** Vercel
- **Local-first data:** IndexedDB for supported offline operations
- **Synchronisation:** Explicit, conflict-aware sync when connectivity is available

Background synchronisation is not guaranteed on every mobile browser. The application will also synchronise when it is reopened or brought back into the foreground.

## Project roadmap

1. Application foundation and responsive dashboard
2. Authentication and business onboarding
3. Local database and synchronisation foundation
4. Products and inventory
5. Barcode lookup and scanning
6. Checkout, payments and receipts
7. Sales history and refunds
8. Customers, suppliers, purchases and expenses
9. Reports and analytics
10. Staff permissions and audit trail
11. PWA, backup, security and deployment
12. Testing and release preparation

## Development notes

This repository is the web application rebuild of TariScan POS. The earlier Android/Jetpack Compose project is a functional reference for workflows and feature requirements; its native Android source is not directly used by this Next.js application.

## License

A project license has not yet been selected. All rights remain with the project owner unless a license is added.


## Build 3: Offline data foundation

Build 3 adds a Dexie/IndexedDB local database for products, sales and a per-business synchronisation queue. Local repository functions save records to IndexedDB first. The sync worker verifies the signed-in owner and business before sending queued product and sale records to Supabase. Failed items remain in the queue and can be retried when connectivity returns. The dashboard shows connection and pending-sync status.

### Activate the cloud schema

Run `supabase/migrations/202611170002_offline_sync_tables.sql` in the Supabase SQL Editor after the Build 2 business migration.

### Current scope and limitations

- Product and sale records can be written through the local repository functions in `src/lib/offline/repository.ts`.
- Synchronisation is attempted when the app is opened, when the browser reports that it is online, and periodically while the app is open.
- iOS may suspend background work. Do not rely on background sync while Safari is closed.
- The dashboard is not yet a live inventory or checkout screen. Build 4 will connect the product-management interface to the local repository.
- This is an initial sync foundation. Multi-device conflict resolution, stock ledger reconciliation, and production-grade retry/backoff are future hardening tasks.
