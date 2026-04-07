/** Public contact details shown across marketing, legal pages, and transactional email. */
export const SITE_CONTACT_EMAIL = "jhoncard@gmail.com";

export const SITE_CONTACT_PHONE_DISPLAY =
  "(603) 484-9623 or (651) 285-6410";

export const SITE_CONTACT_PHONE_TEL_HREFS = [
  "tel:+16034849623",
  "tel:+16512856410",
] as const;

/** Destination for /api/contact form submissions (override with CONTACT_EMAIL in env). */
export const CONTACT_FORM_INBOX_EMAIL = SITE_CONTACT_EMAIL;
