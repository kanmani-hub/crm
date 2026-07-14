# The Command Center — Technical Specification

## Dependencies

### Core Framework
| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.0 | UI framework |
| react-dom | ^19.0 | DOM rendering |
| react-router-dom | ^7.0 | Client-side routing (Dashboard, Search, Profile, Settings, External Forms) |
| vite | ^6.0 | Build tool |
| @vitejs/plugin-react | ^4.0 | Vite React integration |

### Design & Styling
| Package | Version | Purpose |
|---------|---------|---------|
| tailwindcss | ^4.0 | Utility-first CSS framework |
| @tailwindcss/vite | ^4.0 | Tailwind Vite plugin |
| geist | ^1.0 | Geist Mono font package |

### UI Primitives (shadcn/ui)
All components installed via `npx shadcn add`:
| Component | Purpose |
|-----------|---------|
| dialog | BGV Review modal, confirmation dialogs |
| sheet | Changes Sidebar drawer |
| toast | Inline save toasts, action confirmations |
| label | Form field labels |
| input | Text inputs across all forms and editors |
| textarea | Address fields, reason inputs, multi-line text |
| select | Dropdown fields (BGV status, course, branch, filters) |
| checkbox | Document Vault preset checkboxes |
| tabs | Financial Management pipeline tabs |
| badge | Status badges, filter chips, notification dots |
| avatar | User avatar initials in nav |
| dropdown-menu | Nav avatar dropdown (Profile, Settings, Sign Out) |
| separator | Visual dividers between sections |
| skeleton | Loading shimmer states for search results and lists |
| toggle-group | Push Panel payload type toggles (mutually exclusive) |

### Animation
| Package | Version | Purpose |
|---------|---------|---------|
| framer-motion | ^12.0 | Page transitions, panel slides, modal entrances, staggered reveals, layout animations for tracked list rows, financial recalculation pulses, employment chip add/remove |

### State & Logic
| Package | Version | Purpose |
|---------|---------|---------|
| zustand | ^5.0 | Lightweight global state: candidate data cache, active filters, tracked candidates, current profile, settings |

### Utilities
| Package | Version | Purpose |
|---------|---------|---------|
| lucide-react | ^0.460 | Icon system (used by shadcn and custom components) |

---

## Component Inventory

### Layout Components (shared across all internal pages)
| Component | Source | Notes |
|-----------|--------|-------|
| TopNavigationBar | Custom | Fixed nav bar (56px). Left: wordmark + nav links. Right: notification bell + avatar dropdown. Active link state via React Router. Hamburger collapse below 768px. |
| Breadcrumb | Custom | "Dashboard / Search / [Name]" trail on Candidate Profile. Built with Router links. |

### Page Components (routes)
| Component | Route | Notes |
|-----------|-------|-------|
| DashboardPage | `/` | Landing. Push Panel + Tracked Candidates List. Polls tracked list every 30s. |
| SearchPage | `/search` | Search bar + filter chips + candidate cards grid. Infinite scroll (20-card batches). URL-synced query/filters. |
| CandidateProfilePage | `/candidate/:id` | Status badges, two-column layout (profile left 60%, financial right 40%), Document Vault full-width, Changes Sidebar trigger. |
| SettingsPage | `/settings` | BGV email, org name, dropdown option tags (courses/branches), notification toggles. Staged changes with unsaved-guard. |
| NewRegistrationFormPage | `/form/register/:token` | External candidate-facing form. Light theme. Pre-fills email from URL token. |
| BGVFormPage | `/form/bgv/:token` | External candidate-facing BGV form. Light theme. Pre-fills candidate data from token. |

### Reusable Components (used across multiple pages)
| Component | Used By | Notes |
|-----------|---------|-------|
| PushPanel | DashboardPage | Command entry: email input + 3 mutually exclusive toggles (toggle-group) + Send button. Async dispatch with loading state. |
| TrackedCandidatesList | DashboardPage | Real-time list of pending candidates. Status dot + name/email + status badge + optional Review button. Empty state. |
| SearchPanel | SearchPage | Search bar + filter chip row. Debounced 150ms. Regex search across name/email/phone with `[^\d]` phone sanitization. |
| CandidateCard | SearchPage | Compact summary card: name/email/phone, 3 master badges, financial summary (Net Payable / Pending Dues), employment chips. Click navigates to profile. |
| InlinePencilEditor | CandidateProfilePage, SettingsPage | Universal edit mechanism. View mode (text + pencil icon on hover) → Edit mode (input/dropdown + checkmark/X). Supports text, select, date. Global Edit toggle activates all simultaneously. |
| FinancialCard | CandidateProfilePage | Pipeline display: Base Fee (pencil-editable), adjustments list (add/remove with reason enforcement), auto-calculated summary (Net Payable, Paid to Date, Pending Dues). Pure client-side arithmetic. |
| PipelineTabBar | CandidateProfilePage | 4 tabs (Registration/Course Fee/Document/Placement). Each maps to an independent FinancialCard instance. |
| DocumentVault | CandidateProfilePage, BGVFormPage | Two-column checkbox grid: Documents Received + Documents Applied. 5 preset items (Offer Letter, Appraisals, Payslips, Relieving Letter, Counter Offer). Custom checkbox with status labels. |
| EmploymentChip | CandidateProfilePage, CandidateCard, BGVFormPage | Compact pill for past employer. Inline add/remove. Comma-separated backend storage. |
| ChangesSidebar | CandidateProfilePage | Fixed right-edge tab trigger + slide-out drawer (420px). Log entries with type badge, description, reason, metadata. Filterable by type and date range. |
| ModalWindow | DashboardPage, CandidateProfilePage | Backdrop + centered modal. Used for BGV Review, confirmation dialogs, destructive actions. Framer-motion entrance/exit. |
| FilterChip | SearchPage | Dismissible chip with active/inactive states. Horizontal scroll container. "Add Filter" opens dropdown. |
| StatusBadge | Multiple | Colored pill badges: BGV Pending/Review/Cleared, Placed Yes/No, Form Pending, etc. Color-mapped to design tokens. |
| FormField | External form pages | Reusable light-theme field: label + input/select/textarea + validation error. Focus/error states per design. |

### Custom Hooks
| Hook | Purpose |
|------|---------|
| usePolling | Generic interval polling with cleanup. Used by Dashboard (30s) and Changes Sidebar (60s). |
| useDebounce | 150ms debounce for search input. |
| useFinancialCalc | Client-side Net Payable/Pending Dues calculation. Recomputes on dependency change. Returns live figures + recalculate trigger. |
| useUrlState | Bidirectional sync between React state and URL search params. Enables bookmarkable searches. |

---

## Animation Implementation Plan

| Animation | Library | Approach | Complexity |
|-----------|---------|----------|------------|
| Page entrance sequence (title → subtitle → panel → list stagger) | Framer Motion | `staggerChildren` on container, each child with `initial={{ opacity: 0, y }}` / `animate` variants. Dashboard: 0/100/200/400ms delays. | Low |
| Page transitions (Dashboard ↔ Search ↔ Profile) | Framer Motion | `AnimatePresence` wrapping `<Outlet>`. Outgoing: `x: -40, opacity: 0`. Incoming: `x: 40 → 0, opacity: 0 → 1`. Duration 0.25s. | Medium |
| Tracked candidate row add | Framer Motion | `AnimatePresence` on list. New item: `initial={{ maxHeight: 0, opacity: 0 }}` → `animate={{ maxHeight: 'auto', opacity: 1 }}`. 0.3s. Background flash via `backgroundColor` keyframe animation (warm-primary at 5% → transparent, 1s). | Medium |
| Tracked candidate status change | Framer Motion | Dot `backgroundColor` transition 0.3s + `scale: [1, 1.2, 1]` pulse keyframe. Badge crossfade with `AnimatePresence` mode="wait". | Low |
| Search results stagger | Framer Motion | `staggerChildren: 0.03` on grid container. Each card: `opacity: 0 → 1, y: 10 → 0`. | Low |
| Card hover lift | CSS Tailwind | `hover:-translate-y-0.5 hover:shadow-panel transition-all duration-200` on CandidateCard. Pure CSS, no JS. | Low |
| Push Panel slide-in | Framer Motion | `initial={{ opacity: 0, y: 20 }}` → `animate` with 0.4s ease, 200ms delay. | Low |
| Modal entrance/exit | Framer Motion | Backdrop: `opacity 0 ↔ 1` (0.2s). Window: `scale: [0.97,1], y: [20,0]` (0.25s cubic-bezier). `AnimatePresence` handles exit reverse. | Medium |
| BGV Review content stagger | Framer Motion | `staggerChildren: 0.08` on modal body. Each block fades in 0.2s. | Low |
| Pencil Editor activation | Framer Motion | View → edit: text container `layout` prop for smooth width transition. Pencil icon `rotate: 45, opacity: 0`. Checkmark/X `opacity: 0 → 1`. 0.15s. | Medium |
| Changes Sidebar slide | Framer Motion | Drawer: `x: '100%' ↔ 0` (0.3s cubic-bezier). Main content: `x: 0 ↔ -420` (0.3s). Mobile: no main-content shift, full-width overlay. | Medium |
| Financial recalculation pulse | Framer Motion | Pending Due figure: `scale: [1, 1.05, 1]` (0.2s) + color flash via `animate` on value change. Net Payable crossfade with `AnimatePresence`. | Medium |
| Employment chip add/remove | Framer Motion | Add: `initial={{ scale: 0 }}` → `animate={{ scale: 1 }}` (0.2s). Remove: `exit={{ scale: 0, opacity: 0 }}` (0.15s). `AnimatePresence` on chip container. | Low |
| Document checkbox toggle | Framer Motion | Checkmark SVG: `pathLength: 0 → 1` (0.15s) via `motion.path`. Background: `backgroundColor` transition 0.2s. | Low |
| Loading skeleton shimmer | CSS Tailwind | `animate-pulse` on Base Elevated rectangles. Pure CSS. | Low |
| Filter chip add/remove | Framer Motion | Add: `initial={{ scale: 0.8, opacity: 0 }}` → `animate`. Remove: `exit` reverse. 0.15–0.2s. | Low |
| Success checkmark stroke draw | Framer Motion + SVG | `motion.path` with `pathLength: 0 → 1` (0.6s ease). Triggered on mount. | Low |
| Form field validation shake | Framer Motion | `x: [0, -4, 4, -4, 4, 0]` (0.3s). Applied on validation error mount. | Low |
| Toggle switch knob slide | Framer Motion | `motion.div` with `x: 0 ↔ 18` (0.2s). Track `backgroundColor` transition. | Low |
| Toast slide-in/out | Framer Motion (or shadcn toast) | `initial={{ y: 20, opacity: 0 }}` → `animate`. Auto-dismiss after 2s. | Low |

---

## State & Logic Plan

### Global Store (Zustand)
Single store managing cross-page shared state:

- **`candidates`** — Map of all loaded candidates (keyed by ID). Populated by search, profile load, and tracked list polling. Prevents redundant fetches.
- **`trackedCandidates`** — Array of candidate IDs with pending status + metadata (status type, timestamp). Updated by Push Panel sends and polling.
- **`activeProfileId`** — Currently viewed candidate. Used by Changes Sidebar to know which candidate's logs to show.
- **`searchQuery`** — Current search string, synced to URL.
- **`activeFilters`** — Array of active filter chips, synced to URL.
- **`settings`** — BGV email, org name, course/branch options, notification toggles. Loaded once on app mount.
- **`uiFlags`** — Global edit mode toggle, sidebar open state, modal open state.

### URL as State (useUrlState hook)
Search page query and filters are bidirectionally synced to URL params (`?q=john&status=pending&dues=true`). On mount, the hook reads params into state. On state change, it writes back via `history.replaceState`. This makes searches bookmarkable without adding routing complexity.

### Data Flow Architecture

```
Candidate-facing Forms (/form/register, /form/bgv)
    → POST to Google Sheets API (append row)
    → Fire webhook/state-change signal
    → HR Dashboard receives update via polling

HR Push Panel (/)
    → POST dispatches email + creates tracked entry
    → Tracked list updated locally + backend

HR Search (/search)
    → Client-side filter on cached candidate map
    → No per-keystroke API calls

HR Profile (/candidate/:id)
    → Load candidate from cache; fetch if missing
    → Inline edits → PATCH cell-level update to Sheets → update local cache
    → Financial changes → client-side calc → PATCH values → invalidate cache
    → Changes Sidebar reads from System_Audit_Logs tab
```

### Polling Strategy
Dashboard polls tracked candidates every 30s. Changes Sidebar (when open) polls audit logs every 60s. Polling uses a lightweight timestamp comparison — only fetch if `lastModified` on the sheet has changed. Avoids unnecessary data transfer.

### Financial Calculation Engine
Pure client-side logic in `useFinancialCalc`:
- `netPayable = baseFee - sum(adjustments where amount < 0)`
- `pendingDues = netPayable - paidToDate`
- All 4 pipelines are independent — each maintains its own state and calculation.
- Recalculation triggers on any adjustment add/remove/edit or paid-to-date change.
- The adjustment engine enforces a reason field before commit (FR-6.4).

---

## Other Key Decisions

### Google Sheets as Backend
The BRD specifies Google Sheets (relational tabs) via Web API as the core backend. The frontend connects directly to the Google Sheets API using `gapi` or REST fetch with API key + OAuth. Three tabs: `Master_Candidates`, `Financial_Ledger`, `System_Audit_Logs`. Cross-tab linkage via unique candidate identifier (email or UUID). No intermediate server — the React app communicates directly with Google Sheets.

### Routing Strategy
React Router with 6 routes:
- `/` — Dashboard (protected, HR-only)
- `/search` — Search (protected)
- `/candidate/:id` — Profile (protected)
- `/settings` — Settings (protected)
- `/form/register/:token` — New Registration (public, candidate-facing)
- `/form/bgv/:token` — BGV Form (public, candidate-facing)

Protected routes check a minimal auth context (stored in localStorage/session). External form routes are public and use a URL token to identify the candidate.

### Google API Auth
Google OAuth 2.0 via `gapi.auth2` for HR users. The auth token is stored in memory (not localStorage for security). On token expiry, a silent refresh is attempted; if that fails, the user is redirected to re-authenticate. External form pages do not require auth — they use a pre-configured API key for append-only writes.

### No shadcn Form / react-hook-form
The forms are relatively simple (7–10 fields each). Native React state with basic validation is sufficient. Adding react-hook-form would be unnecessary overhead for this scope. Validation is handled per-field on blur + on submit.

### Image Assets
Zero external image assets per the design system. All visuals are inline SVGs (Lucide icons or custom SVGs for document type icons). This eliminates image loading overhead and keeps the bundle lean.

### Font Loading
Geist Mono loaded via the `geist` npm package (self-hosted, no external CDN dependency). Inter loaded via Google Fonts or `@fontsource/inter`. Both declared in `index.html` / Tailwind config.
