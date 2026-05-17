/* ============================================================
   Vintage808 — js/pages/account-profile.js
   ============================================================ */

import {
  API, token, user,
  fetchOrders, fetchAddresses,
  renderUserInfo, setActiveNav, setBreadcrumb, initLogout,
  checkPayfastCancel,
  esc, fmtDate, fmtCurrency, fmtStatus, badgeClass,
} from '../modules/account-shared.js';

renderUserInfo();
setActiveNav();
setBreadcrumb('Dashboard');
initLogout();
checkPayfastCancel();

/* ─── Dashboard recent orders ────────────────────────────────── */
function renderDashboardOrders(orders) {
  const el = document.getElementById('dashboard-orders-list');
  if (!el) return;

  if (!orders.length) {
    el.innerHTML = `<div style="padding:24px 20px;font-size:13px;color:var(--acc-mid);">No orders yet. <a href="./shop.html" style="color:var(--acc-black);font-weight:500;">Browse the shop →</a></div>`;
    return;
  }

  el.innerHTML = orders.slice(0, 3).map(order => {
    const status    = order.orderStatus || order.status || 'pending';
    const displayId = order.orderNumber || ('#' + (order._id || order.id || '').toString().slice(-8).toUpperCase());
    const img       = order.items?.[0]?.image;
    return `
      <div class="recent-order-item">
        ${img
          ? `<img class="recent-order-img" src="${esc(img)}" alt="item" onerror="this.style.display='none'" />`
          : `<div class="recent-order-img-placeholder"></div>`}
        <div class="recent-order-info">
          <div class="recent-order-number">${esc(displayId)}</div>
          <div class="recent-order-date">${fmtDate(order.createdAt)}</div>
          <div class="recent-order-status"><span class="order-badge ${badgeClass(status)}">${fmtStatus(status)}</span></div>
        </div>
        <div class="recent-order-right">
          <div class="recent-order-total">${fmtCurrency(order.total)}</div>
          <div class="recent-order-items-count">${(order.items || []).length} item${(order.items || []).length !== 1 ? 's' : ''}</div>
        </div>
      </div>`;
  }).join('');
}

/* ─── Stats ──────────────────────────────────────────────────── */
function renderStats(orders) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('stat-total-orders', orders.length);
  set('stat-total-spent',  fmtCurrency(orders.reduce((s, o) => s + Number(o.total || 0), 0)));
  set('stat-last-order',   orders.length ? fmtDate(orders[0].createdAt) : '—');
}

/* ─── Dashboard address preview ──────────────────────────────── */
function renderDashboardAddress(addresses) {
  const el = document.getElementById('dashboard-address-preview');
  if (!el) return;

  if (!addresses.length) {
    el.innerHTML = `<p style="font-size:13px;color:var(--acc-mid);">No saved addresses yet.</p>`;
    return;
  }

  const a = addresses[0];
  el.innerHTML = `
    <div style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--acc-mid);margin-bottom:8px;">${esc(a.label)}</div>
    <div style="font-size:13px;color:var(--acc-black);line-height:1.7;">${a.lines.join('<br>')}</div>
    ${addresses.length > 1 ? `<div style="margin-top:8px;font-size:12px;color:var(--acc-mid);">+${addresses.length - 1} more</div>` : ''}`;
}

/* ─── Edit profile ───────────────────────────────────────────── */
function openEdit() {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  set('edit-first-name', user.firstName ?? '');
  set('edit-last-name',  user.lastName  ?? '');
  set('edit-email',      user.email     ?? '');
  document.getElementById('save-success')?.classList.add('hidden');
  document.getElementById('save-error')?.classList.add('hidden');
  document.getElementById('profile-view')?.classList.add('hidden');
  document.getElementById('profile-edit')?.classList.remove('hidden');
}

function closeEdit() {
  document.getElementById('profile-edit')?.classList.add('hidden');
  document.getElementById('profile-view')?.classList.remove('hidden');
}

document.getElementById('edit-profile-btn')?.addEventListener('click', openEdit);
document.getElementById('cancel-edit-btn')?.addEventListener('click', closeEdit);

document.getElementById('save-profile-btn')?.addEventListener('click', async () => {
  document.getElementById('save-success')?.classList.add('hidden');
  document.getElementById('save-error')?.classList.add('hidden');

  const newFirst  = document.getElementById('edit-first-name')?.value.trim();
  const newLast   = document.getElementById('edit-last-name')?.value.trim();
  const newEmail  = document.getElementById('edit-email')?.value.trim();
  const newPw     = document.getElementById('edit-new-pw')?.value;
  const confirmPw = document.getElementById('edit-confirm-pw')?.value;

  if (!newFirst || !newEmail) {
    document.getElementById('save-error-msg').textContent = 'First name and email are required.';
    document.getElementById('save-error')?.classList.remove('hidden');
    return;
  }
  if (newPw && newPw !== confirmPw) {
    document.getElementById('save-error-msg').textContent = 'New passwords do not match.';
    document.getElementById('save-error')?.classList.remove('hidden');
    return;
  }

  document.getElementById('save-profile-btn').disabled = true;
  document.getElementById('save-spinner')?.classList.remove('hidden');

  try {
    const body = { firstName: newFirst, lastName: newLast, email: newEmail };
    if (newPw) body.password = newPw;

    const res = await fetch(`${API}/api/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      document.getElementById('save-error-msg').textContent = d.message || 'Could not save changes.';
      document.getElementById('save-error')?.classList.remove('hidden');
      return;
    }

    user.firstName = newFirst;
    user.lastName  = newLast;
    user.email     = newEmail;
    localStorage.setItem('v808_user', JSON.stringify(user));
    renderUserInfo();
    document.getElementById('save-success')?.classList.remove('hidden');
    setTimeout(closeEdit, 1400);
  } catch {
    document.getElementById('save-error-msg').textContent = 'Something went wrong.';
    document.getElementById('save-error')?.classList.remove('hidden');
  } finally {
    document.getElementById('save-profile-btn').disabled = false;
    document.getElementById('save-spinner')?.classList.add('hidden');
  }
});

/* ─── Boot ───────────────────────────────────────────────────── */
fetchOrders().then(orders => {
  renderDashboardOrders(orders);
  renderStats(orders);
});

fetchAddresses().then(renderDashboardAddress);