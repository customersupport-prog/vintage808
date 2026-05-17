// js/pages/contact.js

const API = 'https://vintage808-api.vercel.app';

const form = document.getElementById('contact-form');

// Guard: only run on the contact page
if (form) {
  const submitBtn    = document.getElementById('contact-submit');
  const submitText   = document.getElementById('submit-text');
  const submitLoader = document.getElementById('submit-loader');
  const successBox   = document.getElementById('contact-success');
  const errorBox     = document.getElementById('contact-error');
  const errorMsg     = document.getElementById('contact-error-msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name    = document.getElementById('contact-name').value.trim();
    const email   = document.getElementById('contact-email').value.trim();
    const message = document.getElementById('contact-message').value.trim();
    const terms   = document.getElementById('terms').checked;

    successBox.style.display = 'none';
    errorBox.style.display   = 'none';

    if (!name || !email || !message) {
      errorMsg.textContent   = 'Please fill in all fields.';
      errorBox.style.display = 'flex';
      return;
    }

    if (!terms) {
      errorMsg.textContent   = 'Please accept the terms.';
      errorBox.style.display = 'flex';
      return;
    }

    submitBtn.disabled         = true;
    submitText.style.display   = 'none';
    submitLoader.style.display = 'inline-flex';

    try {
      const res  = await fetch(`${API}/api/contact`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, message }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send message');

      successBox.style.display = 'flex';
      form.reset();

    } catch (err) {
      errorMsg.textContent   = err.message || 'Something went wrong. Please try again.';
      errorBox.style.display = 'flex';
    } finally {
      submitBtn.disabled         = false;
      submitText.style.display   = 'inline';
      submitLoader.style.display = 'none';
    }
  });
}