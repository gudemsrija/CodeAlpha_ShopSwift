(async function () {
  await Store.ready;

  const root = document.getElementById('order-root');
  const orderId = Number(window.location.pathname.split('/').filter(Boolean).pop());

  function renderAuthGate() {
    const next = encodeURIComponent(window.location.pathname);
    root.innerHTML = `
      <div class="auth-gate">
        <span class="empty-icon">
          <svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M6 3h12v18l-6-3.5L6 21V3Z"/>
          </svg>
        </span>
        <h2>Sign in to view this order</h2>
        <p>For your privacy, order details are only shown when you are signed in to the account that placed the order.</p>
        <div class="auth-gate-actions">
          <a class="button button-accent" href="/login?next=${next}">Sign in</a>
          <a class="button button-outline" href="/orders">Go to orders</a>
        </div>
      </div>`;
  }

  function renderError(message) {
    root.innerHTML = `
      <div class="empty-state" style="max-width:700px;margin:0 auto;">
        <span class="empty-icon">!</span>
        <h3>Order not found</h3>
        <p>${Store.escapeHtml(message)}</p>
        <a class="button button-outline" href="/orders">View your orders</a>
      </div>`;
  }

  function renderOrder(order) {
    document.title = `${order.reference} — CodeAlpha Supply Co.`;

    const items = order.items
      .map(
        (item) => `
          <div class="order-detail-item">
            <div class="order-detail-thumb">
              <img src="${Store.escapeHtml(item.image)}" alt="${Store.escapeHtml(item.name)}" loading="lazy">
            </div>
            <div>
              <div class="order-detail-name">${Store.escapeHtml(item.name)}</div>
              <div class="order-detail-qty">Qty ${item.quantity} · ${Store.money(item.price)} each</div>
            </div>
            <div class="order-detail-price">${Store.money(item.price * item.quantity)}</div>
          </div>`
      )
      .join('');

    const estimated = new Date();
    estimated.setDate(estimated.getDate() + 4);

    root.innerHTML = `
      <div class="success-hero">
        <span class="success-check">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m5 12 4 4L19 6"/>
          </svg>
        </span>
        <span class="eyebrow">Order confirmed</span>
        <h1>It’s on its way.</h1>
        <p>Thank you, ${Store.escapeHtml(order.shipping_name.split(' ')[0])}. Your order is being prepared with care. We will send updates to your account as it moves along.</p>
        <div class="success-reference"><span>Order</span>${Store.escapeHtml(order.reference)}</div>
      </div>

      <div class="order-detail-grid">
        <div class="order-detail-card">
          <h2>Your pieces</h2>
          <div class="order-detail-items">${items}</div>
        </div>

        <aside class="order-detail-side">
          <div class="order-detail-card">
            <h2>Shipping to</h2>
            <div class="address-block">
              <strong>${Store.escapeHtml(order.shipping_name)}</strong>
              ${Store.escapeHtml(order.shipping_address)}<br>
              ${Store.escapeHtml(order.shipping_city)}, ${Store.escapeHtml(order.shipping_postal)}<br>
              ${Store.escapeHtml(order.shipping_country)}
            </div>
            <div class="summary-divider"></div>
            <div class="summary-row"><span>Order placed</span><strong>${Store.formatDate(order.created_at)}</strong></div>
            <div class="summary-row"><span>Estimated delivery</span><strong>${Store.formatDate(estimated)}</strong></div>
            <div class="summary-row"><span>Status</span><span class="status-badge">${Store.escapeHtml(order.status)}</span></div>
          </div>

          <div class="summary-card">
            <h2>Summary</h2>
            <div class="summary-row"><span>Subtotal</span><strong>${Store.money(order.subtotal)}</strong></div>
            <div class="summary-row">
              <span>Shipping</span>
              <strong>${order.shipping === 0 ? 'Free' : Store.money(order.shipping)}</strong>
            </div>
            <div class="summary-total">
              <span>Total</span>
              <strong>${Store.money(order.total)}</strong>
            </div>
            <p class="summary-note">No payment was taken — this is a demo store.</p>
          </div>
        </aside>
      </div>

      <div class="success-actions">
        <a class="button button-accent" href="/">Continue shopping</a>
        <a class="button button-outline" href="/orders">View all orders</a>
      </div>`;
  }

  if (!Number.isInteger(orderId) || orderId <= 0) {
    renderError('That order link does not look right.');
    return;
  }

  if (!Store.user) {
    renderAuthGate();
    return;
  }

  try {
    const data = await Store.api(`/api/orders/${orderId}`);
    renderOrder(data.order);
  } catch (error) {
    renderError(
      error.status === 404
        ? 'We could not find an order with that number on your account.'
        : error.message
    );
  }
})();
