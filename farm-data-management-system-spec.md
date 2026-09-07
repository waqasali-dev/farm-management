# Farm Data Management System — Full-Stack AI Agent Specification

## 1. Project Objective

Build a production-quality farm data management system as a full-stack web application.

The system manages farm operations by **flock**. A flock is a new batch of birds raised together. Every flock must have a unique immutable database ID, and every flock-specific record must reference that flock.

The application must provide:

- Flock management
- Daily farm records
- Bird/mortality tracking
- Feed tracking
- Egg production and inventory tracking for applicable flocks
- Egg usage tracking
- Diesel inventory tracking
- Weight and uniformity tracking
- Medicine/water tracking
- Vaccination tracking
- Weather/light tracking
- Dashboard
- Historical flock views
- Reports
- Data validation
- Audit-friendly calculations
- Strict flock-level data isolation

The visual theme must be **black and white only**:

- Primary: black
- Background: white
- Text: black
- Borders: black/gray only
- No colorful gradients
- No colored status badges
- No decorative colors
- Charts must also remain monochrome
- Use grayscale only where necessary for disabled/secondary UI

The application should look modern, professional, dense but readable, and operational rather than flashy.

---

# 2. Recommended Stack

Use this stack unless the existing repository requires an equivalent:

## Frontend

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- React Hook Form
- Zod
- Tailwind CSS
- shadcn/ui or equivalent accessible component primitives
- Recharts for charts
- date-fns for date calculations

## Backend

- Node.js
- TypeScript
- Fastify
- Zod
- Drizzle ORM
- PostgreSQL
- JWT/session-based authentication if authentication is required by the existing project

## Infrastructure

- Docker
- Docker Compose
- PostgreSQL
- `.env` configuration
- Separate frontend/backend environment configuration

Do not introduce unnecessary libraries.

---

# 3. Monorepo Structure

Use this structure:

```text
farm-management/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   ├── public/
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── ...
│   │
│   └── api/
│       ├── src/
│       ├── package.json
│       ├── tsconfig.json
│       └── ...
│
├── packages/
│   ├── shared/
│   │   ├── src/
│   │   │   ├── schemas/
│   │   │   ├── types/
│   │   │   ├── constants/
│   │   │   └── calculations/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── config/
│       └── ...
│
├── database/
│   ├── migrations/
│   ├── seed/
│   └── README.md
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   └── calculations.md
│
├── docker/
│   └── ...
│
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── .env.example
├── .gitignore
├── README.md
└── AGENTS.md
```

Use pnpm workspaces.

---

# 4. Frontend Structure

```text
apps/web/src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   ├── providers.tsx
│   └── query-client.ts
│
├── assets/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── forms/
│   ├── tables/
│   ├── charts/
│   ├── cards/
│   ├── dialogs/
│   └── feedback/
│
├── features/
│   ├── dashboard/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api.ts
│   │   └── types.ts
│   │
│   ├── flocks/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api.ts
│   │   ├── schemas.ts
│   │   └── types.ts
│   │
│   ├── daily-record/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api.ts
│   │   ├── schemas.ts
│   │   └── types.ts
│   │
│   ├── birds/
│   ├── feed/
│   ├── eggs/
│   ├── egg-usage/
│   ├── diesel/
│   ├── weight/
│   ├── medicine/
│   ├── vaccinations/
│   └── reports/
│
├── hooks/
├── lib/
│   ├── api-client.ts
│   ├── query-keys.ts
│   ├── formatters.ts
│   └── utils.ts
│
├── pages/
│   ├── DashboardPage.tsx
│   ├── DailyRecordPage.tsx
│   ├── FlocksPage.tsx
│   ├── FlockDetailsPage.tsx
│   ├── ReportsPage.tsx
│   └── SettingsPage.tsx
│
├── styles/
│   └── globals.css
│
├── types/
└── main.tsx
```

---

# 5. Backend Structure

```text
apps/api/src/
├── app.ts
├── server.ts
│
├── config/
│   ├── env.ts
│   └── constants.ts
│
├── db/
│   ├── client.ts
│   ├── schema/
│   │   ├── farms.ts
│   │   ├── flocks.ts
│   │   ├── bird-daily-records.ts
│   │   ├── feed-daily-records.ts
│   │   ├── egg-daily-records.ts
│   │   ├── egg-usage-records.ts
│   │   ├── diesel-daily-records.ts
│   │   ├── weight-records.ts
│   │   ├── medicine-daily-records.ts
│   │   ├── medicine-entries.ts
│   │   ├── medicines.ts
│   │   ├── vaccination-records.ts
│   │   └── index.ts
│   └── seed.ts
│
├── modules/
│   ├── farms/
│   │   ├── routes.ts
│   │   ├── service.ts
│   │   ├── repository.ts
│   │   └── schemas.ts
│   │
│   ├── flocks/
│   ├── dashboard/
│   ├── daily-records/
│   ├── birds/
│   ├── feed/
│   ├── eggs/
│   ├── egg-usage/
│   ├── diesel/
│   ├── weight/
│   ├── medicine/
│   ├── vaccinations/
│   └── reports/
│
├── calculations/
│   ├── birds.ts
│   ├── feed.ts
│   ├── eggs.ts
│   ├── diesel.ts
│   ├── weight.ts
│   └── water.ts
│
├── middleware/
│   ├── error-handler.ts
│   ├── request-id.ts
│   └── auth.ts
│
├── plugins/
│   ├── cors.ts
│   └── swagger.ts
│
├── utils/
│   ├── dates.ts
│   ├── units.ts
│   └── pagination.ts
│
└── types/
```

---

# 6. Flock Model

A flock is the central business entity.

Table:

```text
flocks
------
id UUID PRIMARY KEY
farm_id UUID NOT NULL
flock_code VARCHAR NOT NULL UNIQUE PER FARM
name VARCHAR NULL
start_date DATE NOT NULL
initial_birds INTEGER NOT NULL
egg_tracking_enabled BOOLEAN NOT NULL DEFAULT false
status ENUM(active, closed) NOT NULL DEFAULT active
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
closed_at TIMESTAMP NULL
```

Rules:

1. `id` must be UUID.
2. `flock_code` is human-readable, e.g. `FL-001`.
3. The application automatically generates `flock_code`.
4. Never use `flock_code` as the database foreign key.
5. `id` is immutable.
6. A flock belongs to exactly one farm.
7. A flock may be active or closed.
8. Closed flocks should be read-only by default.
9. A new flock starts with zero historical operational records.
10. Do not carry inventory from another flock automatically.
11. Inventory transfer, if added later, must be explicit and auditable.

---

# 7. Flock Isolation Rule

This is a hard requirement.

Every flock-specific table must contain:

```text
flock_id UUID NOT NULL REFERENCES flocks(id)
```

Never query flock-specific data without filtering by `flock_id`.

Bad:

```ts
db.select().from(feedRecords)
```

Good:

```ts
db
  .select()
  .from(feedRecords)
  .where(eq(feedRecords.flockId, flockId))
```

The backend must validate that the requested flock exists and belongs to the current farm/user.

Never trust a `flock_id` sent by the frontend without authorization validation.

---

# 8. Database Tables

## farms

```text
id
name
created_at
updated_at
```

## flocks

```text
id
farm_id
flock_code
name
start_date
initial_birds
egg_tracking_enabled
status
created_at
updated_at
closed_at
```

## bird_daily_records

```text
id
farm_id
flock_id
date
mortality
light_hours nullable
max_temperature nullable
min_temperature nullable
created_at
updated_at
```

Unique:

```text
(flock_id, date)
```

## feed_daily_records

```text
id
farm_id
flock_id
date
arrival_bags
used_bags
created_at
updated_at
```

Unique:

```text
(flock_id, date)
```

The canonical inventory unit should be kilograms internally.

One bag:

```text
50 kg = 50,000 grams
```

## egg_daily_records

Only permitted if:

```text
flocks.egg_tracking_enabled = true
```

Fields:

```text
id
farm_id
flock_id
date
production_peti
production_trays
sold_peti
sold_trays
created_at
updated_at
```

Unique:

```text
(flock_id, date)
```

## egg_usage_records

```text
id
farm_id
flock_id
date
type
peti
trays
created_at
updated_at
```

Allowed types:

```text
gift-use
conveyor-waste
mess-use
store-waste
```

Multiple usage records per day are allowed.

## diesel_daily_records

```text
id
farm_id
flock_id
date
arrival_liters
used_liters
created_at
updated_at
```

Unique:

```text
(flock_id, date)
```

## weight_records

```text
id
farm_id
flock_id
date
weight
uniformity
created_at
updated_at
```

Multiple weight records per day may be supported if required. If only one is desired, enforce:

```text
(flock_id, date)
```

## medicines

```text
id
farm_id
name
active
created_at
updated_at
```

## medicine_daily_records

```text
id
farm_id
flock_id
date
type
water_liters
created_at
updated_at
```

Unique:

```text
(flock_id, date)
```

Allowed type:

```text
water
medicine
```

## medicine_entries

```text
id
daily_record_id
medicine_id
```

This allows unlimited medicines on one day.

## vaccination_records

```text
id
farm_id
flock_id
date
vaccine_name
notes nullable
created_at
updated_at
```

---

# 9. Daily Record Concept

The UI should provide one unified daily entry screen.

However, do not create one giant database table containing every field.

The frontend combines multiple domain records into one workflow.

Example:

```text
Daily Record
07-Sep-2026
Flock FL-002

Birds
Feed
Eggs
Egg Usage
Diesel
Weather
Weight
Medicine
Vaccines
```

Each section persists to its appropriate backend table.

Use React Hook Form for each section or a coordinated parent form.

---

# 10. Bird Calculations

Initial birds:

```text
flock.initial_birds
```

Today's mortality:

```text
today_mortality
```

Remaining birds:

```text
remaining_birds =
    initial_birds - cumulative_mortality
```

Cumulative mortality:

```text
cumulative_mortality =
    SUM(mortality for flock through selected date)
```

Mortality percentage:

```text
mortality_percentage =
    cumulative_mortality / initial_birds * 100
```

Never calculate remaining birds from today's mortality alone.

Example:

```text
Initial: 99,000

Day 1 mortality: 25
Remaining: 98,975

Day 2 mortality: 18
Remaining: 98,957
```

---

# 11. Feed Calculations

One bag:

```text
50 kg
```

Arrival:

```text
arrival_bags
```

Used:

```text
used_bags
```

Daily feed usage:

```text
used_kg = used_bags * 50
```

Total feed received:

```text
total_received_kg =
    SUM(arrival_bags * 50)
```

Remaining feed:

```text
remaining_kg =
    SUM(arrival_bags * 50)
    -
    SUM(used_bags * 50)
```

Display remaining bags as:

```text
remaining_bags = remaining_kg / 50
```

Feed consumption per bird:

```text
feed_consumption_g_per_bird =
    used_bags * 50,000 / remaining_birds
```

Do not store calculated feed consumption as the source of truth.

---

# 12. Egg Unit System

Canonical internal unit:

```text
EGG
```

Conversions:

```text
1 tray = 30 eggs
1 peti = 12 trays
1 peti = 360 eggs
```

Conversion:

```ts
petiToEggs(peti, trays) =
    peti * 360 + trays * 30
```

Eggs back to peti/trays:

```ts
eggsToPetiTrays(eggs):
    peti = floor(eggs / 360)
    remainingEggs = eggs % 360
    trays = floor(remainingEggs / 30)
    looseEggs = remainingEggs % 30
```

If the business requires only complete trays, reject values that produce loose eggs.

For normal inventory:

```text
total_eggs =
    previous_stock_eggs
    + today's_production_eggs
    - today's_sold_eggs
    - today's_usage_eggs
```

Display:

```text
peti + trays
```

Example:

```text
12 peti + 7 trays
=
12 * 12 + 7
=
151 trays
```

Never perform inventory arithmetic directly in peti.

---

# 13. Egg Production Percentage

Today's production:

```text
production_eggs =
    production_peti * 360
    +
    production_trays * 30
```

Production percentage:

```text
production_percentage =
    production_eggs / remaining_birds * 100
```

Example:

```text
275 peti + 4 trays

275 * 360 + 4 * 30
=
99,120 eggs
```

If remaining birds = 98,500:

```text
99,120 / 98,500 * 100
=
100.63%
```

---

# 14. Egg Usage

Allowed types:

```text
GIFT_USE
CONVEYOR_WASTE
MESS_USE
STORE_WASTE
```

Each usage record contains:

```text
peti
trays
```

Convert to eggs:

```text
usage_eggs =
    peti * 360
    +
    trays * 30
```

Daily total usage:

```text
SUM(all usage records for flock/date)
```

Remaining egg inventory:

```text
previous_stock
+
production
-
sales
-
usage
```

Prevent negative stock unless an explicit administrative override is implemented.

---

# 15. Diesel Calculations

Canonical unit:

```text
liters
```

Remaining diesel:

```text
previous_remaining
+
arrival_liters
-
used_liters
```

Alternatively derive it from transaction history:

```text
remaining =
    SUM(arrivals)
    -
    SUM(usage)
```

The second approach is preferred for auditability.

Prevent negative inventory.

---

# 16. Weight Week/Day Calculation

The flock's `start_date` is the reference date.

The application must calculate age automatically.

Business convention:

```text
Sunday = Day 00
Monday = Day 01
Tuesday = Day 02
Wednesday = Day 03
Thursday = Day 04
Friday = Day 05
Saturday = Day 06
```

Do not blindly use ISO calendar week numbers.

Implement a dedicated function:

```ts
calculateBirdAge(date, flockStartDate)
```

Return:

```ts
{
  week: number,
  day: number,
  totalDays: number
}
```

The exact week rollover must be tested against the farm's convention.

Do not hardcode examples into the application.

---

# 17. Weight Data

Inputs:

```text
date
weight
uniformity
```

Calculated:

```text
week
day
```

Weight and uniformity must be numeric and validated.

Suggested ranges:

```text
weight > 0
uniformity >= 0
uniformity <= 100
```

---

# 18. Medicine System

Medicine daily type:

```text
WATER
MEDICINE
```

Water:

```text
water_liters
```

Water per bird:

```text
water_per_bird_ml =
    water_liters * 1000 / remaining_birds
```

Do not store this calculated value as authoritative data.

A medicine day may have:

```text
Medicine A
Medicine B
Medicine C
```

There must be no hardcoded maximum of three medicines.

Medicine entries reference the medicine master table.

---

# 19. Vaccines

Vaccines are optional.

A day may contain zero or more vaccination records.

Minimum fields:

```text
date
vaccine_name
notes
```

Design it so more fields can later be added.

---

# 20. Dashboard

The dashboard must have a prominent flock selector.

Example:

```text
┌──────────────────────────────────────────────────────┐
│ FARM DASHBOARD                                       │
│                                                      │
│ Flock: [ FL-002 — 85,000 birds ▼ ]  [+ New Flock]  │
└──────────────────────────────────────────────────────┘
```

When the flock changes, all dashboard data must change.

Dashboard sections:

```text
Birds
Feed
Eggs
Egg Usage
Diesel
Weather
Weight
Medicine
Vaccination
```

Hide Egg/Egg Usage cards when:

```text
egg_tracking_enabled = false
```

---

# 21. Dashboard KPI Cards

Birds:

```text
Remaining Birds
Today's Mortality
Cumulative Mortality
Mortality %
```

Feed:

```text
Today's Arrival
Today's Usage
Remaining
g/bird
Total Received
```

Eggs:

```text
Today's Production
Today's Sales
Today's Usage
Remaining Stock
Production %
```

Diesel:

```text
Today's Arrival
Today's Usage
Remaining
```

Weight:

```text
Current Week
Current Day
Latest Weight
Latest Uniformity
```

Medicine:

```text
Water Today
Water/bird
Medicine Given
Vaccines
```

Weather:

```text
Max Temperature
Min Temperature
Light Hours
```

---

# 22. Dashboard Date Selector

The dashboard should support:

```text
Today
Previous Day
Specific Date
```

The calculations must be based on the selected date.

For a historical date, never use current flock state.

Example:

```text
Dashboard
Flock: FL-001
Date: 15-Jun-2026
```

must show the state as it existed on 15-Jun-2026.

---

# 23. Flock Management UI

Page:

```text
/Flocks
```

Table:

```text
Flock ID
Name
Start Date
Initial Birds
Current Birds
Egg Tracking
Status
Actions
```

Actions:

```text
View
Close
```

Active flock:

```text
View
```

Closed flock:

```text
View
Reopen (admin only, if implemented)
```

---

# 24. Create Flock Modal

Fields:

```text
Start Date
Initial Birds
Name optional
Egg Tracking Enabled
```

Automatically generate:

```text
FL-001
FL-002
FL-003
...
```

Do not let the user manually choose the code.

Validate:

```text
initial_birds > 0
start_date valid
```

If creating an egg-producing flock:

```text
egg_tracking_enabled = true
```

For young/non-egg-producing birds:

```text
egg_tracking_enabled = false
```

---

# 25. API Design

Base:

```text
/api/v1
```

## Flocks

```http
GET    /flocks
POST   /flocks
GET    /flocks/:flockId
PATCH  /flocks/:flockId
POST   /flocks/:flockId/close
```

## Dashboard

```http
GET /flocks/:flockId/dashboard?date=YYYY-MM-DD
```

## Birds

```http
GET   /flocks/:flockId/birds/daily
GET   /flocks/:flockId/birds/daily/:date
POST  /flocks/:flockId/birds/daily
PATCH /flocks/:flockId/birds/daily/:date
```

## Feed

```http
GET   /flocks/:flockId/feed
POST  /flocks/:flockId/feed
PATCH /flocks/:flockId/feed/:date
```

## Eggs

```http
GET   /flocks/:flockId/eggs
POST  /flocks/:flockId/eggs
PATCH /flocks/:flockId/eggs/:date
```

## Egg Usage

```http
GET  /flocks/:flockId/egg-usage
POST /flocks/:flockId/egg-usage
DELETE /flocks/:flockId/egg-usage/:id
```

## Diesel

```http
GET   /flocks/:flockId/diesel
POST  /flocks/:flockId/diesel
PATCH /flocks/:flockId/diesel/:date
```

## Weight

```http
GET  /flocks/:flockId/weights
POST /flocks/:flockId/weights
PATCH /flocks/:flockId/weights/:id
```

## Medicine

```http
GET  /flocks/:flockId/medicine
POST /flocks/:flockId/medicine
PATCH /flocks/:flockId/medicine/:date
```

## Vaccinations

```http
GET  /flocks/:flockId/vaccinations
POST /flocks/:flockId/vaccinations
DELETE /flocks/:flockId/vaccinations/:id
```

## Reports

```http
GET /flocks/:flockId/reports/summary
GET /flocks/:flockId/reports/feed
GET /flocks/:flockId/reports/eggs
GET /flocks/:flockId/reports/mortality
GET /flocks/:flockId/reports/weight
GET /flocks/:flockId/reports/diesel
```

---

# 26. API Response Format

Use a consistent format.

Success:

```json
{
  "data": {},
  "error": null
}
```

Error:

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Initial birds must be greater than zero",
    "details": []
  }
}
```

Use proper HTTP status codes.

---

# 27. Validation

Validate on both frontend and backend.

Never rely only on frontend validation.

Examples:

```text
mortality >= 0
arrival_bags >= 0
used_bags >= 0
water_liters >= 0
diesel arrival >= 0
diesel use >= 0
weight > 0
uniformity between 0 and 100
temperature numeric
peti >= 0
trays >= 0
```

Also validate business rules:

```text
mortality cannot exceed remaining birds
egg sales cannot exceed available egg stock
egg usage cannot exceed available egg stock
diesel use cannot exceed available diesel
feed usage cannot exceed available feed
```

---

# 28. Transaction Safety

When saving a daily record containing multiple sections, use database transactions where multiple writes must succeed together.

Example:

```text
Save Daily Record
    ↓
BEGIN TRANSACTION
    ↓
Bird record
Feed record
Egg record
Egg usage
Diesel record
Medicine record
Weight record
    ↓
COMMIT
```

If one critical write fails:

```text
ROLLBACK
```

Do not leave half a day's data saved.

---

# 29. Race Conditions

Inventory operations must be protected against concurrent writes.

Use database transactions and appropriate locking/atomic updates when necessary.

The system must not allow:

```text
User A sells 100 trays
User B sells 100 trays
Available = 150 trays
```

to result in:

```text
-50 trays
```

because both requests read the same old stock.

---

# 30. Frontend State

Use TanStack Query for server state.

Do not put all database records into a giant global Zustand/Redux store.

Use:

```text
TanStack Query
    ↓
API
    ↓
PostgreSQL
```

Local UI state should remain local.

Persist the selected flock ID in the URL where practical:

```text
/dashboard?flock=UUID&date=2026-09-07
```

This makes pages shareable and browser navigation reliable.

---

# 31. Query Keys

Use structured query keys:

```ts
['flocks']

['flock', flockId]

['dashboard', flockId, date]

['birds', flockId, date]

['feed', flockId, date]

['eggs', flockId, date]

['egg-usage', flockId, date]

['diesel', flockId, date]

['weight', flockId]

['medicine', flockId, date]

['vaccinations', flockId]
```

Invalidate only affected queries after mutations.

---

# 32. UI Design

Theme:

```text
BLACK + WHITE
```

Primary black:

```text
#000000
```

Background:

```text
#FFFFFF
```

Use grayscale only for secondary states.

Avoid:

```text
blue
green
red
purple
orange
gradient backgrounds
```

Do not use colored success/error badges.

Instead:

```text
Success → black outlined/filled treatment
Error → black outlined treatment + clear text
Warning → black outlined treatment
```

The meaning must never depend solely on color.

---

# 33. Typography

Use a clean sans-serif font.

Suggested:

```text
Inter
```

Hierarchy:

```text
Page title: bold
Section title: semibold
KPI number: bold
Labels: medium
Metadata: regular
```

Do not overuse giant typography.

This is an operational dashboard.

---

# 34. Layout

Desktop-first but responsive.

Desktop:

```text
Sidebar
    +
Main Content
```

Suggested:

```text
┌─────────────┬─────────────────────────────────────┐
│             │ Header                              │
│  Sidebar    ├─────────────────────────────────────┤
│             │                                     │
│ Dashboard   │ Dashboard                           │
│ Daily       │                                     │
│ Flocks      │ KPI cards                           │
│ Reports     │                                     │
│ Settings    │ Tables / charts                     │
│             │                                     │
└─────────────┴─────────────────────────────────────┘
```

Mobile should collapse the sidebar.

---

# 35. Dashboard Visual Language

Use:

- thin borders
- rectangular cards
- subtle shadows only if needed
- black buttons
- white backgrounds
- black text
- compact data tables
- clear spacing
- monochrome charts

Do not make it look like a generic SaaS landing page.

It should look like a serious agricultural operations control panel.

---

# 36. Daily Record UX

The daily record page should have sections:

```text
Date + Flock
↓
Birds
↓
Feed
↓
Egg Production
↓
Egg Usage
↓
Diesel
↓
Weather
↓
Weight
↓
Medicine
↓
Vaccines
```

Each section shows:

```text
Input
↓
Live calculated values
```

Example:

```text
FEED

Arrival Bags     [ 20 ]
Used Bags        [ 18 ]

Today's Usage    900 kg
Remaining        4,250 kg
Remaining Bags   85
Consumption      9.17 g/bird
```

Calculated fields must be visibly read-only.

---

# 37. Auto-Calculated Fields

Never let users manually edit:

```text
remaining_birds
cumulative_mortality
mortality_percentage

remaining_feed
total_feed_received
feed_consumption_per_bird

previous_egg_stock
remaining_egg_stock
production_percentage

remaining_diesel

week
day

water_per_bird
```

These should be displayed as read-only values.

---

# 38. Historical Data

All daily records must be editable according to permission.

When an old record is changed, all downstream calculations must update.

Example:

```text
01 Sep mortality = 20
02 Sep mortality = 30
03 Sep mortality = 15
```

If 01 Sep changes to 40:

```text
02 Sep remaining birds changes
03 Sep remaining birds changes
all affected percentages change
feed g/bird changes
water/bird changes
production % changes
```

Do not persist stale calculated snapshots as authoritative data.

---

# 39. Calculation Layer

Put pure calculations in:

```text
packages/shared/src/calculations/
```

Functions:

```ts
calculateRemainingBirds()
calculateCumulativeMortality()
calculateMortalityPercentage()

calculateFeedUsageKg()
calculateFeedRemainingKg()
calculateFeedConsumptionPerBird()

petiTraysToEggs()
eggsToPetiTrays()
calculateEggProduction()
calculateEggStock()
calculateProductionPercentage()

calculateDieselRemaining()

calculateBirdAge()

calculateWaterPerBird()
```

These functions must:

- be pure
- have no database access
- have no React dependencies
- have deterministic output
- have unit tests

Use the same calculation package in frontend and backend where practical.

---

# 40. Precision

Avoid floating-point errors for inventory.

For eggs:

```text
integer eggs
```

For birds:

```text
integer
```

For feed:

prefer integer grams or decimal kilograms.

For diesel:

use PostgreSQL `numeric`.

For weight:

use PostgreSQL `numeric`.

For percentages:

use decimal/numeric and format only at the UI layer.

Do not store formatted strings such as:

```text
"10.25 g/bird"
```

Store numeric values.

---

# 41. Date Handling

Store dates appropriately.

Daily records represent farm-local calendar dates.

Use:

```text
DATE
```

for daily operational records instead of timestamps when time-of-day is irrelevant.

Use timestamps for:

```text
created_at
updated_at
```

The API should accept:

```text
YYYY-MM-DD
```

for daily record dates.

Do not introduce timezone bugs by converting operational dates unnecessarily to UTC timestamps.

---

# 42. Error Handling

Frontend must show clear errors:

```text
Unable to save today's feed record.
Please correct the highlighted fields.
```

Backend errors must be structured.

Never expose raw PostgreSQL errors to users.

Log technical details server-side.

---

# 43. Loading States

Every API-backed screen needs:

```text
loading state
empty state
error state
success state
```

Avoid blank screens while loading.

Use skeletons for dashboards/tables where appropriate.

---

# 44. Empty States

Example:

```text
No weight records yet.

Add the first weight record for FL-002.
[ Add Weight ]
```

For egg-disabled flocks:

```text
Egg tracking is disabled for this flock.
```

Do not show empty egg forms for those flocks.

---

# 45. Reports

Reports should include:

## Bird report

```text
Date
Mortality
Cumulative Mortality
Remaining Birds
Mortality %
```

## Feed report

```text
Date
Arrival
Used
Remaining
g/bird
Total Received
```

## Egg report

```text
Date
Production
Sales
Usage
Remaining
Production %
```

## Weight report

```text
Date
Week
Day
Weight
Uniformity
```

## Diesel report

```text
Date
Arrival
Usage
Remaining
```

## Medicine report

```text
Date
Type
Medicines
Water
Water/bird
Vaccines
```

---

# 46. Charts

Use monochrome charts.

Recommended:

Birds:

```text
Remaining birds over time
Cumulative mortality over time
```

Feed:

```text
Feed consumption/bird
Feed usage over time
```

Eggs:

```text
Production %
Egg production
Egg stock
```

Weight:

```text
Weight progression
Uniformity progression
```

Diesel:

```text
Usage over time
```

Do not make charts unnecessarily complicated.

---

# 47. Authentication

If the application is multi-user:

```text
users
farms
farm_members
```

A user may belong to one or more farms.

Every request must resolve:

```text
authenticated user
    ↓
farm
    ↓
flock
```

Never trust a farm ID or flock ID from the browser without authorization checks.

If authentication is not currently required, keep the architecture ready for it rather than hardcoding security assumptions into the UI.

---

# 48. Security

Implement:

- input validation
- SQL parameterization through Drizzle
- authorization checks
- CORS configuration
- secure cookies/tokens if authentication is used
- rate limiting where appropriate
- no secrets in source code
- no database credentials in frontend
- sanitized error messages

The frontend must never receive:

```text
DATABASE_URL
JWT_SECRET
other server secrets
```

---

# 49. Environment Variables

Root `.env.example`:

```env
NODE_ENV=development

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/farm_management

API_PORT=4000
API_HOST=0.0.0.0

CORS_ORIGIN=http://localhost:5173

# Authentication
AUTH_SECRET=replace-with-a-long-random-secret

# Frontend
VITE_API_URL=http://localhost:4000/api/v1
```

Backend `.env`:

```env
NODE_ENV=development

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/farm_management

API_PORT=4000
API_HOST=0.0.0.0

CORS_ORIGIN=http://localhost:5173

AUTH_SECRET=replace-with-a-long-random-secret
```

Frontend `.env`:

```env
VITE_API_URL=http://localhost:4000/api/v1
```

Never put server-only secrets in `VITE_*` variables.

Commit only:

```text
.env.example
```

Never commit:

```text
.env
```

---

# 50. Docker Compose

Provide:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: farm_management
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

The API and web applications may be run locally during development or added as Docker services later.

---

# 51. Package Scripts

Root:

```json
{
  "scripts": {
    "dev": "pnpm --parallel --filter web --filter api dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "db:generate": "pnpm --filter api db:generate",
    "db:migrate": "pnpm --filter api db:migrate",
    "db:seed": "pnpm --filter api db:seed"
  }
}
```

Adjust scripts to the actual package manager/tooling implementation.

---

# 52. Database Migration Rules

Use migrations.

Never manually modify production schema without a migration.

Every schema change must create a migration.

Seed data should include:

```text
one demo farm
two demo flocks
one egg-enabled flock
one egg-disabled flock
sample medicines
sample daily records
```

Seed data must clearly be demo data.

---

# 53. Testing

Create unit tests for every calculation.

Minimum tests:

```text
bird calculations
feed calculations
egg conversions
egg stock
production percentage
diesel calculations
bird age
water/bird
```

Example egg test:

```text
12 peti + 7 trays
=
151 trays
=
4,530 eggs
```

Example:

```text
43 trays
=
3 peti + 7 trays
```

Test boundary cases:

```text
0
1
11
12
13
359
360
361
```

Also test negative inventory prevention.

---

# 54. API Integration Tests

Test:

```text
create flock
create daily record
retrieve daily record
update daily record
retrieve dashboard
switch flock
close flock
prevent writing to closed flock
prevent cross-flock access
```

Critical test:

```text
Flock A data must never appear in Flock B responses.
```

---

# 55. Frontend Tests

Test:

```text
flock selector
new flock modal
daily record calculations
conditional egg UI
form validation
dashboard date switching
historical record loading
```

---

# 56. Accessibility

Use semantic HTML.

Forms must have labels.

Buttons must have accessible names.

Keyboard navigation must work.

Dialogs must trap focus appropriately.

Do not use color as the only way to communicate state.

---

# 57. URL Routing

Use:

```text
/dashboard
/flocks
/flocks/:flockId
/flocks/:flockId/daily
/flocks/:flockId/reports
/settings
```

Prefer the flock ID in the route for flock-specific pages.

Example:

```text
/flocks/7d8c.../daily?date=2026-09-07
```

The dashboard may also use:

```text
/dashboard?flock=7d8c...&date=2026-09-07
```

---

# 58. Important Business Rules

Implement these exactly:

1. Every flock has a unique UUID.
2. Every flock has a human-readable generated code.
3. Every flock-specific record references `flock_id`.
4. No flock data can leak into another flock.
5. New flocks start clean.
6. Inventory is not automatically transferred between flocks.
7. Egg tracking is optional per flock.
8. Egg arithmetic is performed internally in eggs.
9. Peti/trays are presentation units.
10. Feed arithmetic is performed internally in kg/grams.
11. Diesel arithmetic is performed internally in liters.
12. Remaining birds are derived from cumulative mortality.
13. Historical edits recalculate downstream values.
14. Calculated fields are read-only.
15. Backend validates all business rules.
16. Negative inventory is rejected.
17. Closed flocks are read-only by default.
18. Daily records are unique per flock/date where applicable.
19. Multiple medicine entries are supported.
20. Multiple egg-usage records per day are supported.
21. No arbitrary maximum of three medicines.
22. No hardcoded flock IDs.
23. No hardcoded bird count.
24. No hardcoded egg production percentage.
25. No hardcoded current inventory.
26. No secrets in frontend code.

---

# 59. AI Agent Implementation Rules

You are the coding agent responsible for building this entire application.

Follow this order:

## Phase 1 — Inspect

Before writing code:

1. Inspect the repository.
2. Determine whether a frontend/backend already exists.
3. Reuse compatible existing infrastructure.
4. Do not destroy working code.
5. Identify existing package manager.
6. Identify existing database setup.
7. Identify existing environment files.
8. Identify existing authentication.
9. Identify existing UI component system.

If an existing stack conflicts with this specification, adapt the implementation while preserving the architecture and business rules.

## Phase 2 — Foundation

Create:

```text
monorepo
packages
frontend
backend
shared package
database
Docker configuration
environment configuration
```

Then verify:

```text
pnpm install
pnpm typecheck
pnpm lint
pnpm build
```

## Phase 3 — Database

Implement:

```text
farms
flocks
bird_daily_records
feed_daily_records
egg_daily_records
egg_usage_records
diesel_daily_records
weight_records
medicines
medicine_daily_records
medicine_entries
vaccination_records
```

Create migrations.

Create seed data.

Run migrations.

Verify foreign keys and unique constraints.

## Phase 4 — Calculation Engine

Implement and test all pure calculation functions before building the dashboard.

Do not duplicate formulas across React components and backend services.

## Phase 5 — API

Implement flock-scoped APIs.

Every route must validate:

```text
authenticated user
farm access
flock existence
flock ownership/access
business rules
```

## Phase 6 — Frontend

Build:

```text
layout
sidebar
header
flock selector
dashboard
flock management
daily record
reports
settings
```

Then build domain forms.

## Phase 7 — Integration

Connect frontend to API through TanStack Query.

Test all CRUD operations.

Test changing the active flock.

Test historical dates.

Test egg-disabled flocks.

## Phase 8 — Polish

Implement:

```text
loading states
empty states
error states
responsive layout
accessibility
form validation
confirmation dialogs
toast/inline feedback
```

## Phase 9 — Verification

Run:

```text
typecheck
lint
unit tests
integration tests
build
```

Then manually verify:

```text
Create Flock 001
Create daily record
Create Flock 002
Switch to Flock 002
Verify Flock 001 data is absent
Switch back
Verify Flock 001 data is intact
Close Flock 001
Verify editing is blocked
```

---

# 60. Do Not Do These Things

Do not:

- build everything in one React component
- put database logic in React
- put business calculations inside JSX
- duplicate calculation formulas
- use localStorage as the database
- trust frontend-calculated inventory
- trust frontend flock IDs
- store formatted numbers
- store peti as the canonical egg inventory unit
- store bags as the canonical feed inventory unit
- create `medicine1`, `medicine2`, `medicine3`
- create separate columns for every egg usage type
- hardcode flock codes
- hardcode bird counts
- mix data between flocks
- automatically transfer inventory between flocks
- allow negative inventory
- allow closed flocks to be casually edited
- expose database credentials to the frontend
- use colorful UI
- introduce unnecessary dependencies
- create fake data and present it as real data
- silently swallow API/database errors

---

# 61. Definition of Done

The system is considered complete only when:

### Flocks

- [ ] User can create a flock.
- [ ] Flock ID is immutable UUID.
- [ ] Flock code is automatically generated.
- [ ] User can switch active flock.
- [ ] User can view historical flocks.
- [ ] User can close a flock.
- [ ] Closed flock protection works.
- [ ] Flock data isolation works.

### Birds

- [ ] Initial birds tracked.
- [ ] Daily mortality recorded.
- [ ] Remaining birds calculated.
- [ ] Cumulative mortality calculated.
- [ ] Mortality percentage calculated.

### Feed

- [ ] Arrival bags tracked.
- [ ] Used bags tracked.
- [ ] Remaining inventory calculated.
- [ ] Total received calculated.
- [ ] g/bird calculated.

### Eggs

- [ ] Egg tracking can be enabled/disabled per flock.
- [ ] Production tracked in peti/trays.
- [ ] Sales tracked in peti/trays.
- [ ] Usage tracked.
- [ ] Inventory calculated in eggs.
- [ ] Inventory displayed in peti/trays.
- [ ] Production percentage calculated.
- [ ] Negative stock prevented.

### Egg Usage

- [ ] Gift use.
- [ ] Conveyor waste.
- [ ] Mess use.
- [ ] Store waste.
- [ ] Multiple usage records supported.

### Diesel

- [ ] Arrival tracked.
- [ ] Usage tracked.
- [ ] Remaining calculated.
- [ ] Negative stock prevented.

### Weight

- [ ] Weight tracked.
- [ ] Uniformity tracked.
- [ ] Week calculated.
- [ ] Day calculated.
- [ ] Sunday/day convention implemented.

### Medicine

- [ ] Water/medicine type tracked.
- [ ] Unlimited medicine entries supported.
- [ ] Water liters tracked.
- [ ] Water/bird calculated.
- [ ] Vaccines tracked.

### Dashboard

- [ ] Flock selector.
- [ ] Date selector.
- [ ] KPI cards.
- [ ] Relevant sections hidden when not applicable.
- [ ] Historical dates work.
- [ ] Charts work.
- [ ] Monochrome design.

### Engineering

- [ ] TypeScript strict mode.
- [ ] Database migrations.
- [ ] Environment configuration.
- [ ] API validation.
- [ ] Authorization.
- [ ] Unit tests.
- [ ] Integration tests.
- [ ] Error handling.
- [ ] Responsive UI.
- [ ] Accessibility.
- [ ] Docker development environment.
- [ ] README setup instructions.

---

# 62. Final Agent Instruction

Build this system as a real production application, not a visual mockup.

Prioritize:

1. Data integrity
2. Flock isolation
3. Correct calculations
4. Database correctness
5. API validation
6. Maintainable architecture
7. Usable daily-entry workflow
8. Clear dashboard
9. Responsive design
10. Visual polish

When a requirement is ambiguous, do not silently invent behavior that could corrupt historical data. Put the ambiguity into a clearly isolated business-rule function or configuration and document the assumption.

The frontend is a client of the backend, not the authority.

The database is the persistent source of truth.

Raw operational inputs are authoritative.

Calculated values should be derived deterministically.

Every flock is an isolated operational universe.

The UI must remain strictly black and white.
