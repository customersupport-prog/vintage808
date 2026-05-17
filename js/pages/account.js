/* ============================================================
   Vintage808 — js/pages/account.js
   Tabs: Profile · Orders · Addresses
   ============================================================ */

(function () {
  'use strict';

  const API     = 'https://vintage808-api-six.vercel.app/';
  const token   = localStorage.getItem('v808_token');
  const userRaw = localStorage.getItem('v808_user');

  if (!token || !userRaw) {
    sessionStorage.setItem('v808_return', './account.html');
    window.location.replace('./login.html');
    return;
  }

  let user;
  try {
    user = JSON.parse(userRaw);
  } catch {
    localStorage.removeItem('v808_token');
    localStorage.removeItem('v808_user');
    window.location.replace('./login.html');
    return;
  }

  if (!user.firstName && user.name) {
    const parts    = user.name.split(' ');
    user.firstName = parts[0] ?? '';
    user.lastName  = parts.slice(1).join(' ') ?? '';
  }

  if (user.createdAt) {
    user.memberSince = new Date(user.createdAt)
      .toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
  }

  const STATUS_STEPS = ['confirmed', 'processing', 'shipped', 'delivered'];

  const STATUS_LABELS = {
    pending:    'Pending',
    confirmed:  'Confirmed',
    processing: 'Processing',
    shipped:    'Shipped',
    delivered:  'Delivered',
    cancelled:  'Cancelled',
    returned:   'Returned',
    paid:       'Paid',
    failed:     'Failed',
  };

  const $ = id => document.getElementById(id);

  const esc         = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const fmtDate     = (iso, opts = { year:'numeric', month:'short', day:'numeric' }) => {
    try { return new Date(iso).toLocaleDateString('en-ZA', opts); } catch { return '—'; }
  };
  const fmtCurrency = n => 'R' + Number(n).toFixed(2);
  const show        = el => el?.classList.remove('hidden');
  const hide        = el => el?.classList.add('hidden');

  function fmtStatus(s) { return STATUS_LABELS[s] ?? 'Pending'; }

  function badgeClass(s) {
    return {
      pending:    'order-badge--pending',
      confirmed:  'order-badge--confirmed',
      paid:       'order-badge--paid',
      processing: 'order-badge--processing',
      shipped:    'order-badge--shipped',
      delivered:  'order-badge--delivered',
      cancelled:  'order-badge--cancelled',
      failed:     'order-badge--failed',
      returned:   'order-badge--cancelled',
    }[s] ?? 'order-badge--pending';
  }

  function stepState(orderStatus, step) {
    if (orderStatus === 'cancelled') return 'future';
    if (orderStatus === 'pending')   return step === 'confirmed' ? 'active' : 'future';
    const oi = STATUS_STEPS.indexOf(orderStatus);
    const si = STATUS_STEPS.indexOf(step);
    if (si < oi)  return 'done';
    if (si === oi) return 'active';
    return 'future';
  }

  function buildStepperHtml(status) {
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

  // ── Render helpers ────────────────────────────────────────────

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
      item.addEventListener('click', () => openOrderModal(item.dataset.orderId));
    });
  }

  function renderStats(orders) {
    if ($('stat-total-orders')) $('stat-total-orders').textContent = orders.length;
    if ($('stat-total-spent'))  $('stat-total-spent').textContent  = fmtCurrency(orders.reduce((s, o) => s + Number(o.total || 0), 0));
    if ($('stat-last-order'))   $('stat-last-order').textContent   = orders.length ? fmtDate(orders[0].createdAt) : '—';
  }

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
      card.addEventListener('click', () => openOrderModal(card.dataset.orderId));
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openOrderModal(card.dataset.orderId); });
    });
  }

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

  // ── Order modal ───────────────────────────────────────────────

  let _cachedOrders = [];

  async function openOrderModal(orderId) {
    let order;
    try {
      const res = await fetch(`${API}/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        order   = d.data ?? d;
        const idx = _cachedOrders.findIndex(o => (o._id || o.id || '').toString() === orderId);
        if (idx > -1) _cachedOrders[idx] = order;
      }
    } catch { /* fall through to cache */ }

    if (!order) {
      order = _cachedOrders.find(o => (o._id || o.id || '').toString() === orderId);
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
            ${order.courier ? `<div class="modal-info-row"><span class="modal-info-key">Courier</span><span class="modal-info-val">${esc(order.courier)}</span></div>` : ''}
            ${order.trackingNumber ? `<div class="modal-info-row"><span class="modal-info-key">Tracking #</span><span class="modal-info-val mono">${esc(order.trackingNumber)}</span></div>` : ''}
            ${order.trackingUrl ? `<div class="modal-info-row"><span class="modal-info-key">Track</span><span class="modal-info-val"><a href="${esc(order.trackingUrl)}" target="_blank" rel="noopener" style="color:var(--acc-black);font-weight:600;text-decoration:underline;text-underline-offset:2px;">Track shipment →</a></span></div>` : ''}
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

  function closeModal() {
    $('modal-overlay')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  $('modal-overlay')?.addEventListener('click', e => { if (e.target === $('modal-overlay')) closeModal(); });
  $('modal-close-btn')?.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // ── API calls ─────────────────────────────────────────────────

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

  async function fetchAddresses() {
    try {
      const res = await fetch(`${API}/api/auth/addresses`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.data ?? []).map((a, i) => ({
        _id:   a._id,
        label: a.label || `Address ${i + 1}`,
        lines: [a.street, `${a.city}, ${a.province}`, a.postal].filter(Boolean),
      }));
    } catch { return []; }
  }

  // ── Nav account dropdown ──────────────────────────────────────

  const accountBtn = document.querySelector('.nav-icon-btn[aria-label="Account"]');
  if (accountBtn && localStorage.getItem('v808_token')) {
    accountBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      let dropdown = document.getElementById('account-dropdown');
      if (dropdown) { dropdown.remove(); return; }

      dropdown = document.createElement('div');
      dropdown.id = 'account-dropdown';
      dropdown.style.cssText = `
        position: absolute; top: 100%; right: 0;
        background: #fff; border: 1px solid #e8e4de;
        border-radius: 6px; min-width: 160px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        z-index: 200; overflow: hidden;
      `;
      dropdown.innerHTML = `
        <a href="./account.html" style="display:block;padding:12px 16px;font-size:13px;color:#111;text-decoration:none;border-bottom:1px solid #e8e4de;">My Account</a>
        <button id="nav-logout-btn" style="width:100%;padding:12px 16px;font-size:13px;color:#111;background:none;border:none;text-align:left;cursor:pointer;">Sign out</button>
      `;
      accountBtn.parentElement.style.position = 'relative';
      accountBtn.parentElement.appendChild(dropdown);

      document.getElementById('nav-logout-btn').addEventListener('click', () => {
        localStorage.removeItem('v808_token');
        localStorage.removeItem('v808_user');
        sessionStorage.clear();
        window.location.href = './index.html';
      });

      document.addEventListener('click', () => dropdown?.remove(), { once: true });
    });
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
  $('add-address-shortcut-btn')?.addEventListener('click',    () => switchTab('addresses'));

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
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
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

  // ── Add address (permanent form) ──────────────────────────────

  $('addr-save-btn')?.addEventListener('click', async () => {
    const street   = $('addr-street')?.value.trim();
    const city     = $('addr-city')?.value.trim();
    const province = $('addr-province')?.value;
    const postal   = $('addr-postal')?.value.trim();
    const label    = $('addr-label')?.value.trim();
    const errEl    = $('addr-error');
    const sucEl    = $('addr-success');

    errEl.style.display = 'none';
    sucEl.style.display = 'none';

    if (!street || !city || !province || !postal) {
      errEl.textContent   = 'Please fill in all required fields.';
      errEl.style.display = 'block';
      return;
    }

    const btn       = $('addr-save-btn');
    btn.disabled    = true;
    btn.textContent = 'Saving…';

    try {
      const res = await fetch(`${API}/api/auth/addresses`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ label, street, city, province, postal }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        errEl.textContent   = d.message || 'Could not save address.';
        errEl.style.display = 'block';
        return;
      }

      // Clear form on success
      $('addr-label').value    = '';
      $('addr-street').value   = '';
      $('addr-city').value     = '';
      $('addr-postal').value   = '';
      $('addr-province').value = '';

      sucEl.style.display = 'block';

      fetchAddresses().then(addrs => {
        renderAddresses(addrs);
        renderDashboardAddress(addrs);
      });

    } catch {
      errEl.textContent   = 'Something went wrong.';
      errEl.style.display = 'block';
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Save Address';
    }
  });

  // ── Logout ────────────────────────────────────────────────────

  $('logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('v808_token');
    localStorage.removeItem('v808_user');
    sessionStorage.clear();
    window.location.href = './index.html';
  });

  // ── Boot ──────────────────────────────────────────────────────

  renderUserInfo();

  fetchOrders().then(orders => {
    renderOrders(orders);
    renderDashboardOrders(orders);
    renderStats(orders);
  });

  fetchAddresses().then(addrs => {
    renderAddresses(addrs);
    renderDashboardAddress(addrs);
  });

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

  // ── Tab routing ───────────────────────────────────────────────

  const urlParams = new URLSearchParams(window.location.search);
  const urlTab    = urlParams.get('tab');
  const savedTab  = urlTab || sessionStorage.getItem('account_tab') || 'profile';
  switchTab(savedTab);

  window.addEventListener('popstate', () => {
    const p = new URLSearchParams(window.location.search);
    switchTab(p.get('tab') || 'profile');
  });

})();