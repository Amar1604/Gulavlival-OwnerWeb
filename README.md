# Gulavlival Grand — Staff, Manager & Owner Operations Portal

> **Brand:** Gulavlival Grand  
> **Tagline:** Stay • Dine • Experience  
> **System:** Private Operations Portal (Staff / Cashier • Manager • Owner)  
> **Scope:** Order Reception • Kitchen Handoff • Menu Operations • Store Settings • Team Security  
> **Core Principle:** Simple, tablet-optimized, zero-missed-order workflow sharing a unified backend with the Customer Website.

---

## Table of Contents
1. [Project Overview & Core Mission](#1-project-overview--core-mission)
2. [Shared Architecture with CafeWeb](#2-shared-architecture-with-cafeweb)
3. [Zero-Missed-Order Real-Time Pipeline](#3-zero-missed-order-real-time-pipeline)
4. [Roles & Strict Permission Matrix (RBAC)](#4-roles--strict-permission-matrix-rbac)
5. [Authentication & Session Engine (Passwordless OTP)](#5-authentication--session-engine-passwordless-otp)
6. [Daily Restaurant Workflows](#6-daily-restaurant-workflows)
7. [Recommended Technology Stack & Dependencies](#7-recommended-technology-stack--dependencies)
8. [Complete Project File & Directory Structure](#8-complete-project-file--directory-structure)
9. [TypeScript Domain Models & Interfaces](#9-typescript-domain-models--interfaces)
10. [REST API & WebSocket Contract](#10-rest-api--websocket-contract)
11. [Page Specifications & UI Wireframe Blueprint](#11-page-specifications--ui-wireframe-blueprint)
12. [Audio Ring & Visual Alert System (Web Audio API)](#12-audio-ring--visual-alert-system-web-audio-api)
13. [Menu & Live Sold-Out Synchronization](#13-menu--live-sold-out-synchronization)
14. [Restaurant Settings & Operating Controls](#14-restaurant-settings--operating-controls)
15. [Team Access & Security Guardrails](#15-team-access--security-guardrails)
16. [Cash on Delivery (COD) Reconciliation](#16-cash-on-delivery-cod-reconciliation)
17. [Environment Configuration](#17-environment-configuration)
18. [Step-by-Step Developer Implementation Guide](#18-step-by-step-developer-implementation-guide)
19. [Verification & Acceptance Checklist](#19-verification--acceptance-checklist)

---

## 1. Project Overview & Core Mission

The **OwnerWeb** portal is the private operational command center for Gulavlival Grand restaurant. It serves three internal roles:
1. **Staff / Cashier:** Stations at the counter tablet to receive incoming orders, monitor preparation, coordinate kitchen dispatch, and mark orders delivered.
2. **Manager:** Oversees floor shifts, edits food prices, toggles sold-out items during service, and reconciles cash returned by riders.
3. **Owner:** Full executive control over operating hours, store open/closed states, delivery charges, tax configurations, team access, and price histories.

### Key Operational Guarantees
- **Zero Missed Orders:** Multi-channel alerting combining continuous tablet ringing, screen-wide pulsating red badges, fallback polling, and automated WhatsApp backup dispatch.
- **Single Source of Truth:** 100% synchronized with the Customer Website (`CafeWeb`). A customer placing an order immediately lights up the counter tablet; staff confirming or delivering updates customer tracking within seconds.
- **Simplicity Over Complexity:** Designed specifically for 10-inch counter tablets mounted next to the cashier. Large touch targets (minimum 48×48px), bold typography, and direct 1-click status transitions.

---

## 2. Shared Architecture with CafeWeb

Both the Customer Website (`CafeWeb/apps/customer-web`) and this Operations Portal (`OwnerWeb`) communicate with the **same FastAPI backend** and **PostgreSQL database**.

```
                           ┌────────────────────────────────────────────────────────┐
                           │                 PostgreSQL Database                    │
                           │  • orders & order_items (frozen unit price snapshots)  │
                           │  • menu_items & categories (is_available, price)       │
                           │  • restaurant_settings (open/closed, hours, tax, fee)  │
                           │  • users & team (roles: CUSTOMER, STAFF, MGR, OWNER)   │
                           │  • menu_price_history & cash_records                   │
                           └───────────────────────────┬────────────────────────────┘
                                                       │
                                                       ▼
                           ┌────────────────────────────────────────────────────────┐
                           │               Shared FastAPI Backend                   │
                           │               (http://localhost:8000/api/v1)           │
                           │  • WebSocket Hub: /api/v1/ws/orders                    │
                           │  • Dual-Auth: Password (Customer) / OTP (Staff)        │
                           │  • Strict RBAC Middleware & State Machine Guard        │
                           │  • WhatsApp Business API Notification Dispatcher       │
                           └──────────────┬──────────────────────────┬──────────────┘
                                          │                          │
                 HTTP / REST              │                          │ HTTP / WS
          ┌───────────────────────────────┴─────┐              ┌─────┴───────────────────────────────┐
          │     Customer Web (CafeWeb)          │              │    Staff/Owner Web (OwnerWeb)       │
          │  • Port 3000                        │              │  • Port 3001                        │
          │  • Mobile-first customer ordering   │              │  • Tablet-optimized operations      │
          │  • Polls order status every 7s      │              │  • Real-time inbox with audio ring  │
          │  • Reads live open/closed & prices  │              │  • 1-click Confirm / Delivered      │
          └─────────────────────────────────────┘              └─────────────────────────────────────┘
```

### Architectural Principles
1. **Never Separate Databases:** Customer orders and staff orders exist in the exact same table (`orders`).
2. **Frozen Price Snapshots:** Changing a menu price in OwnerWeb never alters existing or historical orders. Each line item retains `item_name_snapshot` and `unit_price_snapshot`.
3. **Double Validation:** Even if the customer UI misses an availability update, backend `create_order` checks `menu_item.is_available` and `restaurant_settings.is_open` before committing.

---

## 3. Zero-Missed-Order Real-Time Pipeline

To guarantee that no customer order goes unnoticed by restaurant staff, the portal uses a **4-tier reliability pipeline**:

```
Customer Clicks "Place Order"
            │
            ▼
FastAPI Saves Order to PostgreSQL (Status: RECEIVED)
            │
            ├──────────────────────────────────────────────┐
            ▼                                              ▼
[Tier 1: Real-Time WebSocket]                  [Tier 3: WhatsApp Backup Notification]
Broadcasts event to /api/v1/ws/orders          Dispatches official WhatsApp Business API
OwnerWeb receives event within < 500ms         message to Owner/Manager phone number with
• Plays continuous synthesized ringtone        order details and quick link.
• Card pulses red at top of Order Inbox
            │
            ▼
[Tier 2: Fallback Polling]
Every 8 seconds, OwnerWeb calls
GET /api/v1/staff/orders?status=RECEIVED
Guarantees updates if tablet WiFi briefly drops.
            │
            ▼
[Tier 4: 3-Minute Escalation Alert]
If status remains RECEIVED after 180 seconds:
• Tablet increases ringtone repetition speed
• Automated secondary WhatsApp alert sent to Owner
```

---

## 4. Roles & Strict Permission Matrix (RBAC)

The system supports three internal staff roles alongside the public customer role:

| Feature / Action | Staff / Cashier | Manager | Owner | Public / Customer |
|:---|:---:|:---:|:---:|:---:|
| **Staff Mobile + OTP Login** | ✅ | ✅ | ✅ | ❌ |
| **View Order Inbox & Active Orders** | ✅ | ✅ | ✅ | ❌ (Own only) |
| **Confirm Order (`CONFIRMED`)** | ✅ | ✅ | ✅ | ❌ |
| **Mark Delivered (`DELIVERED`)** | ✅ | ✅ | ✅ | ❌ |
| **Print Kitchen Ticket (KOT)** | ✅ | ✅ | ✅ | ❌ |
| **Toggle Item Sold-Out / Available** | ❌ | ✅ | ✅ | ❌ |
| **Edit Food Prices** | ❌ | ✅ | ✅ | ❌ |
| **Add / Delete Menu Items & Photos** | ❌ | ❌ | ✅ | ❌ |
| **Manage Categories & Sizes** | ❌ | ❌ | ✅ | ❌ |
| **View Cash Received Reconciliation** | ❌ | ✅ | ✅ | ❌ |
| **Toggle Store Open / Closed** | ❌ | ❌ | ✅ | ❌ |
| **Update Tax & Delivery Charges** | ❌ | ❌ | ✅ | ❌ |
| **Update Minimum Delivery Order** | ❌ | ❌ | ✅ | ❌ |
| **Add / Disable Team Members** | ❌ | ❌ | ✅ | ❌ |
| **View Price Change Audit Logs** | ❌ | ✅ | ✅ | ❌ |

---

## 5. Authentication & Session Engine (Passwordless OTP)

Restaurant staff use **Mobile Number + 6-Digit OTP** only. Passwords are forbidden on OwnerWeb to prevent credential sharing and simplify counter tablet logins.

```
Staff Enters 10-Digit Mobile Number
                 │
                 ▼
Backend Checks: Is mobile in `users` table with is_active=True and role IN (STAFF, MANAGER, OWNER)?
    ├── NO  ──► HTTP 403 Forbidden: "Mobile not authorized. Contact restaurant owner."
    └── YES ──► Generates cryptographically secure 6-digit OTP
                 │
                 ▼
            Dispatches OTP via SMS / WhatsApp Business
                 │
                 ▼
Staff Enters OTP on Counter Tablet
                 │
                 ▼
Backend Validates: Matches? Not expired (< 5 min)? Not used?
    ├── Invalid ──► Record failed attempt. (3 failed attempts = 15-minute lockout).
    └── Success ──► Issues HTTP-only JWT Cookie / Bearer Token.
                 │
                 ▼
Session Duration: 30-Day persistent session on counter tablet.
Instant Kill-Switch: If Owner disables a user, token is invalidated on next request.
```

### Owner Safety Rule
- **Minimum 2 Active Owners:** The database must never allow the last remaining active Owner account to be disabled or deleted.

---

## 6. Daily Restaurant Workflows

### 6.1 Order Handling Workflow
```
[NEW ORDER ARRIVES]
       │
       ▼
Ring sounds continuously • Red alert card flashes at top of tablet inbox
       │
       ▼
Staff taps card to open Order Detail (Dine-in table number shown in 48pt bold)
       │
       ▼
Staff verifies items, quantities, and customer instructions
       │
       ▼
Staff taps [ CONFIRM ORDER ]
       ├── 1. Ringtone stops
       ├── 2. Order status updates to CONFIRMED
       ├── 3. Kitchen ticket (KOT) sends to kitchen screen / thermal printer
       └── 4. Customer tracking page updates to "Confirmed & Cooking"
       │
       ▼
Kitchen prepares food • Food is packed or plated
       │
       ▼
Staff / Rider hands over food
       │
       ▼
Staff taps [ DELIVERED ]
       ├── 1. Order status updates to DELIVERED
       ├── 2. COD payment automatically marked as PAID
       ├── 3. Customer tracking page updates to "Delivered & Enjoy"
       └── 4. Delivery entry recorded in Cash Received table
```

### 6.2 Kitchen KOT Ticket Format
```
==================================================
              GULAVLIVAL GRAND
             KITCHEN ORDER TICKET
==================================================
Order #: GG-20261002-4821       Type: DINE-IN
Table  : TABLE 12               Time: 02:45 PM
--------------------------------------------------
QTY   ITEM                          NOTES
--------------------------------------------------
 2    Butter Chicken (Full)         Extra Spicy
 4    Butter Naan                   Crispy
 1    Jeera Rice
 2    Sweet Lassi
--------------------------------------------------
Instructions: Serve lassi with starter
==================================================
```

---

## 7. Recommended Technology Stack & Dependencies

```
OwnerWeb/
├── Framework: Next.js 14 (App Router)
├── Language: TypeScript 5+ (Strict mode)
├── Styling: Tailwind CSS 3.4+ (Custom restaurant palette)
├── Icons: Lucide React
├── Real-time: Native WebSockets + Polling Fallback
├── Sound: Web Audio API (Zero external audio file dependency)
└── HTTP Client: Native fetch with auth credentials
```

### `package.json` Dependencies
```json
{
  "name": "gulavlival-grand-owner-web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint"
  },
  "dependencies": {
    "lucide-react": "^0.359.0",
    "next": "^14.2.14",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.5"
  }
}
```

---

## 8. Complete Project File & Directory Structure

```
OwnerWeb/
├── README.md                           # This operational blueprint
├── package.json                        # Dependencies and scripts
├── tsconfig.json                       # TypeScript compiler options
├── next.config.mjs                     # Next.js configuration
├── tailwind.config.ts                  # Theme tokens (Amber/Gold/Charcoal palette)
├── postcss.config.mjs                  # PostCSS plugins
├── .env.example                        # Example environment variables
├── .env.local                          # Local environment variables
│
├── app/
│   ├── layout.tsx                      # Root layout (Fonts, Audio Alert Provider, Toast)
│   ├── page.tsx                        # Root redirect (/orders or /login)
│   ├── globals.css                     # Global styles, scrollbars, print styles
│   │
│   ├── login/
│   │   └── page.tsx                    # Staff Mobile + OTP verification screen
│   │
│   ├── orders/
│   │   ├── page.tsx                    # Main Order Inbox (Split view / Tablet cards)
│   │   └── [id]/
│   │       └── page.tsx                # Order Detail (Items, Customer, KOT Print, Status Actions)
│   │
│   ├── menu/
│   │   └── page.tsx                    # Menu Manager (Sold-Out toggle, Price edit, Add item)
│   │
│   ├── settings/
│   │   └── page.tsx                    # Store Settings (Open/Closed, Hours, Tax, Delivery fee)
│   │
│   ├── team/
│   │   └── page.tsx                    # Team Management (Add member, Role, Disable switch)
│   │
│   └── cash/
│       └── page.tsx                    # Cash Received (COD reconciliation list)
│
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx                 # Tablet navigation sidebar with role-aware tabs
│   │   ├── header.tsx                  # Top bar with Store status badge, Volume toggle, User profile
│   │   └── notification-banner.tsx     # Urgent red banner when unaccepted orders exist
│   │
│   ├── orders/
│   │   ├── order-card.tsx              # Order card for inbox (Pulsing red for RECEIVED)
│   │   ├── order-filter-bar.tsx        # Filter tabs: All, Received, Confirmed, Delivered
│   │   ├── order-actions.tsx           # Large [CONFIRM] & [DELIVERED] action buttons
│   │   └── printable-kot.tsx           # Styled thermal receipt layout for window.print()
│   │
│   ├── menu/
│   │   ├── menu-item-row.tsx           # Row with live Sold-Out toggle and quick price edit
│   │   ├── price-edit-modal.tsx        # Modal with price history audit log
│   │   └── add-item-modal.tsx          # Owner modal to create new category or item
│   │
│   ├── team/
│   │   ├── member-card.tsx             # Staff member card with quick disable switch
│   │   └── add-member-modal.tsx        # Add new mobile number + role modal
│   │
│   └── ui/
│       ├── button.tsx                  # High-touch tablet buttons
│       ├── badge.tsx                   # Status indicators (Received, Confirmed, Delivered)
│       ├── modal.tsx                   # Accessible backdrop modals
│       └── switch.tsx                  # iOS-style immediate toggle switch
│
├── lib/
│   ├── api-client.ts                   # Fetch wrapper with auto-auth and 401 handling
│   ├── audio-alert.ts                  # Web Audio API ringtone synthesizer
│   ├── socket-client.ts                # WebSocket reconnecting client
│   ├── auth-context.tsx                # React context storing current staff user & role
│   ├── order-context.tsx               # Global order state, sound control, and live updates
│   └── utils.ts                        # Currency formatters, date formatters, phone formatters
│
└── types/
    └── index.ts                        # Shared TypeScript definitions
```

---

## 9. TypeScript Domain Models & Interfaces

Create `types/index.ts` to mirror the backend schema exactly:

```typescript
export type UserRole = "STAFF" | "MANAGER" | "OWNER" | "CUSTOMER";

export interface StaffUser {
  id: string;
  phone: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export type OrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
export type OrderStatus = "RECEIVED" | "CONFIRMED" | "DELIVERED" | "CANCELLED";
export type PaymentStatus = "PENDING" | "PAID";

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  variant_id?: string | null;
  item_name_snapshot: string;
  variant_name_snapshot?: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  special_note?: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  user_id?: string | null;
  customer_name: string;
  customer_phone: string;
  order_type: OrderType;
  table_number?: string | null;
  delivery_address?: string | null;
  status: OrderStatus;
  payment_method: string; // "CASH"
  payment_status: PaymentStatus;
  special_instructions?: string | null;
  subtotal: number;
  tax: number;
  delivery_charge: number;
  discount: number;
  total: number;
  created_at: string;
  updated_at: string;
  confirmed_at?: string | null;
  delivered_at?: string | null;
  items: OrderItem[];
}

export interface MenuItem {
  id: string;
  category_id: string;
  category_name?: string;
  name: string;
  slug: string;
  description?: string;
  base_price: number;
  image_url?: string;
  is_veg: boolean;
  is_available: boolean;
  is_bestseller: boolean;
  variants?: MenuVariant[];
}

export interface MenuVariant {
  id: string;
  menu_item_id: string;
  name: string; // e.g. "Half", "Full"
  price: number;
  is_available: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  items?: MenuItem[];
}

export interface RestaurantSettings {
  is_open: boolean;
  opening_time: string; // e.g. "11:00 AM"
  closing_time: string; // e.g. "11:00 PM"
  tax_percentage: number; // e.g. 5.0
  delivery_charge: number; // e.g. 40.0
  min_delivery_order: number; // e.g. 200.0
  delivery_area: string; // e.g. "Within 5 km radius"
  whatsapp_notification_phone: string;
}

export interface CashRecord {
  order_id: string;
  order_number: string;
  order_type: OrderType;
  rider_name?: string | null;
  amount: number;
  status: "PENDING" | "RECEIVED";
  received_at?: string | null;
  confirmed_by?: string | null;
}
```

---

## 10. REST API & WebSocket Contract

All endpoints reside under `/api/v1` on the shared backend.

### 10.1 Authentication (`/auth`)
- `POST /auth/staff/request-otp`
  - Body: `{ "phone": "9876543210" }`
  - Logic: Rejects numbers not registered or marked `is_active=False`.
  - Response: `{ "status": "OTP_SENT", "cooldown_seconds": 30 }`
- `POST /auth/staff/verify-otp`
  - Body: `{ "phone": "9876543210", "otp": "482910" }`
  - Response: `{ "access_token": "...", "token_type": "bearer", "user": StaffUser }`
- `GET /auth/staff/me`
  - Headers: `Authorization: Bearer <token>`
  - Response: `StaffUser`
- `POST /auth/staff/logout`
  - Invalidates token.

### 10.2 Staff Orders (`/staff/orders`)
- `GET /staff/orders?status=RECEIVED&order_type=DINE_IN`
  - Query filters: `status`, `order_type`, `date`
  - Response: `Order[]`
- `GET /staff/orders/{id}`
  - Response: `Order` with nested items and status history.
- `POST /staff/orders/{id}/confirm`
  - RBAC: Staff, Manager, Owner
  - Updates status to `CONFIRMED`.
  - Response: Updated `Order`.
- `POST /staff/orders/{id}/delivered`
  - RBAC: Staff, Manager, Owner
  - Updates status to `DELIVERED`, sets `payment_status = "PAID"`.
  - Response: Updated `Order`.
- `POST /staff/orders/{id}/cancel`
  - Body: `{ "reason": "Customer unreachable" }`
  - RBAC: Manager, Owner only.

### 10.3 Real-Time WebSocket (`/ws/orders`)
- Connection: `ws://localhost:8000/api/v1/ws/orders?token=<jwt_token>`
- Server Emits:
  ```json
  {
    "event": "NEW_ORDER",
    "order": {
      "id": "ord_1234",
      "order_number": "GG-20261002-8921",
      "order_type": "DINE_IN",
      "table_number": "12",
      "customer_name": "Rahul Verma",
      "total": 420.0,
      "items_count": 3
    }
  }
  ```

### 10.4 Menu Management (`/staff/menu`)
- `PATCH /staff/menu/items/{id}/availability`
  - Body: `{ "is_available": false }`
  - RBAC: Manager, Owner.
  - Broadcasts live sold-out state.
- `PATCH /staff/menu/items/{id}/price`
  - Body: `{ "new_price": 280.0, "reason": "Vendor price hike" }`
  - RBAC: Manager, Owner.
  - Automatically writes an entry to `menu_price_history`.
- `POST /staff/menu/items`
  - RBAC: Owner only. Creates new menu item with sizes/variants.

### 10.5 Restaurant Settings (`/staff/settings`)
- `GET /staff/settings`
  - Response: `RestaurantSettings`
- `PATCH /staff/settings`
  - Body: `{ "is_open": false }` or `{ "delivery_charge": 50.0 }`
  - RBAC: Owner only. Immediately updates customer site.

### 10.6 Team Management (`/staff/team`)
- `GET /staff/team` — List all team members. (Owner only)
- `POST /staff/team` — Add person: `{ "phone": "...", "full_name": "...", "role": "STAFF" }`.
- `PATCH /staff/team/{id}/toggle-active` — Disable/enable access immediately.
- `DELETE /staff/team/{id}` — Remove member (enforces minimum 2 Owners rule).

---

## 11. Page Specifications & UI Wireframe Blueprint

### 11.1 Counter Tablet Layout (`/orders`)
Designed for continuous touch usage with maximum visibility across the counter:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [GULAVLIVAL GRAND]  ● RESTAURANT OPEN   [🔊 Volume: 100%]   🔔 (3 New)   [ Amar (Owner) ] │
├────────────────────────┬───────────────────────────────────────────────────────────────┤
│ TABS:                  │ SELECTED ORDER: #GG-20261002-1048                   [PRINT KOT]│
│ [🔴 3 New Orders]      ├───────────────────────────────────────────────────────────────┤
│ [🟡 4 Cooking]         │ Type: DINE-IN                           Time: 2 mins ago      │
│ [🟢 28 Delivered]      │ TABLE NUMBER:                                                 │
│                        │ ┌───────────────────────────────────────────────────────────┐ │
│ ────────────────────── │ │                       TABLE 12                            │ │
│ #1048  DINE-IN  ₹380   │ └───────────────────────────────────────────────────────────┘ │
│ TABLE 12 [2 mins ago]  │ Customer: Amar Sharma (9876543210)                            │
│ 2x Paneer Tikka        │                                                               │
│ 1x Butter Naan         │ Items:                                                        │
│ [PULSING RED BORDER]   │   • 2 × Paneer Tikka (Full) ......................... ₹280.00 │
│ ────────────────────── │   • 1 × Butter Naan ................................. ₹ 40.00 │
│ #1047  DELIVERY ₹640   │                                                               │
│ Sector 4, House 12     │ Special Note: "Please make it spicy and crispy"               │
│ [YELLOW / COOKING]     │ Total Amount (COD Cash):                              ₹320.00 │
│ ────────────────────── │ ───────────────────────────────────────────────────────────── │
│ #1046  TAKEAWAY ₹220   │ [ ✔ CONFIRM ORDER & SEND TO KITCHEN ]  (Stops Ringtone)       │
│ Picked up              │ [ 🚚 MARK AS DELIVERED / CASH PAID ]                         │
└────────────────────────┴───────────────────────────────────────────────────────────────┘
```

### 11.2 Menu Manager Page (`/menu`)
- **Category Filter Pills:** All, Appetizers, Main Course, Breads, Beverages, Desserts.
- **Item Rows:**
  - Item Photo, Name, and Veg/Non-Veg icon.
  - Current Price (Click to edit with Manager/Owner badge).
  - **Instant Availability Toggle:** Large iOS-style switch. If toggled off, immediately shows `SOLD OUT` in red.
  - Price History Link: Opens modal showing previous prices, dates, and who changed them.

### 11.3 Restaurant Settings Page (`/settings`)
- **Emergency Kill Switch:** Prominent Master Toggle — `RESTAURANT OPEN` vs. `RESTAURANT CLOSED`.
  - When switched to CLOSED, prompts for opening time (e.g. "Tomorrow 11:00 AM") and blocks customer orders.
- **Operating Hours Form:** Opening time, closing time per day.
- **Delivery & Financial Controls:**
  - Tax Rate input (default: 5.0%)
  - Delivery Fee input (default: ₹40.0)
  - Minimum Delivery Order input (default: ₹200.0)
  - Delivery Radius text description
- **WhatsApp Notification Number:** Phone number that receives the Tier 3 backup order alerts.

### 11.4 Team Management Page (`/team`)
- **List of Authorized Staff:** Table showing Full Name, Mobile Number, Assigned Role (`Staff`, `Manager`, `Owner`), and Status (`Active` / `Disabled`).
- **Instant Kill Switch:** Toggling a staff member to `Disabled` blocks their access immediately on their next click.
- **Add Team Member Button:** Opens modal to input Name, 10-digit mobile, and select role.

---

## 12. Audio Ring & Visual Alert System (Web Audio API)

To prevent reliance on external `.mp3` files that might fail to download or be blocked by browser policies, `OwnerWeb` includes a **self-contained synthesized audio chime** using the browser's native Web Audio API.

### Implementation: `lib/audio-alert.ts`
```typescript
class OrderAudioEngine {
  private ctx: AudioContext | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private isMuted: boolean = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // Play dual-tone pleasant restaurant chime
  public playChime() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      
      // Tone 1: 587.33 Hz (D5)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      // Tone 2: 880 Hz (A5) slightly delayed
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.frequency.setValueAtTime(880, now + 0.15);
      gain2.gain.setValueAtTime(0.35, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.6);
    } catch {
      // Audio playback safety catch
    }
  }

  // Start continuous loop for unaccepted orders
  public startAlarmLoop() {
    if (this.intervalId) return;
    this.playChime();
    this.intervalId = setInterval(() => {
      this.playChime();
    }, 2500); // Repeats every 2.5 seconds until stopped
  }

  // Stop loop when staff clicks "CONFIRM"
  public stopAlarmLoop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) this.stopAlarmLoop();
  }
}

export const audioEngine = typeof window !== "undefined" ? new OrderAudioEngine() : null;
```

---

## 13. Menu & Live Sold-Out Synchronization

1. **Sub-Second Zero-Refresh Propagation (WebSockets):** When a Manager or Owner toggles an item to `SOLD OUT`, edits a price, or updates dish details:
   - `PATCH /api/v1/staff/menu/items/{id}/availability`, `PATCH /api/v1/staff/menu/items/{id}/price`, or `PUT /api/v1/staff/menu/items/{id}` executes.
   - The PostgreSQL database updates immediately.
   - **Real-Time Broadcast Hub:** FastAPI instantly broadcasts the change over `/api/v1/ws/menu` to all connected customer sessions. Active customer devices reflect the updated price, "Sold Out" tag, or photo in milliseconds with zero page reload.
2. **Supabase Cloud Photo Storage (`menu-photos`):**
   - Staff can snap real dish photos directly with their mobile camera or choose from gallery in the operations portal.
   - Images upload directly to the Supabase Storage public bucket (`menu-photos`) via `lib/supabase-storage.ts`, producing a permanent CDN URL saved in `MenuItem.image_url`.
3. **Full Dish Management & Photo Editing Modal:**
   - Managers/Owners can click **Edit** on any dish to modify Name, Category, Price, Veg/Non-Veg type, Ingredients, and upload or replace real photos with live preview.
4. **Preventing Race Conditions at Checkout:**
   - If a customer loaded the page while the dish was available but staff marked it sold-out before the customer submitted the order, the backend `create_order` endpoint validates:
     ```python
     if not menu_item.is_available:
         raise HTTPException(
             status_code=400,
             detail=f"'{menu_item.name}' was just marked sold-out by the kitchen."
         )
     ```
5. **Audited Price History:**
   - Any price change records: `menu_item_id`, `old_price`, `new_price`, `changed_by_user_id`, and `timestamp`.

---

## 14. Restaurant Settings & Operating Controls

Owner settings directly govern checkout validation on both websites:

1. **Store Closed State:**
   - When `is_open == false`:
     - Customer Website renders a top banner: *"We are currently closed for orders."*
     - The "Proceed to Checkout" button is completely disabled.
     - Backend rejects any incoming orders with a clear 400 error.
2. **Dynamic Minimum Order & Fees:**
   - Backend `create_order` loads `delivery_fee` and `min_delivery_order` directly from the `restaurant_settings` table instead of hardcoding values.
   - Delivery orders with `subtotal < min_delivery_order` are rejected.

---

## 15. Team Access & Security Guardrails

1. **Owner-Controlled Whitelist:**
   - Unknown mobile numbers cannot request OTP or sign in.
2. **Immediate Session Termination (Kill Switch):**
   - When an Owner sets a staff member's status to `Disabled`:
     - The `is_active` flag in PostgreSQL becomes `False`.
     - The API authentication dependency checks `user.is_active` on every single request.
     - The disabled staff member's tablet is booted back to the login screen immediately.
3. **Owner Account Protection:**
   - Minimum 2 active owner accounts guaranteed. Deleting or disabling an owner is rejected by the backend if `count(active_owners) <= 2`.

---

## 16. Cash on Delivery (COD) Reconciliation

Because Gulavlival Grand operates on Cash on Delivery / Pay at Counter:

1. **Order Total Breakdown:**
   - Every order clearly itemizes: Subtotal + 5% GST + Delivery Fee = Total Payable.
2. **Cash Settlement Flow (`/cash`):**
   - For Delivery orders: When staff marks the order `DELIVERED`, a pending cash receipt entry is created with the assigned rider's name and amount.
   - When the rider returns to the counter with cash, the Manager or Owner taps **[Confirm Cash Received]**.
   - This prevents cash leakage during shifts without needing a complex full accounting suite.

---

## 17. Environment Configuration

Create `.env.local` inside `OwnerWeb/`:

```env
# Next.js Server & Client Config
PORT=3001
NEXT_PUBLIC_APP_NAME="Gulavlival Grand Operations"

# Shared FastAPI Backend URL
NEXT_PUBLIC_API_URL="http://localhost:8000/api/v1"
NEXT_PUBLIC_WS_URL="ws://localhost:8000/api/v1/ws/orders"

# Audio Settings
NEXT_PUBLIC_DEFAULT_ALARM_VOLUME="1.0"

# Supabase Storage Configuration (Real Food Photos)
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET="menu-photos"
```

---

## 18. Step-by-Step Developer Implementation Guide

Follow this sequence to build and run the portal:

### Step 1: Scaffold Next.js in `OwnerWeb`
```powershell
cd d:\GulavlivalGrand\OwnerWeb
npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

### Step 2: Install UI Icons & Dependencies
```powershell
npm install lucide-react
```

### Step 3: Implement Core Modules
1. **Types:** Create `types/index.ts` with all shared interfaces.
2. **API Client:** Create `lib/api-client.ts` with auto-attached token logic and 401 redirect to `/login`.
3. **Audio Engine:** Create `lib/audio-alert.ts` containing the native Web Audio API synthesizer.
4. **WebSocket Listener:** Create `lib/socket-client.ts` with automatic reconnection logic.
5. **Auth Context:** Create `lib/auth-context.tsx` managing login state and RBAC role checks.

### Step 4: Build Pages
1. **Login Page (`app/login/page.tsx`):**
   - Step 1: 10-digit mobile number input $\rightarrow$ Request OTP.
   - Step 2: 6-digit OTP input with 30s resend timer $\rightarrow$ Verify OTP $\rightarrow$ Save token $\rightarrow$ Redirect to `/orders`.
2. **Order Inbox (`app/orders/page.tsx`):**
   - Tablet-optimized split screen or grid.
   - Flashes red with chime until order is confirmed.
3. **Order Detail & KOT Print (`app/orders/[id]/page.tsx`):**
   - Full order breakdown.
   - Large touch button: `[CONFIRM ORDER]` $\rightarrow$ transitions status, stops audio ring, generates KOT.
   - Large touch button: `[MARK DELIVERED]` $\rightarrow$ marks cash paid.
4. **Menu Manager (`app/menu/page.tsx`):**
   - Quick sold-out toggles and price edit modals.
5. **Settings Page (`app/settings/page.tsx`):**
   - Restaurant open/closed switch, tax %, delivery fee, hours.
6. **Team Page (`app/team/page.tsx`):**
   - Mobile whitelist and instant disable switches.
7. **Cash Page (`app/cash/page.tsx`):**
   - Shift-end cash reconciliation list.

### Step 5: Start the Development Server
```powershell
npm run dev
```
Open [http://localhost:3001](http://localhost:3001) in your browser or on the counter tablet.

---

## 19. Verification & Acceptance Checklist

Before handing the portal over to the restaurant owner, verify:

- [ ] **Dual-Website Synchronization:**
  - Placed test order on Customer Website (`http://localhost:3000`).
  - Order appeared on OwnerWeb inbox (`http://localhost:3001`) within 1 second.
  - Counter tablet chime started ringing immediately.
  - Tapping **[CONFIRM]** stopped the chime and moved Customer Website tracking to "Confirmed & Cooking".
  - Tapping **[DELIVERED]** marked cash paid and moved Customer Website tracking to "Delivered & Enjoy".
- [ ] **Sold-Out Live Propagation:**
  - Toggled an item to "Sold Out" in OwnerWeb.
  - Checked Customer Website: Item immediately showed "Sold Out" and the Add button was disabled.
- [ ] **Store Closed Protection:**
  - Switched restaurant status to "CLOSED" in OwnerWeb.
  - Customer Website immediately displayed "We are currently closed" banner and blocked checkout.
- [ ] **RBAC Enforcement:**
  - Staff login: Settings and Team tabs are completely hidden; direct URL access returns 403.
  - Manager login: Can toggle sold-out and edit prices; cannot edit taxes or manage team.
  - Owner login: Full access to all menus, settings, and team controls.
- [ ] **Session & Security:**
  - Counter tablet stays logged in for 30 days without re-authenticating.
  - Disabling a staff member in Team settings immediately boots them out.
  - At least 2 owner phone numbers are preserved at all times.
