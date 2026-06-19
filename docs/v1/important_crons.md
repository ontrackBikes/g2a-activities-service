# Inventory & Schedule Worker Architecture

## 1. Schedule Generation Worker

**Frequency:** Every 15 minutes

### Purpose

* Check `maintain_inventory_days`
* Generate missing `vendor_schedules`
* Generate missing `vendor_schedule_slots`
* Ensure inventory is maintained for the configured period (default: **90 days**)

### Example

```
Today: 2026-06-20

Maintain Inventory: 90 Days

Existing Inventory Until:
2026-08-01

Missing Dates:
2026-08-02
...
2026-09-18

Action:
Generate all missing schedules and slots.
```

---

## 2. Schedule Slot Sync Worker

**Frequency:** Every 15 minutes

### Purpose

Keep `vendor_schedule_slots` synchronized with `vendor_product_slots`.

### Missing Slot Example

```
Template Slots:
- 09:00
- 11:00
- 13:00

Existing Schedule Slots:
- 09:00
- 11:00

Action:
+ Add 13:00
```

### Orphan Slot Example

```
Template Slots:
- 09:00
- 11:00

Existing Schedule Slots:
- 09:00
- 11:00
- 13:00

Action:
- Remove 13:00
```

---

## 3. Schedule Status Sync Worker

**Frequency:** Hourly

### Purpose

Automatically update schedule status.

### Rule

```
available = 0
↓
status = CLOSED
```

Otherwise, the schedule remains `OPEN`.

---

## 4. Schedule Price Sync Worker

**Frequency:** Every 15 minutes

### Purpose

Apply template price changes to future schedules.

### Condition

```
allow_sync_updates = TRUE
```

### Example

```
Template Price:
3500

Updated To:
4000

Action:
Update all future schedule slot prices.
```

---

## 5. Schedule Capacity Sync Worker

**Frequency:** Every 15 minutes

### Purpose

Apply template capacity updates to future schedules.

### Condition

```
allow_sync_updates = TRUE
```

---

## 6. Availability Rebuild Worker

**Frequency:** Hourly

### Purpose

Recalculate slot availability.

### Formula

```
available = capacity - booked
```

Applied to all future slots.

---

## 7. Orphan Data Worker

**Frequency:** Daily

### Checks

* Schedule slot without a schedule
* Vendor product without a vendor
* Product image without a product
* Schedule without a product

---

## 8. Inventory Integrity Worker

**Frequency:** Hourly

### Validation Rules

* `available < 0`
* `booked < 0`
* `price < 0`
* `capacity < booked`

### Action

Create a record in:

```
system_alerts
```

---

## 9. Duplicate Inventory Worker

**Frequency:** Daily

### Detect Duplicate Records

#### Schedule Level

```
vendor_product_id
schedule_date
```

#### Slot Level

```
vendor_schedule_id
vendor_product_slot_id
```

---

## 10. Schedule Gap Worker

**Frequency:** Daily

### Purpose

Verify inventory duration meets `maintain_inventory_days`.

### Example

```
Expected:
90 Days

Found:
40 Days

Action:
Generate Alert
```

---

## 11. Future Inventory Health Worker

**Frequency:** Daily

### Purpose

Check inventory coverage for the next 30 days.

### Example

```
Missing Inventory:

- July 3
- July 4
- July 5
```

Generate an alert if gaps are detected.

---

## 12. Daily Metrics Worker

**Frequency:** Daily at **1:00 AM**

### Stores

* Total Schedules
* Total Slots
* Bookings
* Revenue
* Occupancy

### Destination

```
daily_metrics
```

---

## 13. Vendor Metrics Worker

**Frequency:** Daily

### Stores

* Vendor Revenue
* Vendor Bookings
* Vendor Occupancy

---

## 14. Product Metrics Worker

**Frequency:** Daily

### Stores

* Product Revenue
* Product Bookings
* Top Products

---

# System Alerts

Possible alert types:

```
PRICE_ZERO
NEGATIVE_AVAILABILITY
MISSING_SCHEDULE
DUPLICATE_SLOT
ORPHAN_SLOT
CAPACITY_MISMATCH
BOOKING_OVERFLOW
```

---

# Redis / BullMQ Queues

```
inventory.generate
inventory.slot-sync
inventory.price-sync
inventory.capacity-sync
inventory.validate
inventory.metrics
inventory.alerts
```

---

# Worker File Structure

```text
workers/
├── scheduleGenerator.worker.js
├── scheduleSlotSync.worker.js
├── priceSync.worker.js
├── capacitySync.worker.js
├── inventoryIntegrity.worker.js
├── orphanData.worker.js
├── dailyMetrics.worker.js
└── alertWorker.js
```
