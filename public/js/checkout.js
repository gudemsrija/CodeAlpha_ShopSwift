(async function () {
  await Store.ready;

  const root = document.getElementById('checkout-root');

  function renderAuthGate() {
    root.innerHTML = `
      <div class="auth-gate">
        <span class="empty-icon">
          <svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="4" y="10" width="16" height="10" rx="2"/>
            <path d="M8 10V7a4 4 0 0 1 8 0v3"/>
          </svg>
        </span>
        <h2>Sign in to check out</h2>
        <p>Your bag is saved. Sign in or create an account to complete your order and keep track of it later.</p>
        <div class="auth-gate-actions">
          <a class="button button-accent" href="/login?next=%2Fcheckout">Sign in</a>
          <a class="button button-outline" href="/register?next=%2Fcheckout">Create an account</a>
        </div>
      </div>`;
  }

  function renderEmptyCart() {
    root.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">
          <svg width="31" height="31" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M6.2 8h11.6l-1 12H7.2l-1-12Z"/>
            <path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>
          </svg>
        </span>
        <h3>There is nothing to check out yet</h3>
        <p>Add a piece or two to your bag, then come back here to finish your order.</p>
        <a class="button button-accent" href="/">Explore the collection</a>
      </div>`;
  }

  function renderCheckout(cart) {
    const items = cart.items
      .map(
        (item) => `
          <div class="order-summary-item">
            <div class="order-summary-thumb">
              <img src="${Store.escapeHtml(item.image)}" alt="${Store.escapeHtml(item.name)}">
              <span class="order-summary-qty">${item.quantity}</span>
            </div>
            <div>
              <div class="order-summary-name">${Store.escapeHtml(item.name)}</div>
              <div class="order-summary-price">${Store.money(item.price)} each</div>
            </div>
            <div class="order-summary-line">${Store.money(item.lineTotal)}</div>
          </div>`
      )
      .join('');

    root.innerHTML = `
      <div class="checkout-layout">
        <div>
          <div class="checkout-steps">
            <a href="/cart">Bag</a><span>→</span><strong>Details</strong><span>→</span><span>Confirmation</span>
          </div>

          <form class="form-card" id="checkout-form">
            <div class="form-error" id="checkout-error" role="alert"></div>

            <div class="form-section">
              <div class="form-section-title"><span>1</span><h2>Contact details</h2></div>
              <div class="form-grid">
                <div class="form-field">
                  <label for="checkout-name">Full name</label>
                  <input id="checkout-name" name="name" type="text" value="${Store.escapeHtml(Store.user.name)}" autocomplete="name" required>
                </div>
                <div class="form-field">
                  <label for="checkout-email">Email address</label>
                  <input id="checkout-email" type="email" value="${Store.escapeHtml(Store.user.email)}" autocomplete="email" readonly>
                  <span class="form-hint">Your receipt and updates go here.</span>
                </div>
              </div>
            </div>

            <div class="form-section">
              <div class="form-section-title"><span>2</span><h2>Shipping address</h2></div>
              <div class="form-grid">
                <div class="form-field form-field-full">
                  <label for="checkout-address">Street address</label>
                  <input id="checkout-address" name="address" type="text" placeholder="123 Supply Street, Apt 4" autocomplete="street-address" required>
                </div>
                <div class="form-field">
                  <label for="checkout-city">City</label>
                  <input id="checkout-city" name="city" type="text" autocomplete="address-level2" required>
                </div>
                <div class="form-field">
                  <label for="checkout-postal">ZIP / Postal code</label>
                  <input id="checkout-postal" name="postal" type="text" autocomplete="postal-code" required>
                </div>
                <div class="form-field form-field-full">
                  <label for="checkout-country">Country</label>
                  <input id="checkout-country" name="country" type="text" value="United States" autocomplete="country-name" required>
                </div>
              </div>
            </div>

            <div class="form-section">
              <div class="form-section-title"><span>3</span><h2>Payment</h2></div>
              <div class="payment-option">
                <span class="payment-option-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect x="3" y="6" width="18" height="12" rx="2"/>
                    <path d="M3 10h18"/>
                  </svg>
                </span>
                <div>
                  <strong>Demo checkout</strong>
                  <span>No payment will be taken. Your order is processed instantly.</span>
                </div>
              </div>
            </div>

            <button class="button button-accent button-wide" type="submit" id="place-order">
              Place order · ${Store.money(cart.total)}
            </button>
            <p class="form-hint" style="text-align:center;margin-top:14px;">By placing this order, you agree to our friendly returns policy.</p>
          </form>
        </div>

        <aside class="summary-card" aria-label="Order summary">
          <h2>Your order</h2>
          <div class="order-summary-items">${items}</div>
          <div class="summary-divider"></div>
          <div class="summary-row"><span>Subtotal</span><strong>${Store.money(cart.subtotal)}</strong></div>
          <div class="summary-row">
            <span>Shipping</span>
            <strong>${cart.shipping === 0 ? 'Free' : Store.money(cart.shipping)}</strong>
          </div>
          <div class="summary-total">
            <span>Total</span>
            <strong>${Store.money(cart.total)}</strong>
          </div>
          <div class="secure-note">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="4" y="10" width="16" height="10" rx="2"/>
              <path d="M8 10V7a4 4 0 0 1 8 0v3"/>
            </svg>
            Your details stay private and secure
          </div>
        </aside>
      </div>`;

    const form = document.getElementById('checkout-form');
    const errorBox = document.getElementById('checkout-error');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorBox.classList.remove('is-visible');

      const fields = {
        name: document.getElementById('checkout-name').value.trim(),
        address: document.getElementById('checkout-address').value.trim(),
        city: document.getElementById('checkout-city').value.trim(),
        postal: document.getElementById('checkout-postal').value.trim(),
        country: document.getElementById('checkout-country').value.trim()
      };

      if (Object.values(fields).some((value) => !value)) {
        errorBox.textContent = 'Please complete all shipping fields.';
        errorBox.classList.add('is-visible');
        return;
      }

      const button = document.getElementById('place-order');
      const original = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<span class="spinner"></span> Placing order…';

      try {
        const result = await Store.api('/api/checkout', {
          method: 'POST',
          body: JSON.stringify(fields)
        });
        Store.setCartCount(0, false);
        await Store.refreshSession();
        window.location.assign(`/order/${result.orderId}`);
      } catch (error) {
        errorBox.textContent = error.message;
        errorBox.classList.add('is-visible');
        button.disabled = false;
        button.innerHTML = original;
        Store.toast(error.message, 'error');
        if (error.status === 401) {
          window.location.assign('/login?next=%2Fcheckout');
        }
      }
    });
  }

  if (!Store.user) {
    renderAuthGate();
    return;
  }

  try {
    const cart = await Store.api('/api/cart');
    if (!cart.items.length) {
      renderEmptyCart();
      return;
    }
    renderCheckout(cart);
  } catch (error) {
    root.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">!</span>
        <h3>Checkout is unavailable</h3>
        <p>${Store.escapeHtml(error.message)}</p>
        <a class="button button-outline" href="/cart">Return to your bag</a>
      </div>`;
  }
})();
