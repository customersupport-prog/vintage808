// js/utils/format.js
// ─── Pure formatting + DOM helpers shared across all pages ───

export function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function fmtDate(iso, opts = { year:'numeric', month:'short', day:'numeric' }) {
  try { return new Date(iso).toLocaleDateString('en-ZA', opts); } catch { return '—'; }
}

export function fmtCurrency(n) {
  return 'R' + Number(n || 0).toFixed(2);
}

export const STATUS_LABELS = {
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

export function fmtStatus(s) {
  return STATUS_LABELS[s] ?? 'Pending';
}

export function badgeClass(s) {
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

export const show = el => el?.classList.remove('hidden');
export const hide = el => el?.classList.add('hidden');

export const $ = id => document.getElementById(id);