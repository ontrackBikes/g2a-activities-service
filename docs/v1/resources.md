# Go2Andaman Activities Platform - System Overview

## Vision

The goal of this platform is to create a unified inventory and booking engine capable of supporting:

* Activities
* Water Sports
* Scuba Diving
* Rentals
* Transfers
* Ferry Services
* Tours
* Experiences

through a single operational model.

The platform must support:

* Multiple vendors
* Multiple locations
* Slot-based products
* Non-slot products
* Date-wise inventory
* Dynamic pricing
* Schedule overrides
* Future vendor portal access
* High-volume inventory management

while keeping the architecture simple and understandable.

---

# Core Design Principle

The most important design decision in the system is:

> Schedules and Schedule Slots are the only entities that bookings and checkout are allowed to read from.

Products define intent.

Schedules define inventory.

Bookings consume inventory.

This separation allows product definitions to evolve without impacting bookings.

---

# Core Hierarchy

```text
ProductGroup
└── Products
    └── ProductImages

Locations
└── Locations (Self-Referencing Hierarchy)

Vendors
└── VendorProducts
    ├── Product
    ├── Location
    ├── Images
    ├── FAQs
    ├── Terms
    ├── Highlights
    ├── Inclusions
    ├── Exclusions
    ├── ThingsToKnow
    ├── ProductSlots
    │   └── ScheduleSlots
    │
    └── Schedules
        └── ScheduleSlots
```

---

# Operational Chain

```text
Vendor
    ↓

VendorProduct
    ↓

ProductSlot (Template)
    ↓

VendorSchedule (Date-wise Inventory)
    ↓

VendorScheduleSlot (Actual Bookable Inventory)
    ↓

Booking
```

---

# Product Layer

The Product Layer is the catalog layer.

Products define:

* Name
* Product Type
* Category
* Group
* Generic Product Images

Examples:

```text
DSD Boat Dive
Bike Rental
Airport Transfer
Sunset Cruise
Elephant Beach Trip
```

Products do NOT contain:

* Inventory
* Availability
* Bookings
* Capacity
* Actual Prices
* Vendor Information

Those belong to Vendor Products and Schedules.

---

# Vendor Product Layer

Vendor Products represent an actual offering by a vendor.

Example:

```text
Product:
DSD Boat Dive

Vendor:
Ocean Tribe

Location:
Havelock

↓

Vendor Product
```

A Vendor Product owns:

* Images
* FAQs
* Terms
* Highlights
* Inclusions
* Exclusions
* Things To Know
* Product Slot Templates
* Inventory Configuration

This is where operational management begins.

---

# Slot Template Layer

Vendor Product Slots act as templates.

Example:

```text
09:00 AM
11:00 AM
01:00 PM
```

Each slot defines:

* Slot Name
* Start Time
* End Time
* Default Price
* Default Capacity

These slots are never booked directly.

They are used to generate inventory.

---

# Inventory Layer

Inventory is generated as Schedules.

Example:

```text
DSD Boat Dive

2026-07-01
2026-07-02
2026-07-03
```

Each schedule represents a single date.

Schedules are automatically maintained using:

```text
maintain_inventory_days
```

configured on Vendor Product.

---

# Schedule Slot Layer

Schedule Slots are the most important inventory entity.

Example:

```text
2026-07-01

09:00 AM
11:00 AM
01:00 PM
```

Schedule Slots contain:

* Actual Price
* Actual Capacity
* Available Seats
* Booked Seats
* Status
* Sync Control

Bookings are always created against Schedule Slots.

Never against Product Slots.

---

# Slotless Products

Products without slots are supported using an implicit default slot.

Example:

```text
Bike Rental
```

System automatically creates:

```text
Default Slot
```

This allows:

* Activities
* Rentals
* Transfers
* Ferries
* Tours

to share the exact same inventory architecture.

No special code paths are required.

---

# Pricing Strategy

Prices exist at inventory level.

```text
VendorScheduleSlot.price
```

This allows:

* Date-specific pricing
* Slot-specific pricing
* Holiday pricing
* Seasonal pricing
* Manual overrides

without modifying product templates.

---

# Availability Strategy

Availability exists at inventory level.

```text
VendorScheduleSlot.capacity

VendorScheduleSlot.booked

VendorScheduleSlot.available
```

Formula:

```text
available = capacity - booked
```

Bookings reduce availability.

Sync workers rebuild availability when required.

---

# Inventory Generation Strategy

Inventory is generated automatically.

Example:

```text
Maintain Inventory Days = 90
```

Worker ensures:

```text
Today + 90 Days
```

always exists.

Missing schedules are generated automatically.

---

# Sync Philosophy

Templates define intent.

Inventory defines reality.

```text
VendorProductSlot
    ↓
Template

VendorScheduleSlot
    ↓
Actual Inventory
```

Workers synchronize template changes into inventory.

Timing, capacity/inventory, and other structural fields always sync from
the template, on every existing schedule, regardless of this flag.

Only the `price` (and, for KM_BASED products, distance-tier pricing) on a
`VendorScheduleSlot` is gated by:

```text
allow_sync_updates = TRUE
```

When `FALSE`, that slot's price is treated as a manually pinned special
price and is left untouched by sync - everything else about it still
syncs normally. A slot dropped from the template (e.g. the vendor
product's pricing type changes) is still closed regardless of this flag,
since that's a structural change, not a price change.

---

# Future Vendor Portal Support

The architecture is intentionally vendor-centric.

Future enhancements may include:

* Vendor Login
* Vendor Dashboard
* Vendor Inventory Management
* Vendor Pricing Updates
* Vendor Reports
* Vendor Booking Management

without requiring database redesign.

---

# Why This Architecture

This architecture was chosen because it provides:

* Clear separation of concerns
* Easy inventory management
* Simple booking logic
* Consistent slot handling
* Support for all activity types
* Vendor scalability
* Future marketplace support
* Reduced code complexity

Most importantly:

```text
Everything becomes inventory.

Everything becomes a schedule slot.

Everything becomes bookable through one engine.
```

This keeps the system understandable even with:

* 500+ Products
* 50+ Vendors
* Millions of Schedules
* Millions of Bookings

```
```
