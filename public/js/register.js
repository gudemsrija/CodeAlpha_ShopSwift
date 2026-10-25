(async function () {
  await Store.ready;

  function nextDestination() {
    const next = new URLSearchParams(window.location.search).get('next');
    if (!next || !next.startsWith('/') || next.startsWith('//')) return '/';
    if (next.startsWith('/login') || next.startsWith('/register')) return '/';
    return next;
  }

  const next = nextDestination();
  const loginLink = document.getElementById('login-link');
  if (loginLink && next !== '/') {
    loginLink.href = `/login?next=${encodeURIComponent(next)}`;
  }

  if (Store.user) {
    window.location.replace(next);
    return;
  }

  const form = document.getElementById('register-form');
  const errorBox = document.getElementById('auth-error');
  const submitButton = document.getElementById('register-submit');

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.add('is-visible');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.classList.remove('is-visible');

    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;

    if (name.length < 2) {
      showError('Please enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      showError('Your password needs to be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      showError('Those passwords do not match. Try again.');
      return;
    }

    const original = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner"></span> Creating account…';

    try {
      await Store.api('/api/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });
      await Store.refreshSession();
      window.location.assign(next);
    } catch (error) {
      showError(error.message);
      submitButton.disabled = false;
      submitButton.textContent = original;
    }
  });
})();
