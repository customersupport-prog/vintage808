/* ============================================================
   Vintage808 — js/pages/account-addresses.js
   ============================================================ */

import {
  API, token,
  fetchAddresses,
  renderUserInfo, setActiveNav, setBreadcrumb, initLogout,
  esc,
} from '../modules/account-shared.js';

renderUserInfo();
setActiveNav();
setBreadcrumb('Addresses');
initLogout();

/* ─── Render addresses ───────────────────────────────────────── */
function renderAddresses(addresses = []) {
  const el = document.getElementById('addresses-list');
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
        fetchAddresses().then(renderAddresses);
      } catch { alert('Could not remove address.'); }
    });
  });
}

/* ─── Add address form ───────────────────────────────────────── */
document.getElementById('add-address-btn')?.addEventListener('click', () => {
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

  document.getElementById('add-address-btn').after(form);

  document.getElementById('addr-cancel-btn').addEventListener('click', () => form.remove());

  document.getElementById('addr-save-btn').addEventListener('click', async () => {
    const street   = document.getElementById('addr-street').value.trim();
    const city     = document.getElementById('addr-city').value.trim();
    const province = document.getElementById('addr-province').value;
    const postal   = document.getElementById('addr-postal').value.trim();
    const label    = document.getElementById('addr-label').value.trim();
    const errEl    = document.getElementById('addr-error');

    if (!street || !city || !province || !postal) {
      errEl.textContent = 'Please fill in all required fields.';
      errEl.style.display = 'block'; return;
    }

    try {
      const res = await fetch(`${API}/api/auth/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ label, street, city, province, postal }),
      });
      if (!res.ok) { errEl.textContent = 'Could not save address.'; errEl.style.display = 'block'; return; }
      form.remove();
      fetchAddresses().then(renderAddresses);
    } catch {
      errEl.textContent = 'Something went wrong.';
      errEl.style.display = 'block';
    }
  });
});

/* ─── Boot ───────────────────────────────────────────────────── */
fetchAddresses().then(renderAddresses);