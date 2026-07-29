# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A plain Express + Sequelize (MySQL) REST API backing the Go2Andaman activities/booking platform (activities, water sports, rentals, transfers, ferries, tours). No TypeScript, no test framework configured. Node version pinned in `.nvmrc` (20.19.0).

## Commands

```bash
npm run dev                    # API server with nodemon (NODE_ENV=development)
npm run dev:workers            # all 4 BullMQ workers concurrently (media, cleanup, schedule, settlement)
npm run dev:media               # just the media-processing worker
npm run dev:media-cleanup       # just the media-cleanup worker
npm run dev:vendor-schedule     # just the vendor-schedule worker
npm run dev:payment-settlement  # just the payment-settlement worker
```

There is no lint script, no test script/framework, and no build step — this is a plain CommonJS Node app run directly.

Production process management is via PM2 (`ecosystem.config.js` defines 5 apps: the API server plus the 4 workers): `npm run pm2:start[:staging|:prod]`, `pm2:restart`, `pm2:stop`, `pm2:logs`, `pm2:status`.

Requires a running MySQL instance (config in `config/sequelize.js`, env-driven) and Redis (`REDIS_URL`, used by BullMQ). Sequelize `sync({ alter: true })` in `server.js` bootstrap is intentionally commented out — schema changes are applied out-of-band (no migrations directory in this repo), not via Sequelize sync.

## Architecture

### Layering

Standard `routes/ -> controllers/ -> services/ -> models/` with Joi validation in `schemas/`. Every domain (product, vendor, location, media, booking-*, order, ...) gets its own route file mounted under `/api/v1` in `routes/index.js`, plus one legacy route (`bikeRentals.routes.js`) mounted directly at `/api` in `server.js` for backwards compatibility.

Controllers are plain functions (no classes), each wrapped in try/catch, always returning `{ success, message, data }` JSON shapes with explicit status codes. `services/error.service.js#parseError` centralizes Sequelize error → HTTP status/message mapping (unique constraint, validation, FK constraint) but is not used everywhere — many controllers still hand-roll their own error responses inline.

Soft-delete convention: normal `DELETE` routes flip `active: false`, never destroy rows. A separate `.../:id/permanent` route does real hard deletion — see `permanentlyDeleteProduct` in `controllers/product.controller.js` for the pattern (wrapped in a `sequelize.transaction` with row locks, cascades manually through every dependent child table, blocks deletion if orders/bookings reference the row). Permanent-delete endpoints are gated by `authorizePermanentDelete`, which checks `Authorization: Bearer <PERMANENT_DELETE_TOKEN>` against an env var — not the JWT auth middleware.

`middlewares/auth.middleware.js#validateUser` currently short-circuits with an early `return next()` before its real JWT check — auth is effectively disabled repo-wide right now. Don't assume routes using it are actually protected; check for this before relying on `req.user`.

### Core domain model (read `docs/v1/resources.md` for the full narrative)

The central design rule: **bookings only ever read/write `VendorSchedule` / `VendorScheduleSlot` — never `Product` or `VendorProductSlot` directly.** Products define catalog intent; schedules define actual date-wise inventory.

```
ProductGroup -> Product -> ProductImage
Category -> ProductType -> Product
Location (self-referencing parent/child hierarchy)

Vendor -> VendorProduct (the actual bookable offering: vendor + product + location)
  ├─ VendorProductImage/Faq/Term/Highlight/Inclusion/Exclusion/ThingToKnow
  ├─ VendorProductSlot        (template: e.g. "09:00", "11:00", default price/capacity)
  └─ VendorSchedule           (one row per date, generated from templates)
        └─ VendorScheduleSlot (actual bookable inventory: price, capacity, booked, available)
```

`VendorScheduleSlot` is what bookings decrement (`available = capacity - booked`). Products without explicit time slots (bike rentals, transfers) get an implicit "Default" slot created automatically (`pricing_type !== "SLOT"` branch in `services/vendorScheduleMaintenance.service.js`) so the whole platform shares one inventory model instead of special-casing slotless products.

Inventory generation/sync ("maintain_inventory_days" rolling window, template→schedule propagation) is handled by `services/vendorScheduleMaintenance.service.js`, invoked both on a cron (`crons/vendorSchedule/vendorSchedule.cron.js`, daily at 02:00/14:00 `APP_TIMEZONE`, plus once at boot) and via the `vendor-schedule` BullMQ queue/worker for per-vendor-product runs. Note: `docs/v1/important_crons.md` describes a much larger, more granular multi-worker architecture (separate generate/sync/validate/metrics/alert workers running every 15 min) — that is a design/target document, not the current implementation. The actual code consolidates all of that into the single `vendorScheduleMaintenance` service/worker; don't assume the other named workers in that doc exist.

Availability/pricing lookups for the customer-facing app (`getProductsListForApp`, `getProductDetailsForApp`, etc. in `controllers/product.controller.js`) go through `services/availableVendor.service.js` and `services/nextAvailableSlot.service.js`, and the booking-quote logic lives under `services/availability/` (`singleDate.service.js`, `dateRange.service.js`, `airportTransfer.service.js`, `buildBookingQuote.js`, `availableDates.service.js` — dispatched based on `Product.booking_mode`: `single_date` / `date_range` / `open`).

### Background jobs

Each job type follows the same 3-file pattern: `constants/queues.js` (queue name) + `constants/jobNames.js` (job name for logging) + `queues/<domain>/<name>.queue.js` (BullMQ `Queue` + shared IORedis connection) + `workers/<domain>/<name>.worker.js` (BullMQ `Worker`, wraps the handler in `services/jobExecutor.service.js` for timing/logging, graceful SIGINT/SIGTERM shutdown). The thin `workers/<name>.js` files at the top level (e.g. `workers/media-processing.js`) are just PM2/npm-script entry points that `require()` the real worker in the subfolder.

Four job domains: media processing (image variants via `sharp`), media cleanup (orphaned upload cleanup), vendor schedule maintenance (inventory generation described above), payment settlement (`services/paymentSettlement.service.js` — locks a `Payment` row with `settlement_status`, confirms/settles bookings, sends Postmark emails via `emailTemplates` constants).

### Payments

Razorpay integration: `routes/razorpay.routes.js` (webhook + order endpoints) → `controllers/webhook.controller.js` / `services/razorpay.service.js`. Webhook signature verification uses `RAZORPAY_WEBHOOK_SECRET`. Settlement (marking bookings paid, decrementing inventory, emailing confirmations) is deliberately queued through BullMQ (`payment-settlement` queue) rather than done synchronously in the webhook handler.

### Conventions worth knowing before editing

- Sequelize models use `underscored: true` globally (`config/sequelize.js`) — DB columns are snake_case, JS attributes stay camelCase-free/snake_case too (e.g. `product_type_id`, not `productTypeId`).
- Model associations are centralized in `models/index.js`, not declared inside individual model files — always check there for the full association graph before adding a new relation.
- Joi schemas in `schemas/` are the only request validation layer; there's no global validation middleware, each controller calls `schema.validate()` manually at the top of the handler.
- `.postman/`, `postman/`, and `Activities.postman_collection.json` hold API request collections/environments used for manual testing — check there for real example payloads before guessing a request shape.
