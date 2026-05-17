/* ============================================================
   Vintage808 — js/pages/account-returns.js
   ============================================================ */

import {
  fetchOrders,
  renderUserInfo, setActiveNav, setBreadcrumb, initLogout,
  esc, fmtDate, fmtCurrency, fmtStatus, badgeClass,
} from '../modules/account-shared.js';

renderUserInfo();
setActiveNav();
setBreadcrumb('Returns');
initLogout();

/* ─── Render returns ─────────────────────────────────────────── */
function renderReturns(orders = []) {
  const el = document.getElementById('returns-list');
  if (!el) return;

  const returned = orders.filter(o =>
    o.return?.status || ['returned'].includes(o.orderStatus)
  );

  if (!returned.length) {
    el.innerHTML = `
      <div class="account-empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M3 12a9 9 0 0 0 9 9m9-9a9 9 0 0 0-9-9M3 12l4-4m-4 4l4 4"/>
        </svg>
        <p>No return requests yet.</p>
      </div>`;
    return;
  }

  el.innerHTML = returned.map(order => {
    const ret       = order.return || {};
    const status    = ret.status || 'requested';
    const displayId = order.orderNumber || ('#' + (order._id || order.id || '').toString().slice(-8).toUpperCase());

    return `
      <div class="account-card" style="margin-bottom:12px;">
        <div class="card-header">
          <div>
            <div style="font-family:var(--font-mono);font-size:11px;color:var(--acc-mid);margin-bottom:3px;">${esc(displayId)}</div>
            <div style="font-size:13px;color:var(--acc-black);">${fmtDate(order.createdAt)}</div>
          </div>
          <span class="order-badge ${badgeClass('return_' + status)}">${fmtStatus('return_' + status)}</span>
        </div>
        <div class="card-body">
          <div class="profile-row">
            <span class="profile-key">Reason</span>
            <span class="profile-val">${esc(ret.reason || '—')}</span>
          </div>
          <div class="profile-row">
            <span class="profile-key">Requested</span>
            <span class="profile-val">${ret.requestedAt ? fmtDate(ret.requestedAt) : '—'}</span>
          </div>
          ${ret.adminNote ? `
          <div class="profile-row">
            <span class="profile-key">Admin Note</span>
            <span class="profile-val">${esc(ret.adminNote)}</span>
          </div>` : ''}
          <div class="profile-row">
            <span class="profile-key">Order Total</span>
            <span class="profile-val">${fmtCurrency(order.total)}</span>
          </div>
        </div>
        <a href="./account-orders.html" class="card-footer-link">
          View Order Details
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
      </div>`;
  }).join('');
}

/* ─── Boot ───────────────────────────────────────────────────── */
fetchOrders().then(renderReturns);