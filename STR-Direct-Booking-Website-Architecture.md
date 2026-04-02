**PROJECT ARCHITECTURE**

Information Architecture & Website Structure

**Short-Term Rental Direct Booking Website**

Tampa Bay & St. Petersburg, FL • 4 Properties

  ------------------------- ------------------- ------------ -------------- --------------------
  **Property**              **Type**            **Guests**   **Bedrooms**   **Location**

  **Cozy Room Tampa**       Private Room        2            1 BR / 1 BA    Tampa, FL

  **Room Paradise Tampa**   Guest Suite         2            1 BR / 1 BA    Tampa, FL

  **Small House Tampa**     Entire Guesthouse   2            1 BR / 1 BA    Tampa, FL

  **St Pete Oasis**         Entire Home         12           4 BR / 2 BA    St. Petersburg, FL
  ------------------------- ------------------- ------------ -------------- --------------------

Document Version 1.0 • March 2026

1\. Complete Sitemap (Page Hierarchy)

Tree structure of all pages organized by navigation level and functional grouping.

**/ Homepage**

├─ **/properties** Properties Listing (All Properties)

│ ├─ /properties/:slug Property Detail Page

│ └─ /properties/:slug/book Booking / Checkout Flow

├─ **/locations** Locations Hub

│ ├─ /locations/tampa Tampa Area Guide

│ └─ /locations/st-petersburg St. Petersburg Area Guide

├─ **/about** About Us / Host Story

├─ **/reviews** Guest Reviews (Aggregated)

├─ **/faq** Frequently Asked Questions

├─ **/contact** Contact Us

├─ **/blog** Blog / Local Guides (V2)

│ └─ /blog/:slug Blog Post Detail

├─ /privacy-policy Privacy Policy

├─ /terms Terms & Conditions

├─ /cancellation-policy Cancellation Policy

└─ /house-rules House Rules

**Transactional Pages (no main nav):**

├─ /booking/confirmation Booking Confirmation

├─ /booking/cancel Cancellation Request

└─ /404 Not Found

*Reference pattern: Follows flat hierarchy used by Vacasa, AvantStay, and boutique STR sites. Max 2 levels deep to minimize clicks-to-book.*

2\. Page Specifications

Purpose, target audience, and component blocks for every page.

2.1 Homepage /

**Purpose:** Primary landing page. Communicate brand value, showcase properties, build trust, and drive users toward booking.

**Target audience:** First-time visitors from search engines, social media, or referrals.

**Blocks / Components:**

-   **Hero section:** Full-width image/video with search bar (check-in, check-out, guests) and primary CTA.

-   **Property cards grid:** Card per property with thumbnail, name, location tag, guest capacity, star rating, and starting price.

-   **Value proposition strip:** 3--4 icons with benefits (e.g., "Book Direct & Save", "Self Check-in", "Superhost Quality", "Pet Friendly Options").

-   **Location highlights:** Map or cards linking to Tampa and St. Petersburg area guides.

-   **Guest reviews carousel:** Aggregated reviews from Airbnb/VRBO with guest name, rating, and snippet.

-   **Trust signals bar:** Superhost badge, total reviews count, years hosting, OTA logos where also listed.

-   **CTA banner:** "Why Book Direct?" section explaining price advantage and personal service.

-   **Footer:** Navigation links, contact info, social media, legal links, language selector (V2).

*Reference: Modeled after Vacasa, Evolve, and AvantStay homepages which prioritize search-first hero + property grid.*

2.2 Properties Listing /properties

**Purpose:** Browse all available properties with filtering. Serve as the main catalog page.

**Target audience:** Users comparing options or arriving from SEO for location-based queries.

**Blocks / Components:**

-   **Filter bar:** Location (Tampa / St. Pete), property type (room / house), guests count, date range, amenities, pet-friendly toggle.

-   **Property cards:** Thumbnail gallery (swipeable), name, location, capacity, beds/baths, rating, price/night, "Book Now" CTA.

-   **Sort controls:** By price, rating, capacity, newest.

-   **Map view toggle (V1):** Map with pins showing property locations alongside card list.

-   **Empty state:** Messaging when filters return no results with suggestion to adjust dates or filters.

*Reference: Airbnb search results pattern: card grid + map split view. For 4 properties, list view is sufficient for MVP.*

2.3 Property Detail /properties/:slug

**Purpose:** Showcase a single property with all details needed to make a booking decision. This is the most critical conversion page.

**Target audience:** Users evaluating a specific property, direct links shared via marketing or social.

**Blocks / Components:**

-   **Photo gallery:** Hero image + grid with lightbox. Organized by category (bedroom, bathroom, kitchen, exterior).

-   **Quick facts bar:** Guests, bedrooms, beds, bathrooms, property type.

-   **Booking widget (sticky sidebar on desktop):** Date picker, guest selector, price breakdown, "Book Now" CTA. Always visible.

-   **Description section:** Property overview, the space, guest access, during your stay.

-   **Amenities grid:** Icon + label for each amenity. Expandable "Show all".

-   **Sleeping arrangements:** Visual cards per bedroom showing bed type and count.

-   **House rules:** Check-in/out times, pet policy, smoking policy, noise policy, additional fees.

-   **Location section:** Embedded map (approximate area), distance to landmarks, neighborhood description.

-   **Reviews section:** Rating summary, individual reviews with date and guest name.

-   **Host info card:** Host name, photo, Superhost badge, years hosting, response time.

-   **Similar properties:** Cards linking to other properties (cross-sell).

-   **FAQ accordion:** Property-specific questions (parking, early check-in, pet fees).

*Reference: Directly modeled after Airbnb listing detail page structure. Sticky booking widget pattern used by Booking.com, Vrbo, Vacasa.*

2.4 Booking / Checkout /properties/:slug/book

**Purpose:** Collect guest information and payment to complete a reservation.

**Target audience:** Users who have decided to book. Minimize friction.

**Blocks / Components:**

-   **Step indicator:** Visual progress (Guest Info → Extras → Payment → Confirmation).

-   **Booking summary sidebar:** Property thumbnail, dates, guests, nightly rate, cleaning fee, pet fee (if applicable), taxes, total.

-   **Guest information form:** Full name, email, phone, special requests, estimated arrival time.

-   **Add-ons (V1):** Pool heating (\$100/\$150), early check-in, pet fee (\$52), extra cleaning.

-   **Payment form:** Stripe/PayPal integration. Card number, expiry, CVC.

-   **Policy acceptance:** Checkboxes for cancellation policy, house rules, terms & conditions.

-   **Confirm button:** Clear total amount and "Confirm & Pay" CTA.

*Reference: Booking.com single-page checkout with sidebar summary. Vrbo step-by-step flow with transparent pricing.*

2.5 Booking Confirmation /booking/confirmation

**Purpose:** Confirm successful reservation and set expectations for the stay.

**Target audience:** Guest who just completed booking.

**Blocks / Components:**

-   **Success message:** Confirmation number, animated checkmark.

-   **Reservation summary:** Property, dates, guests, total paid.

-   **Next steps:** What to expect (confirmation email, check-in instructions timing, host contact).

-   **Add to calendar:** Google Calendar / iCal / Outlook links.

-   **Contact host:** Direct messaging or email link.

2.6 Location Area Guide /locations/:city

**Purpose:** SEO landing page for location-based searches. Provide local context to increase booking confidence.

**Target audience:** Travelers researching Tampa Bay / St. Petersburg as a destination.

**Blocks / Components:**

-   **Hero with location imagery:** City skyline or landmark photo with area name.

-   **Area description:** Neighborhood overview, vibe, what makes it special.

-   **Properties in this area:** Filtered property cards for that location.

-   **Local attractions:** Nearby points of interest, restaurants, beaches, distances.

-   **Transportation tips:** Airport info, parking, public transit.

-   **Embedded map:** Area map with property pins and attraction markers.

*Reference: Vacasa and Evolve use area guide pages as SEO pillars. Marriott Homes & Villas also uses destination pages.*

2.7 About Us /about

**Purpose:** Build trust through the host's personal story. Differentiate from anonymous OTA listings.

**Target audience:** Guests who want to know who they're booking with.

**Blocks / Components:**

-   **Host story section:** Photo, bio, hosting philosophy, years of experience.

-   **Superhost credentials:** Badges, total reviews, ratings across platforms.

-   **Mission / values:** What guests can expect (cleanliness, communication, comfort).

-   **CTA:** "Browse Our Properties" link.

2.8 Guest Reviews /reviews

**Purpose:** Aggregate and display social proof from all platforms and properties.

**Target audience:** Guests in the consideration stage needing trust validation.

**Blocks / Components:**

-   **Overall rating summary:** Average across all properties, total review count.

-   **Filter by property:** Tabs or dropdown to view reviews per property.

-   **Review cards:** Guest name, date, rating, review text, property tag.

-   **Platform badges:** Indicate if review is from Airbnb, VRBO, Booking.com, or direct.

2.9 FAQ /faq

**Purpose:** Answer common questions to reduce pre-booking support inquiries and booking friction.

**Target audience:** All potential guests. Also serves as SEO content.

**Blocks / Components:**

-   **Category tabs:** Booking, Check-in/Check-out, Payments, Pet Policy, Cancellation, House Rules.

-   **Accordion items:** Question + expandable answer. Structured data (FAQ schema) for SEO.

-   **Contact CTA:** "Still have questions?" link to contact page.

2.10 Contact Us /contact

**Purpose:** Provide direct communication channel. Build confidence that there is a real person behind the website.

**Target audience:** Guests with pre-booking questions or existing reservation inquiries.

**Blocks / Components:**

-   **Contact form:** Name, email, subject (dropdown: booking inquiry / existing reservation / general), message.

-   **Direct contact info:** Email, phone, WhatsApp (optional), response time expectation.

-   **Social media links:** Instagram, Facebook.

2.11 Blog / Local Guides /blog (V2)

**Purpose:** SEO content engine. Attract organic traffic with destination-related content.

**Target audience:** Travelers researching Tampa Bay area via search engines.

**Blocks / Components:**

-   **Post listing:** Card grid with featured image, title, excerpt, date, category tag.

-   **Categories:** Local Guides, Things To Do, Travel Tips, Events.

-   **Post detail:** Full article with images, related properties sidebar CTA, social share buttons.

2.12 Legal Pages

Privacy Policy, Terms & Conditions, Cancellation Policy, House Rules.

**Purpose:** Legal compliance, transparency, and trust. Required for payment processing (Stripe/PayPal).

**Blocks / Components:**

-   Static content pages with clear section headings.

-   Cancellation policy should include a visual timeline or table showing refund percentages by date range.

-   House Rules page should consolidate rules that apply across all properties plus property-specific variations.

3\. Data Models

Minimum data entities required to power the website. Defined as logical models independent of database technology.

3.1 Property

  ----------------------- --------------- --------------------------------------------------
  **Field**               **Type**        **Notes**

  **id**                  UUID            Primary key

  **slug**                String          URL-friendly identifier (e.g., cozy-room-tampa)

  **name**                String          Display name

  **property_type**       Enum            room \| guest_suite \| guesthouse \| entire_home

  **description**         Text (rich)     Full property description with sections

  **short_description**   String          Summary for cards (max 160 chars)

  **location_city**       String          Tampa \| St. Petersburg

  **location_address**    String          Approximate or full address

  **location_lat**        Float           Latitude for map

  **location_lng**        Float           Longitude for map

  **max_guests**          Integer         Maximum occupancy

  **bedrooms**            Integer         Number of bedrooms

  **beds**                Integer         Number of beds

  **bathrooms**           Integer         Number of bathrooms

  **amenities**           Array\<Ref\>    References to Amenity model

  **house_rules**         Text            Property-specific rules

  **check_in_time**       Time            Default check-in time

  **check_out_time**      Time            Default check-out time

  **base_price_night**    Decimal         Starting nightly rate

  **cleaning_fee**        Decimal         One-time cleaning fee

  **pet_fee**             Decimal         Per-stay pet fee (if applicable)

  **pet_allowed**         Boolean         Whether pets are accepted

  **smoking_allowed**     Boolean         Smoking policy

  **status**              Enum            active \| inactive \| maintenance

  **airbnb_url**          URL             Link to Airbnb listing

  **vrbo_url**            URL             Link to VRBO listing

  **booking_com_url**     URL             Link to Booking.com listing

  **created_at**          Timestamp       Record creation date
  ----------------------- --------------- --------------------------------------------------

3.2 Property Image

  ------------------ --------------- -----------------------------------------------------------------
  **Field**          **Type**        **Notes**

  **id**             UUID            Primary key

  **property_id**    UUID FK         References Property

  **url**            URL             Image file path or CDN URL

  **alt_text**       String          Accessibility alt text

  **category**       Enum            bedroom \| bathroom \| kitchen \| living \| exterior \| amenity

  **sort_order**     Integer         Display order in gallery

  **is_cover**       Boolean         Primary image for property cards
  ------------------ --------------- -----------------------------------------------------------------

3.3 Amenity

  ------------------ --------------- ------------------------------------------------------------------------
  **Field**          **Type**        **Notes**

  **id**             UUID            Primary key

  **name**           String          Display name (e.g., WiFi, Pool, Hot Tub)

  **icon**           String          Icon identifier or SVG reference

  **category**       Enum            essentials \| kitchen \| safety \| outdoor \| entertainment \| parking
  ------------------ --------------- ------------------------------------------------------------------------

3.4 Sleeping Arrangement

  ------------------ --------------- ---------------------------------------------
  **Field**          **Type**        **Notes**

  **id**             UUID            Primary key

  **property_id**    UUID FK         References Property

  **room_name**      String          e.g., Bedroom 1, Living Room

  **bed_type**       Enum            queen \| full \| bunk \| sofa_bed \| single

  **bed_count**      Integer         Number of beds of this type in the room
  ------------------ --------------- ---------------------------------------------

3.5 Availability (Calendar)

  -------------------- --------------- ---------------------------------------------------
  **Field**            **Type**        **Notes**

  **id**               UUID            Primary key

  **property_id**      UUID FK         References Property

  **date**             Date            Calendar date

  **status**           Enum            available \| booked \| blocked

  **price_override**   Decimal         Custom price for this date (seasonal, weekend)

  **min_nights**       Integer         Minimum stay requirement for this date

  **source**           Enum            direct \| airbnb \| vrbo \| booking_com \| manual
  -------------------- --------------- ---------------------------------------------------

3.6 Booking (Reservation)

  ----------------------- --------------- ------------------------------------------------
  **Field**               **Type**        **Notes**

  **id**                  UUID            Primary key

  **confirmation_code**   String          Guest-facing code (e.g., BK-2026-0001)

  **property_id**         UUID FK         References Property

  **guest_id**            UUID FK         References Guest

  **check_in**            Date            Arrival date

  **check_out**           Date            Departure date

  **num_guests**          Integer         Number of guests

  **num_nights**          Integer         Computed from dates

  **nightly_rate**        Decimal         Rate charged per night

  **cleaning_fee**        Decimal         Cleaning fee applied

  **pet_fee**             Decimal         Pet fee if applicable

  **add_ons_total**       Decimal         Sum of optional add-ons

  **taxes**               Decimal         Applicable taxes

  **total_amount**        Decimal         Grand total charged

  **payment_status**      Enum            pending \| paid \| refunded \| partial_refund

  **booking_status**      Enum            confirmed \| cancelled \| completed \| no_show

  **payment_intent_id**   String          Stripe payment intent reference

  **special_requests**    Text            Guest notes or requests

  **arrival_time**        Time            Estimated arrival time

  **source**              Enum            direct \| airbnb \| vrbo \| booking_com

  **created_at**          Timestamp       When booking was made
  ----------------------- --------------- ------------------------------------------------

3.7 Guest

  -------------------- --------------- ------------------------------------
  **Field**            **Type**        **Notes**

  **id**               UUID            Primary key

  **first_name**       String          Guest first name

  **last_name**        String          Guest last name

  **email**            Email           Primary contact and login

  **phone**            String          Phone number with country code

  **auth_user_id**     UUID            Optional link to Supabase auth.users for V2 portal

  **stripe_customer_id** String        Optional Stripe Customer ID for repeat bookings/refunds

  **language_pref**    Enum            en \| es (V2)

  **total_bookings**   Integer         Computed: count of past bookings

  **created_at**       Timestamp       First interaction date
  -------------------- --------------- ------------------------------------

3.8 Review

  ------------------ --------------- -----------------------------------------
  **Field**          **Type**        **Notes**

  **id**             UUID            Primary key

  **property_id**    UUID FK         References Property

  **guest_name**     String          Reviewer display name

  **rating**         Decimal         1.0 -- 5.0 scale

  **comment**        Text            Review content

  **source**         Enum            airbnb \| vrbo \| booking_com \| direct

  **review_date**    Date            When the review was posted
  ------------------ --------------- -----------------------------------------

3.9 Add-On Service

  --------------------------- --------------- -----------------------------------------
  **Field**                   **Type**        **Notes**

  **id**                      UUID            Primary key

  **name**                    String          e.g., Pool Heating, Early Check-in

  **description**             String          Short explanation

  **price**                   Decimal         Fee amount

  **price_type**              Enum            flat \| per_night \| per_stay

  **applicable_properties**   Array\<UUID\>   Which properties this add-on applies to
  --------------------------- --------------- -----------------------------------------

3.10 Location (Area)

  -------------------- --------------- -----------------------------------------------------------
  **Field**            **Type**        **Notes**

  **id**               UUID            Primary key

  **slug**             String          URL slug (tampa, st-petersburg)

  **name**             String          Display name

  **description**      Text            Area guide content

  **hero_image**       URL             Area hero image

  **attractions**      JSON            Array of nearby attractions with name, distance, category

  **transport_info**   Text            Airport, parking, transit information
  -------------------- --------------- -----------------------------------------------------------

3.11 Property iCal Feed

  -------------------- --------------- -----------------------------------------------------------
  **Field**            **Type**        **Notes**

  **id**               UUID            Primary key

  **property_id**      UUID FK         References Property

  **source**           Enum            airbnb \| vrbo \| booking_com

  **url**              URL             The iCal feed URL to parse

  **is_active**        Boolean         Whether the cron job should process this feed
  -------------------- --------------- -----------------------------------------------------------

4\. Navigation Structure

Header main menu structure with sub-menus. No secondary navigation.

4.1 Desktop Header Layout

Logo (left) \| Main Nav (center) \| Book Now CTA Button (right)

4.2 Main Menu Items

  ---------------- ----------------- --------------------------------------------- -------------------
  **Menu Label**   **Links To**      **Sub-Menu Items**                            **Phase**

  **Properties**   /properties       None (4 properties visible on page)           MVP

  **Locations**    /locations        Tampa \| St. Petersburg                       MVP

  **Reviews**      /reviews          None                                          MVP

  **About**        /about            None                                          MVP

  **FAQ**          /faq              None                                          V1

  **Contact**      /contact          None                                          MVP

  **Blog**         /blog             Local Guides \| Things To Do \| Travel Tips   V2
  ---------------- ----------------- --------------------------------------------- -------------------

4.3 Mobile Navigation

-   Hamburger menu icon (right side of header).

-   Full-screen overlay menu with all items stacked vertically.

-   **Sticky "Book Now" button** at bottom of screen on property detail pages (mobile only).

-   Sub-menus expand inline as accordions.

4.4 Footer Navigation

Organized in 3--4 columns:

-   **Properties:** Links to each property by name.

-   **Company:** About, Contact, Reviews.

-   **Resources:** FAQ, Blog (V2), Area Guides.

-   **Legal:** Privacy Policy, Terms, Cancellation Policy, House Rules.

-   Social media icons row below columns.

-   Language selector (V2) in footer bottom bar.

*Reference: Flat primary nav pattern used by Vacasa, Evolve, and Sonder. Max 5--7 items. CTA button always visible in header.*

5\. Key Functionalities by Phase

Phased rollout without timeframes. Each phase builds on the previous.

5.1 MVP --- Core Booking Experience

Goal: A functional website where guests can discover properties, view details, and complete a booking.

Frontend

-   Responsive homepage with property cards grid and hero section.

-   Property detail pages with photo gallery, description, amenities, and house rules.

-   Sticky booking widget with date picker and guest selector.

-   Booking checkout flow (single page or multi-step) with guest info and payment.

-   Booking confirmation page with summary and next steps.

-   About, Contact, and Reviews pages.

-   Legal pages (privacy, terms, cancellation, house rules).

-   Mobile-responsive design (mobile-first approach).

-   SEO fundamentals: meta tags, Open Graph, structured data (LocalBusiness, LodgingBusiness, FAQ schema).

Backend / Integrations

-   Static or CMS-managed property content (no admin panel yet).

-   iCal sync to import availability from Airbnb, VRBO, Booking.com (read-only, prevents double bookings).

-   Stripe or PayPal payment gateway integration.

-   Booking notification emails (confirmation to guest + alert to host).

-   Contact form with email forwarding.

-   SSL certificate and HTTPS.

-   Google Analytics 4 + basic conversion tracking.

5.2 V1 --- Enhanced Experience & Operations

Goal: Improve conversion rate, add operational tools, and expand guest experience.

Frontend Enhancements

-   Interactive map view on properties listing page.

-   Location area guide pages (/locations/tampa, /locations/st-petersburg).

-   FAQ page with accordion and structured data markup.

-   Add-on upsells in booking flow (pool heating, early check-in, pet fee).

-   Price breakdown component with transparent fee display (pattern from Vrbo).

-   Photo gallery organized by room/category with lightbox navigation.

-   Guest review filtering by property.

-   Add-to-calendar buttons on confirmation page.

-   "Why Book Direct?" comparison component showing price savings vs OTAs.

Backend / Integrations

-   Basic admin dashboard for managing bookings and viewing calendar.

-   Automated email sequences: pre-arrival (check-in instructions), during stay, post-checkout (review request).

-   Dynamic pricing support (seasonal rates, weekend premiums, min-night rules).

-   Google Vacation Rentals feed integration.

-   WhatsApp or SMS messaging integration for guest communication.

-   Two-way calendar sync (write-back to OTA calendars when direct booking is made).

-   Basic guest CRM: store guest data for repeat booking outreach.

5.3 V2 --- Growth & Loyalty

Goal: Drive organic traffic, build guest loyalty, and scale the brand.

Frontend Enhancements

-   Blog / local guides section with CMS-managed content.

-   Multi-language support (English + Spanish minimum, given Tampa Bay demographics).

-   Guest account portal: view upcoming/past reservations, re-book, save favorites.

-   Loyalty/discount program for returning guests (coupon codes, percentage off repeat bookings).

-   Live chat widget or AI chatbot for pre-booking questions.

-   Property comparison feature (side-by-side view).

-   Virtual tour / 360-degree photos integration.

Backend / Integrations

-   Full PMS (Property Management System) integration or custom admin panel.

-   Email marketing automation (newsletter, seasonal promotions, abandoned booking recovery).

-   Advanced analytics dashboard (booking source attribution, conversion funnels, revenue per property).

-   Guest identity verification (V2+).

-   Automated review aggregation from OTA platforms.

-   API endpoints for future mobile app or third-party integrations.

-   A/B testing framework for CTA buttons, pricing display, and hero images.

6\. Best Practice Recommendations

Based on patterns observed across professional STR websites (Vacasa, Evolve, AvantStay, Sonder, Marriott Homes & Villas, CraftedStays, Lodgify-built sites).

6.1 Accessibility (WCAG 2.1 AA)

-   All images must have descriptive alt text (critical for property photos).

-   Color contrast ratio minimum 4.5:1 for text, 3:1 for large text.

-   Keyboard navigable: all interactive elements (date picker, gallery, booking form) must be operable via keyboard.

-   ARIA labels on icons, buttons, and interactive components.

-   Skip-to-content link on every page.

-   Focus indicators visible on all interactive elements.

-   Form error messages associated with fields via aria-describedby.

6.2 Language & Localization & Timezones

-   **Strict Timezone Enforcement:** All Next.js API routes, date pickers, and database queries must be strictly forced to use `America/New_York` (EST/EDT) to prevent off-by-one errors in calendar availability.

-   **MVP:** English only. Write all UI copy in plain, conversational English suitable for international travelers.

-   **V2:** Add Spanish (Tampa Bay has 25%+ Hispanic population). Use i18n framework from the start to avoid costly retrofitting.

-   Use hreflang tags for multilingual SEO.

-   Dates in locale-appropriate format (MM/DD/YYYY for US, configurable for international).

-   Currency display: USD with \$ symbol; consider showing approximate conversion (V2).

6.3 SEO & Structured Data

-   **Schema.org markup:** LodgingBusiness, VacationRental, FAQPage, BreadcrumbList, Review, LocalBusiness.

-   Unique meta title and description per page. Property pages should include location, type, and key amenity.

-   Clean URL structure: /properties/cozy-room-tampa (not /properties?id=123).

-   XML sitemap and robots.txt.

-   Canonical URLs to avoid duplicate content.

-   Open Graph and Twitter Card tags for social sharing.

-   Google Vacation Rentals feed for search visibility (V1).

-   Location pages as SEO pillar content targeting "short term rental Tampa", "vacation rental St Petersburg FL".

6.4 Performance

-   **Core Web Vitals targets:** LCP \< 2.5s, FID \< 100ms, CLS \< 0.1.

-   Image optimization: WebP format, responsive srcset, lazy loading below fold.

-   CDN for static assets (images, CSS, JS).

-   Minimize third-party scripts. Defer non-critical JS.

-   Server-side rendering (SSR) or static generation for property pages (critical for SEO).

-   **Industry benchmark:** Purpose-built STR platforms load 4x faster than generic WordPress sites (CraftedStays data).

6.5 Trust & Conversion Signals

-   **Book Direct savings badge:** Clearly communicate the price advantage of booking direct vs OTAs. Pattern from AvantStay and Evolve.

-   **Transparent pricing:** Show complete price breakdown before checkout. No surprise fees. Pattern from Vrbo.

-   **Review aggregation:** Display Airbnb/VRBO reviews on your site with source badges. 131+ reviews on one property is a strong trust signal.

-   **Superhost badge:** Prominently display across all properties. Jhon has 4+ years and Superhost status.

-   **Response time indicator:** Show "Typically responds within 1 hour" or similar.

-   **Secure payment badges:** Stripe/PayPal logos, SSL lock icon, "Secure Checkout" messaging.

-   **Cancellation policy clarity:** Display policy prominently before and during checkout, not hidden in fine print.

6.6 Mobile-First Design

-   **60%+ of travel bookings happen on mobile** (industry data). Design mobile-first, then enhance for desktop.

-   Sticky bottom CTA bar on property detail pages (mobile).

-   Touch-friendly date picker and gallery (swipe gestures).

-   Collapsible sections for long content (description, amenities, reviews).

-   Click-to-call phone number.

-   Simplified mobile checkout: minimize form fields, support autofill.

6.7 Calendar & Availability Sync

-   **Critical:** Sync availability with Airbnb, VRBO, and Booking.com via iCal to prevent double bookings.

-   **Database-Driven Feeds:** Store iCal feed URLs in the database (`property_ical_feeds`), not environment variables, so the sync process can scale dynamically.

-   Sync frequency: minimum every 15 minutes for iCal via Vercel Cron, real-time via API if using a PMS.

-   **Transactional Concurrency:** Booking Next.js Route Handlers must use PostgreSQL Transactions (via Drizzle) to lock rows and prevent double bookings if two users try to book the exact same dates simultaneously.

-   Show real-time availability on the booking widget. Blocked dates should be visually distinct.

-   Consider a channel manager (Hostaway, Guesty, Lodgify) for two-way sync.

6.8 Legal & Compliance

-   Florida short-term rental tax collection and remittance (Tourist Development Tax).

-   Cookie consent banner (GDPR if targeting international guests).

-   PCI DSS compliance through Stripe/PayPal (never handle raw card data).

-   Clear cancellation and refund policy displayed before payment.

-   Accessibility statement page.

-   Privacy policy compliant with CCPA and GDPR.

6.9 Analytics & Tracking

-   Google Analytics 4 with enhanced ecommerce events.

-   **Key events to track:** property_view, search_dates, begin_checkout, purchase, contact_form_submit.

-   UTM parameters for marketing campaigns.

-   Facebook Pixel / Meta Conversions API for retargeting (V1).

-   Google Search Console for organic search performance.

-   Heatmaps (Hotjar or Microsoft Clarity) for UX insights.

6.10 Content Strategy Patterns

-   **Property descriptions:** Lead with the hook (location, key feature), then details. Avoid duplicating Airbnb copy word-for-word; rewrite for your brand voice.

-   **Unique selling points per property:** Cozy Room = budget + private entrance; Room Paradise = private kitchen; Small House = full independence; St Pete Oasis = pool + groups.

-   **Photo sequencing:** Hero exterior → living area → bedroom → bathroom → kitchen → outdoor space → neighborhood. Pattern from Airbnb top-performing listings.

-   **"Book Direct" messaging:** Include on business cards left at properties, in Airbnb message templates, and on social media. This is the #1 driver of direct booking traffic.
