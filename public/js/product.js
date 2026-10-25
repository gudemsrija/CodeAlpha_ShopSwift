(async function () {
  await Store.ready;

  const detail = document.getElementById('product-detail');
  const breadcrumbs = document.getElementById('breadcrumbs');
  const relatedSection = document.getElementById('related-section');
  const relatedGrid = document.getElementById('related-grid');
  const slug = decodeURIComponent(
    window.location.pathname.split('/').filter(Boolean).pop() || ''
  );

  let product = null;
  let quantity = 1;
  let maxQuantity = 1;

  function renderError(message) {
    detail.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <span class="empty-icon">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 8v5M12 17h.01"/>
            <circle cx="12" cy="12" r="9"/>
          </svg>
        </span>
        <h3>Product not found</h3>
        <p>${Store.escapeHtml(message)}</p>
        <a class="button button-outline" href="/">Back to the shop</a>
      </div>`;
  }

  function updatePurchaseUi() {
    const quantityLabel = document.getElementById('quantity-value');
    const addButton = document.getElementById('add-to-bag');
    const buyButton = document.getElementById('buy-now');
    const lineTotal = document.getElementById('add-line-total');
    if (quantityLabel) quantityLabel.textContent = String(quantity);
    if (lineTotal) lineTotal.textContent = Store.money(product.price * quantity);
    document.querySelectorAll('[data-qty-change]').forEach((button) => {
      const change = Number(button.dataset.qtyChange);
      button.disabled =
        !product.inStock ||
        (change < 0 && quantity <= 1) ||
        (change > 0 && quantity >= maxQuantity);
    });
    if (addButton) addButton.disabled = !product.inStock;
    if (buyButton) buyButton.disabled = !product.inStock;
  }

  function renderProduct(data) {
    product = data.product;
    maxQuantity = Math.max(1, Math.min(product.stock, 10));

    document.title = `${product.name} — CodeAlpha Supply Co.`;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', product.description);

    breadcrumbs.innerHTML = `
      <a href="/">Home</a><span>/</span><a href="/">Shop</a><span>/</span>
      <a href="/?category=${encodeURIComponent(product.category)}">${Store.escapeHtml(product.category)}</a>
      <span>/</span><span>${Store.escapeHtml(product.name)}</span>`;

    const badgeClass =
      product.badge === 'Limited'
        ? 'badge-limited'
        : product.badge === 'New'
          ? 'badge-new'
          : '';
    const badge = product.badge
      ? `<span class="product-badge ${badgeClass}">${Store.escapeHtml(product.badge)}</span>`
      : '';

    let stockClass = '';
    let stockText = 'In stock, ready to ship';
    if (!product.inStock) {
      stockClass = 'out';
      stockText = 'Currently sold out';
    } else if (product.lowStock) {
      stockClass = 'low';
      stockText = `Only ${product.stock} left — order soon`;
    }

    const highlights = product.highlights
      .map(
        (highlight) => `
          <li>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m5 12 4 4L19 6"/>
            </svg>
            <span>${Store.escapeHtml(highlight)}</span>
          </li>`
      )
      .join('');

    detail.innerHTML = `
      <div class="product-gallery">
        <div class="product-gallery-main">
          <img src="${Store.escapeHtml(product.image)}" alt="${Store.escapeHtml(product.name)}" fetchpriority="high">
          ${badge}
        </div>
        <div class="product-gallery-caption">
          <span>Ships within 1–2 business days</span>
          <span>SKU CA-${String(product.id).padStart(4, '0')}</span>
        </div>
      </div>

      <div class="product-info-panel">
        <div class="product-category">${Store.escapeHtml(product.category)}</div>
        <h1>${Store.escapeHtml(product.name)}</h1>
        <div class="product-rating-row">
          ${Store.stars(product.rating)}
          <span>${Number(product.rating).toFixed(1)} · ${product.review_count} reviews</span>
        </div>
        <div class="product-price-large">${Store.money(product.price)}</div>
        <p class="product-description">${Store.escapeHtml(product.description)}</p>

        <ul class="highlight-list">${highlights}</ul>

        <div class="product-stock-note ${stockClass}">${stockText}</div>

        <div class="purchase-row">
          <div class="quantity-stepper" aria-label="Quantity">
            <button type="button" data-qty-change="-1" aria-label="Decrease quantity" ${product.inStock ? '' : 'disabled'}>−</button>
            <span id="quantity-value">1</span>
            <button type="button" data-qty-change="1" aria-label="Increase quantity" ${product.inStock ? '' : 'disabled'}>+</button>
          </div>
          <button class="button button-accent" type="button" id="add-to-bag">
            Add to bag · <span id="add-line-total">${Store.money(product.price)}</span>
          </button>
        </div>
        <button class="button button-outline button-wide" type="button" id="buy-now">Buy it now</button>

        <div class="product-perks">
          <div class="product-perk">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z"/>
              <circle cx="7" cy="18" r="1.6"/><circle cx="18" cy="18" r="1.6"/>
            </svg>
            <span><strong>Free shipping</strong>On orders over $75</span>
          </div>
          <div class="product-perk">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"/>
            </svg>
            <span><strong>30-day returns</strong>Easy and free</span>
          </div>
          <div class="product-perk">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="4" y="10" width="16" height="10" rx="2"/>
              <path d="M8 10V7a4 4 0 0 1 8 0v3"/>
            </svg>
            <span><strong>Secure checkout</strong>Protected end to end</span>
          </div>
          <div class="product-perk">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m12 3 2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.4-4.2 6-.9L12 3Z"/>
            </svg>
            <span><strong>Chosen with care</strong>Quality you can feel</span>
          </div>
        </div>
      </div>`;

    if (data.related.length) {
      relatedSection.hidden = false;
      Store.renderProductGrid(relatedGrid, data.related);
    } else {
      relatedSection.hidden = true;
    }

    updatePurchaseUi();
  }

  detail.addEventListener('click', async (event) => {
    const quantityButton = event.target.closest('[data-qty-change]');
    if (quantityButton && product) {
      quantity = Math.max(
        1,
        Math.min(maxQuantity, quantity + Number(quantityButton.dataset.qtyChange))
      );
      updatePurchaseUi();
      return;
    }

    const addButton = event.target.closest('#add-to-bag');
    if (addButton && product) {
      try {
        await Store.addToCart(product.id, quantity, addButton);
      } catch {
        /* The shared helper displays an error toast. */
      }
      return;
    }

    const buyButton = event.target.closest('#buy-now');
    if (buyButton && product) {
      buyButton.disabled = true;
      const original = buyButton.textContent;
      buyButton.textContent = 'Adding to bag…';
      try {
        await Store.addToCart(product.id, quantity, buyButton);
        window.location.href = '/cart';
      } catch {
        buyButton.disabled = false;
        buyButton.textContent = original;
      }
    }
  });

  if (!slug) {
    renderError('We could not find that product.');
    return;
  }

  try {
    const data = await Store.api(`/api/products/${encodeURIComponent(slug)}`);
    renderProduct(data);
  } catch (error) {
    renderError(
      error.status === 404
        ? 'That product may have sold out or moved. Explore the collection for something else.'
        : 'We could not load this product right now. Please try again in a moment.'
    );
  }
})();
