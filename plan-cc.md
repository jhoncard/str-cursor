# Execution Plan & Technical Stack

## Short-Term Rental Direct Booking Website

Tampa Bay & St. Petersburg, FL • 4 Properties

---

## 1. Technical Stack

### Frontend

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 15 (App Router) | SSR/SSG for SEO, file-based routing matches sitemap, React Server Components for performance |
| **Language** | TypeScript | Type safety across data models, better DX, fewer runtime errors |
| **Styling** | Tailwind CSS 4 | Utility-first, mobile-first by design, rapid prototyping, small bundle size |
| **UI Components** | shadcn/ui | Accessible (Radix primitives), unstyled base, full customization, copy-paste ownership |
| **Date Picker** | react-day-picker | Lightweight, accessible, used by shadcn/ui, supports date ranges for booking |
| **Image Gallery** | yet-another-react-lightbox | Lightweight lightbox with swipe, zoom, thumbnails |
| **Maps** | Leaflet + react-leaflet | Free, no API key for basic tiles, sufficient for 4 property pins |
| **Forms** | React Hook Form + Zod | Performant form handling with schema-based validation |
| **State Management** | React Server Components + nuqs + Zustand | nuqs for URL-based search filters, Zustand for multi-step checkout state |
| **Icons** | Lucide React | Clean icon set, tree-shakeable, consistent with shadcn/ui |
| **Animations** | Framer Motion | Smooth transitions for gallery, modals, accordion (used sparingly) |

### Backend

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Runtime** | Node.js 22 LTS | Native with Next.js, stable long-term support |
| **API Layer** | Next.js Route Handlers + Server Actions | Co-located API routes, no separate backend service needed for MVP |
| **Database** | PostgreSQL 16 (via Supabase) | Relational model fits data structure, Supabase adds auth/realtime/storage free tier |
| **ORM** | Drizzle ORM | Type-safe queries, lightweight, SQL-like syntax, excellent PostgreSQL support |
| **Payments** | Stripe (Checkout + Payment Intents) | Industry standard, PCI compliant, supports deposits and refunds |
| **Email** | Resend + React Email | Transactional emails with React-based templates, generous free tier |
| **Calendar Sync** | node-ical + custom cron | Parse iCal feeds from Airbnb/VRBO/Booking.com for availability sync |
| **File Storage** | Supabase Storage (S3-compatible) | Property images, hosted on CDN, integrated with database |
| **Caching** | Next.js ISR + fetch cache | Incremental Static Regeneration for property pages, on-demand revalidation |

### Infrastructure & DevOps

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Hosting** | Vercel | Native Next.js deployment, edge network, preview deployments, analytics |
| **Database Hosting** | Supabase (managed PostgreSQL) | Free tier covers MVP, managed backups, connection pooling via Supavisor |
| **DNS / Domain** | Cloudflare | Free DNS, DDoS protection, SSL, page rules |
| **CI/CD** | Vercel Git Integration | Auto-deploy on push to main, preview deploys on PRs |
| **Monitoring** | Vercel Analytics + Sentry | Core Web Vitals tracking, error monitoring with source maps |
| **Analytics** | Google Analytics 4 + Google Tag Manager | Event tracking (property_view, begin_checkout, purchase), conversion funnels |

### Development Tools

| Tool | Purpose |
|------|---------|
| **pnpm** | Fast, disk-efficient package manager |
| **ESLint + Prettier** | Code linting and formatting |
| **Husky + lint-staged** | Pre-commit hooks for code quality |
| **Playwright** | E2E testing for booking flow |
| **Vitest** | Unit/integration tests |

---

## 2. Project Structure

```
website-str/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (marketing)/              # Route group: public pages
│   │   │   ├── page.tsx              # Homepage /
│   │   │   ├── about/page.tsx        # /about
│   │   │   ├── contact/page.tsx      # /contact
│   │   │   ├── reviews/page.tsx      # /reviews
│   │   │   ├── faq/page.tsx          # /faq
│   │   │   └── locations/
│   │   │       ├── page.tsx          # /locations hub
│   │   │       └── [city]/page.tsx   # /locations/tampa, /locations/st-petersburg
│   │   ├── properties/
│   │   │   ├── page.tsx              # /properties listing
│   │   │   └── [slug]/
│   │   │       ├── page.tsx          # /properties/:slug detail
│   │   │       └── book/page.tsx     # /properties/:slug/book checkout
│   │   ├── booking/
│   │   │   ├── confirmation/page.tsx # /booking/confirmation
│   │   │   └── cancel/page.tsx       # /booking/cancel
│   │   ├── blog/                     # V2
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── privacy-policy/page.tsx
│   │   ├── terms/page.tsx
│   │   ├── cancellation-policy/page.tsx
│   │   ├── house-rules/page.tsx
│   │   ├── not-found.tsx             # 404 page
│   │   ├── layout.tsx                # Root layout (header, footer)
│   │   ├── globals.css
│   │   └── api/
│   │       ├── bookings/route.ts     # Booking creation endpoint
│   │       ├── availability/route.ts # Availability check endpoint
│   │       ├── contact/route.ts      # Contact form handler
│   │       ├── stripe/
│   │       │   └── webhook/route.ts  # Stripe webhook handler
│   │       └── cron/
│   │           └── sync-ical/route.ts # iCal sync endpoint (Vercel Cron)
│   ├── components/
│   │   ├── ui/                       # shadcn/ui base components
│   │   ├── layout/
│   │   │   ├── header.tsx
│   │   │   ├── footer.tsx
│   │   │   ├── mobile-nav.tsx
│   │   │   └── cta-banner.tsx
│   │   ├── property/
│   │   │   ├── property-card.tsx
│   │   │   ├── property-grid.tsx
│   │   │   ├── photo-gallery.tsx
│   │   │   ├── amenities-grid.tsx
│   │   │   ├── sleeping-arrangements.tsx
│   │   │   ├── booking-widget.tsx     # Sticky sidebar booking widget
│   │   │   ├── house-rules-section.tsx
│   │   │   └── similar-properties.tsx
│   │   ├── booking/
│   │   │   ├── checkout-form.tsx
│   │   │   ├── booking-summary.tsx
│   │   │   ├── price-breakdown.tsx
│   │   │   ├── step-indicator.tsx
│   │   │   └── add-ons-selector.tsx
│   │   ├── home/
│   │   │   ├── hero-section.tsx
│   │   │   ├── value-props.tsx
│   │   │   ├── location-highlights.tsx
│   │   │   ├── trust-signals.tsx
│   │   │   └── why-book-direct.tsx
│   │   ├── reviews/
│   │   │   ├── review-card.tsx
│   │   │   ├── reviews-carousel.tsx
│   │   │   └── rating-summary.tsx
│   │   └── shared/
│   │       ├── search-bar.tsx
│   │       ├── date-range-picker.tsx
│   │       ├── guest-selector.tsx
│   │       ├── map-view.tsx
│   │       ├── faq-accordion.tsx
│   │       ├── contact-form.tsx
│   │       └── seo-metadata.tsx
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts             # Drizzle schema (all data models)
│   │   │   ├── migrations/           # SQL migrations
│   │   │   └── seed.ts               # Seed data for 4 properties
│   │   ├── stripe.ts                 # Stripe client + helpers
│   │   ├── email.ts                  # Resend email helpers
│   │   ├── ical-sync.ts             # iCal parsing and availability sync
│   │   ├── availability.ts          # Availability checking logic
│   │   ├── pricing.ts               # Price calculation (nightly, fees, taxes)
│   │   └── validators.ts            # Zod schemas for forms/API
│   ├── data/
│   │   ├── properties.ts            # Static property data (MVP, before CMS)
│   │   ├── amenities.ts             # Amenity definitions
│   │   ├── reviews.ts               # Imported reviews from OTAs
│   │   └── locations.ts             # Area guide content
│   └── types/
│       └── index.ts                  # Shared TypeScript types
├── public/
│   ├── images/
│   │   ├── properties/              # Property photos
│   │   ├── locations/               # Area guide images
│   │   └── brand/                   # Logo, icons, og-images
│   └── robots.txt
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.local                        # Environment variables (not committed)
```

---

## 3. Database Schema (Drizzle ORM)

Maps directly to the data models defined in the architecture document (Section 3).

| Table | Architecture Model | Key Fields |
|-------|-------------------|------------|
| `properties` | 3.1 Property | slug, name, property_type, location, pricing, status |
| `property_images` | 3.2 Property Image | property_id FK, url, alt_text, category, sort_order, is_cover |
| `amenities` | 3.3 Amenity | name, icon, category |
| `property_amenities` | Junction table | property_id, amenity_id (many-to-many) |
| `sleeping_arrangements` | 3.4 Sleeping Arrangement | property_id FK, room_name, bed_type, bed_count |
| `availability` | 3.5 Availability | property_id FK, date, status, price_override, min_nights, source |
| `bookings` | 3.6 Booking | confirmation_code, property_id FK, guest_id FK, dates, pricing, status |
| `guests` | 3.7 Guest | first_name, last_name, email, phone, auth_user_id, stripe_customer_id |
| `reviews` | 3.8 Review | property_id FK, guest_name, rating, comment, source |
| `add_on_services` | 3.9 Add-On Service | name, price, price_type, applicable_properties |
| `locations` | 3.10 Location | slug, name, description, hero_image, attractions, transport_info |
| `property_ical_feeds` | 3.11 Property iCal Feed | property_id FK, source, url, is_active |

---

## 4. Execution Phases

### Phase 1: MVP — Core Booking Experience

**Milestone: Functional website with booking capability**

#### Step 1: Project Setup (Days 1–2)
- [ ] Initialize Next.js 15 project with TypeScript, Tailwind CSS, pnpm
- [ ] Configure ESLint, Prettier, Husky pre-commit hooks
- [ ] Set up shadcn/ui component library
- [ ] Create Supabase project, configure PostgreSQL database
- [ ] Define Drizzle ORM schema for all data models
- [ ] Run initial migration, seed 4 properties with real data
- [ ] Set up Vercel project with Git integration
- [ ] Configure environment variables (.env.local)

#### Step 2: Layout & Navigation (Days 3–4)
- [ ] Root layout with header (logo, nav, Book Now CTA) and footer
- [ ] Mobile hamburger menu with full-screen overlay
- [ ] Footer with 4-column navigation (Properties, Company, Resources, Legal)
- [ ] 404 not-found page
- [ ] SEO metadata component (meta tags, Open Graph, structured data)

#### Step 3: Homepage (Days 5–7)
- [ ] Hero section with background image and search bar (dates, guests)
- [ ] Property cards grid (thumbnail, name, location, capacity, price)
- [ ] Value proposition strip (4 icons: Book Direct & Save, Self Check-in, Superhost, Pet Friendly)
- [ ] Guest reviews carousel (aggregated from Airbnb/VRBO)
- [ ] Trust signals bar (Superhost badge, review count, years hosting)
- [ ] "Why Book Direct?" CTA banner
- [ ] Structured data: LocalBusiness, LodgingBusiness

#### Step 4: Properties Listing Page (Days 8–9)
- [ ] Property cards with swipeable thumbnail gallery
- [ ] Filter bar (location, property type, guests, pet-friendly)
- [ ] Sort controls (price, rating, capacity)
- [ ] Empty state for no filter results
- [ ] URL-based filter state with nuqs

#### Step 5: Property Detail Page (Days 10–14)
- [ ] Photo gallery with lightbox (organized by category)
- [ ] Quick facts bar (guests, bedrooms, beds, bathrooms)
- [ ] Sticky booking widget (desktop sidebar): date picker, guest selector, price breakdown, Book Now CTA
- [ ] Mobile sticky bottom CTA bar
- [ ] Description sections (overview, the space, guest access)
- [ ] Amenities grid with "Show all" expandable
- [ ] Sleeping arrangements visual cards
- [ ] House rules section
- [ ] Location section with Leaflet map
- [ ] Reviews section with rating summary
- [ ] Host info card
- [ ] Similar properties cross-sell cards
- [ ] FAQ accordion (property-specific)
- [ ] Structured data: VacationRental, BreadcrumbList, Review

#### Step 6: Booking & Checkout Flow (Days 15–19)
- [ ] Stripe integration (Payment Intents API)
- [ ] Checkout page with step indicator (Guest Info → Payment → Confirmation)
- [ ] Booking summary sidebar (property, dates, rate breakdown, total)
- [ ] Guest information form (name, email, phone, special requests, arrival time)
- [ ] Payment form (Stripe Elements)
- [ ] Policy acceptance checkboxes (cancellation, house rules, terms)
- [ ] Confirm & Pay button with total amount
- [ ] Stripe webhook handler for payment confirmation
- [ ] Booking record creation in database
- [ ] Availability calendar update (mark dates as booked)

#### Step 7: Booking Confirmation Page (Days 19–20)
- [ ] Success message with confirmation code and animated checkmark
- [ ] Reservation summary (property, dates, guests, total)
- [ ] Next steps info (email confirmation, check-in instructions timing)
- [ ] Contact host link

#### Step 8: iCal Availability Sync (Days 20–22)
- [ ] iCal feed parser for Airbnb, VRBO, Booking.com calendars
- [ ] Vercel Cron job running every 15 minutes
- [ ] Availability table updates (mark dates as booked/blocked per source)
- [ ] Booking widget respects synced availability (blocked dates shown as unavailable)

#### Step 9: Transactional Emails (Days 22–23)
- [ ] Resend + React Email setup
- [ ] Booking confirmation email to guest (reservation details, check-in info)
- [ ] New booking alert email to host
- [ ] Contact form submission email

#### Step 10: Static & Supporting Pages (Days 23–25)
- [ ] About page (host story, credentials, values)
- [ ] Contact page (form, direct contact info, social links)
- [ ] Reviews page (aggregated reviews, filter by property)
- [ ] Privacy Policy, Terms & Conditions, Cancellation Policy, House Rules pages

#### Step 11: SEO & Performance (Days 25–27)
- [ ] Meta tags and Open Graph for all pages
- [ ] XML sitemap generation (next-sitemap)
- [ ] robots.txt configuration
- [ ] Image optimization (next/image with WebP, responsive srcset, lazy loading)
- [ ] Google Analytics 4 setup with key events
- [ ] Core Web Vitals audit (target: LCP < 2.5s, CLS < 0.1)

#### Step 12: Testing & Launch (Days 27–30)
- [ ] Playwright E2E tests for complete booking flow
- [ ] Mobile responsiveness testing across devices
- [ ] Accessibility audit (WCAG 2.1 AA checklist)
- [ ] Stripe test mode → live mode switch
- [ ] SSL/HTTPS verification
- [ ] Production deployment to Vercel
- [ ] DNS configuration via Cloudflare
- [ ] Smoke test all pages and booking flow on production

---

### Phase 2: V1 — Enhanced Experience & Operations

- [ ] Interactive map view on properties listing (Leaflet split view)
- [ ] Location area guide pages (/locations/tampa, /locations/st-petersburg)
- [ ] FAQ page with structured data (FAQPage schema)
- [ ] Add-on upsells in booking flow (pool heating, early check-in, pet fee)
- [ ] Price breakdown component with transparent fee display
- [ ] Photo gallery organized by room/category
- [ ] Guest review filtering by property
- [ ] Add-to-calendar buttons on confirmation page
- [ ] "Why Book Direct?" comparison component (price savings vs OTAs)
- [ ] Basic admin dashboard (bookings list, calendar view)
- [ ] Automated email sequences (pre-arrival, post-checkout review request)
- [ ] Dynamic pricing support (seasonal rates, weekend premiums, min-night rules)
- [ ] Google Vacation Rentals feed
- [ ] Two-way calendar sync (write-back to OTAs on direct booking)
- [ ] Basic guest CRM
- [ ] Facebook Pixel / Meta Conversions API
- [ ] Sentry error monitoring

---

### Phase 3: V2 — Growth & Loyalty

- [ ] Blog / local guides with CMS (MDX or Sanity)
- [ ] Multi-language support (English + Spanish) via next-intl
- [ ] Guest account portal (upcoming/past reservations, re-book)
- [ ] Loyalty program (coupon codes, repeat guest discounts)
- [ ] Live chat widget or AI chatbot
- [ ] Property comparison feature (side-by-side)
- [ ] Virtual tour / 360-degree photos
- [ ] Full admin panel (property management, content editing)
- [ ] Email marketing automation (newsletter, abandoned booking recovery)
- [ ] Advanced analytics dashboard
- [ ] Guest identity verification
- [ ] Automated review aggregation from OTA platforms
- [ ] A/B testing framework
- [ ] Cookie consent banner (GDPR compliance)

---

## 5. Environment Variables

```env
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
RESEND_API_KEY=re_...

# iCal Sync URLs
# Note: iCal Sync URLs are stored dynamically in the database (property_ical_feeds table)

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-...

# App
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
CRON_SECRET=...
```

---

## 6. Key Technical Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| **SSR vs SPA** | SSR/SSG via Next.js | SEO is critical for property discovery; property pages must be indexable |
| **Database** | PostgreSQL (not NoSQL) | Relational data models with foreign keys (bookings → properties → guests) |
| **Hosting** | Vercel (not self-hosted) | Zero-config Next.js deploys, edge CDN, preview environments, Cron Jobs |
| **Payments** | Stripe (not PayPal only) | Better DX, Payment Intents for SCA compliance, webhooks, refund support |
| **Styling** | Tailwind (not CSS Modules) | Faster development, consistent design tokens, mobile-first utilities |
| **ORM** | Drizzle (not Prisma) | Lighter weight, better SQL control, faster cold starts on serverless |
| **Content (MVP)** | 100% Database-driven (Supabase) | Single source of truth from Day 1. Static data files used only for initial seeding. |
| **Maps** | Leaflet (not Google Maps) | Free, no API billing, sufficient for pinning 4 locations |
| **Calendar sync** | iCal polling (not API) | All OTAs support iCal export; API integration requires PMS (V1/V2) |
| **Email** | Resend (not SendGrid) | Modern DX, React Email templates, generous free tier (100 emails/day) |
