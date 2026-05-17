// js/main.js
import { init as initCart } from './components/cart.js';
import { nav } from './components/nav.js';

document.addEventListener('DOMContentLoaded', () => {

  // ── Cart ──────────────────────────────────────────────────
  initCart();

  // ── Nav burger ───────────────────────────────────────────
  nav();

  // ── Account button → login or account ────────────────────
  document.querySelectorAll('[aria-label="Account"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const token = localStorage.getItem('v808_token');
      window.location.href = token ? './account.html' : './login.html';
    });
  });

  // ── Drawer account button (mobile) ───────────────────────
  document.querySelectorAll('.nav-drawer-icon-btn[aria-label="Account"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const token = localStorage.getItem('v808_token');
      window.location.href = token ? './account.html' : './login.html';
    });
  });

  // ── Page detection ────────────────────────────────────────
  const page = document.body.dataset.page;

  if (page === 'home') {
    import('./pages/home.js').then(m => m.renderFeaturedProducts());
  }

  if (page === 'shop') {
    import('./pages/shop.js').then(m => m.default.init());
  }

  if (page === 'checkout') {
    import('./pages/checkout.js');
  }

  if (page === 'login') {
    import('./pages/login.js');
  }

  if (page === 'register') {
    import('./pages/register.js');
  }

  if (page === 'account') {
    import('./pages/account.js');
  }

  if (page === 'order-confirmation') {
    import('./pages/order-confirmation.js');
  }

});