// js/utils/auth.js
// ─── Token guard — call at the top of every protected page ───
// Returns the parsed user object or redirects to login.

export function requireAuth(returnPath = null) {
  const token   = localStorage.getItem('v808_token');
  const userRaw = localStorage.getItem('v808_user');

  if (!token || !userRaw) {
    sessionStorage.setItem('v808_return', returnPath || window.location.pathname);
    window.location.replace('./login.html');
    return null;
  }

  let user;
  try {
    user = JSON.parse(userRaw);
  } catch {
    localStorage.removeItem('v808_token');
    localStorage.removeItem('v808_user');
    window.location.replace('./login.html');
    return null;
  }

  // Normalise name into firstName / lastName if only full name is stored
  if (!user.firstName && user.name) {
    const parts    = user.name.split(' ');
    user.firstName = parts[0] ?? '';
    user.lastName  = parts.slice(1).join(' ') ?? '';
  }

  if (user.createdAt) {
    user.memberSince = new Date(user.createdAt)
      .toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
  }

  return { token, user };
}

// ─── Logout helper ────────────────────────────────────────────
export function logout(redirectTo = './index.html') {
  localStorage.removeItem('v808_token');
  localStorage.removeItem('v808_user');
  sessionStorage.clear();
  window.location.href = redirectTo;
}