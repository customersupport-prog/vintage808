/* ============================================================
   Vintage808 — js/modules/account-shared.js
   Shared module: auth, helpers, fetch, user info, logout
   Import this in every account page module.
   ============================================================ */

export const API   = 'https://vintage808-api-six.vercel.app';
export const token = localStorage.getItem('v808_token');

// ── Auth guard — redirect to login if no token ────────────────
const _userRaw = localStorage.getItem('v808_user');
if (!token || !_userRaw) {
  sessionStorage.setItem('v808_return', window.location.pathname);
  window.location.replace('./login.html');
}

export let user = {};
try {
  user = JSON.parse(_userRaw || '{}');
  if (!user.firstName && user.name) {
    const parts    = user.name.split(' ');
    user.firstName = parts[0] ?? '';
    user.lastName  = parts.slice(1).join(' ') ?? '';
  }
  if (user.createdAt) {
    user.memberSince = new Date(user.createdAt)
      .toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
  }
} catch {
  localStorage.removeItem('v808_token');
  localStorage.removeItem('v808_user');
  window.location.replace('./login.html');
}

/* ─── Utilities ──────────────────────────────────────────────── */
export const esc = s =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function fmtDate(iso, opts = { year: 'numeric', month: 'short', day: 'numeric' }) {
  try { return new Date(iso).toLocaleDateString('en-ZA', opts); } catch { return '—'; }
}

export const fmtCurrency = n => 'R' + Number(n || 0).toFixed(2);

export const STATUS_STEPS = ['confirmed', 'processing', 'shipped', 'delivered'];

export const STATUS_LABELS = {
  pending:          'Pending',
  confirmed:        'Confirmed',
  processing:       'Processing',
  shipped:          'Shipped',
  delivered:        'Delivered',
  cancelled:        'Cancelled',
  returned:         'Returned',
  return_requested: 'Return Requested',
  return_approved:  'Return Approved',
  return_rejected:  'Return Rejected',
  paid:             'Paid',
  failed:           'Failed',
};

export function fmtStatus(s) { return STATUS_LABELS[s] ?? 'Pending'; }

export function badgeClass(s) {
  return {
    pending:          'order-badge--pending',
    confirmed:        'order-badge--confirmed',
    paid:             'order-badge--paid',
    processing:       'order-badge--processing',
    shipped:          'order-badge--shipped',
    delivered:        'order-badge--delivered',
    cancelled:        'order-badge--cancelled',
    failed:           'order-badge--failed',
    returned:         'order-badge--cancelled',
    return_requested: 'order-badge--processing',
    return_approved:  'order-badge--delivered',
    return_rejected:  'order-badge--cancelled',
  }[s] ?? 'order-badge--pending';
}

export function stepState(orderStatus, step) {
  if (orderStatus === 'cancelled') return 'future';
  if (orderStatus === 'pending') return step === 'confirmed' ? 'active' : 'future';
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
    const label  = step.charAt(0).toUpperCase() + step.slice(1);
    return `
      <div class="ostep ${state}">
        <div class="ostep-dot"></div>
        <div class="ostep-label">${label}</div>
      </div>
      ${!isLast ? `<div class="${lineCls}"></div>` : ''}`;
  }).join('');
}

/* ─── API fetch wrapper ───────────────────────────────────────── */
export async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.message || `Request failed (${res.status})`);
  }
  return res.json();
}

/* ─── Fetch helpers ──────────────────────────────────────────── */
export async function fetchOrders() {
  try {
    const res = await fetch(`${API}/api/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data      = await res.json();
    const rawOrders = data.data ?? data.orders ?? [];
    if (!Array.isArray(rawOrders)) return [];
    return rawOrders.map(order => ({
      ...order,
      id:          order.id || order._id,
      orderStatus: order.orderStatus || order.status || 'pending',
      total:       Number(order.total || 0),
      items:       Array.isArray(order.items) ? order.items : [],
      createdAt:   order.createdAt || new Date().toISOString(),
    }));
  } catch { return []; }
}

export async function fetchAddresses() {
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
      raw:   a,
    }));
  } catch { return []; }
}

export async function fetchSingleOrder(orderId) {
  try {
    const res = await fetch(`${API}/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d.data ?? d;
  } catch { return null; }
}

export async function requestReturn(orderId, reason) {
  const res = await fetch(`${API}/api/orders/${orderId}/return`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body:    JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.message || 'Could not submit return request.');
  }
  return (await res.json()).data;
}

/* ─── Render user info (sidebar avatar) ──────────────────────── */
export function renderUserInfo() {
  const full     = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  const initials = ((user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')).toUpperCase() || '??';

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('avatar-initials', initials);
  set('avatar-name',     full || user.email);
  set('avatar-email',    user.email ?? '');
}

/* ─── Active nav item ─────────────────────────────────────────── */
export function setActiveNav() {
  const page = window.location.pathname.split('/').pop();
  document.querySelectorAll('.account-nav-item').forEach(item => {
    const href = item.getAttribute('href')?.split('/').pop();
    if (href === page) item.classList.add('active');
    else               item.classList.remove('active');
  });
}

/* ─── Breadcrumb ──────────────────────────────────────────────── */
export function setBreadcrumb(label) {
  const el = document.getElementById('breadcrumb-current');
  if (el) el.textContent = label;
  document.title = `${label} — Vintage808`;
}

/* ─── Logout ──────────────────────────────────────────────────── */
export function initLogout() {
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('v808_token');
    localStorage.removeItem('v808_user');
    sessionStorage.clear();
    window.location.href = './index.html';
  });
}

/* ─── PayFast cancel restore ──────────────────────────────────── */
export function checkPayfastCancel() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('status') === 'cancelled' && params.get('restore') === '1') {
    const pending = JSON.parse(sessionStorage.getItem('v808_pending_order') || 'null');
    if (pending?.items) {
      localStorage.setItem('v808_cart', JSON.stringify(pending.items));
    }
    const banner = document.createElement('div');
    banner.style.cssText = 'background:#1a1a1a;color:#fff;text-align:center;padding:12px;font-size:13px;position:relative;z-index:999;';
    banner.textContent   = 'Payment was cancelled. Your cart has been restored.';
    document.body.prepend(banner);
    setTimeout(() => banner.remove(), 5000);

    const clean = new URL(window.location.href);
    clean.searchParams.delete('status');
    clean.searchParams.delete('restore');
    window.history.replaceState({}, '', clean);
  }
}