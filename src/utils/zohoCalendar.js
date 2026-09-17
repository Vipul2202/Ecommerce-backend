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

// Creates a calendar event in the Zoho calendar for the booking's location.
// Returns false (without throwing) if the location has no calendar configured.
exports.createBookingCalendarEvent = async (booking) => {
  const locationKey = booking.location ? String(booking.location).toLowerCase().trim() : '';
  const calendarUid = CALENDAR_UIDS[locationKey];

  if (!calendarUid) {
    console.warn(`Zoho Calendar: no calendar configured for location "${booking.location}"`);
    return false;
  }

  const accessToken = await getAccessToken();
  const apiBase = getCalendarApiBase();
  const url = `${apiBase}/calendars/${calendarUid}/events`;

  const startTime = formatDateTime(booking.booking_date, booking.booking_time);
  const endTime = formatDateTime(booking.booking_date, addOneHour(booking.booking_time));
  const servicesList = Array.isArray(booking.services) ? booking.services.join(', ') : (booking.services || '');

  const eventdata = {
    title: `${booking.vehicle_registration} - ${booking.first_name}`,
    dateandtime: {
      timezone: TIMEZONE,
      start: startTime,
      end: endTime,
    },
    description: [
      `Booking ID: ${booking.booking_id}`,
      `Customer: ${booking.first_name}`,
      `Vehicle Rego: ${booking.vehicle_registration}`,
      `Services: ${servicesList}`,
      `Phone: ${booking.phone}`,
      `Email: ${booking.email}`,
      `Location: ${booking.location}`,
    ].join('\n'),
    reminders: [{ action: 'popup', minutes: '-60' }],
  };

  const response = await axios.post(url, null, {
    params: { eventdata: JSON.stringify(eventdata) },
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });

  return response?.data;
};
