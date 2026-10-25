(async function () {
  await Store.ready;

  const root = document.getElementById('cart-root');
  let cart = null;
  let busy = false;

  function emptyCart() {
    root.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">
          <svg width="31" height="31" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M6.2 8h11.6l-1 12H7.2l-1-12Z"/>
            <path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>
          </svg>
        </span>
        <h3>Your bag is feeling light</h3>
        <p>Fill it with something useful, beautiful, or both. The collection is right this way.</p>
        <a class="button button-accent" href="/">Start shopping</a>
      </div>`;
  }

  function itemMarkup(item) {
    return `
      <article class="cart-item" data-cart-row="${item.id}" data-quantity="${item.quantity}">
        <a class="cart-item-image" href="/product/${encodeURIComponent(item.slug)}" aria-label="View ${Store.escapeHtml(item.name)}">
          <img src="${Store.escapeHtml(item.image)}" alt="${Store.escapeHtml(item.name)}" loading="lazy">
        </a>
        <div class="cart-item-info">
          <div class="product-category">${Store.escapeHtml(item.category)}</div>
          <a class="cart-item-name" href="/product/${encodeURIComponent(item.slug)}">${Store.escapeHtml(item.name)}</a>
          <div class="cart-item-price">${Store.money(item.price)} each</div>
          <div class="cart-item-controls">
            <div class="quantity-stepper" aria-label="Quantity for ${Store.escapeHtml(item.name)}">
              <button type="button" data-cart-decrease ${item.quantity <= 1 ? 'disabled' : ''} aria-label="Decrease quantity">−</button>
              <span>${item.quantity}</span>
              <button type="button" data-cart-increase ${item.quantity >= item.stock ? 'disabled' : ''} aria-label="Increase quantity">+</button>
            </div>
            <button class="remove-item" type="button" data-cart-remove>Remove</button>
          </div>
        </div>
        <div class="cart-item-total">${Store.money(item.lineTotal)}</div>
      </article>`;
  }

  function render(nextCart) {
    cart = nextCart;
    Store.setCartCount(cart.count);

    if (!cart.items.length) {
      emptyCart();
      return;
    }

    const progress = Math.min(100, (cart.subtotal / 75) * 100);
    const shippingMessage =
      cart.freeShippingRemaining > 0
        ? `Add <strong>${Store.money(cart.freeShippingRemaining)}</strong> more to unlock free shipping.`
        : 'Free shipping unlocked. Nice choice.';

    root.innerHTML = `
      <div class="cart-layout">
        <div>
          <div class="cart-list-head">
            <span>${cart.count} ${cart.count === 1 ? 'piece' : 'pieces'} in your bag</span>
            <a class="text-link" href="/">Continue shopping</a>
          </div>
          <div class="cart-items">
            ${cart.items.map(itemMarkup).join('')}
          </div>
        </div>

        <aside class="summary-card" aria-label="Order summary">
          <h2>Order summary</h2>
          <div class="free-shipping">
            <p>${shippingMessage}</p>
            <div class="shipping-progress" aria-hidden="true"><span style="width:${progress}%"></span></div>
          </div>
          <div class="summary-row"><span>Subtotal</span><strong>${Store.money(cart.subtotal)}</strong></div>
          <div class="summary-row">
            <span>Shipping</span>
            <strong>${cart.shipping === 0 ? 'Free' : Store.money(cart.shipping)}</strong>
          </div>
          <div class="summary-total">
            <span>Total</span>
            <strong>${Store.money(cart.total)}</strong>
          </div>
          <a class="button button-accent button-wide" href="${Store.user ? '/checkout' : `/login?next=${encodeURIComponent('/checkout')}`}">
            ${Store.user ? 'Continue to checkout' : 'Sign in to checkout'}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
          </a>
          <p class="summary-note">No hidden fees. The total above is the total you pay.</p>
          <div class="secure-note">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="4" y="10" width="16" height="10" rx="2"/>
              <path d="M8 10V7a4 4 0 0 1 8 0v3"/>
            </svg>
            Secure, encrypted checkout
          </div>
        </aside>
      </div>`;
  }

  async function loadCart() {
    try {
      render(await Store.api('/api/cart'));
    } catch (error) {
      root.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">!</span>
          <h3>We could not load your bag</h3>
          <p>${Store.escapeHtml(error.message)}</p>
          <button class="button button-outline" type="button" id="retry-cart">Try again</button>
        </div>`;
    }
  }

  async function changeQuantity(row, nextQuantity) {
    if (busy) return;
    busy = true;
    row.classList.add('is-updating');
    try {
      const data = await Store.api(`/api/cart/items/${row.dataset.cartRow}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: nextQuantity })
      });
      render(data.cart);
    } catch (error) {
      Store.toast(error.message, 'error');
      row.classList.remove('is-updating');
      await loadCart();
    } finally {
      busy = false;
    }
  }

  async function removeItem(row) {
    if (busy) return;
    busy = true;
    row.classList.add('is-updating');
    try {
      const data = await Store.api(`/api/cart/items/${row.dataset.cartRow}`, {
        method: 'DELETE'
      });
      render(data.cart);
      Store.toast('Item removed from your bag.');
    } catch (error) {
      Store.toast(error.message, 'error');
      row.classList.remove('is-updating');
    } finally {
      busy = false;
    }
  }

  root.addEventListener('click', (event) => {
    if (event.target.closest('#retry-cart')) {
      loadCart();
      return;
    }

    const row = event.target.closest('[data-cart-row]');
    if (!row) return;
    const quantity = Number(row.dataset.quantity);

    if (event.target.closest('[data-cart-increase]')) {
      changeQuantity(row, quantity + 1);
    } else if (event.target.closest('[data-cart-decrease]')) {
      changeQuantity(row, quantity - 1);
    } else if (event.target.closest('[data-cart-remove]')) {
      removeItem(row);
    }
  });

  loadCart();
})();
