const axios = require('axios');

const TIMEZONE = 'Australia/Perth';
const TZ_OFFSET = '+0800'; // WA does not observe daylight saving

const CALENDAR_UIDS = {
  myaree: process.env.ZOHO_CALENDAR_MYAREE_UID,
  midland: process.env.ZOHO_CALENDAR_MIDLAND_UID,
};

let cachedToken = null;
let cachedTokenExpiresAt = 0; // epoch ms

const getAccessToken = async () => {
  const accountsBase = process.env.ZOHO_ACCOUNTS_BASE || 'https://accounts.zoho.com';
  const tokenUrl = `${accountsBase}/oauth/v2/token`;

  if (!process.env.ZOHO_CLIENT_ID || !process.env.ZOHO_CLIENT_SECRET || !process.env.ZOHO_CALENDAR_REFRESH_TOKEN) {
    throw new Error('Zoho Calendar OAuth env missing (ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_CALENDAR_REFRESH_TOKEN)');
  }

  if (cachedToken && Date.now() < cachedTokenExpiresAt - 60000) {
    return cachedToken;
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    refresh_token: process.env.ZOHO_CALENDAR_REFRESH_TOKEN,
  });

  const response = await axios.post(tokenUrl, params);
  const accessToken = response?.data?.access_token;
  if (!accessToken) {
    throw new Error('Zoho Calendar token response missing access_token');
  }

  const expiresInMs = response?.data?.expires_in ? response.data.expires_in * 1000 : 55 * 60 * 1000;
  cachedToken = accessToken;
  cachedTokenExpiresAt = Date.now() + expiresInMs;
  return accessToken;
};

const getCalendarApiBase = () => {
  if (process.env.ZOHO_CALENDAR_API_BASE) return process.env.ZOHO_CALENDAR_API_BASE.replace(/\/$/, '');
  const accountsBase = String(process.env.ZOHO_ACCOUNTS_BASE || 'https://accounts.zoho.com').toLowerCase();
  if (accountsBase.includes('com.au')) return 'https://calendar.zoho.com.au/api/v1';
  if (accountsBase.includes('zoho.eu')) return 'https://calendar.zoho.eu/api/v1';
  if (accountsBase.includes('zoho.in')) return 'https://calendar.zoho.in/api/v1';
  return 'https://calendar.zoho.com/api/v1';
};

// booking_date comes back from Mongoose as a Date (stored as UTC midnight for
// the calendar day); booking_time is a plain "HH:mm" (24h) string.
const formatDateTime = (dateInput, timeStr) => {
  let datePart;
  if (dateInput instanceof Date) {
    const y = dateInput.getUTCFullYear();
    const m = String(dateInput.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dateInput.getUTCDate()).padStart(2, '0');
    datePart = `${y}${m}${d}`;
  } else {
    datePart = String(dateInput).slice(0, 10).replace(/-/g, '');
  }
  const timePart = timeStr.replace(':', '') + '00';
  return `${datePart}T${timePart}${TZ_OFFSET}`;
};

const addOneHour = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  const total = (h * 60 + m + 60) % (24 * 60);
  const newH = Math.floor(total / 60);
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
};

const buildEventData = (booking) => {
  const startTime = formatDateTime(booking.booking_date, booking.booking_time);
  const endTime = formatDateTime(booking.booking_date, addOneHour(booking.booking_time));
  const servicesList = Array.isArray(booking.services) ? booking.services.join(', ') : (booking.services || '');

  return {
    title: `${booking.vehicle_registration} - ${booking.first_name}`,
    dateandtime: {
      timezone: TIMEZONE,
      start: startTime,
      end: endTime,
    },
    description: [
      `Services: ${servicesList}`,
      `Phone: ${booking.phone}`,
      `Email: ${booking.email}`,
      `Location: ${booking.location}`,
    ].join('\n'),
    reminders: [{ action: 'popup', minutes: '-60' }],
  };
};

const getCalendarUidForBooking = (booking) => {
  const locationKey = booking.location ? String(booking.location).toLowerCase().trim() : '';
  return CALENDAR_UIDS[locationKey];
};

// Creates a calendar event in the Zoho calendar for the booking's location.
// Returns null if the location has no calendar configured. On success,
// returns { uid, etag } identifying the created event.
const createBookingCalendarEvent = async (booking) => {
  const calendarUid = getCalendarUidForBooking(booking);
  if (!calendarUid) {
    console.warn(`Zoho Calendar: no calendar configured for location "${booking.location}"`);
    return null;
  }

  const accessToken = await getAccessToken();
  const url = `${getCalendarApiBase()}/calendars/${calendarUid}/events`;

  const response = await axios.post(url, null, {
    params: { eventdata: JSON.stringify(buildEventData(booking)) },
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });

  const event = response?.data?.events?.[0];
  if (!event?.uid) {
    throw new Error('Zoho Calendar create-event response missing event uid');
  }
  return { uid: event.uid, etag: event.etag };
};

// Updates an existing event in place (used when a booking is rescheduled).
// Requires booking.zoho_calendar_event_id and booking.zoho_calendar_event_etag
// from a prior create/update. Returns { uid, etag } for the updated event.
const updateBookingCalendarEvent = async (booking) => {
  const calendarUid = getCalendarUidForBooking(booking);
  if (!calendarUid) {
    console.warn(`Zoho Calendar: no calendar configured for location "${booking.location}"`);
    return null;
  }

  const accessToken = await getAccessToken();
  const url = `${getCalendarApiBase()}/calendars/${calendarUid}/events/${booking.zoho_calendar_event_id}`;

  const eventdata = {
    ...buildEventData(booking),
    etag: booking.zoho_calendar_event_etag,
  };

  const response = await axios.put(url, null, {
    params: { eventdata: JSON.stringify(eventdata) },
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });

  const event = response?.data?.events?.[0];
  if (!event?.uid) {
    throw new Error('Zoho Calendar update-event response missing event uid');
  }
  return { uid: event.uid, etag: event.etag };
};

// Deletes the calendar event tied to a booking (used when a booking is
// cancelled). Safe to call even if the booking never had one.
const deleteBookingCalendarEvent = async (booking) => {
  if (!booking.zoho_calendar_event_id) return;
  const calendarUid = getCalendarUidForBooking(booking);
  if (!calendarUid) return;

  const accessToken = await getAccessToken();
  const url = `${getCalendarApiBase()}/calendars/${calendarUid}/events/${booking.zoho_calendar_event_id}`;

  await axios.delete(url, {
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      etag: booking.zoho_calendar_event_etag,
    },
  });
};

// Creates the event if the booking doesn't have one yet, otherwise updates
// the existing one in place. Mutates and saves the booking's
// zoho_calendar_event_id / zoho_calendar_event_etag fields.
const upsertBookingCalendarEvent = async (booking) => {
  const result = booking.zoho_calendar_event_id
    ? await updateBookingCalendarEvent(booking)
    : await createBookingCalendarEvent(booking);

  if (!result) return null;

  booking.zoho_calendar_event_id = result.uid;
  booking.zoho_calendar_event_etag = result.etag;
  await booking.save();
  return result;
};

module.exports = {
  createBookingCalendarEvent,
  updateBookingCalendarEvent,
  deleteBookingCalendarEvent,
  upsertBookingCalendarEvent,
};
