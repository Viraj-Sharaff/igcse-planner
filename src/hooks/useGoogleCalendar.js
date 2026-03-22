import { useCallback, useEffect, useRef, useState } from 'react';

const CLIENT_ID = import.meta.env.VITE_GCAL_CLIENT_ID;
const SCOPES    = 'https://www.googleapis.com/auth/calendar.events';
const CAL_API   = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export function useGoogleCalendar() {
  const [status, setStatus]   = useState('idle'); // idle | loading | connected | error
  const tokenClientRef        = useRef(null);
  const accessTokenRef        = useRef(null);
  const scriptLoadedRef       = useRef(false);
  const statusRef             = useRef('idle');
  const connectTimeoutRef     = useRef(null);

  const updateStatus = (s) => {
    statusRef.current = s;
    setStatus(s);
    // Clear any pending connect timeout whenever status changes
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (!CLIENT_ID || scriptLoadedRef.current) return;
    scriptLoadedRef.current = true;

    const script  = document.createElement('script');
    script.src    = 'https://accounts.google.com/gsi/client';
    script.async  = true;
    script.defer  = true;
    script.onload = () => {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope:     SCOPES,
        callback:  (resp) => {
          if (resp.error) {
            if (resp.error === 'interaction_required' || resp.error === 'consent_required') {
              // Silent auth failed — need user to explicitly grant access once.
              // Fall back to showing the Connect button (idle state).
              updateStatus('idle');
            } else {
              // Real error (access_denied, invalid_client, etc.)
              console.error('[GCal] OAuth error:', resp.error, resp.error_description);
              updateStatus('error');
            }
            return;
          }
          console.log('[GCal] Connected ✓');
          accessTokenRef.current = resp.access_token;
          localStorage.setItem('gcal_auto_connect', '1');
          updateStatus('connected');
          // Silently refresh ~2 min before the token expires
          setTimeout(() => {
            accessTokenRef.current = null;
            updateStatus('idle');
            if (tokenClientRef.current) {
              tokenClientRef.current.requestAccessToken({ prompt: '' });
            }
          }, (resp.expires_in - 120) * 1000);
        },
      });

      // Always try silent auto-connect on page load.
      // Falls back to idle if interaction is needed or no response in 6s.
      updateStatus('loading');
      connectTimeoutRef.current = setTimeout(() => {
        if (statusRef.current === 'loading') {
          console.warn('[GCal] Silent auth timed out — showing Connect button');
          updateStatus('idle');
        }
      }, 6000);
      tokenClientRef.current.requestAccessToken({ prompt: '' });
    };
    script.onerror = () => updateStatus('error');
    document.head.appendChild(script);
  }, []);

  /** Manually trigger sign-in (e.g. from the Connect button) */
  const connect = useCallback(() => {
    if (!tokenClientRef.current) return;
    updateStatus('loading');
    tokenClientRef.current.requestAccessToken({ prompt: '' });
  }, []);

  /** Build the start/end fields for a block (shared by create + update) */
  function buildTimeFields(dateKey, block) {
    const [year, month, day] = dateKey.split('-').map(Number);
    if (block.startTime) {
      const [h, m] = block.startTime.split(':').map(Number);
      const start  = new Date(year, month - 1, day, h, m);
      const end    = new Date(start.getTime() + block.duration * 60 * 1000);
      const tz     = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return {
        startField: { dateTime: start.toISOString(), timeZone: tz },
        endField:   { dateTime: end.toISOString(),   timeZone: tz },
      };
    }
    const nextDay = new Date(year, month - 1, day + 1);
    const fmt     = (d) => d.toISOString().slice(0, 10);
    return {
      startField: { date: fmt(new Date(year, month - 1, day)) },
      endField:   { date: fmt(nextDay) },
    };
  }

  /** Create a Google Calendar event for a study block. Returns event ID or null. */
  const createEvent = useCallback(async (dateKey, block) => {
    const token = accessTokenRef.current;
    if (!token) return null;
    const { startField, endField } = buildTimeFields(dateKey, block);
    const title = block.isTutor
      ? `📚 Tutor — ${block.label}`
      : `📖 ${block.subjectName || 'Study'} — ${block.label}`;
    try {
      const res  = await fetch(CAL_API, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          summary:     title,
          description: `IGCSE Planner · ${block.duration} min`,
          start:       startField,
          end:         endField,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) { accessTokenRef.current = null; updateStatus('idle'); }
        return null;
      }
      console.log('[GCal] Created:', title, data.id);
      return data.id || null;
    } catch (e) {
      console.error('[GCal] create error:', e);
      return null;
    }
  }, []);

  /** PATCH start/end time of an existing event (for time changes). */
  const updateEvent = useCallback(async (googleEventId, dateKey, block) => {
    const token = accessTokenRef.current;
    if (!token || !googleEventId) return false;
    const { startField, endField } = buildTimeFields(dateKey, block);
    try {
      const res = await fetch(`${CAL_API}/${googleEventId}`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ start: startField, end: endField }),
      });
      if (res.status === 401) { accessTokenRef.current = null; updateStatus('idle'); }
      console.log('[GCal] Updated:', googleEventId, res.status);
      return res.ok;
    } catch (e) {
      console.error('[GCal] update error:', e);
      return false;
    }
  }, []);

  /** Delete a Google Calendar event by ID. */
  const deleteEvent = useCallback(async (googleEventId) => {
    const token = accessTokenRef.current;
    if (!token || !googleEventId) return;
    try {
      const res = await fetch(`${CAL_API}/${googleEventId}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { accessTokenRef.current = null; updateStatus('idle'); }
      console.log('[GCal] Deleted:', googleEventId, res.status);
    } catch (e) {
      console.error('[GCal] delete error:', e);
    }
  }, []);

  /**
   * List all events in Google Calendar that were created by this planner.
   * Used for the full-mirror sync on connect to remove orphaned events.
   */
  const listPlannerEvents = useCallback(async () => {
    const token = accessTokenRef.current;
    if (!token) return [];
    try {
      const timeMin = encodeURIComponent(new Date('2026-01-01T00:00:00Z').toISOString());
      const timeMax = encodeURIComponent(new Date('2026-07-01T00:00:00Z').toISOString());
      const res = await fetch(
        `${CAL_API}?timeMin=${timeMin}&timeMax=${timeMax}&maxResults=2500&singleEvents=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return [];
      const data = await res.json();
      // Identify our events by the description prefix we always write
      return (data.items || []).filter(
        (e) => e.description?.startsWith('IGCSE Planner')
      );
    } catch (e) {
      console.error('[GCal] list error:', e);
      return [];
    }
  }, []);

  /** Check if an access token is available (ref-based, avoids stale closures). */
  const isReady = useCallback(() => !!accessTokenRef.current, []);

  return {
    status,
    connected:         status === 'connected',
    isConfigured:      !!CLIENT_ID,
    connect,
    createEvent,
    updateEvent,
    deleteEvent,
    listPlannerEvents,
    isReady,
  };
}
