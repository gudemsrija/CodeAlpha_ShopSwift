(async function () {
  await Store.ready;

  const root = document.getElementById('orders-root');

  function renderAuthGate() {
    root.innerHTML = `
      <div class="auth-gate">
        <span class="empty-icon">
          <svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M6 3h12v18l-6-3.5L6 21V3Z"/>
          </svg>
        </span>
        <h2>Your orders live here</h2>
        <p>Sign in to see your order history, check on a delivery, or revisit something you loved.</p>
        <div class="auth-gate-actions">
          <a class="button button-accent" href="/login?next=%2Forders">Sign in</a>
          <a class="button button-outline" href="/register?next=%2Forders">Create an account</a>
        </div>
      </div>`;
  }

  function renderEmpty() {
    root.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">
          <svg width="31" height="31" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M6 3h12v18l-6-3.5L6 21V3Z"/>
          </svg>
        </span>
        <h3>No orders yet</h3>
        <p>Your future favourites are waiting. Find something made for the everyday and it will show up here.</p>
        <a class="button button-accent" href="/">Explore the collection</a>
      </div>`;
  }

  function orderCard(order) {
    const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const thumbs = order.items.slice(0, 3);
    const more = order.items.length - thumbs.length;
    const thumbMarkup = thumbs
      .map(
        (item) => `
          <span class="order-thumb">
            <img src="${Store.escapeHtml(item.image)}" alt="${Store.escapeHtml(item.name)}" loading="lazy">
          </span>`
      )
      .join('');
    const moreMarkup = more > 0 ? `<span class="order-thumb order-thumb-more">+${more}</span>` : '';

    return `
      <article class="order-card">
        <div class="order-card-head">
          <div class="order-meta">
            <div class="order-meta-item">
              <span>Order</span>
              <strong>${Store.escapeHtml(order.reference)}</strong>
            </div>
            <div class="order-meta-item">
              <span>Placed</span>
              <strong>${Store.formatDate(order.created_at)}</strong>
            </div>
            <div class="order-meta-item">
              <span>Items</span>
              <strong>${itemCount} ${itemCount === 1 ? 'piece' : 'pieces'}</strong>
            </div>
          </div>
          <span class="status-badge">${Store.escapeHtml(order.status)}</span>
        </div>
        <div class="order-card-body">
          <div class="order-thumbs" aria-label="Items in this order">
            ${thumbMarkup}${moreMarkup}
          </div>
          <div class="order-total-area">
            <div>
              <span>Total</span>
              <strong>${Store.money(order.total)}</strong>
            </div>
            <a class="button button-outline button-small" href="/order/${order.id}">View order</a>
          </div>
        </div>
      </article>`;
  }

  if (!Store.user) {
    renderAuthGate();
    return;
  }

  try {
    const data = await Store.api('/api/orders');
    if (!data.orders.length) {
      renderEmpty();
      return;
    }
    root.innerHTML = `<div class="orders-list">${data.orders.map(orderCard).join('')}</div>`;
  } catch (error) {
    root.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">!</span>
        <h3>We could not load your orders</h3>
        <p>${Store.escapeHtml(error.message)}</p>
        <button class="button button-outline" type="button" id="retry-orders">Try again</button>
      </div>`;
    document.getElementById('retry-orders')?.addEventListener('click', () => window.location.reload());
  }
})();
