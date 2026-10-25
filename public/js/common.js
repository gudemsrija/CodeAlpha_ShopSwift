(function () {
  'use strict';

  const state = {
    user: null,
    cartCount: 0,
    loaded: false,
    menuOpen: false
  };

  const currency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  });

  function money(value) {
    return currency.format(Number(value) || 0);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => {
      const entities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return entities[character];
    });
  }

  async function api(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      credentials: 'same-origin',
      ...options,
      headers
    });

    const contentType = response.headers.get('content-type') || '';
    let data = null;

    if (contentType.includes('application/json')) {
      data = await response.json().catch(() => null);
    } else {
      data = await response.text().catch(() => '');
    }

    if (!response.ok) {
      const error = new Error(
        (data && data.error) || `Something went wrong (${response.status}).`
      );
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  function getInitials(name) {
    return String(name || '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }

  function firstName(name) {
    return String(name || '').trim().split(/\s+/)[0] || 'Account';
  }

  function parseDbDate(value) {
    if (!value) return new Date();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
      return new Date(`${value.replace(' ', 'T')}Z`);
    }
    return new Date(value);
  }

  function formatDate(value, options = {}) {
    const date = parseDbDate(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      ...options
    }).format(date);
  }

  function stars(rating) {
    const value = Math.max(0, Math.min(5, Number(rating) || 0));
    const width = (value / 5) * 100;
    return `<span class="stars" aria-label="${value.toFixed(1)} out of 5 stars">★★★★★<span class="stars-fill" style="width:${width}%">★★★★★</span></span>`;
  }

  function activeNav() {
    const path = window.location.pathname;
    const category = new URLSearchParams(window.location.search).get('category');
    if (path === '/' && !category) return 'shop';
    if (path === '/' && category === 'Audio') return 'audio';
    if (path === '/' && category === 'Home') return 'home';
    if (path === '/orders' || path.startsWith('/order')) return 'orders';
    return '';
  }

  function accountMarkup() {
    if (state.user) {
      return `
        <div class="account-cluster">
          <a class="account-chip" href="/orders" aria-label="View your orders">
            <span class="avatar">${escapeHtml(getInitials(state.user.name))}</span>
            <span>${escapeHtml(firstName(state.user.name))}</span>
          </a>
          <button class="signout-button" type="button" data-logout>Sign out</button>
        </div>`;
    }
    return `
      <a class="signin-link" href="/login">Sign in</a>
      <a class="button button-small button-accent" href="/register">Join</a>`;
  }

  function mobileAccountMarkup() {
    if (state.user) {
      return `
        <div class="mobile-account">
          <span class="avatar">${escapeHtml(getInitials(state.user.name))}</span>
          <span>${escapeHtml(firstName(state.user.name))}</span>
          <button class="signout-button" type="button" data-logout>Sign out</button>
        </div>`;
    }
    return `
      <div class="mobile-account">
        <a href="/login">Sign in</a>
        <a class="button button-small button-accent" href="/register">Create account</a>
      </div>`;
  }

  function renderHeader() {
    const host = document.getElementById('site-header');
    if (!host) return;

    const active = activeNav();
    host.innerHTML = `
      <div class="announcement">
        <p>Free shipping on orders over $75 <span>·</span> 30-day easy returns</p>
      </div>
      <header class="site-header">
        <div class="container header-inner">
          <a class="brand" href="/" aria-label="ShopSwift home">
            <span class="brand-mark">SS</span>
            <span class="brand-copy">
              <strong>ShopSwift</strong>
              <small>Everyday goods</small>
            </span>
          </a>
          <nav class="main-nav" aria-label="Main navigation">
            <a href="/" class="${active === 'shop' ? 'is-active' : ''}">Shop all</a>
            <a href="/?category=Audio" class="${active === 'audio' ? 'is-active' : ''}">Audio</a>
            <a href="/?category=Home" class="${active === 'home' ? 'is-active' : ''}">Home &amp; office</a>
            <a href="/orders" class="${active === 'orders' ? 'is-active' : ''}">Orders</a>
          </nav>
          <div class="header-actions">
            ${accountMarkup()}
            <a class="cart-link" href="/cart" aria-label="Open shopping bag">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M6.2 8h11.6l-1 12H7.2l-1-12Z"/>
                <path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>
              </svg>
              <span class="cart-count ${state.cartCount ? '' : 'is-empty'}" data-cart-count>${state.cartCount}</span>
            </a>
            <button class="menu-toggle" type="button" data-menu-toggle aria-expanded="${state.menuOpen}" aria-controls="mobile-nav" aria-label="Toggle menu">
              <span></span>
            </button>
          </div>
        </div>
        <nav class="mobile-nav ${state.menuOpen ? 'is-open' : ''}" id="mobile-nav" aria-label="Mobile navigation">
          <a href="/">Shop all</a>
          <a href="/?category=Audio">Audio</a>
          <a href="/?category=Home">Home &amp; office</a>
          <a href="/?category=Wearables">Wearables</a>
          <a href="/orders">Orders</a>
          ${mobileAccountMarkup()}
        </nav>
      </header>`;
  }

  function renderFooter() {
    const host = document.getElementById('site-footer');
    if (!host) return;

    host.innerHTML = `
      <footer class="site-footer">
        <div class="container">
          <div class="footer-grid">
            <div class="footer-brand">
              <a class="brand" href="/" aria-label="CodeAlpha Supply Co. home">
                <span class="brand-mark">CA</span>
                <span class="brand-copy">
                  <strong>CodeAlpha</strong>
                  <small>Supply Co.</small>
                </span>
              </a>
              <p>Considered everyday objects for slower mornings, deeper focus and better adventures. Designed to be used, loved and kept.</p>
            </div>
            <div class="footer-column">
              <h3>Shop</h3>
              <a href="/">All products</a>
              <a href="/?category=Audio">Audio</a>
              <a href="/?category=Home">Home &amp; office</a>
              <a href="/?category=Bags">Bags</a>
            </div>
            <div class="footer-column">
              <h3>Your account</h3>
              <a href="/login">Sign in</a>
              <a href="/register">Create account</a>
              <a href="/orders">Order history</a>
              <a href="/cart">Shopping bag</a>
            </div>
            <div class="footer-column">
              <h3>Help</h3>
              <a href="/#shipping">Shipping &amp; returns</a>
              <a href="mailto:hello@codealpha.store">Contact us</a>
              <a href="/#shop">Shop the edit</a>
            </div>
          </div>
          <div class="footer-bottom">
            <p>&copy; ${new Date().getFullYear()} CodeAlpha Supply Co. Built with Express &amp; SQLite.</p>
            <div class="payment-badges" aria-label="Accepted payment methods">
              <span class="payment-badge">VISA</span>
              <span class="payment-badge">MC</span>
              <span class="payment-badge">AMEX</span>
              <span class="payment-badge">PAYPAL</span>
            </div>
          </div>
        </div>
      </footer>`;
  }

  function updateCartBadges(bump = false) {
    document.querySelectorAll('[data-cart-count]').forEach((badge) => {
      badge.textContent = String(state.cartCount);
      badge.classList.toggle('is-empty', state.cartCount === 0);
      if (bump) {
        badge.classList.remove('is-bumping');
        void badge.offsetWidth;
        badge.classList.add('is-bumping');
      }
    });
  }

  let sessionPromise = null;

  function loadSession(force = false) {
    if (!force && sessionPromise) return sessionPromise;

    sessionPromise = api('/api/me')
      .then((data) => {
        state.user = data.user || null;
        state.cartCount = Number(data.cartCount) || 0;
        return data;
      })
      .catch((error) => {
        console.error('Unable to load session:', error);
        state.user = null;
        state.cartCount = 0;
        return { user: null, cartCount: 0 };
      })
      .finally(() => {
        state.loaded = true;
        renderHeader();
        updateCartBadges();
      });

    return sessionPromise;
  }

  async function refreshSession() {
    sessionPromise = null;
    return loadSession(true);
  }

  function setCartCount(count, bump = true) {
    state.cartCount = Math.max(0, Number(count) || 0);
    updateCartBadges(bump);
  }

  function toast(message, type = 'success') {
    const root =
      document.getElementById('toast-root') ||
      (() => {
        const element = document.createElement('div');
        element.id = 'toast-root';
        element.className = 'toast-root';
        document.body.appendChild(element);
        return element;
      })();

    const element = document.createElement('div');
    element.className = `toast toast-${type}`;
    element.setAttribute('role', 'status');
    element.innerHTML = `
      <span class="toast-icon" aria-hidden="true">${type === 'error' ? '!' : '✓'}</span>
      <span>${escapeHtml(message)}</span>`;
    root.appendChild(element);

    requestAnimationFrame(() => element.classList.add('is-visible'));
    setTimeout(() => {
      element.classList.remove('is-visible');
      setTimeout(() => element.remove(), 240);
    }, 3400);
  }

  async function addToCart(productId, quantity = 1, button = null) {
    if (button) {
      button.disabled = true;
      button.classList.add('is-loading');
    }

    try {
      const data = await api('/api/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity })
      });
      state.cartCount = data.cart.count;
      updateCartBadges(true);
      toast('Added to your bag.');
      return data.cart;
    } catch (error) {
      toast(error.message, 'error');
      throw error;
    } finally {
      if (button) {
        button.disabled = false;
        button.classList.remove('is-loading');
      }
    }
  }

  function productCard(product) {
    const badgeClass =
      product.badge === 'Limited'
        ? 'badge-limited'
        : product.badge === 'New'
          ? 'badge-new'
          : '';
    const badge = product.badge
      ? `<span class="product-badge ${badgeClass}">${escapeHtml(product.badge)}</span>`
      : '';
    const soldOut = product.inStock
      ? ''
      : '<span class="sold-out-label">Sold out</span>';
    const lowStock =
      product.lowStock && product.inStock
        ? `<span class="low-stock">Only ${product.stock} left</span>`
        : '';
    const href = `/product/${encodeURIComponent(product.slug)}`;

    return `
      <article class="product-card">
        <div class="product-media-wrap">
          <a class="product-media" href="${href}" aria-label="View ${escapeHtml(product.name)}">
            <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async">
            ${badge}
            ${soldOut}
          </a>
          <button class="quick-add" type="button" data-add="${product.id}" ${product.inStock ? '' : 'disabled'} aria-label="Add ${escapeHtml(product.name)} to bag">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            <span class="quick-add-text">Add to bag</span>
          </button>
        </div>
        <div class="product-info">
          <div class="product-category">${escapeHtml(product.category)}</div>
          <a class="product-title" href="${href}">${escapeHtml(product.name)}</a>
          <div class="product-bottom">
            <span class="product-price">${money(product.price)}</span>
            <span class="product-rating">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="m12 2.6 2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4L2.6 9.4l6.5-.9L12 2.6Z"/>
              </svg>
              ${Number(product.rating).toFixed(1)}
            </span>
          </div>
          ${lowStock}
        </div>
      </article>`;
  }

  function renderProductGrid(container, products) {
    if (!container) return;
    container.innerHTML = products.map(productCard).join('');
  }

  async function logout(button) {
    if (button) button.disabled = true;
    try {
      await api('/api/logout', { method: 'POST' });
      state.user = null;
      state.cartCount = 0;
      state.loaded = false;
      sessionPromise = null;
      renderHeader();
      updateCartBadges();
      toast('You have been signed out.');
      if (window.location.pathname.startsWith('/orders') || window.location.pathname.startsWith('/order')) {
        window.location.href = '/';
      }
    } catch (error) {
      toast(error.message, 'error');
      if (button) button.disabled = false;
    }
  }

  function closeMenu() {
    state.menuOpen = false;
    document.body.classList.remove('no-scroll');
    const toggle = document.querySelector('[data-menu-toggle]');
    const nav = document.getElementById('mobile-nav');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    if (nav) nav.classList.remove('is-open');
  }

  function initEvents() {
    document.addEventListener('click', async (event) => {
      const addButton = event.target.closest('[data-add]');
      if (addButton) {
        event.preventDefault();
        if (addButton.disabled) return;
        try {
          await addToCart(Number(addButton.dataset.add), 1, addButton);
        } catch {
          /* Error toast is shown by addToCart. */
        }
        return;
      }

      const logoutButton = event.target.closest('[data-logout]');
      if (logoutButton) {
        event.preventDefault();
        await logout(logoutButton);
        return;
      }

      const menuToggle = event.target.closest('[data-menu-toggle]');
      if (menuToggle) {
        state.menuOpen = !state.menuOpen;
        menuToggle.setAttribute('aria-expanded', String(state.menuOpen));
        const nav = document.getElementById('mobile-nav');
        if (nav) nav.classList.toggle('is-open', state.menuOpen);
        document.body.classList.toggle('no-scroll', state.menuOpen);
        return;
      }

      if (event.target.closest('#mobile-nav a')) {
        closeMenu();
        return;
      }

      const passwordToggle = event.target.closest('[data-password-toggle]');
      if (passwordToggle) {
        const input = document.getElementById(passwordToggle.dataset.passwordToggle);
        if (input) {
          const showing = input.type === 'text';
          input.type = showing ? 'password' : 'text';
          passwordToggle.textContent = showing ? 'Show' : 'Hide';
        }
        return;
      }

      if (state.menuOpen && !event.target.closest('.site-header')) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.menuOpen) closeMenu();
    });

    document.addEventListener(
      'error',
      (event) => {
        const image = event.target;
        if (image && image.tagName === 'IMG' && !image.dataset.fallbackApplied) {
          image.dataset.fallbackApplied = 'true';
          image.src = '/images/placeholder.svg';
        }
      },
      true
    );

    document.addEventListener('submit', (event) => {
      const form = event.target.closest('[data-newsletter]');
      if (!form) return;
      event.preventDefault();
      const email = form.querySelector('input[type="email"]');
      if (email && email.value.trim()) {
        toast('You are on the list. Welcome to the good stuff.');
        form.reset();
      }
    });
  }

  const Store = {
    api,
    money,
    escapeHtml,
    formatDate,
    stars,
    productCard,
    renderProductGrid,
    addToCart,
    toast,
    refreshSession,
    loadSession,
    setCartCount,
    get user() {
      return state.user;
    },
    get cartCount() {
      return state.cartCount;
    },
    ready: null
  };

  window.Store = Store;

  renderFooter();
  renderHeader();
  initEvents();
  Store.ready = loadSession();
})();
