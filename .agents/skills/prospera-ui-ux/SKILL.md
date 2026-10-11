---
name: prospera-ui-ux
description: "Design system specification and UI/UX implementation rules for the Prospera Referral Platform. Defines color tokens, typography scales, component variants, responsiveness, accessibility standards, and property-aware visual patterns."
---

# Prospera UI/UX Design System Specification

## 1. Product Identity & Purpose
Prospera is a premier B2B and B2C referral platform operating in the UAE, connecting high-net-worth individuals, institutional partners, and business clients with property acquisitions, mortgage financing, Golden Visa processing, and corporate advisory services.

The design language conveys:
- **Trust & Authority**: Regulated financial institution standards, transparent ledger reporting.
- **Property-Aware Excellence**: Visual elegance suited to UAE luxury real estate and corporate advisory.
- **Clarity & Efficiency**: Guided workflows with clear progress indicators, transparent status tracking, and zero ambiguity.

---

## 2. Color System & Design Tokens

### Brand Palette
| Token | Hex | Usage |
|---|---|---|
| `--navy-primary` | `#14243A` | Primary structural elements, sidebar background, brand headers |
| `--navy-dark` | `#0B1524` | Sidebar contrast panels, high-contrast modal headers |
| `--navy-border` | `#23354E` | Sidebar dividers and dark surface borders |
| `--blue-primary` | `#2563EB` | Primary interactive color, key action buttons, active navigation |
| `--blue-hover` | `#1D4ED8` | Hover state for primary buttons |
| `--blue-subtle` | `#EFF6FF` | Highlighted cards, active tab background, subtle focus fills |
| `--blue-border` | `#BFDBFE` | Accent card borders, active input borders |

### Neutral Palette
| Token | Hex | Usage |
|---|---|---|
| `--bg-canvas` | `#F8FAFC` | Main application background workspace |
| `--surface-card` | `#FFFFFF` | Panels, cards, tables, modal bodies |
| `--text-primary` | `#172033` | Headings, primary client data, table values (WCAG AA 11.2:1) |
| `--text-secondary` | `#64748B` | Subheadings, descriptions, table headers |
| `--text-muted` | `#94A3B8` | Placeholders, inactive icons, timestamps |
| `--border-default` | `#E2E8F0` | Default card borders, dividers, table row lines |
| `--border-subdued` | `#F1F5F9` | Inner subtle dividers |

### Status Palette (Semantic Lifecycle Mapping)
All badges maintain high contrast, readable text and distinct background tints:
- **`SUBMITTED` / `DRAFT`**: Blue/Indigo (`bg: #EFF6FF`, `text: #2563EB`, `border: #BFDBFE`)
- **`ASSIGNED` / `CONTACTED` / `QUALIFIED`**: Sky/Teal (`bg: #F0F9FF`, `text: #0284C7`, `border: #BAE6FD`)
- **`PROPOSAL_SENT`**: Violet (`bg: #F5F3FF`, `text: #7C3AED`, `border: #DDD6FE`)
- **`NEGOTIATION`**: Amber (`bg: #FFFBEB`, `text: #D97706`, `border: #FDE68A`)
- **`WON` / `PAID` / `VERIFIED`**: Emerald (`bg: #ECFDF5`, `text: #059669`, `border: #A7F3D0`)
- **`LOST` / `REJECTED` / `CANCELLED`**: Rose (`bg: #FEF2F2`, `text: #DC2626`, `border: #FECACA`)

---

## 3. Typography Hierarchy
Primary Typeface: **Inter** (loaded via `next/font/google` with optical kerning).

| Role | Size | Line Height | Weight | Tracking |
|---|---|---|---|---|
| **Display Heading** | `2rem` (32px) | `2.5rem` | 700 / 800 | `-0.025em` |
| **Page Heading** | `1.5rem` (24px) | `2rem` | 700 | `-0.02em` |
| **Section Heading** | `1.125rem` (18px) | `1.5rem` | 600 / 700 | `-0.015em` |
| **Card Heading** | `1rem` (16px) | `1.375rem` | 600 | `-0.01em` |
| **Body Standard** | `0.875rem` (14px) | `1.375rem` | 400 / 500 | `0` |
| **Small / Metadata** | `0.75rem` (12px) | `1.125rem` | 500 / 600 | `0.02em` |
| **Monospace Codes** | `0.8125rem` (13px) | `1.25rem` | 600 | `0.05em` |

---

## 4. Spacing Scale & Layout Constraints
- **Base Grid**: 4px base (`4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`, `40px`, `48px`, `64px`).
- **Sidebar**: Fixed `280px` on desktop (≥ 1024px); collapsible drawer sheet on mobile/tablet (< 1024px).
- **Workspace Max Width**: `1440px` with fluid responsive padding (`padding: 24px` on mobile, `36px` on desktop).
- **Wizard Form Max Width**: `740px` centered for optimal line length and cognitive focus.

---

## 5. Border Radius & Elevation Rules
- **Pills / Status Badges**: `rounded-full` (`9999px`)
- **Buttons & Form Inputs**: `rounded-lg` (`8px` to `10px`)
- **Cards & Data Panels**: `rounded-xl` (`14px` to `16px`)
- **Modals & Drawers**: `rounded-2xl` (`16px` to `20px`)

### Elevation & Shadow
- **Card Default**: `0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)`
- **Card Hover**: `0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)`
- **Modal Backdrop**: `rgba(15, 23, 42, 0.65)` with backdrop blur `4px`

---

## 6. Service Categories & Visual Patterns
Prospera supports 6 primary service categories:
1. **Property and Real Estate**: Luxury residential acquisitions, commercial freehold, developer off-plan in Dubai/Abu Dhabi.
2. **Mortgage Services**: UAE resident & non-resident mortgage financing, refinancing, valuation advisory.
3. **Golden Visa & Residency**: 10-year investor visa, real estate investment visa, high-skilled talent.
4. **Corporate Advisory**: Cross-border M&A, DIFC/ADGM SPV asset holding structures.
5. **Bank Account Opening**: Fast-track corporate accounts with Tier-1 UAE banks (Emirates NBD, FAB, Mashreq, Wio).
6. **Company Formation**: Dubai Mainland 100% foreign-owned LLCs, Free Zone licenses (DMCC, IFZA, DAFZA).

---

## 7. Component Guidelines
- **Buttons**:
  - `Primary`: Solid navy/blue, high contrast white text, clear active push feedback.
  - `Secondary`: White background, border `#E2E8F0`, hover `#F8FAFC`.
  - `Ghost`: Subtle hover background without borders.
- **Form Fields**:
  - Explicit labels with asterisk on required fields.
  - Helpful placeholder and helper guidance.
  - Inline validation error message connected via `aria-describedby`.
  - Visible focus ring: `ring-2 ring-blue-600 ring-offset-2`.
- **Modals & Sheets**:
  - Escape key support, backdrop click dismissal, focus trap, and return focus on close.
- **Financial Numbers**:
  - Always state currency explicitly (`AED`).
  - Distinguish between **Estimated Deal Value**, **Accrued Commission**, and **Available Withdrawable Balance**.
