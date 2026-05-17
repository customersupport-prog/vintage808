/* ============================================================
   Vintage808 — js/pages/account-orders.js
   ============================================================ */

import {
  token, API,
  fetchOrders, fetchSingleOrder, requestReturn,
  renderUserInfo, setActiveNav, setBreadcrumb, initLogout,
  esc, fmtDate, fmtCurrency, fmtStatus, badgeClass,
  buildStepperHtml, stepState, STATUS_STEPS,
} from '../modules/account-shared.js';

renderUserInfo();
setActiveNav();
setBreadcrumb('Orders');
initLogout();

/* ─── State ──────────────────────────────────────────────────── */
let _cachedOrders = [];

/* ─── Render orders list ─────────────────────────────────────── */
function renderOrders(orders = []) {
  const el = document.getElementById('orders-list');
  if (!el) return;

  if (!orders.length) {
    el.innerHTML = `
      <div class="account-empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" color="var(--acc-mid)">
          <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
        </svg>
        <p>No orders yet.</p>
        <a class="account-btn-secondary" href="./shop.html">Browse the Shop</a>
      </div>`;
    return;
  }

  el.innerHTML = orders.map(order => {
    const status    = order.orderStatus || order.status || 'pending';
    const displayId = order.orderNumber || ('#' + (order._id || order.id || '').toString().slice(-8).toUpperCase());
    const thumbs    = (order.items || []).slice(0, 3).map(item =>
      item.image
        ? `<img class="order-thumb" src="${esc(item.image)}" alt="${esc(item.name)}" />`
        : `<div class="order-thumb-placeholder"></div>`
    ).join('') + ((order.items || []).length > 3
      ? `<div class="order-thumb-more">+${order.items.length - 3}</div>` : '');

    return `
      <div class="order-card" data-order-id="${esc((order._id || order.id || '').toString())}" role="button" tabindex="0">
        <div class="order-card-header">
          <div class="order-card-meta">
            <div class="order-number">${esc(displayId)}</div>
            <div class="order-date">${fmtDate(order.createdAt)}</div>
          </div>
          <div class="order-card-right">
            <span class="order-badge ${badgeClass(status)}">${fmtStatus(status)}</span>
            <span class="order-card-total">${fmtCurrency(order.total)}</span>
          </div>
        </div>
        <div class="order-stepper">${buildStepperHtml(status)}</div>
        <div class="order-items-row">${thumbs}</div>
        <div class="order-card-footer">
          <span class="order-card-footer-left">${(order.items || []).length} item${(order.items || []).length !== 1 ? 's' : ''}</span>
          <span class="order-card-footer-right">
            View Details
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </span>
        </div>
      </div>`;
  }).join('');

  el.querySelectorAll('.order-card').forEach(card => {
    card.addEventListener('click',   () => openOrderModal(card.dataset.orderId));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') openOrderModal(card.dataset.orderId);
    });
  });
}

/* ─── Order modal ────────────────────────────────────────────── */
async function openOrderModal(orderId) {
  let order = await fetchSingleOrder(orderId);
  if (!order) order = _cachedOrders.find(o => (o._id || o.id || '').toString() === orderId);
  if (!order) return;

  const status    = order.orderStatus || order.status || 'pending';
  const displayId = order.orderNumber || ('#' + (order._id || order.id || '').toString().slice(-8).toUpperCase());
  const addr      = order.shippingAddress || {};

  document.getElementById('modal-order-id').textContent   = displayId;
  document.getElementById('modal-order-date').textContent = fmtDate(order.createdAt, { year: 'numeric', month: 'long', day: 'numeric' });

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

  document.getElementById('modal-body').innerHTML = `
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
          ${order.courier       ? `<div class="modal-info-row"><span class="modal-info-key">Courier</span><span class="modal-info-val">${esc(order.courier)}</span></div>` : ''}
          ${order.trackingNumber ? `<div class="modal-info-row"><span class="modal-info-key">Tracking #</span><span class="modal-info-val mono">${esc(order.trackingNumber)}</span></div>` : ''}
          ${order.trackingUrl   ? `<div class="modal-info-row"><span class="modal-info-key">Track</span><span class="modal-info-val"><a href="${esc(order.trackingUrl)}" target="_blank" rel="noopener" style="color:var(--acc-black);font-weight:600;text-decoration:underline;text-underline-offset:2px;">Track shipment →</a></span></div>` : ''}
        </div>
      </div>
    </div>` : ''}
    <div class="modal-two-col">
      <div class="modal-section">
        <div class="modal-section-title">Delivery Address</div>
        <div class="modal-inner-card">
          <div class="modal-address-text">
            ${esc(order.customerName || '')}<br>
            ${addr.street  ? esc(addr.street)  + '<br>' : ''}
            ${addr.city    ? esc(addr.city) + (addr.province ? ', ' + esc(addr.province) : '') + '<br>' : ''}
            ${addr.postal  ? esc(addr.postal)  + '<br>' : ''}
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

  // Returns section
  const ret = order.return;
  let returnHtml = '';

  if (ret?.status) {
    returnHtml = `
      <div class="modal-section">
        <div class="modal-section-title">Return Request</div>
        <div class="modal-inner-card">
          <div class="modal-info-rows">
            <div class="modal-info-row"><span class="modal-info-key">Status</span><span class="modal-info-val"><span class="order-badge ${badgeClass('return_' + ret.status)}">${fmtStatus('return_' + ret.status)}</span></span></div>
            <div class="modal-info-row"><span class="modal-info-key">Reason</span><span class="modal-info-val">${esc(ret.reason)}</span></div>
            ${ret.requestedAt ? `<div class="modal-info-row"><span class="modal-info-key">Requested</span><span class="modal-info-val">${fmtDate(ret.requestedAt)}</span></div>` : ''}
            ${ret.adminNote   ? `<div class="modal-info-row"><span class="modal-info-key">Note</span><span class="modal-info-val">${esc(ret.adminNote)}</span></div>` : ''}
          </div>
        </div>
      </div>`;
  } else if (status === 'delivered') {
    returnHtml = `
      <div class="modal-section" id="return-section">
        <div class="modal-section-title">Request a Return</div>
        <div class="modal-inner-card" style="padding:16px 20px;">
          <p style="font-size:13px;color:var(--acc-mid);margin:0 0 12px;">Not happy with your order? Let us know why.</p>
          <textarea id="return-reason" class="edit-input" style="width:100%;resize:vertical;min-height:80px;font-family:inherit;" placeholder="Describe the reason for your return…"></textarea>
          <p id="return-error" style="font-size:12px;color:var(--acc-red);margin:6px 0 0;display:none;"></p>
          <button id="return-submit-btn" class="account-btn-primary" style="margin-top:12px;width:100%;">Submit Return Request</button>
        </div>
      </div>`;
  }

  document.getElementById('modal-body').insertAdjacentHTML('beforeend', returnHtml);

  const submitBtn = document.getElementById('return-submit-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const reason  = document.getElementById('return-reason')?.value.trim();
      const errorEl = document.getElementById('return-error');
      if (!reason) { errorEl.textContent = 'Please enter a reason.'; errorEl.style.display = 'block'; return; }
      submitBtn.disabled = true; submitBtn.textContent = 'Submitting…'; errorEl.style.display = 'none';
      try {
        await requestReturn(orderId, reason);
        closeModal();
        setTimeout(() => openOrderModal(orderId), 150);
      } catch (err) {
        errorEl.textContent = err.message; errorEl.style.display = 'block';
        submitBtn.disabled = false; submitBtn.textContent = 'Submit Return Request';
      }
    });
  }

  document.getElementById('modal-overlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('modal-overlay')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ─── Boot ───────────────────────────────────────────────────── */
fetchOrders().then(orders => {
  _cachedOrders = orders;
  renderOrders(orders);
});