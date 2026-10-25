(async function () {
  await Store.ready;

  function nextDestination() {
    const next = new URLSearchParams(window.location.search).get('next');
    if (!next || !next.startsWith('/') || next.startsWith('//')) return '/';
    if (next.startsWith('/login') || next.startsWith('/register')) return '/';
    return next;
  }

  const next = nextDestination();
  const registerLink = document.getElementById('register-link');
  if (registerLink && next !== '/') {
    registerLink.href = `/register?next=${encodeURIComponent(next)}`;
  }

  if (Store.user) {
    window.location.replace(next);
    return;
  }

  const form = document.getElementById('login-form');
  const errorBox = document.getElementById('auth-error');
  const submitButton = document.getElementById('login-submit');

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.add('is-visible');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.classList.remove('is-visible');

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      showError('Enter your email and password to continue.');
      return;
    }

    const original = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner"></span> Signing in…';

    try {
      await Store.api('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
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
