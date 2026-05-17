// js/pages/checkout.js
import { getCart, getCartTotal, clearCart } from '../components/cart.js';

const API = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://vintage808-api-six.vercel.app/api';

const SHIPPING = 150;

// ── Auth guard ────────────────────────────────────────────────
const token = localStorage.getItem('v808_token');
if (!token) {
  sessionStorage.setItem('v808_return', './checkout.html');
  window.location.href = './login.html';
}

// ── Handle cancelled payment return ──────────────────────────
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('status') === 'cancelled' && urlParams.get('restore') === '1') {
  const pending = JSON.parse(sessionStorage.getItem('v808_pending_order') || 'null');
  if (pending?.items) {
    localStorage.setItem('v808_cart', JSON.stringify(pending.items));
  }
  const banner = document.createElement('div');
  banner.style.cssText = 'background:#1a1a1a;color:#fff;text-align:center;padding:12px;font-size:13px;position:relative;z-index:999;';
  banner.textContent   = 'Payment was cancelled. Your cart has been restored.';
  document.body.prepend(banner);
  setTimeout(() => banner.remove(), 5000);
  // Clean URL
  const clean = new URL(window.location.href);
  clean.searchParams.delete('status');
  clean.searchParams.delete('restore');
  window.history.replaceState({}, '', clean);
}

// ── Elements ──────────────────────────────────────────────────
const summaryItems    = document.getElementById('summary-items');
const summaryEmpty    = document.getElementById('summary-empty');
const summarySubtotal = document.getElementById('summary-subtotal');
const summaryTotal    = document.getElementById('summary-total');
const errorBox        = document.getElementById('checkout-error');
const errorMsg        = document.getElementById('checkout-error-msg');
const payBtn          = document.getElementById('pay-btn');
const payBtnText      = document.getElementById('pay-btn-text');
const payBtnLoader    = document.getElementById('pay-btn-loader');

// ── Render summary ────────────────────────────────────────────
function renderSummary() {
  const cart     = getCart();
  const subtotal = getCartTotal();

  if (cart.length === 0) {
    summaryItems.style.display = 'none';
    summaryEmpty.style.display = 'block';
  } else {
    summaryItems.innerHTML = cart.map(item => `
      <div class="summary-item">
        <img class="summary-item-img"
             src="${item.image ?? item.images?.[0] ?? ''}"
             alt="${item.name}"
             onerror="this.style.display='none'" />
        <div class="summary-item-info">
          <p class="summary-item-name">${item.name}</p>
          <p class="summary-item-meta">Size: ${item.size ?? '—'} · Qty: ${item.qty}</p>
        </div>
        <span class="summary-item-price">R${(item.price * item.qty).toFixed(2)}</span>
      </div>
    `).join('');
  }

  summarySubtotal.textContent = `R${subtotal.toFixed(2)}`;
  summaryTotal.textContent    = `R${(subtotal + SHIPPING).toFixed(2)}`;
}

renderSummary();

// ── Helpers ───────────────────────────────────────────────────
function showError(msg) {
  errorMsg.textContent = msg;
  errorBox.style.display = 'flex';
  errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function hideError() { errorBox.style.display = 'none'; }

function setLoading(on) {
  payBtn.disabled            = on;
  payBtnText.style.display   = on ? 'none'        : 'inline';
  payBtnLoader.style.display = on ? 'inline-flex' : 'none';
}

// ── Pre-fill email from logged in user ────────────────────────
const loggedInUser = JSON.parse(localStorage.getItem('v808_user') || '{}');
const emailInput   = document.getElementById('email');
if (emailInput && loggedInUser.email) {
  emailInput.value = loggedInUser.email;
}

// ── Pay button ────────────────────────────────────────────────
payBtn.addEventListener('click', async () => {
  hideError();

  const fullName = document.getElementById('full-name').value.trim();
  const email    = document.getElementById('email').value.trim();
  const phone    = document.getElementById('phone').value.trim();
  const street   = document.getElementById('street').value.trim();
  const city     = document.getElementById('city').value.trim();
  const province = document.getElementById('province').value;
  const postal   = document.getElementById('postal').value.trim();

  if (!fullName || !email || !phone || !street || !city || !province || !postal) {
    showError('Please fill in all fields before continuing.');
    return;
  }

  const cart = getCart();
  if (cart.length === 0) {
    showError('Your cart is empty.');
    return;
  }

  const subtotal = getCartTotal();
  const total    = subtotal + SHIPPING;

  const items = cart.map(item => ({
    productId: item.productId || item._id || item.id || '',
    name:      item.name,
    price:     item.price,
    size:      item.size ?? '',
    quantity:  item.qty ?? item.quantity ?? 1,
    image:     item.image || item.images?.[0] || '',
  }));

  const address = { street, city, province, postal, phone };

  // Save pending order to session in case we need to restore cart
  sessionStorage.setItem('v808_pending_order', JSON.stringify({
    customerName:  fullName,
    customerEmail: loggedInUser.email || email,
    items,
    total,
    shippingAddress: address,
    createdAt: new Date().toISOString(),
  }));

  setLoading(true);

  try {
    // 1. Initialize payment with our backend
    const initRes = await fetch(`${API}/paystack/initialize`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify({
        email:        loggedInUser.email || email,
        customerName: fullName,
        userId:       loggedInUser._id || loggedInUser.id || '',
        items,
        address,
        subtotal:     subtotal.toFixed(2),
        shippingFee:  SHIPPING.toFixed(2),
      }),
    });

    const initData = await initRes.json();

    if (!initData.success) {
      showError(initData.message || 'Could not initialize payment. Please try again.');
      setLoading(false);
      return;
    }

    // Save order ID so success page can verify
    sessionStorage.setItem('v808_paystack_ref',      initData.reference);
    sessionStorage.setItem('v808_paystack_order_id', initData.orderId);

    // 2. Redirect to Paystack hosted payment page
    window.location.href = initData.authorization_url;

  } catch (err) {
    console.error('[Checkout] Error:', err);
    showError('Something went wrong. Please try again.');
    setLoading(false);
  }
});