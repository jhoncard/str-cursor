import { pgTable, text, timestamp, varchar, integer, numeric, boolean, uuid, date, pgEnum, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const propertyTypeEnum = pgEnum('property_type', ['room', 'guest_suite', 'guesthouse', 'entire_home']);
export const propertyStatusEnum = pgEnum('property_status', ['active', 'inactive', 'maintenance']);
export const amenityCategoryEnum = pgEnum('amenity_category', ['essentials', 'kitchen', 'safety', 'outdoor', 'entertainment', 'parking']);
export const availabilityStatusEnum = pgEnum('availability_status', ['available', 'booked', 'blocked']);
export const bookingSourceEnum = pgEnum('booking_source', ['direct', 'airbnb', 'vrbo', 'booking_com', 'manual', 'pricelabs']);
export const bookingPaymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'refunded', 'partial_refund']);
export const bookingStatusEnum = pgEnum('booking_status', ['confirmed', 'cancelled', 'completed', 'no_show']);
export const userRoleEnum = pgEnum('user_role', ['guest', 'admin']);

// Properties Table
export const properties = pgTable('properties', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  propertyType: propertyTypeEnum('property_type').notNull(),
  description: text('description'),
  /** Public URL of the rental agreement PDF (Supabase Storage); guests must accept before paying when set. */
  guestContractPdfUrl: text('guest_contract_pdf_url'),
  shortDescription: varchar('short_description', { length: 160 }),
  locationCity: varchar('location_city', { length: 255 }).notNull(),
  locationAddress: varchar('location_address', { length: 255 }),
  locationLat: numeric('location_lat'),
  locationLng: numeric('location_lng'),
  maxGuests: integer('max_guests').default(2).notNull(),
  bedrooms: integer('bedrooms').default(1).notNull(),
  beds: integer('beds').default(1).notNull(),
  bathrooms: integer('bathrooms').default(1).notNull(),
  basePriceNight: numeric('base_price_night').notNull(),
  /** PriceLabs listing ID (from their dashboard) when using dynamic pricing sync. */
  pricelabsListingId: varchar('pricelabs_listing_id', { length: 128 }),
  cleaningFee: numeric('cleaning_fee').default('0'),
  petFee: numeric('pet_fee').default('0'),
  status: propertyStatusEnum('status').default('active').notNull(),
  /** Secret token for public `.ics` export URL (Airbnb / VRBO import). */
  icalExportToken: uuid('ical_export_token').notNull().defaultRandom(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Property Images Table
export const propertyImages = pgTable('property_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  propertyId: uuid('property_id').references(() => properties.id).notNull(),
  url: text('url').notNull(),
  altText: varchar('alt_text', { length: 255 }),
  sortOrder: integer('sort_order').default(0),
  isCover: boolean('is_cover').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Availability Table
export const availability = pgTable('availability', {
  id: uuid('id').defaultRandom().primaryKey(),
  propertyId: uuid('property_id').references(() => properties.id).notNull(),
  date: date('date').notNull(),
  status: availabilityStatusEnum('status').default('available').notNull(),
  priceOverride: numeric('price_override'),
  minNights: integer('min_nights').default(1),
  source: bookingSourceEnum('source').default('direct').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Property iCal Feeds Table (import from Airbnb / VRBO / etc.)
export const propertyIcalFeeds = pgTable('property_ical_feeds', {
  id: uuid('id').defaultRandom().primaryKey(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  feedUrl: text('feed_url').notNull(),
  source: varchar('source', { length: 50 }).notNull(),
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Blocked nights imported from a specific iCal feed (one row per feed per night).
export const propertyIcalBlockedDates = pgTable(
  'property_ical_blocked_dates',
  {
    icalFeedId: uuid('ical_feed_id')
      .notNull()
      .references(() => propertyIcalFeeds.id, { onDelete: 'cascade' }),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    blockedDate: date('blocked_date').notNull(),
  },
  (t) => [primaryKey({ columns: [t.icalFeedId, t.blockedDate] })]
);

// Guests Table
export const guests = pgTable('guests', {
  id: uuid('id').defaultRandom().primaryKey(),
  firstName: varchar('first_name', { length: 120 }).notNull(),
  lastName: varchar('last_name', { length: 120 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Profiles Table
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: text('email'),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  role: userRoleEnum('role').default('guest').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Bookings Table
export const bookings = pgTable('bookings', {
  id: uuid('id').defaultRandom().primaryKey(),
  confirmationCode: varchar('confirmation_code', { length: 64 }).notNull().unique(),
  propertyId: uuid('property_id').references(() => properties.id).notNull(),
  guestId: uuid('guest_id').references(() => guests.id).notNull(),
  checkIn: date('check_in').notNull(),
  checkOut: date('check_out').notNull(),
  numGuests: integer('num_guests').notNull(),
  nightlyRate: numeric('nightly_rate').notNull(),
  cleaningFee: numeric('cleaning_fee').default('0').notNull(),
  petFee: numeric('pet_fee').default('0').notNull(),
  addOnsTotal: numeric('add_ons_total').default('0').notNull(),
  taxes: numeric('taxes').default('0').notNull(),
  totalAmount: numeric('total_amount').notNull(),
  paymentStatus: bookingPaymentStatusEnum('payment_status').default('pending').notNull(),
  bookingStatus: bookingStatusEnum('booking_status').default('confirmed').notNull(),
  paymentIntentId: varchar('payment_intent_id', { length: 255 }),
  specialRequests: text('special_requests'),
  /** When the guest accepted the property rental agreement (server time at checkout session creation). */
  contractAcceptedAt: timestamp('contract_accepted_at'),
  /** Snapshot of rental agreement at booking time (PDF public URL). */
  contractTextSnapshot: text('contract_text_snapshot'),
  source: bookingSourceEnum('source').default('direct').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const propertiesRelations = relations(properties, ({ many }) => ({
  images: many(propertyImages),
  availability: many(availability),
  bookings: many(bookings),
  icalFeeds: many(propertyIcalFeeds),
}));

export const propertyImagesRelations = relations(propertyImages, ({ one }) => ({
  property: one(properties, {
    fields: [propertyImages.propertyId],
    references: [properties.id],
  }),
}));

export const availabilityRelations = relations(availability, ({ one }) => ({
  property: one(properties, {
    fields: [availability.propertyId],
    references: [properties.id],
  }),
}));

export const guestsRelations = relations(guests, ({ many }) => ({
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  property: one(properties, {
    fields: [bookings.propertyId],
    references: [properties.id],
  }),
  guest: one(guests, {
    fields: [bookings.guestId],
    references: [guests.id],
  }),
}));

export const propertyIcalFeedsRelations = relations(propertyIcalFeeds, ({ one, many }) => ({
  property: one(properties, {
    fields: [propertyIcalFeeds.propertyId],
    references: [properties.id],
  }),
  blockedDates: many(propertyIcalBlockedDates),
}));

export const propertyIcalBlockedDatesRelations = relations(propertyIcalBlockedDates, ({ one }) => ({
  feed: one(propertyIcalFeeds, {
    fields: [propertyIcalBlockedDates.icalFeedId],
    references: [propertyIcalFeeds.id],
  }),
  property: one(properties, {
    fields: [propertyIcalBlockedDates.propertyId],
    references: [properties.id],
  }),
}));