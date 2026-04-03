import { format } from 'date-fns';

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function toIcsDateOnly(yyyyMmDd: string): string {
  return yyyyMmDd.replace(/-/g, '');
}

export type IcsBookingEvent = {
  uid: string;
  summary: string;
  checkIn: string;
  checkOut: string;
};

export function buildPropertyAvailabilityIcs(opts: {
  calendarName: string;
  /** e.g. https://yoursite.com */
  productIdHost: string;
  events: IcsBookingEvent[];
}): string {
  const stamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
  const prod =
    (() => {
      try {
        return new URL(opts.productIdHost).host;
      } catch {
        return "direct-booking";
      }
    })();

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${escapeIcsText(prod)}//Direct Booking//EN`,
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeIcsText(opts.calendarName)}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
    'X-PUBLISHED-TTL:PT15M',
  ];

  for (const ev of opts.events) {
    const dtStart = toIcsDateOnly(ev.checkIn);
    const dtEnd = toIcsDateOnly(ev.checkOut);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${escapeIcsText(ev.summary)}`,
      'TRANSP:OPAQUE',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}
