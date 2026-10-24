const stays = [
  { id: 'je-casa-01', name: 'Casa Sol', location: 'Algarve, Portugal', category: 'coastal', price: 210, guests: 4, badge: 'Guest favourite', image: 'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=900&q=85' },
  { id: 'je-loft-02', name: 'The Linen Loft', location: 'Copenhagen, Denmark', category: 'city', price: 180, guests: 2, badge: 'New stay', image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=85' },
  { id: 'je-cabin-03', name: 'Juniper Cabin', location: 'Cotswolds, England', category: 'countryside', price: 245, guests: 4, badge: 'Slow living', image: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=900&q=85' },
  { id: 'je-house-04', name: 'Blue Hour House', location: 'Byron Bay, Australia', category: 'coastal', price: 325, guests: 6, badge: 'Long weekend', image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=85' },
  { id: 'je-flat-05', name: 'Casa Clementine', location: 'Lisbon, Portugal', category: 'city', price: 155, guests: 2, badge: 'City favourite', image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=85' },
  { id: 'je-farm-06', name: 'Meadow House', location: 'Piedmont, Italy', category: 'countryside', price: 280, guests: 5, badge: 'Made for groups', image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=85' }
];

const grid = document.querySelector('#stay-grid');
const dialog = document.querySelector('#booking-dialog');
const bookingForm = document.querySelector('#booking-form');
const today = new Date().toISOString().split('T')[0];

document.querySelector('#check-in').min = today;
document.querySelector('#check-out').min = today;
document.querySelector('#booking-check-in').min = today;
document.querySelector('#booking-check-out').min = today;

function renderStays(filter = 'all', search = '') {
  const normalizedSearch = search.trim().toLowerCase();
  const visibleStays = stays.filter((stay) => {
    const matchesFilter = filter === 'all' || stay.category === filter;
    const matchesSearch = !normalizedSearch || `${stay.name} ${stay.location}`.toLowerCase().includes(normalizedSearch);
    return matchesFilter && matchesSearch;
  });
  grid.innerHTML = visibleStays.length ? visibleStays.map((stay) => `
    <article class="stay-card">
      <div class="stay-photo" style="background-image:url('${stay.image}')">
        <span class="stay-badge">${stay.badge}</span>
      </div>
      <div class="stay-info">
        <h3>${stay.name}</h3>
        <div class="stay-meta"><span>${stay.location} · up to ${stay.guests}</span><span class="stay-price">KSh ${stay.price} / night</span></div>
        <button class="text-link book-button" data-stay-id="${stay.id}" style="background:none;border:0;border-bottom:1px solid var(--ink);margin-top:18px;padding:0 0 6px;width:auto">View stay <span>→</span></button>
      </div>
    </article>`).join('') : '<p>No stays match that search yet. Try another place.</p>';
  document.querySelectorAll('.book-button').forEach((button) => button.addEventListener('click', () => openBooking(button.dataset.stayId)));
}

function nightsBetween(start, end) {
  if (!start || !end) return 0;
  return Math.max(0, Math.round((new Date(`${end}T00:00:00`) - new Date(`${start}T00:00:00`)) / 86400000));
}

function updateTotal() {
  const stay = stays.find((item) => item.id === document.querySelector('#room-id').value);
  const nights = nightsBetween(document.querySelector('#booking-check-in').value, document.querySelector('#booking-check-out').value);
  document.querySelector('#booking-total').textContent = stay ? `KSh ${(stay.price * nights).toLocaleString()}` : 'KSh 0';
}

function openBooking(stayId) {
  const stay = stays.find((item) => item.id === stayId);
  document.querySelector('#room-id').value = stay.id;
  document.querySelector('#selected-stay').textContent = `${stay.name} · ${stay.location} · KSh ${stay.price} per night`;
  document.querySelector('#form-message').textContent = '';
  dialog.showModal();
}

document.querySelectorAll('.filter').forEach((button) => button.addEventListener('click', () => {
  document.querySelector('.filter.active').classList.remove('active');
  button.classList.add('active');
  renderStays(button.dataset.filter, document.querySelector('#destination').value);
}));

document.querySelector('#search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  renderStays(document.querySelector('.filter.active').dataset.filter, document.querySelector('#destination').value);
  document.querySelector('#stays').scrollIntoView({ behavior: 'smooth' });
});

document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
document.querySelectorAll('#booking-check-in, #booking-check-out').forEach((input) => input.addEventListener('change', updateTotal));

document.querySelector('#booking-check-in').addEventListener('change', (event) => {
  document.querySelector('#booking-check-out').min = event.target.value;
});

document.querySelector('#payment-method').addEventListener('change', (event) => {
  const phoneField = document.querySelector('#mpesa-phone-field');
  const isMpesa = event.target.value === 'mpesa';
  phoneField.classList.toggle('is-visible', isMpesa);
  document.querySelector('#mpesa-phone').required = isMpesa;
});

bookingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = document.querySelector('#form-message');
  const checkIn = document.querySelector('#booking-check-in').value;
  const checkOut = document.querySelector('#booking-check-out').value;
  if (nightsBetween(checkIn, checkOut) < 1) {
    message.textContent = 'Choose a check-out date after check-in.';
    return;
  }
  const payload = {
    roomID: document.querySelector('#room-id').value,
    checkIn,
    checkOut,
    guests: Number(document.querySelector('#guests').value),
    guestName: document.querySelector('#guest-name').value,
    guestEmail: document.querySelector('#guest-email').value,
    paymentMethod: document.querySelector('#payment-method').value,
    mpesaPhone: document.querySelector('#mpesa-phone').value,
    amount: stays.find((item) => item.id === document.querySelector('#room-id').value).price * nightsBetween(checkIn, checkOut),
    note: document.querySelector('#guest-note').value
  };
  const button = bookingForm.querySelector('button[type="submit"]');
  button.disabled = true;
  button.firstChild.textContent = 'Sending request ';
  try {
    const response = await fetch('/process-booking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Booking failed');
    if (payload.paymentMethod === 'card' && result.checkoutUrl) {
      window.location.assign(result.checkoutUrl);
      return;
    }
    const paymentMessage = result.paymentStatus === 'prompt_sent' ? ` ${result.customerMessage || 'Check your phone to approve the M-Pesa payment.'}` : '';
    document.querySelector('#booking-content').innerHTML = `<div class="success-state"><p class="eyebrow">Request received</p><h2>You are almost there.</h2><p>We have sent your stay request for <strong>${payload.guestName}</strong> to the host. Your booking reference is <strong>${result.bookingID}</strong>.${paymentMessage}</p><button class="primary-button" onclick="document.querySelector('#booking-dialog').close()">Back to stays <span>→</span></button></div>`;
  } catch (error) {
    message.textContent = error.message || 'We could not reach the booking service. Please try again.';
  } finally {
    button.disabled = false;
    button.firstChild.textContent = 'Request to book ';
  }
});

renderStays();
