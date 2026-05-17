// js/pages/order-confirmation.js

const API = 'https://vintage808-api-six.vercel.app/api';

const params  = new URLSearchParams(window.location.search);
const orderId = params.get('order');

// ── Guard: no order ID → go home ─────────────────────────────
if (!orderId) {
  window.location.replace('./index.html');
}

async function init() {
  try {
    const token = localStorage.getItem('v808_token');

    const res  = await fetch(`${API}/orders/${orderId}`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    const data = await res.json();
    let order  = data.data ?? data.order ?? null;

    // Fallback to sessionStorage if API order is missing items
    if (!order?.items?.length) {
      const stored = sessionStorage.getItem('v808_pending_order');
      if (stored) {
        const stored_order = JSON.parse(stored);
        order = order ? { ...stored_order, ...order } : stored_order;
      }
    }

    if (!order) {
      console.error('[OrderConfirmation] Order not found');
      return;
    }

    // ── Render order ID ───────────────────────────────────────
    const idEl = document.getElementById('confirm-order-id');
    if (idEl) {
      idEl.textContent = order.orderNumber || `#${orderId.slice(-6).toUpperCase()}`;
    }

    // ── Render date ───────────────────────────────────────────
    const dateEl = document.getElementById('confirm-date');
    if (dateEl) {
      dateEl.textContent = new Date(order.createdAt).toLocaleDateString('en-ZA', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    }

    // ── Render total ──────────────────────────────────────────
    const totalEl = document.getElementById('confirm-total');
    if (totalEl) totalEl.textContent = `R${Number(order.total || 0).toFixed(2)}`;

    // ── Render address ────────────────────────────────────────
    const addrEl = document.getElementById('confirm-address');
    const a = order.shippingAddress;
    if (addrEl && a) {
      addrEl.innerHTML = `${a.street}<br/>${a.city}, ${a.province}<br/>${a.postal}`;
    }

    // ── Render items ──────────────────────────────────────────
    const itemsEl = document.getElementById('confirm-items');
    if (itemsEl && order.items?.length) {
      itemsEl.innerHTML = order.items.map(item => `
        <div class="confirm-item">
          <img class="confirm-item-img" src="${item.image ?? ''}" alt="${item.name}"
               onerror="this.style.display='none'" />
          <div class="confirm-item-info">
            <p class="confirm-item-name">${item.name}</p>
            <p class="confirm-item-meta">
              Size: ${item.size ?? '—'} · Qty: ${item.quantity ?? item.qty ?? 1}
            </p>
          </div>
          <span class="confirm-item-price">
            R${(Number(item.price) * (item.quantity ?? item.qty ?? 1)).toFixed(2)}
          </span>
        </div>
      `).join('');
    }

    // ── Clean up ──────────────────────────────────────────────
    sessionStorage.removeItem('v808_pending_order');
    localStorage.removeItem('v808_cart');

  } catch (err) {
    console.error('[OrderConfirmation] Error:', err);
    // Network error — show fallback order ID so page isn't blank
    const el = document.getElementById('confirm-order-id');
    if (el) el.textContent = `#${orderId.slice(-6).toUpperCase()}`;
  }
}

init();