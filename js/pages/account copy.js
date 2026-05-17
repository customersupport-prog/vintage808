// js/pages/account.js
import { requireAuth, logout }                    from '../utils/auth.js';
import { esc, fmtDate, fmtCurrency, fmtStatus, badgeClass, show, hide, $ } from '../utils/format.js';
import { openOrderModal, closeModal, bindModalClose, buildStepperHtml } from '../components/orderModal.js';

(function () {
  'use strict';

  const API = 'https://vintage808-api.vercel.app' || 'http://localhost:5000';

  // ── Auth guard ────────────────────────────────────────────────
  const auth = requireAuth('./account.html');
  if (!auth) return;
  const { token, user } = auth;

  // ── Cached data ───────────────────────────────────────────────
  let _cachedOrders = [];

  // ── Render: user info ─────────────────────────────────────────
  function renderUserInfo() {
    const full     = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    const initials = ((user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')).toUpperCase() || '??';
    if ($('avatar-initials'))       $('avatar-initials').textContent       = initials;
    if ($('avatar-name'))           $('avatar-name').textContent           = full || user.email;
    if ($('avatar-email'))          $('avatar-email').textContent          = user.email ?? '';
    if ($('profile-name-display'))  $('profile-name-display').textContent  = full || '—';
    if ($('profile-email-display')) $('profile-email-display').textContent = user.email ?? '—';
    if ($('profile-phone-display')) $('profile-phone-display').textContent = user.phone ?? '—';
    if ($('profile-since-display')) $('profile-since-display').textContent = user.memberSince ?? '—';
  }

  // ── Render: dashboard order previews ──────────────────────────
  function renderDashboardOrders(orders) {
    const el = $('dashboard-orders-list');
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
        <div class="recent-order-item" style="cursor:pointer;" data-order-id="${esc((order._id || order.id || '').toString())}">
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
    el.querySelectorAll('.recent-order-item').forEach(item => {
      item.addEventListener('click', () => openOrderModal(item.dataset.orderId, _cachedOrders, token));
    });
  }

  // ── Render: stats row ─────────────────────────────────────────
  function renderStats(orders) {
    if ($('stat-total-orders')) $('stat-total-orders').textContent = orders.length;
    if ($('stat-total-spent'))  $('stat-total-spent').textContent  = fmtCurrency(orders.reduce((s, o) => s + Number(o.total || 0), 0));
    if ($('stat-last-order'))   $('stat-last-order').textContent   = orders.length ? fmtDate(orders[0].createdAt) : '—';
  }

  // ── Render: dashboard address preview ─────────────────────────
  function renderDashboardAddress(addresses) {
    const el = $('dashboard-address-preview');
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

  // ── Render: full orders list ──────────────────────────────────
  function renderOrders(orders = []) {
    const el = $('orders-list');
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
      ).join('') + ((order.items || []).length > 3 ? `<div class="order-thumb-more">+${order.items.length - 3}</div>` : '');

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
      card.addEventListener('click',   () => openOrderModal(card.dataset.orderId, _cachedOrders, token));
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openOrderModal(card.dataset.orderId, _cachedOrders, token); });
    });
  }

  // ── Render: addresses list ────────────────────────────────────
  function renderAddresses(addresses = []) {
    const el = $('addresses-list');
    if (!el) return;
    if (!addresses.length) {
      el.innerHTML = '<p style="font-size:14px;color:var(--acc-mid);padding:24px 0 12px;">No saved addresses yet.</p>';
      return;
    }
    el.innerHTML = addresses.map(addr => `
      <div class="address-card">
        <div class="address-card-top">
          <div class="address-label">${esc(addr.label || 'Address')}</div>
          <button class="address-action-btn danger address-delete-btn" data-id="${esc(addr._id)}">Remove</button>
        </div>
        <div class="address-text">${addr.lines.join('<br>')}</div>
      </div>`).join('');

    el.querySelectorAll('.address-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Remove this address?')) return;
        try {
          await fetch(`${API}/api/auth/addresses/${btn.dataset.id}`, {
            method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
          });
          fetchAddresses().then(addrs => { renderAddresses(addrs); renderDashboardAddress(addrs); });
        } catch { alert('Could not remove address.'); }
      });
    });
  }

  // ── API: fetch orders ─────────────────────────────────────────
  async function fetchOrders() {
    try {
      const res = await fetch(`${API}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data      = await res.json();
      const rawOrders = data.data ?? data.orders ?? [];
      if (!Array.isArray(rawOrders)) return [];
      const orders = rawOrders.map(order => ({
        ...order,
        id:          order.id || order._id,
        orderStatus: order.orderStatus || order.status || 'pending',
        total:       Number(order.total || 0),
        items:       Array.isArray(order.items) ? order.items : [],
        createdAt:   order.createdAt || new Date().toISOString(),
      }));
      _cachedOrders = orders;
      return orders;
    } catch { return []; }
  }

  // ── API: fetch addresses ──────────────────────────────────────
  async function fetchAddresses() {
    try {
      const res = await fetch(`${API}/api/auth/addresses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.data ?? []).map((a, i) => ({
        _id:   a._id,
        label: a.label || `Address ${i + 1}`,
        lines: [a.street, `${a.city}, ${a.province}`, a.postal].filter(Boolean),
      }));
    } catch { return []; }
  }


// ── Tab switching ─────────────────────────────────────────────
  const TAB_LABELS = { profile: 'Dashboard', orders: 'Orders', addresses: 'Addresses' };

  function switchTab(name) {
    document.querySelectorAll('.account-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.account-nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${name}`)?.classList.add('active');
    document.querySelector(`.account-nav-item[data-tab="${name}"]`)?.classList.add('active');

    const crumb = $('breadcrumb-current');
    if (crumb) crumb.textContent = TAB_LABELS[name] || name;

    const url = new URL(window.location.href);
    name === 'profile' ? url.searchParams.delete('tab') : url.searchParams.set('tab', name);
    window.history.pushState({}, '', url);

    document.title = `${TAB_LABELS[name] || name} — Vintage808`;
    sessionStorage.setItem('account_tab', name);

    document.querySelectorAll('#mobile-tab-bar .account-mobile-tab').forEach(b => b.classList.remove('active'));
    document.querySelector(`#mobile-tab-bar .account-mobile-tab[data-tab="${name}"]`)?.classList.add('active');

    if (name === 'orders') {
      fetchOrders().then(orders => {
        renderOrders(orders);
        renderDashboardOrders(orders);
        renderStats(orders);
      });
    }
  }

  // ── Sidebar nav ───────────────────────────────────────────────
  document.querySelectorAll('.account-nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // ── Breadcrumb ────────────────────────────────────────────────
  document.querySelector('.account-breadcrumb-home')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('profile');
  });

  // ── Mobile tab bar ────────────────────────────────────────────
  document.querySelectorAll('#mobile-tab-bar .account-mobile-tab[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('mobile-logout-btn')?.addEventListener('click', () => {
    document.getElementById('logout-btn').click();
  });

  // ── Dashboard shortcuts ───────────────────────────────────────
  $('view-all-orders-btn')?.addEventListener('click',         () => switchTab('orders'));
  $('dashboard-orders-footer-btn')?.addEventListener('click', () => switchTab('orders'));
  $('manage-addresses-btn')?.addEventListener('click',        () => switchTab('addresses'));
  $('add-address-shortcut-btn')?.addEventListener('click',    () => {
    switchTab('addresses');
    setTimeout(() => $('add-address-btn')?.click(), 100);
  });

  // ── Edit profile ──────────────────────────────────────────────
  function openEdit() {
    if ($('edit-first-name')) $('edit-first-name').value = user.firstName ?? '';
    if ($('edit-last-name'))  $('edit-last-name').value  = user.lastName  ?? '';
    if ($('edit-email'))      $('edit-email').value      = user.email     ?? '';
    hide($('save-success')); hide($('save-error'));
    hide($('profile-view')); show($('profile-edit'));
  }

  function closeEdit() { hide($('profile-edit')); show($('profile-view')); }

  $('edit-profile-btn')?.addEventListener('click', openEdit);
  $('cancel-edit-btn')?.addEventListener('click', closeEdit);

  $('save-profile-btn')?.addEventListener('click', async () => {
    hide($('save-success')); hide($('save-error'));

    const newFirst  = $('edit-first-name')?.value.trim();
    const newLast   = $('edit-last-name')?.value.trim();
    const newEmail  = $('edit-email')?.value.trim();
    const curPw     = $('edit-current-pw')?.value;
    const newPw     = $('edit-new-pw')?.value;
    const confirmPw = $('edit-confirm-pw')?.value;

    if (!newFirst || !newEmail) {
      $('save-error-msg').textContent = 'First name and email are required.';
      show($('save-error')); return;
    }
    if (newPw && newPw !== confirmPw) {
      $('save-error-msg').textContent = 'New passwords do not match.';
      show($('save-error')); return;
    }

    $('save-profile-btn').disabled = true;
    show($('save-spinner'));

    try {
      const body = { firstName: newFirst, lastName: newLast, email: newEmail };
      if (newPw) { body.currentPassword = curPw; body.newPassword = newPw; }

      const res = await fetch(`${API}/api/auth/profile`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        $('save-error-msg').textContent = d.message || 'Could not save changes.';
        show($('save-error')); return;
      }

      user.firstName = newFirst;
      user.lastName  = newLast;
      user.email     = newEmail;
      localStorage.setItem('v808_user', JSON.stringify(user));
      renderUserInfo();
      show($('save-success'));
      setTimeout(closeEdit, 1400);
    } catch {
      $('save-error-msg').textContent = 'Something went wrong.';
      show($('save-error'));
    } finally {
      $('save-profile-btn').disabled = false;
      hide($('save-spinner'));
    }
  });

  // ── Add address ───────────────────────────────────────────────
  $('add-address-btn')?.addEventListener('click', () => {
    const existing = document.getElementById('add-address-form');
    if (existing) { existing.remove(); return; }

    const form = document.createElement('div');
    form.id = 'add-address-form';
    form.style.cssText = 'margin-top:16px;display:flex;flex-direction:column;gap:12px;';
    form.innerHTML = `
      <input class="edit-input" id="addr-label"    placeholder="Label (e.g. Home, Work)" />
      <input class="edit-input" id="addr-street"   placeholder="Street address" />
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <input class="edit-input" id="addr-city"   placeholder="City" />
        <input class="edit-input" id="addr-postal" placeholder="Postal code" />
      </div>
      <select class="edit-input" id="addr-province">
        <option value="" disabled selected>Select province</option>
        <option>Gauteng</option><option>Western Cape</option>
        <option>KwaZulu-Natal</option><option>Eastern Cape</option>
        <option>Limpopo</option><option>Mpumalanga</option>
        <option>North West</option><option>Free State</option>
        <option>Northern Cape</option>
      </select>
      <div style="display:flex;gap:10px;">
        <button id="addr-save-btn"   class="account-btn-primary"   style="flex:1;">Save address</button>
        <button id="addr-cancel-btn" class="account-btn-secondary" style="flex:1;">Cancel</button>
      </div>
      <p id="addr-error" style="font-size:12px;color:var(--acc-red);display:none;"></p>`;

    $('add-address-btn').after(form);

    document.getElementById('addr-cancel-btn').addEventListener('click', () => form.remove());
    document.getElementById('addr-save-btn').addEventListener('click', async () => {
      const street   = document.getElementById('addr-street').value.trim();
      const city     = document.getElementById('addr-city').value.trim();
      const province = document.getElementById('addr-province').value;
      const postal   = document.getElementById('addr-postal').value.trim();
      const label    = document.getElementById('addr-label').value.trim();
      const errEl    = document.getElementById('addr-error');

      if (!street || !city || !province || !postal) {
        errEl.textContent   = 'Please fill in all required fields.';
        errEl.style.display = 'block'; return;
      }

      try {
        const res = await fetch(`${API}/api/auth/addresses`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body:    JSON.stringify({ label, street, city, province, postal }),
        });
        if (!res.ok) { errEl.textContent = 'Could not save address.'; errEl.style.display = 'block'; return; }
        form.remove();
        fetchAddresses().then(addrs => { renderAddresses(addrs); renderDashboardAddress(addrs); });
      } catch { errEl.textContent = 'Something went wrong.'; errEl.style.display = 'block'; }
    });
  });

  // ── Logout ────────────────────────────────────────────────────
  $('logout-btn')?.addEventListener('click', () => logout('./index.html'));

  // ── PayFast cancel restore ────────────────────────────────────
  const _urlParams = new URLSearchParams(window.location.search);
  if (_urlParams.get('status') === 'cancelled' && _urlParams.get('restore') === '1') {
    const pending = JSON.parse(sessionStorage.getItem('v808_pending_order') || 'null');
    if (pending?.items) localStorage.setItem('v808_cart', JSON.stringify(pending.items));
    const banner = document.createElement('div');
    banner.style.cssText = 'background:#1a1a1a;color:#fff;text-align:center;padding:12px;font-size:13px;position:relative;z-index:999;';
    banner.textContent   = 'Payment was cancelled. Your cart has been restored.';
    document.body.prepend(banner);
    setTimeout(() => banner.remove(), 5000);
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('status');
    cleanUrl.searchParams.delete('restore');
    window.history.replaceState({}, '', cleanUrl);
  }

  // ── Boot ──────────────────────────────────────────────────────
  renderUserInfo();
  bindModalClose();

  fetchOrders().then(orders => {
    renderOrders(orders);
    renderDashboardOrders(orders);
    renderStats(orders);
  });

  fetchAddresses().then(addrs => {
    renderAddresses(addrs);
    renderDashboardAddress(addrs);
  });

  // ── Tab routing ──────────────────────────────────────────────
  const urlParams = new URLSearchParams(window.location.search);
  const savedTab  = urlParams.get('tab') || sessionStorage.getItem('account_tab') || 'profile';
  switchTab(savedTab);

  window.addEventListener('popstate', () => {
    const p = new URLSearchParams(window.location.search);
    switchTab(p.get('tab') || 'profile');
  });

})();