import { useCallback, useEffect, useRef, useState } from 'react';

const CLIENT_ID = import.meta.env.VITE_GCAL_CLIENT_ID;
const SCOPES    = 'https://www.googleapis.com/auth/calendar.events';
const CAL_API   = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export function useGoogleCalendar() {
  const [status, setStatus]   = useState('idle'); // idle | loading | connected | error
  const tokenClientRef        = useRef(null);
  const accessTokenRef        = useRef(null);
  const scriptLoadedRef       = useRef(false);
  // Ref mirrors status so callbacks always see the latest value without stale closure
  const statusRef             = useRef('idle');

  const updateStatus = (s) => { statusRef.current = s; setStatus(s); };

  useEffect(() => {
    if (!CLIENT_ID || scriptLoadedRef.current) return;
    scriptLoadedRef.current = true;

    const script   = document.createElement('script');
    script.src     = 'https://accounts.google.com/gsi/client';
    script.async   = true;
    script.defer   = true;
    script.onload  = () => {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope:     SCOPES,
        callback:  (resp) => {
          if (resp.error) {
            console.error('[GCal] OAuth error:', resp.error, resp.error_description);
            updateStatus('error');
            return;
          }
          console.log('[GCal] Connected ✓ token length:', resp.access_token?.length);
          accessTokenRef.current = resp.access_token;
          updateStatus('connected');
          // Auto-expire slightly before token actually expires
          setTimeout(() => {
            accessTokenRef.current = null;
            updateStatus('idle');
          }, (resp.expires_in - 120) * 1000);
        },
      });
    };
    script.onerror = () => updateStatus('error');
    document.head.appendChild(script);
  }, []);

  /** Prompt Google sign-in / token grant */
  const connect = useCallback(() => {
    if (!tokenClientRef.current) {
      console.warn('[GCal] tokenClient not ready yet');
      return;
    }
    updateStatus('loading');
    tokenClientRef.current.requestAccessToken({ prompt: '' });
  }, []);

  /**
   * Create a Google Calendar event for a study block.
   * - No startTime set → all-day event (just shows on the day, no time)
   * - startTime set ("HH:MM" 24h) → timed event starting at that time
   * Returns the Google event ID or null.
   */
  const createEvent = useCallback(async (dateKey, block) => {
    const token = accessTokenRef.current;
    if (!token) {
      console.warn('[GCal] createEvent called but no access token');
      return null;
    }

    const [year, month, day] = dateKey.split('-').map(Number);
    const title = block.isTutor
      ? `📚 Tutor — ${block.label}`
      : `📖 ${block.subjectName || 'Study'} — ${block.label}`;

    let startField, endField;

    if (block.startTime) {
      // Timed event: user explicitly set a start time
      const [h, m]  = block.startTime.split(':').map(Number);
      const start   = new Date(year, month - 1, day, h, m);
      const end     = new Date(start.getTime() + block.duration * 60 * 1000);
      const tz      = Intl.DateTimeFormat().resolvedOptions().timeZone;
      startField    = { dateTime: start.toISOString(), timeZone: tz };
      endField      = { dateTime: end.toISOString(),   timeZone: tz };
    } else {
      // All-day event — just the date, no time
      const nextDay = new Date(year, month - 1, day + 1);
      const fmt     = (d) => d.toISOString().slice(0, 10);
      startField    = { date: fmt(new Date(year, month - 1, day)) };
      endField      = { date: fmt(nextDay) };
    }

    const body = {
      summary:     title,
      description: `IGCSE Planner · ${block.duration} min`,
      start:       startField,
      end:         endField,
    };

    console.log('[GCal] Creating event:', title, 'on', dateKey);

    try {
      const res = await fetch(CAL_API, {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('[GCal] API error:', res.status, data?.error?.message);
        // Token expired — reset so user can reconnect
        if (res.status === 401) {
          accessTokenRef.current = null;
          updateStatus('idle');
        }
        return null;
      }

      console.log('[GCal] Event created ✓ id:', data.id);
      return data.id || null;
    } catch (e) {
      console.error('[GCal] fetch error:', e);
      return null;
    }
  }, []);

  /** Delete a Google Calendar event by its event ID */
  const deleteEvent = useCallback(async (googleEventId) => {
    const token = accessTokenRef.current;
    if (!token || !googleEventId) return;
    try {
      const res = await fetch(`${CAL_API}/${googleEventId}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        accessTokenRef.current = null;
        updateStatus('idle');
      }
      console.log('[GCal] Event deleted', googleEventId, res.status);
    } catch (e) {
      console.error('[GCal] delete error:', e);
    }
  }, []);

  /** Check if ready to create events (uses ref, not stale state) */
  const isReady = useCallback(() => !!accessTokenRef.current, []);

  return {
    status,
    connected: status === 'connected',
    isConfigured: !!CLIENT_ID,
    connect,
    createEvent,
    deleteEvent,
    isReady,
  };
}
