// js/components/orderModal.js
// ─── Order detail modal — used by account.js ─────────────────
import { esc, fmtDate, fmtCurrency, fmtStatus, badgeClass, $ } from '../utils/format.js';

const API = 'https://vintage808-api-six.vercel.app';

const STATUS_STEPS = ['confirmed', 'processing', 'shipped', 'delivered'];

// ─── Stepper helpers ──────────────────────────────────────────
export function stepState(orderStatus, step) {
  if (orderStatus === 'cancelled') return 'future';
  if (orderStatus === 'pending')   return step === 'confirmed' ? 'active' : 'future';
  const oi = STATUS_STEPS.indexOf(orderStatus);
  const si = STATUS_STEPS.indexOf(step);
  if (si < oi)   return 'done';
  if (si === oi) return 'active';
  return 'future';
}

export function buildStepperHtml(status) {
  return STATUS_STEPS.map((step, i) => {
    const state  = stepState(status, step);
    const isLast = i === STATUS_STEPS.length - 1;
    const nextSt = !isLast ? stepState(status, STATUS_STEPS[i + 1]) : '';
    const lineCls = (nextSt === 'done' || nextSt === 'active') ? 'ostep-line done' : 'ostep-line';
    return `
      <div class="ostep ${state}">
        <div class="ostep-dot"></div>
        <div class="ostep-label">${step.charAt(0).toUpperCase() + step.slice(1)}</div>
      </div>
      ${!isLast ? `<div class="${lineCls}"></div>` : ''}`;
  }).join('');
}

// ─── Open modal ───────────────────────────────────────────────
export async function openOrderModal(orderId, cachedOrders = [], token) {
  let order;

  // Try fresh fetch first, fall back to cache
  try {
    const res = await fetch(`${API}/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const d = await res.json();
      order   = d.data ?? d;
      const idx = cachedOrders.findIndex(o => (o._id || o.id || '').toString() === orderId);
      if (idx > -1) cachedOrders[idx] = order;
    }
  } catch { /* fall through */ }

  if (!order) {
    order = cachedOrders.find(o => (o._id || o.id || '').toString() === orderId);
  }
  if (!order) return;

  const status    = order.orderStatus || order.status || 'pending';
  const displayId = order.orderNumber || ('#' + (order._id || order.id || '').toString().slice(-8).toUpperCase());
  const addr      = order.shippingAddress || {};

  if ($('modal-order-id'))   $('modal-order-id').textContent   = displayId;
  if ($('modal-order-date')) $('modal-order-date').textContent = fmtDate(order.createdAt, { year:'numeric', month:'long', day:'numeric' });

  const timelineHtml = STATUS_STEPS.map(step => {
    const state = stepState(status, step);
    const hist  = (order.statusHistory || []).find(h => h.status === step);
    return `
      <div class="mstep ${state}">
        <div class="mstep-left"><div class="mstep-dot"></div><div class="mstep-line"></div></div>
        <div class="mstep-right">
          <div class="mstep-name">${step.charAt(0).toUpperCase() + step.slice(1)}</div>
          ${hist?.timestamp ? `<div class="mstep-time">${esc(String(hist.timestamp))}</div>` : ''}
          ${hist?.note      ? `<div class="mstep-note">${esc(hist.note)}</div>`              : ''}
        </div>
      </div>`;
  }).join('');

  const itemsHtml = (order.items || []).map(item => `
    <div class="modal-item">
      <div class="modal-item-img">
        ${item.image ? `<img src="${esc(item.image)}" alt="${esc(item.name)}" style="width:100%;height:100%;object-fit:cover;">` : ''}
      </div>
      <div class="modal-item-info">
        <div class="modal-item-name">${esc(item.name)}</div>
        <div class="modal-item-meta">${item.size && item.size !== '—' ? `Size: ${esc(item.size)}<br>` : ''}Qty: ${item.quantity ?? item.qty ?? 1}</div>
      </div>
      <div class="modal-item-price">${fmtCurrency((item.price ?? 0) * (item.quantity ?? item.qty ?? 1))}</div>
    </div>`).join('');

  const shipping = order.shippingFee ?? order.shipping ?? 0;

  $('modal-body').innerHTML = `
    <div class="modal-section">
      <div class="modal-section-title">Order Status</div>
      <div class="modal-inner-card"><div class="modal-timeline">${timelineHtml}</div></div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">Items (${(order.items || []).length})</div>
      <div class="modal-inner-card">${itemsHtml}</div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">Order Summary</div>
      <div class="modal-inner-card">
        <div class="modal-totals">
          <div class="modal-total-row"><span>Subtotal</span><span>${fmtCurrency(order.subtotal ?? order.total ?? 0)}</span></div>
          <div class="modal-total-row"><span>Shipping</span><span>${shipping === 0 ? 'Free' : fmtCurrency(shipping)}</span></div>
          <div class="modal-total-row final"><span>Total</span><span>${fmtCurrency(order.total)}</span></div>
        </div>
      </div>
    </div>
    ${(order.trackingNumber || order.courier) ? `
    <div class="modal-section">
      <div class="modal-section-title">Tracking</div>
      <div class="modal-inner-card">
        <div class="modal-info-rows">
          ${order.courier        ? `<div class="modal-info-row"><span class="modal-info-key">Courier</span><span class="modal-info-val">${esc(order.courier)}</span></div>` : ''}
          ${order.trackingNumber ? `<div class="modal-info-row"><span class="modal-info-key">Tracking #</span><span class="modal-info-val mono">${esc(order.trackingNumber)}</span></div>` : ''}
          ${order.trackingUrl    ? `<div class="modal-info-row"><span class="modal-info-key">Track</span><span class="modal-info-val"><a href="${esc(order.trackingUrl)}" target="_blank" rel="noopener" style="color:var(--acc-black);font-weight:600;text-decoration:underline;text-underline-offset:2px;">Track shipment →</a></span></div>` : ''}
        </div>
      </div>
    </div>` : ''}
    <div class="modal-two-col">
      <div class="modal-section">
        <div class="modal-section-title">Delivery Address</div>
        <div class="modal-inner-card">
          <div class="modal-address-text">
            ${esc(order.customerName || '')}<br>
            ${addr.street   ? esc(addr.street)  + '<br>' : ''}
            ${addr.city     ? esc(addr.city) + (addr.province ? ', ' + esc(addr.province) : '') + '<br>' : ''}
            ${addr.postal   ? esc(addr.postal)  + '<br>' : ''}
            <span style="color:var(--acc-mid)">${esc(addr.phone || '')}</span>
          </div>
        </div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Payment</div>
        <div class="modal-inner-card">
          <div class="modal-info-rows">
            <div class="modal-info-row"><span class="modal-info-key">Method</span><span class="modal-info-val">${esc(order.payment?.method || 'PayFast')}</span></div>
            <div class="modal-info-row"><span class="modal-info-key">Status</span><span class="modal-info-val"><span class="order-badge ${badgeClass(order.payment?.status || status)}">${fmtStatus(order.payment?.status || status)}</span></span></div>
            ${order.payment?.transactionId ? `<div class="modal-info-row"><span class="modal-info-key">Ref</span><span class="modal-info-val mono">${esc(order.payment.transactionId)}</span></div>` : ''}
          </div>
        </div>
      </div>
    </div>`;

  $('modal-overlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

// ─── Close modal ──────────────────────────────────────────────
export function closeModal() {
  $('modal-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

// ─── Bind modal close events (call once on page load) ─────────
export function bindModalClose() {
  $('modal-overlay')?.addEventListener('click', e => {
    if (e.target === $('modal-overlay')) closeModal();
  });
  $('modal-close-btn')?.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}