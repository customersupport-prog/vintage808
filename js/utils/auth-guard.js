

// js/utils/auth-guard.js
// ─────────────────────────────────────────────────────────────
// Drop this into your main.js or nav.js init function
// It wires the account icon in the nav to check login state
// ─────────────────────────────────────────────────────────────

export function initAccountIcon() {
  const token = localStorage.getItem('v808_token');

  document.querySelectorAll('[aria-label="Account"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = token ? './account.html' : './login.html';
    });
  });
}

// ─────────────────────────────────────────────────────────────
// Use this on pages that REQUIRE login (checkout, account)
// Call at the top of the page's JS file
// ─────────────────────────────────────────────────────────────

export function requireAuth(returnUrl = null) {
  const token = localStorage.getItem('v808_token');

  if (!token) {
    if (returnUrl) sessionStorage.setItem('v808_return', returnUrl);
    window.location.href = './login.html';
    return false;
  }

  return true;
}

// ─────────────────────────────────────────────────────────────
// Get current logged in user
// ─────────────────────────────────────────────────────────────

export function getUser() {
  return JSON.parse(localStorage.getItem('v808_user') || 'null');
}

export function getToken() {
  return localStorage.getItem('v808_token');
}

export function logout() {
  localStorage.removeItem('v808_token');
  localStorage.removeItem('v808_user');
  window.location.href = './index.html';
}