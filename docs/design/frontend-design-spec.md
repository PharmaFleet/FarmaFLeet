# Frontend Design Specification

## Project Overview

PharmaFleet is a comprehensive delivery management system for pharmacy groups. This detailed design specification focuses on the React-based Web Dashboard used by managers, dispatchers, and executives to oversee operations, track drivers, and manage orders.

The design philosophy emphasizes **Operational Clarity**, **Premium Aesthetics**, and **Responsive Interactivity**. The interface should feel "alive" with real-time updates and smooth transitions, utilizing a modern tech stack to ensure performance and scalability.

## Technology Stack

- **Framework:** React 18+ (Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (v3.4+)
- **Component System:** shadcn/ui (built on Radix UI)
- **State Management:** Zustand
- **Data Fetching:** TanStack Query (React Query)
- **Maps:** @vis.gl/react-google-maps
- **Icons:** Lucide React
- **Forms:** React Hook Form + Zod

## Design System Foundation

### Color Palette ("Pharma Premium")

We use a sophisticated color system based on Tailwind's Slate and Emerald, augmented with semantic colors for status indication.

| Semantic       | Token              | Tailwind Class   | Hex Value | Usage                                       |
| -------------- | ------------------ | ---------------- | --------- | ------------------------------------------- |
| **Primary**    | `primary`          | `bg-emerald-600` | `#059669` | Main actions, active states, brand identity |
| **Secondary**  | `secondary`        | `bg-slate-800`   | `#1e293b` | Secondary actions, dark backgrounds         |
| **Accent**     | `accent`           | `bg-teal-500`    | `#14b8a6` | Highlights, interactive elements            |
| **Background** | `background`       | `bg-slate-50`    | `#f8fafc` | Page background (Light mode)                |
| **Surface**    | `surface`          | `bg-white`       | `#ffffff` | Cards, modals, sidebars                     |
| **Text Main**  | `foreground`       | `text-slate-900` | `#0f172a` | High emphasis text                          |
| **Text Muted** | `muted-foreground` | `text-slate-500` | `#64748b` | Low emphasis text                           |
| **Error**      | `destructive`      | `bg-red-500`     | `#ef4444` | Errors, delete actions, "Rejected" status   |
| **Warning**    | `warning`          | `bg-amber-500`   | `#f59e0b` | Alerts, "Pending" status                    |
| **Success**    | `success`          | `bg-emerald-500` | `#10b981` | Success messages, "Delivered" status        |
| **Info**       | `info`             | `bg-blue-500`    | `#3b82f6` | Information, "On Way" status                |

### Typography Scale

**Font Family:** `Inter`, sans-serif (Google Fonts)

| Style        | Weight         | Size (rem/px)   | Line Height | Usage                  |
| ------------ | -------------- | --------------- | ----------- | ---------------------- |
| `Display`    | Bold (700)     | 1.875rem / 30px | 2.25rem     | Dashboard Headlines    |
| `H1`         | SemiBold (600) | 1.5rem / 24px   | 2rem        | Page Titles            |
| `H2`         | SemiBold (600) | 1.25rem / 20px  | 1.75rem     | Section Headers        |
| `Body Large` | Medium (500)   | 1.125rem / 18px | 1.75rem     | Lead text              |
| `Body`       | Regular (400)  | 1rem / 16px     | 1.5rem      | Default content        |
| `Small`      | Medium (500)   | 0.875rem / 14px | 1.25rem     | Labels, secondary text |
| `Tiny`       | Medium (500)   | 0.75rem / 12px  | 1rem        | Badges, captions       |

### Spacing System

Based on Tailwind's 4px grid.

- **Components:** `p-4` (16px), `gap-4`
- **Layout:** `p-6` (24px) or `p-8` (32px) for page containers
- **Sectioning:** `my-8` (32px)

### Component Architecture

#### 1. LayoutShell

**Purpose**: The main skeleton of the authenticated application.
**Structure**:

- `Sidebar` (Left, fixed): Navigation links, User profile summary, Logout.
- `TopBar` (Top, sticky): Breadcrumbs, Global Search, Notifications, Theme Toggle.
- `Main` (Center, scrollable): The page content outlet.

**Visual Specs**:

- Sidebar: `w-64`, `border-r`, `bg-surface`.
- TopBar: `h-16`, `border-b`, `backdrop-blur` (Glassmorphism).

#### 2. StatCard

**Purpose**: Display high-level metrics on the dashboard.
**Props Interface**:

```typescript
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType;
  trend?: {
    value: number; // percentage
    direction: "up" | "down" | "neutral";
  };
  description?: string;
  loading?: boolean;
}
```

**Visual Specs**:

- `bg-surface`
- `rounded-xl`
- `shadow-sm`
- `hover:shadow-md` (micro-interaction)
- Icon wrapper: `p-2 rounded-full bg-primary/10 text-primary`

#### 3. DataTable (Generic)

**Purpose**: Reusable table for Orders, Drivers, Users.
**Features**:

- Pagination
- Sorting (Column headers)
- Filtering (Toolbar)
- Row Actions (Dropdown menu)
  **Implementation Note**: Use `@tanstack/react-table` with shadcn `Table` components.

#### 4. MapView

**Purpose**: Interactive map showing drivers and warehouses.
**Props**:

```typescript
interface MapViewProps {
  drivers: Driver[];
  warehouses: Warehouse[];
  selectedDriverId?: string;
  onDriverClick: (driverId: string) => void;
  height?: string;
}
```

**Visual Specs**:

- Rounded corners `rounded-xl`
- Hidden overflow `overflow-hidden`
- Custom markers:
  - Driver: Vehicle icon (colored by status: Green=Free, Orange=Busy, Grey=Offline)
  - Warehouse: Building icon (Purple)

#### 5. StatusBadge

**Purpose**: Consistent status indicators for Orders and Drivers.
**Variants**:

- `default` (Gray)
- `success` (Green)
- `warning` (Yellow/Orange)
- `destructive` (Red)
- `info` (Blue)

### Interaction Patterns

- **Modals (Dialogs)**: Use for "Import Orders", "Assign Driver", "Edit User". Should have backdrop blur and smooth fade-in/scale-up animation.
- **Toasts**: Top-right corner for system notifications (Success/Error).
- **Drawers (Sheet)**: Use for "Driver Details" or "Order Details" on smaller screens or for quick formatting without leaving the page context.
- **Hover Effects**: All interactive elements (cards, buttons, rows) must have distinct hover states (`bg-muted/50`, `scale-[1.02]`).

## Implementation Roadmap

### Phase 1: Foundation (Section 4)

1. [ ] **Project Init**: Vite + React + TS.
2. [ ] **Styling Setup**: Tailwind CSS + `postcss`.
3. [ ] **UI Library**: Install `shadcn/ui` CLI and initialize.
4. [ ] **Router**: Setup `react-router-dom` with `MainLayout` and `AuthLayout`.
5. [ ] **State**: Setup `zustand` stores (`useAuthStore`, `useThemeStore`).
6. [ ] **HTTP**: Configure `axios` instance with interceptors.

### Phase 2: Core Components

1. [ ] **Auth Pages**: Login screen with visual branding (split screen: Image + Form).
2. [ ] **Navigation**: Sidebar with collapsible items.
3. [ ] **Dashboard Home**: Grid layout with `StatCard`s.

### Phase 3: Domain Features (Section 5)

1. [ ] **Orders**: Data table with server-side pagination.
2. [ ] **Drivers**: List view and "Add Driver" modal.
3. [ ] **Map**: Integration with Google Maps API.
4. [ ] **Real-time**: WebSocket connection hook for live driver positions.

## Accessibility Requirements

- [ ] All inputs must have associated labels or `aria-label`.
- [ ] Interactive elements must be keyboard focusable (`tabindex`).
- [ ] Color contrast ratio of 4.5:1 for normal text.
- [ ] Meaningful alt text for non-decorative images.
- [ ] Semantic HTML (`<main>`, `<nav>`, `<aside>`, `<h1>`...).

## Feedback & Iteration Notes

_Pending user review of this specification._
