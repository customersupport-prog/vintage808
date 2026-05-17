// js/components/productCard.js
// ─── Shared product card builder used by home.js and shop.js ─
import { openQuickAdd } from './quickAdd.js';
import { IMAGE_BASE_URL } from '../api/products.js';
import { addToCart } from './cart.js';

export const LOW_STOCK_DEFAULT = 5;

// ─── Stock helpers ────────────────────────────────────────────
export function getStockForSize(product, size) {
  if (product.sizeStock?.length) {
    const entry = product.sizeStock.find(s => s.size === size);
    return entry ? entry.stock : 0;
  }
  return product.stock ?? 0;
}

// ─── Cart button animation ────────────────────────────────────
export function animateCartBtn(btn) {
  const orig = btn.textContent;
  btn.textContent = 'Added ✓';
  btn.classList.add('btn-cart--added');
  setTimeout(() => {
    btn.textContent = orig === 'Added ✓' ? 'Add to cart' : orig;
    btn.classList.remove('btn-cart--added');
  }, 1400);
}

// ─── Inline stock alert shown under card ─────────────────────
export function showStockAlert(card, msg) {
  let alertEl = card.querySelector('.stock-alert');
  if (!alertEl) {
    alertEl = document.createElement('p');
    alertEl.className = 'stock-alert';
    card.appendChild(alertEl);
  }
  alertEl.textContent = msg;
  clearTimeout(alertEl._timer);
  alertEl._timer = setTimeout(() => alertEl.remove(), 4000);
}

// ─── Image slider ─────────────────────────────────────────────
export function initSlider(card) {
  const track = card.querySelector('.product-image-track');
  const prev  = card.querySelector('.product-image-prev');
  const next  = card.querySelector('.product-image-next');
  const dots  = card.querySelectorAll('.product-image-dot');
  if (!track || (!prev && !next)) return;

  const total = track.children.length;
  let current = 0;

  function goTo(index) {
    current = (index + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  prev?.addEventListener('click', e => { e.stopPropagation(); goTo(current - 1); });
  next?.addEventListener('click', e => { e.stopPropagation(); goTo(current + 1); });
  dots.forEach((dot, i) => dot.addEventListener('click', e => { e.stopPropagation(); goTo(i); }));
}

// ─── Build card HTML ──────────────────────────────────────────
export function buildCard(product) {
  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images : [null];

  const imagesHTML = images.map(img => {
    const src = img ? (img.startsWith('http') ? img : `${IMAGE_BASE_URL}${img}`) : '';
    return src
      ? `<img src="${src}" alt="${product.name}" loading="lazy" />`
      : `<div style="width:100%;height:100%;background:var(--sand);display:flex;align-items:center;justify-content:center;">
           <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1">
             <rect x="3" y="3" width="18" height="18" rx="2"/>
             <circle cx="8.5" cy="8.5" r="1.5"/>
             <polyline points="21 15 16 10 5 21"/>
           </svg>
         </div>`;
  }).join('');

  const dotsHTML = images.length > 1
    ? `<div class="product-image-dots">${images.map((_, i) =>
        `<button class="product-image-dot${i === 0 ? ' active' : ''}" data-index="${i}"></button>`
      ).join('')}</div>` : '';

  const arrowsHTML = images.length > 1
    ? `<button class="product-image-prev" aria-label="Previous">
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
       </button>
       <button class="product-image-next" aria-label="Next">
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
       </button>` : '';

  const badge = product.isFeatured ? `<span class="product-badge sale">New</span>` : '';

  const wishlistBtn = `
    <button class="product-wishlist" aria-label="Save">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </button>`;

  const totalStock   = product.stock ?? 0;
  const threshold    = product.lowStockThreshold ?? LOW_STOCK_DEFAULT;
  const hasSizeStock = product.sizeStock?.length > 0;
  const isOutOfStock = totalStock === 0;

  let topStockBadge = '';
  if (isOutOfStock) {
    topStockBadge = `<span class="product-badge product-badge--out">Out of stock</span>`;
  } else if (!hasSizeStock && totalStock <= threshold) {
    topStockBadge = `<span class="product-badge product-badge--low">${totalStock} left</span>`;
  }

  const hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0;
  const firstImage = images[0]
    ? (images[0].startsWith('http') ? images[0] : `${IMAGE_BASE_URL}${images[0]}`)
    : '';

  return `
    <div class="product-card"
      data-id="${product._id || product.id}"
      data-name="${product.name}"
      data-price="${product.price}"
      data-stock="${totalStock}"
      data-sizes="${hasSizes ? product.sizes.join(',') : ''}"
      data-image="${firstImage}">
      <div class="product-image">
        ${badge}
        ${topStockBadge}
        <div class="product-image-track">${imagesHTML}</div>
        ${arrowsHTML}
        ${dotsHTML}
      </div>
      <div class="product-info">
        <p class="product-name">${product.name}</p>
        <span class="product-price">R${Number(product.price).toFixed(2)}</span>
      </div>
      <button class="btn-cart" ${isOutOfStock ? 'disabled' : ''}>
        ${isOutOfStock ? 'Out of stock' : 'Add to cart'}
      </button>
    </div>`;
}

// ─── Shared click handler (call once per grid) ────────────────
export function bindGridEvents(grid, products) {
  grid.addEventListener('click', e => {

    // ── Wishlist ────────────────────────────────────────────────
    const wishlistBtn = e.target.closest('.product-wishlist');
    if (wishlistBtn) {
      wishlistBtn.classList.toggle('wishlisted');
      wishlistBtn.innerHTML = wishlistBtn.classList.contains('wishlisted')
        ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="#c84b2f" stroke="#c84b2f" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`
        : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
      e.stopPropagation();
      return;
    }

    // ── Cart button → open Quick Add modal ──────────────────────
    const cartBtn = e.target.closest('.btn-cart');
    if (!cartBtn || cartBtn.disabled) return;

    const card    = cartBtn.closest('.product-card');
    const product = products.find(p => (p._id || p.id) === card.dataset.id);

    const sizes = card.dataset.sizes
      ? card.dataset.sizes.split(',').filter(Boolean)
      : [];

    openQuickAdd({
      id:        card.dataset.id,
      name:      card.dataset.name,
      price:     Number(card.dataset.price),
      image:     card.dataset.image || card.querySelector('img')?.src || '',
      stock:     Number(card.dataset.stock) || Infinity,
      sizes,
      sizeStock: product?.sizeStock || [],
    });
  });
}