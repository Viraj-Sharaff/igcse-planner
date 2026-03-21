/**
 * Google Calendar integration via Google Identity Services (OAuth 2.0)
 *
 * Setup (one-time):
 * 1. Go to https://console.cloud.google.com and create a project
 * 2. Enable "Google Calendar API"
 * 3. Create credentials → OAuth 2.0 Client ID → Web application
 * 4. Add your Vercel domain (https://your-app.vercel.app) to Authorized JavaScript origins
 * 5. Copy the Client ID and add it to Vercel env vars as VITE_GCAL_CLIENT_ID
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const CLIENT_ID = import.meta.env.VITE_GCAL_CLIENT_ID;
const SCOPES    = 'https://www.googleapis.com/auth/calendar.events';

export function useGoogleCalendar() {
  const [status, setStatus]   = useState('idle'); // idle | loading | connected | error
  const tokenClientRef        = useRef(null);
  const accessTokenRef        = useRef(null);
  const scriptLoadedRef       = useRef(false);

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
          if (resp.error) { setStatus('error'); return; }
          accessTokenRef.current = resp.access_token;
          setStatus('connected');
          // Token expires in ~1hr; reset status so user can re-auth
          setTimeout(() => {
            accessTokenRef.current = null;
            setStatus('idle');
          }, (resp.expires_in - 60) * 1000);
        },
      });
    };
    script.onerror = () => setStatus('error');
    document.head.appendChild(script);
  }, []);

  /** Prompt Google sign-in / token grant */
  const connect = useCallback(() => {
    if (!tokenClientRef.current) return;
    setStatus('loading');
    tokenClientRef.current.requestAccessToken({ prompt: '' });
  }, []);

  const connected = status === 'connected';

  /**
   * Create a Google Calendar event for a study block.
   * Returns the Google event ID (string) or null on failure.
   */
  const createEvent = useCallback(async (dateKey, block, schoolDays) => {
    if (!accessTokenRef.current) return null;

    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dow  = date.getDay(); // 0=Sun

    // Determine start time from study window logic
    const isWeekday   = dow >= 1 && dow <= 5;
    const hasSchool   = isWeekday
      ? schoolDays[dateKey] !== false
      : schoolDays[dateKey] === true;

    let startHour = 9, startMin = 0;
    if (hasSchool && isWeekday) {
      startHour = (dow === 1 || dow === 3) ? 16 : 15;
      startMin  = 30;
    }

    const start = new Date(year, month - 1, day, startHour, startMin);
    const end   = new Date(start.getTime() + block.duration * 60 * 1000);
    const tz    = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const title = block.isTutor
      ? `📚 Tutor — ${block.label}`
      : `📖 ${block.subjectName || block.subjectId || 'Study'} — ${block.label}`;

    const body = {
      summary:     title,
      description: `IGCSE Planner block\nDuration: ${block.duration} min`,
      start: { dateTime: start.toISOString(), timeZone: tz },
      end:   { dateTime: end.toISOString(),   timeZone: tz },
    };

    try {
      const res  = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method:  'POST',
          headers: {
            Authorization:  `Bearer ${accessTokenRef.current}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return data.id || null;
    } catch (e) {
      console.error('[GCal] create error:', e);
      return null;
    }
  }, []);

  /** Delete a Google Calendar event by its event ID */
  const deleteEvent = useCallback(async (googleEventId) => {
    if (!accessTokenRef.current || !googleEventId) return;
    try {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
        {
          method:  'DELETE',
          headers: { Authorization: `Bearer ${accessTokenRef.current}` },
        }
      );
    } catch (e) {
      console.error('[GCal] delete error:', e);
    }
  }, []);

  const isConfigured = !!CLIENT_ID;

  return { status, connected, isConfigured, connect, createEvent, deleteEvent };
}
