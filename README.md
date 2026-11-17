# TariScan POS

**TariScan POS** is an offline-first retail point-of-sale and inventory management application in development.

The project is being built as a responsive web application that can be installed on supported devices. The planned architecture uses Next.js, TypeScript, Tailwind CSS, Supabase and browser-based local storage for offline workflows.

> **Development status:** The current dashboard is an interface preview populated with sample figures and transactions. It is not connected to a live business database. Authentication, inventory persistence, checkout, synchronisation and production offline support are still under development.

## Current technology

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- Lucide icons

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
