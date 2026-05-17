// js/pages/login.js
import { login, register, GOOGLE_CLIENT_ID } from '../api/auth.js';

const API = 'https://vintage808-api.vercel.app';

// ── If already logged in, skip ────────────────────────────────
if (localStorage.getItem('v808_token')) {
  window.location.replace('./account.html');
}

// ── All panels ────────────────────────────────────────────────
const panels = {
  login:    document.getElementById('panel-login'),
  register: document.getElementById('panel-register'),
  forgot:   document.getElementById('panel-forgot'),
  otp:      document.getElementById('panel-otp'),
  reset:    document.getElementById('panel-reset'),
};

function showPanel(name) {
  Object.values(panels).forEach(p => p.classList.add('auth-form-wrap--hidden'));
  panels[name].classList.remove('auth-form-wrap--hidden');
}

// ── Shared state for reset flow ───────────────────────────────
let resetEmail = '';

// ── Helpers ───────────────────────────────────────────────────
function showError(boxId, msgId, msg) {
  document.getElementById(msgId).textContent = msg;
  document.getElementById(boxId).style.display = 'flex';
}
function hideError(boxId) { document.getElementById(boxId).style.display = 'none'; }

function setLoading(btnId, textId, loaderId, loading) {
  document.getElementById(btnId).disabled = loading;
  document.getElementById(textId).style.display   = loading ? 'none' : 'inline';
  document.getElementById(loaderId).style.display = loading ? 'inline-flex' : 'none';
}

function bindPasswordToggle(btnId, inputId) {
  document.getElementById(btnId)?.addEventListener('click', () => {
    const input = document.getElementById(inputId);
    input.type  = input.type === 'password' ? 'text' : 'password';
  });
}

bindPasswordToggle('login-toggle-pw',      'login-password');
bindPasswordToggle('reg-toggle-pw',        'reg-password');
bindPasswordToggle('reg-toggle-confirm',   'reg-confirm');
bindPasswordToggle('reset-toggle-pw',      'reset-password');
bindPasswordToggle('reset-toggle-confirm', 'reset-confirm');

// ── Session helpers ───────────────────────────────────────────
function getReturnUrl() {
  const returnTo = sessionStorage.getItem('v808_return') || './index.html';
  sessionStorage.removeItem('v808_return');
  return returnTo;
}

function saveSession(token, user) {
  localStorage.setItem('v808_token', token);
  localStorage.setItem('v808_user',  JSON.stringify(user));
}

// ── Panel navigation ──────────────────────────────────────────
document.getElementById('go-to-register').addEventListener('click', () => showPanel('register'));
document.getElementById('go-to-login').addEventListener('click',    () => showPanel('login'));
document.getElementById('forgot-password-btn').addEventListener('click', () => showPanel('forgot'));
document.getElementById('back-to-login-from-forgot').addEventListener('click', () => showPanel('login'));
document.getElementById('back-to-forgot').addEventListener('click', () => showPanel('forgot'));

// ── LOGIN ─────────────────────────────────────────────────────
document.getElementById('login-btn').addEventListener('click', async () => {
  hideError('login-error');
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();

  if (!email || !password) {
    showError('login-error', 'login-error-msg', 'Please fill in all fields.');
    return;
  }

  setLoading('login-btn', 'login-btn-text', 'login-btn-loader', true);
  try {
    const data = await login(email, password);
    saveSession(data.token, data.user);
    window.location.href = getReturnUrl();
  } catch (err) {
    showError('login-error', 'login-error-msg', err.message || 'Something went wrong.');
  } finally {
    setLoading('login-btn', 'login-btn-text', 'login-btn-loader', false);
  }
});

// ── REGISTER ──────────────────────────────────────────────────
document.getElementById('register-btn').addEventListener('click', async () => {
  hideError('register-error');
  const first    = document.getElementById('reg-first').value.trim();
  const last     = document.getElementById('reg-last').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm  = document.getElementById('reg-confirm').value;

  if (!first || !last || !email || !password) {
    showError('register-error', 'register-error-msg', 'Please fill in all fields.');
    return;
  }
  if (password.length < 8) {
    showError('register-error', 'register-error-msg', 'Password must be at least 8 characters.');
    return;
  }
  if (password !== confirm) {
    showError('register-error', 'register-error-msg', 'Passwords do not match.');
    return;
  }

  setLoading('register-btn', 'register-btn-text', 'register-btn-loader', true);
  try {
    const data = await register(`${first} ${last}`.trim(), email, password);
    saveSession(data.token, data.user);
    window.location.href = getReturnUrl();
  } catch (err) {
    showError('register-error', 'register-error-msg', err.message || 'Something went wrong.');
  } finally {
    setLoading('register-btn', 'register-btn-text', 'register-btn-loader', false);
  }
});

// ── FORGOT PASSWORD ───────────────────────────────────────────
document.getElementById('forgot-btn').addEventListener('click', async () => {
  hideError('forgot-error');
  const email = document.getElementById('forgot-email').value.trim();

  if (!email) {
    showError('forgot-error', 'forgot-error-msg', 'Please enter your email.');
    return;
  }

  setLoading('forgot-btn', 'forgot-btn-text', 'forgot-btn-loader', true);
  try {
    const res  = await fetch(`${API}/api/auth/forgot-password`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to send code');

    resetEmail = email;
    document.getElementById('otp-sub').textContent = `We sent a 6-digit code to ${email}`;
    showPanel('otp');
  } catch (err) {
    showError('forgot-error', 'forgot-error-msg', err.message || 'Something went wrong.');
  } finally {
    setLoading('forgot-btn', 'forgot-btn-text', 'forgot-btn-loader', false);
  }
});

// ── VERIFY OTP ────────────────────────────────────────────────
document.getElementById('otp-btn').addEventListener('click', async () => {
  hideError('otp-error');
  const otp = document.getElementById('otp-input').value.trim();

  if (!otp || otp.length !== 6) {
    showError('otp-error', 'otp-error-msg', 'Please enter the 6-digit code.');
    return;
  }

  setLoading('otp-btn', 'otp-btn-text', 'otp-btn-loader', true);
  try {
    const res  = await fetch(`${API}/api/auth/verify-otp`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: resetEmail, otp }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Invalid code');

    showPanel('reset');
  } catch (err) {
    showError('otp-error', 'otp-error-msg', err.message || 'Something went wrong.');
  } finally {
    setLoading('otp-btn', 'otp-btn-text', 'otp-btn-loader', false);
  }
});

// ── RESET PASSWORD ────────────────────────────────────────────
document.getElementById('reset-btn').addEventListener('click', async () => {
  hideError('reset-error');
  const password = document.getElementById('reset-password').value;
  const confirm  = document.getElementById('reset-confirm').value;

  if (!password) {
    showError('reset-error', 'reset-error-msg', 'Please enter a new password.');
    return;
  }
  if (password.length < 8) {
    showError('reset-error', 'reset-error-msg', 'Password must be at least 8 characters.');
    return;
  }
  if (password !== confirm) {
    showError('reset-error', 'reset-error-msg', 'Passwords do not match.');
    return;
  }

  setLoading('reset-btn', 'reset-btn-text', 'reset-btn-loader', true);
  try {
    const res  = await fetch(`${API}/api/auth/reset-password`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: resetEmail, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to reset password');

    document.getElementById('reset-success').style.display = 'flex';
    setTimeout(() => showPanel('login'), 2000);
  } catch (err) {
    showError('reset-error', 'reset-error-msg', err.message || 'Something went wrong.');
  } finally {
    setLoading('reset-btn', 'reset-btn-text', 'reset-btn-loader', false);
  }
});

// ── PASSWORD STRENGTH BARS ────────────────────────────────────
const pwInput = document.getElementById('reg-password');
if (pwInput) {
  pwInput.addEventListener('input', function () {
    const v    = this.value;
    const bars = ['pw-b0', 'pw-b1', 'pw-b2', 'pw-b3'].map(id => document.getElementById(id));
    bars.forEach(b => { b.className = 'pw-bar'; });
    let score = 0;
    if (v.length >= 8)          score++;
    if (/[A-Z]/.test(v))        score++;
    if (/[0-9]/.test(v))        score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    const cls = score <= 1 ? 'weak' : score <= 2 ? 'medium' : 'strong';
    for (let i = 0; i < score; i++) bars[i].classList.add(cls);
  });
}

// ── GOOGLE SIGN IN ────────────────────────────────────────────
function onGoogleSuccess(data) {
  saveSession(data.token, data.user);
  window.location.href = getReturnUrl();
}

function onGoogleError(msg) {
  showError('login-error', 'login-error-msg', msg);
}

window.onGoogleLibraryLoad = () => {
  if (!window.google || !GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') return;

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: async (response) => {
      try {
        const { googleLogin } = await import('../api/auth.js');
        const data = await googleLogin(response.credential);
        onGoogleSuccess(data);
      } catch (err) {
        onGoogleError(err.message || 'Google login failed.');
      }
    },
  });

  const loginBtn    = document.getElementById('google-signin-btn');
  const registerBtn = document.getElementById('google-signin-btn-register');

  if (loginBtn) {
    google.accounts.id.renderButton(loginBtn,
      { theme: 'outline', size: 'large', width: 320, text: 'continue_with', shape: 'rectangular' }
    );
  }
  if (registerBtn) {
    google.accounts.id.renderButton(registerBtn,
      { theme: 'outline', size: 'large', width: 320, text: 'signup_with', shape: 'rectangular' }
    );
  }
};