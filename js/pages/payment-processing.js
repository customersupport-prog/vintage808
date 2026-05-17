const API = 'https://vintage808-api.vercel.app/api';

const params    = new URLSearchParams(window.location.search);
const reference = params.get('trxref') || params.get('reference')
               || sessionStorage.getItem('v808_paystack_ref');
const orderId   = sessionStorage.getItem('v808_paystack_order_id');

if (!reference) {
  window.location.replace('./index.html');
}

// ── Save shipping address to account after successful order ──
async function saveAddressToAccount(token, address) {
  if (!token || !address?.street) return;
  try {
    await fetch(`${API}/auth/addresses`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify({
        label:    'Delivery Address',
        street:   address.street,
        city:     address.city,
        province: address.province,
        postal:   address.postal,
      }),
    });
  } catch (err) {
    console.warn('[Address] Could not save address:', err.message);
  }
}

async function verifyAndRedirect() {
  try {
    const token = localStorage.getItem('v808_token');

    const res  = await fetch(`${API}/paystack/verify`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ reference }),
    });

    const data = await res.json();
    console.log('[OrderSuccess] Verify result:', data);

    if (data.success) {
      // ── Save address to account silently ──────────────────
      const pending = JSON.parse(sessionStorage.getItem('v808_pending_order') || 'null');
      const address = data.order?.shippingAddress || pending?.shippingAddress;
      await saveAddressToAccount(localStorage.getItem('v808_token'), address);

      // ── Clean up ──────────────────────────────────────────
      localStorage.removeItem('v808_cart');
      sessionStorage.removeItem('v808_paystack_ref');
      sessionStorage.removeItem('v808_paystack_order_id');
      sessionStorage.removeItem('v808_pending_order');

      window.location.replace(
        `./order-confirmation.html?order=${data.order?._id || orderId}`
      );
    } else {
      window.location.replace('./checkout.html?status=cancelled&restore=1');
    }

  } catch (err) {
    console.error('[OrderSuccess] Error:', err);
    setTimeout(verifyAndRedirect, 3000);
  }
}

verifyAndRedirect();