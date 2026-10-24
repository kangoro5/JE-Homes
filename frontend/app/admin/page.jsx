'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

async function readResponse(response) {
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'The admin service could not complete the request.');
  }
  return result;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

function paymentLabel(booking) {
  return booking.payment?.status?.replaceAll('_', ' ') || 'pending';
}

export default function AdminPage() {
  const [authState, setAuthState] = useState('checking');
  const [bookings, setBookings] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadBookings = useCallback(async () => {
    const response = await apiFetch('/bookings');
    const result = await readResponse(response);
    setBookings(result.bookings);
  }, []);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const response = await apiFetch('/api/admin/session');
        const result = await readResponse(response);
        if (!active) return;
        if (!result.authenticated) {
          setAuthState('signedOut');
          return;
        }
        await loadBookings();
        if (active) setAuthState('signedIn');
      } catch (requestError) {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Could not connect to the admin service.');
          setAuthState('signedOut');
        }
      }
    }

    checkSession();
    return () => {
      active = false;
    };
  }, [loadBookings]);

  async function handleLogin(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await apiFetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      await readResponse(response);
      await loadBookings();
      setPassword('');
      setAuthState('signedIn');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setError('');
    try {
      const response = await apiFetch('/api/admin/logout', { method: 'POST' });
      await readResponse(response);
      setBookings([]);
      setAuthState('signedOut');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not sign out.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmBooking(bookingID) {
    setBusy(true);
    setError('');
    try {
      const response = await apiFetch('/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingID })
      });
      await readResponse(response);
      await loadBookings();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not confirm the booking.');
    } finally {
      setBusy(false);
    }
  }

  if (authState === 'checking') {
    return <main className="admin-section"><p role="status">Checking admin session…</p></main>;
  }

  if (authState === 'signedOut') {
    return (
      <main className="admin-section">
        <div className="admin-login">
          <a className="text-link" href="/">← Back to JE Homes</a>
          <div className="admin-heading">
            <p className="eyebrow">Owner access</p>
            <h1>Admin sign in.</h1>
          </div>
          <form className="admin-login-form" onSubmit={handleLogin}>
            <label htmlFor="admin-username">Username</label>
            <input
              id="admin-username"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {error && <p className="admin-error" role="alert">{error}</p>}
            <button className="primary-button" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'} <span>→</span>
            </button>
          </form>
        </div>
      </main>
    );
  }

  const confirmedCount = bookings.filter((booking) => booking.confirmedAt).length;
  const paidCount = bookings.filter((booking) => booking.payment?.status === 'paid').length;
  const awaitingCount = bookings.filter((booking) => !booking.confirmedAt).length;

  return (
    <main className="admin-section">
      <header className="admin-dashboard-header">
        <div className="admin-heading">
          <p className="eyebrow">JE Homes</p>
          <h1>Owner dashboard.</h1>
          <p className="section-intro">Review guest requests and manage your bookings.</p>
        </div>
        <button className="admin-logout" type="button" disabled={busy} onClick={handleLogout}>Sign out</button>
      </header>

      {error && <p className="admin-error" role="alert">{error}</p>}

      <section className="admin-summary" aria-label="Booking summary">
        <article className="summary-card"><span>Total requests</span><strong>{bookings.length}</strong><small>All guest bookings</small></article>
        <article className="summary-card"><span>Awaiting confirmation</span><strong>{awaitingCount}</strong><small>Requests to review</small></article>
        <article className="summary-card"><span>Confirmed</span><strong>{confirmedCount}</strong><small>Confirmed bookings</small></article>
        <article className="summary-card"><span>Paid</span><strong>{paidCount}</strong><small>Payment completed</small></article>
      </section>

      <section className="admin-panel booking-panel">
        <div className="panel-header">
          <div><h2>Booking requests</h2><p className="panel-description">Latest guest requests and payment status.</p></div>
          <button className="admin-refresh" type="button" disabled={busy} onClick={() => loadBookings().catch((requestError) => setError(requestError.message))}>Refresh</button>
        </div>
        {bookings.length ? bookings.slice().reverse().map((booking) => (
          <article className={`booking-request${booking.confirmedAt ? ' is-confirmed' : ''}`} key={booking.id}>
            <div className="booking-request-main">
              <div>
                <strong>{booking.guestName || 'Guest'}</strong>
                <span>{booking.guestEmail || 'No email provided'} · {booking.roomID || 'Stay'}</span>
              </div>
              <span className="booking-status">{booking.confirmedAt ? 'Confirmed' : 'Needs confirmation'}</span>
            </div>
            <div className="booking-request-details">
              <span>{formatDate(booking.checkIn)} – {formatDate(booking.checkOut)}</span>
              <span>{booking.guests || 1} guest(s)</span>
              <span className="booking-payment">KSh {Number(booking.amount || 0).toLocaleString()}</span>
              <span>Payment: {paymentLabel(booking)}</span>
            </div>
            {booking.note && <p>{booking.note}</p>}
            {booking.confirmedAt ? (
              <small>Confirmed {formatDate(booking.confirmedAt)}</small>
            ) : (
              <button className="confirm-booking" type="button" disabled={busy} onClick={() => confirmBooking(booking.id)}>Confirm booking</button>
            )}
          </article>
        )) : <p className="empty-state">No booking requests yet.</p>}
      </section>
    </main>
  );
}
