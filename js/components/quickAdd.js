// ─── Quick Add Modal ──────────────────────────────────────────
import { addToCart } from './cart.js';

const MODAL_ID  = 'quick-add-modal';
const OVERLAY_ID = 'quick-add-overlay';

// ─── Build & inject modal shell once ─────────────────────────
function ensureModal() {
  if (document.getElementById(MODAL_ID)) return;

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.className = 'qa-overlay';

  const modal = document.createElement('div');
  modal.id = MODAL_ID;
  modal.className = 'qa-modal';
  modal.innerHTML = `
    <button class="qa-close" aria-label="Close">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
    <div class="qa-body">
      <img class="qa-img" src="" alt="" />
      <div class="qa-details">
        <p class="qa-name"></p>
        <p class="qa-price"></p>
        <div class="qa-sizes-wrap" style="display:none">
          <p class="qa-sizes-label">Select a size</p>
          <div class="qa-sizes"></div>
          <p class="qa-size-error" aria-live="polite"></p>
        </div>
        <div class="qa-qty-wrap">
          <p class="qa-qty-label">Quantity</p>
          <div class="qa-qty-row">
            <button class="qa-qty-btn" id="qa-minus">−</button>
            <span class="qa-qty-count" id="qa-count">1</span>
            <button class="qa-qty-btn" id="qa-plus">+</button>
          </div>
        </div>
        <button class="qa-confirm">Add to Cart</button>
      </div>
    </div>`;

  document.body.append(overlay, modal);

  // Close handlers
  overlay.addEventListener('click', closeModal);
  modal.querySelector('.qa-close').addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

// ─── Open with product data ───────────────────────────────────
export function openQuickAdd(product) {
  ensureModal();

  const modal = document.getElementById(MODAL_ID);
  const overlay = document.getElementById(OVERLAY_ID);

  // Reset state
  let selectedSize = null;
  let qty = 1;
  const stock = Number(product.stock ?? Infinity);

  // Populate
  const img = modal.querySelector('.qa-img');
  img.src = product.image || '';
  img.style.display = product.image ? 'block' : 'none';

  modal.querySelector('.qa-name').textContent  = product.name;
  modal.querySelector('.qa-price').textContent = `R${Number(product.price).toFixed(2)}`;

  // Sizes
  const sizesWrap  = modal.querySelector('.qa-sizes-wrap');
  const sizesEl    = modal.querySelector('.qa-sizes');
  const sizeError  = modal.querySelector('.qa-size-error');
  const hasSizes   = product.sizes?.length > 0;

  sizeError.textContent = '';
  sizesEl.innerHTML = '';

// ── Sizes ──
if (hasSizes) {
  sizesWrap.style.display = 'block';
  product.sizes.forEach(s => {
    const sizeStock = product.sizeStock?.length
      ? (product.sizeStock.find(e => e.size === s)?.stock ?? 0)
      : product.stock;

    const outOfStock = sizeStock === 0;
    const btn = document.createElement('button');
    btn.className  = `size-option${outOfStock ? ' size-option--out' : ''}`;
    btn.textContent = s;
    btn.dataset.size = s;
    if (outOfStock) btn.disabled = true;

    btn.addEventListener('click', () => {
      sizesEl.querySelectorAll('.size-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedSize = s;
      sizeError.textContent = '';

      // ── Show stock warning under sizes ──
      if (sizeStock <= 5 && sizeStock > 0) {
        sizeError.textContent = `Only ${sizeStock} left in this size`;
        sizeError.style.color = '#c84b2f';
      } else {
        sizeError.textContent = '';
      }
    });
    sizesEl.append(btn);
  });

} else {
  sizesWrap.style.display = 'none';

  // ── No sizes: show low stock warning immediately ──
  if (product.stock <= 5 && product.stock > 0) {
    sizeError.style.color = '#c84b2f';
    sizeError.textContent = `Only ${product.stock} left`;
  } else {
    sizeError.textContent = '';
  }
}

  // Quantity
  const countEl = modal.querySelector('#qa-count');
  const minusBtn = modal.querySelector('#qa-minus');
  const plusBtn  = modal.querySelector('#qa-plus');

  countEl.textContent = '1';
  qty = 1;

  const updateQtyBtns = () => {
    minusBtn.disabled = qty <= 1;
    plusBtn.disabled  = isFinite(stock) && qty >= stock;
  };
  updateQtyBtns();

  minusBtn.onclick = () => { if (qty > 1) { qty--; countEl.textContent = qty; updateQtyBtns(); } };
  plusBtn.onclick  = () => {
    if (!isFinite(stock) || qty < stock) {
      qty++;
      countEl.textContent = qty;
      updateQtyBtns();
    }
  };

  // Confirm
  const confirmBtn = modal.querySelector('.qa-confirm');
  confirmBtn.onclick = () => {
    if (hasSizes && !selectedSize) {
      sizeError.textContent = 'Please select a size';
      return;
    }
    // Call addToCart once per qty (your cart merges duplicates via qty++)
    for (let i = 0; i < qty; i++) {
      addToCart({
        id:    product.id,
        name:  product.name,
        price: product.price,
        image: product.image,
        size:  selectedSize || '',
        stock: isFinite(stock) ? stock : undefined,
      });
    }
    closeModal();
  };

  // Show
  modal.classList.add('open');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById(MODAL_ID)?.classList.remove('open');
  document.getElementById(OVERLAY_ID)?.classList.remove('open');
  document.body.style.overflow = '';
}