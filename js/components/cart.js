import {openQuickAdd} from './quickAdd.js'

// ─── Constants ───────────────────────────────────────────────
const STORAGE_KEY = 'v808_cart';

// ─── State ───────────────────────────────────────────────────
export function getCart() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

// ─── Cart Actions ────────────────────────────────────────────
export function addToCart(product) {
  const id = String(product.id || product._id || '');

  if (!id) {
    console.error('[cart] addToCart called with no id:', product);
    return;
  }

  const cart     = getCart();
  const existing = cart.find(item => item.id === id);

  // ── Stock limit (stored on the item so drawer can enforce it) ─
  // shop.js passes product.stock when calling addToCart.
  // If not provided we default to Infinity (no limit enforced).
  const stockLimit = Number(product.stock ?? Infinity);

  if (existing) {
    if (existing.qty >= (existing.stock ?? stockLimit)) {
      showCartAlert(`Only ${existing.stock ?? stockLimit} available for ${existing.name}.`);
      return;
    }
    existing.qty += 1;
  } else {
    cart.push({
      id,
      name:  product.name,
      price: product.price,
      image: product.image || '',
      size:  product.size  || '',
      qty:   1,
      // ── Store stock so drawer can cap + button ────────────────
      stock: isFinite(stockLimit) ? stockLimit : null,
    });
  }

  saveCart(cart);
  renderCartDrawer();
  updateBadges();
  openDrawer();
}

export function removeFromCart(productId) {
  saveCart(getCart().filter(item => item.id !== productId));
  renderCartDrawer();
  updateBadges();
}

export function changeQty(productId, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (!item) return;

  // ── Enforce stock cap on + ────────────────────────────────────
  if (delta > 0 && item.stock !== null && item.stock !== undefined) {
    if (item.qty >= item.stock) {
      showCartAlert(`Only ${item.stock} available for ${item.name}.`);
      return;
    }
  }

  item.qty += delta;
  saveCart(item.qty <= 0 ? cart.filter(i => i.id !== productId) : cart);
  renderCartDrawer();
  updateBadges();
}

export function clearCart() {
  saveCart([]);
  renderCartDrawer();
  updateBadges();
}

export function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

export function getCartTotal() {
  return getCart().reduce((sum, item) => sum + item.price * item.qty, 0);
}

// ─── Cart alert (shown inside drawer) ────────────────────────
function showCartAlert(msg) {
  const body = document.getElementById('cart-drawer-body');
  if (!body) return;

  let alertEl = document.getElementById('cart-stock-alert');
  if (!alertEl) {
    alertEl = document.createElement('div');
    alertEl.id        = 'cart-stock-alert';
    alertEl.className = 'cart-stock-alert';
    body.prepend(alertEl);
  }

  alertEl.textContent = msg;
  alertEl.style.display = 'block';
  clearTimeout(alertEl._timer);
  alertEl._timer = setTimeout(() => {
    alertEl.style.display = 'none';
  }, 3500);
}

// ─── Render Drawer ───────────────────────────────────────────
function renderCartDrawer() {
  const body    = document.getElementById('cart-drawer-body');
  const footer  = document.getElementById('cart-drawer-footer');
  const totalEl = document.getElementById('cart-drawer-total');
  if (!body) return;

  const cart = getCart();

  if (cart.length === 0) {
    body.innerHTML = `<div class="cart-empty"><p>Your cart is empty</p></div>`;
    if (footer) footer.style.display = 'none';
    return;
  }

  body.innerHTML = `
    <div id="cart-stock-alert" class="cart-stock-alert" style="display:none;"></div>
    ${cart.map(item => {
      const atMax = item.stock !== null && item.stock !== undefined && item.qty >= item.stock;
      const isLow = item.stock !== null && item.stock !== undefined && item.stock <= 5;

      return `
        <div class="cart-item" data-id="${item.id}">
          <img class="cart-item-img" src="${item.image}" alt="${item.name}" />
          <div class="cart-item-info">
            <p class="cart-item-name">${item.name}${item.size ? ` <span class="cart-item-size">${item.size}</span>` : ''}</p>
            <p class="cart-item-price">R${(item.price * item.qty).toFixed(2)}</p>
            ${isLow ? `<p class="cart-item-stock-warning">${item.stock === item.qty ? `Max quantity reached` : `Only ${item.stock} in stock`}</p>` : ''}
            <div class="cart-item-qty">
              <button class="qty-btn" data-id="${item.id}" data-delta="-1">−</button>
              <span class="qty-count">${item.qty}</span>
              <button class="qty-btn ${atMax ? 'qty-btn--disabled' : ''}"
                data-id="${item.id}" data-delta="1"
                ${atMax ? 'disabled title="Maximum stock reached"' : ''}>+</button>
            </div>
          </div>
          <button class="cart-item-remove" data-id="${item.id}" aria-label="Remove">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      `;
    }).join('')}
  `;

  if (footer) footer.style.display = 'flex';
  if (totalEl) totalEl.textContent = `R${getCartTotal().toFixed(2)}`;

  body.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      changeQty(btn.dataset.id, Number(btn.dataset.delta));
    });
  });

  body.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
  });
}

// ─── Badges ──────────────────────────────────────────────────
function updateBadges() {
  const count = getCartCount();
  document.querySelectorAll('.drawer-badge, .cart-badge').forEach(badge => {
    badge.textContent   = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  });
}

// ─── Open / Close ────────────────────────────────────────────
export function openDrawer() {
  document.getElementById('cart-drawer')?.classList.add('open');
  document.getElementById('cart-overlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closeDrawer() {
  document.getElementById('cart-drawer')?.classList.remove('open');
  document.getElementById('cart-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

// ─── Bind Controls ───────────────────────────────────────────
function bindDrawerControls() {
  document.getElementById('cart-overlay')?.addEventListener('click', closeDrawer);
  document.getElementById('cart-drawer-close')?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
}

function bindCartIcons() {
  document.querySelectorAll('[aria-label="Cart"]').forEach(btn => {
    btn.addEventListener('click', e => { e.preventDefault(); openDrawer(); });
  });
}

// ─── Init ────────────────────────────────────────────────────
export function init() {
  bindDrawerControls();
  bindCartIcons();
  renderCartDrawer();
  updateBadges();
}

export default { init, openDrawer, closeDrawer, addToCart, removeFromCart, changeQty, clearCart, getCartCount, getCartTotal };