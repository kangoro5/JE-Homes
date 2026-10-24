'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';

const stays = [
  { id: 'je-casa-01', name: 'Casa Sol', location: 'Algarve, Portugal', category: 'coastal', price: 210, guests: 4, badge: 'Guest favourite', image: 'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=900&q=85' },
  { id: 'je-loft-02', name: 'The Linen Loft', location: 'Copenhagen, Denmark', category: 'city', price: 180, guests: 2, badge: 'New stay', image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=85' },
  { id: 'je-cabin-03', name: 'Juniper Cabin', location: 'Cotswolds, England', category: 'countryside', price: 245, guests: 4, badge: 'Slow living', image: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=900&q=85' },
  { id: 'je-house-04', name: 'Blue Hour House', location: 'Byron Bay, Australia', category: 'coastal', price: 325, guests: 6, badge: 'Long weekend', image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=85' },
  { id: 'je-flat-05', name: 'Casa Clementine', location: 'Lisbon, Portugal', category: 'city', price: 155, guests: 2, badge: 'City favourite', image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=85' },
  { id: 'je-farm-06', name: 'Meadow House', location: 'Piedmont, Italy', category: 'countryside', price: 280, guests: 5, badge: 'Made for groups', image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=85' }
];

const filters = [
  { id: 'all', label: 'All stays' },
  { id: 'coastal', label: 'Coastal' },
  { id: 'city', label: 'City breaks' },
  { id: 'countryside', label: 'Countryside' }
];

function nightsBetween(start, end) {
  if (!start || !end) return 0;
  return Math.max(0, Math.round((new Date(`${end}T00:00:00`) - new Date(`${start}T00:00:00`)) / 86400000));
}

export default function HomePage() {
  const dialogRef = useRef(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [destination, setDestination] = useState('');
  const [guestCount, setGuestCount] = useState('2');
  const [today, setToday] = useState('');
  const [selectedStay, setSelectedStay] = useState(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [bookingResult, setBookingResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setToday(new Date().toISOString().slice(0, 10));
  }, []);

  const visibleStays = stays.filter((stay) => {
    const normalizedSearch = search.trim().toLowerCase();
    const matchesFilter = activeFilter === 'all' || stay.category === activeFilter;
    const matchesSearch = !normalizedSearch || `${stay.name} ${stay.location}`.toLowerCase().includes(normalizedSearch);
    return matchesFilter && matchesSearch;
  });
  const total = selectedStay ? selectedStay.price * nightsBetween(checkIn, checkOut) : 0;

  function openBooking(stay) {
    setSelectedStay(stay);
    setCheckIn('');
    setCheckOut('');
    setPaymentMethod('');
    setMpesaPhone('');
    setGuestName('');
    setGuestEmail('');
    setNote('');
    setMessage('');
    setBookingResult(null);
    dialogRef.current?.showModal();
  }

  function searchStays(event) {
    event.preventDefault();
    setSearch(destination);
    document.querySelector('#stays')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function submitBooking(event) {
    event.preventDefault();
    if (!selectedStay) return;
    if (nightsBetween(checkIn, checkOut) < 1) {
      setMessage('Choose a check-out date after check-in.');
      return;
    }

    const payload = {
      roomID: selectedStay.id,
      checkIn,
      checkOut,
      guests: Number(guestCount),
      guestName,
      guestEmail,
      paymentMethod,
      mpesaPhone,
      amount: total,
      note
    };
    setSubmitting(true);
    setMessage('');
    try {
      const response = await apiFetch('/process-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Booking failed');
      if (payload.paymentMethod === 'card' && result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      setBookingResult(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'We could not reach the booking service. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const paymentMessage = bookingResult?.paymentStatus === 'prompt_sent'
    ? ` ${bookingResult.customerMessage || 'Check your phone to approve the M-Pesa payment.'}`
    : '';

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="JE Homes home"><span className="brand-mark">JE</span><span>homes</span></a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#stays">Find a stay</a><a href="#story">Our story</a><a href="/admin">Admin</a>
        </nav>
        <a className="host-link" href="#host">List your home <span aria-hidden="true">↗</span></a>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Boutique bayside stays</p>
            <h1>Stay somewhere <em>beautifully yours.</em></h1>
            <p className="hero-text">Wake up to linen-soft rooms, slow breakfasts, and coastal views that feel personal from the moment you arrive.</p>
            <div className="hero-actions">
              <a className="primary-link" href="#stays">Book your stay</a>
              <a className="secondary-link" href="/admin">Owner dashboard</a>
            </div>
            <ul className="hero-metrics" aria-label="Property highlights">
              <li><strong>32</strong><span>homes</span></li><li><strong>4.9/5</strong><span>guest rating</span></li><li><strong>24/7</strong><span>concierge</span></li>
            </ul>
          </div>
          <form className="search-panel" onSubmit={searchStays}>
            <div className="field destination-field">
              <label htmlFor="destination">Where</label>
              <input id="destination" type="text" placeholder="Search a city or region" autoComplete="off" value={destination} onChange={(event) => setDestination(event.target.value)} />
            </div>
            <div className="field"><label htmlFor="check-in">Check in</label><input id="check-in" type="date" min={today} required /></div>
            <div className="field"><label htmlFor="check-out">Check out</label><input id="check-out" type="date" min={today} required /></div>
            <div className="field guests-field">
              <label htmlFor="guests">Guests</label>
              <select id="guests" value={guestCount} onChange={(event) => setGuestCount(event.target.value)}>
                {[1, 2, 3, 4, 5, 6].map((guests) => <option key={guests} value={guests}>{guests} {guests === 1 ? 'guest' : 'guests'}</option>)}
              </select>
            </div>
            <button className="search-button" type="submit" aria-label="Search stays">⌕</button>
          </form>
        </section>

        <section className="stays-section" id="stays">
          <div className="section-heading">
            <div><p className="eyebrow">The JE edit</p><h2>Available homes.</h2></div>
            <p className="section-intro">No endless scrolling. Just homes we would happily stay in ourselves.</p>
          </div>
          <div className="filter-row" aria-label="Stay categories">
            {filters.map((filter) => (
              <button className={`filter${activeFilter === filter.id ? ' active' : ''}`} key={filter.id} type="button" onClick={() => setActiveFilter(filter.id)}>{filter.label}</button>
            ))}
          </div>
          <div className="stay-grid">
            {visibleStays.length ? visibleStays.map((stay) => (
              <article className="stay-card" key={stay.id}>
                <div className="stay-photo" style={{ backgroundImage: `url('${stay.image}')` }}><span className="stay-badge">{stay.badge}</span></div>
                <div className="stay-info">
                  <h3>{stay.name}</h3>
                  <div className="stay-meta"><span>{stay.location} · up to {stay.guests}</span><span className="stay-price">KSh {stay.price} / night</span></div>
                  <button className="text-link book-button" type="button" onClick={() => openBooking(stay)} style={{ background: 'none', border: 0, borderBottom: '1px solid var(--ink)', marginTop: 18, padding: '0 0 6px', width: 'auto' }}>View stay <span>→</span></button>
                </div>
              </article>
            )) : <p>No stays match that search yet. Try another place.</p>}
          </div>
        </section>

        <section className="feature-band"><div className="feature-grid">
          <div className="feature-card"><span>✓</span><h3>Thoughtful spaces</h3><p>Each home is chosen for natural light, comfort, and local character.</p></div>
          <div className="feature-card"><span>✓</span><h3>Fast guest support</h3><p>Our team helps with arrivals, local tips, and any issue during the stay.</p></div>
          <div className="feature-card"><span>✓</span><h3>Flexible stays</h3><p>From quick weekends to longer slow-living escapes, we keep it easy.</p></div>
        </div></section>

        <section className="story-section" id="story">
          <div className="story-image" role="img" aria-label="Quiet pool beside a modern home"></div>
          <div className="story-copy"><p className="eyebrow">A different kind of getaway</p><h2>Space to do<br /><em>less, better.</em></h2><p>JE Homes is a small collection of places with good light, real character, and hosts who know the best bakery in town.</p><a className="text-link" href="#stays">Explore the collection <span>→</span></a></div>
        </section>

        <section className="testimonials-section">
          <div className="section-heading"><div><p className="eyebrow">Guest love</p><h2>What our guests say.</h2></div></div>
          <div className="testimonial-grid">
            <article className="testimonial-card"><div className="stars">★★★★★</div><p>“The room was spotless, the host was warm, and the location felt like a private hideaway.”</p><strong>— Anika, weekend guest</strong></article>
            <article className="testimonial-card"><div className="stars">★★★★★</div><p>“Everything was thoughtfully arranged — the best mix of luxury and comfort we have ever had.”</p><strong>— Daniel, long-stay guest</strong></article>
            <article className="testimonial-card"><div className="stars">★★★★★</div><p>“A beautiful property with great communication and a genuinely memorable stay.”</p><strong>— Chloe, family guest</strong></article>
          </div>
        </section>

        <section className="contact-section" id="contact"><div className="contact-card">
          <div><p className="eyebrow">Contact</p><h2>Plan your next escape.</h2></div>
          <div className="contact-details"><p>hello@jehomes.co</p><p>+254 720 335 889</p><p>Ngong Road, Nairobi</p></div>
        </div></section>
      </main>

      <dialog className="booking-dialog" ref={dialogRef}>
        <button className="close-dialog" type="button" aria-label="Close booking form" onClick={() => dialogRef.current?.close()}>×</button>
        {bookingResult ? (
          <div className="success-state">
            <p className="eyebrow">Request received</p><h2>You are almost there.</h2>
            <p>We have sent your stay request for <strong>{guestName}</strong> to the host. Your booking reference is <strong>{bookingResult.bookingID}</strong>.{paymentMessage}</p>
            <button className="primary-button" type="button" onClick={() => dialogRef.current?.close()}>Back to stays <span>→</span></button>
          </div>
        ) : (
          <div>
            <p className="eyebrow">Make it yours</p><h2>Book your stay.</h2>
            <p className="dialog-subtitle">{selectedStay && `${selectedStay.name} · ${selectedStay.location} · KSh ${selectedStay.price} per night`}</p>
            <form id="booking-form" onSubmit={submitBooking}>
              <div className="form-grid">
                <label>Full name<input type="text" required placeholder="Your name" value={guestName} onChange={(event) => setGuestName(event.target.value)} /></label>
                <label>Email<input type="email" required placeholder="you@example.com" value={guestEmail} onChange={(event) => setGuestEmail(event.target.value)} /></label>
                <label>Check in<input type="date" min={today} required value={checkIn} onChange={(event) => setCheckIn(event.target.value)} /></label>
                <label>Check out<input type="date" min={checkIn || today} required value={checkOut} onChange={(event) => setCheckOut(event.target.value)} /></label>
                <label>Payment method<select required value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                  <option value="" disabled>Choose a method</option><option value="mpesa">M-Pesa</option><option value="card">Card</option><option value="pay_at_property">Pay at property</option>
                </select></label>
                {paymentMethod === 'mpesa' && <label className="mpesa-phone-field is-visible">M-Pesa number<input type="tel" inputMode="numeric" required placeholder="0712 345 678" value={mpesaPhone} onChange={(event) => setMpesaPhone(event.target.value)} /></label>}
              </div>
              <label>Note to your host<textarea rows="3" placeholder="Anything we should know?" value={note} onChange={(event) => setNote(event.target.value)} /></label>
              <div className="booking-total"><span>Estimated total</span><strong>KSh {total.toLocaleString()}</strong></div>
              <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Sending request…' : 'Request to book'} <span>→</span></button>
              <p className="form-message" role="status">{message}</p>
            </form>
          </div>
        )}
      </dialog>

      <footer id="host"><span>© 2026 JE Homes</span><span>Made for meaningful escapes.</span></footer>
    </>
  );
}
