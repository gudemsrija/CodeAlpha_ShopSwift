(async function () {
  await Store.ready;

  const grid = document.getElementById('product-grid');
  const chipsHost = document.getElementById('category-chips');
  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-select');
  const resultCount = document.getElementById('result-count');
  const clearButton = document.getElementById('clear-filters');
  const sectionCount = document.getElementById('section-count');

  const params = new URLSearchParams(window.location.search);
  const validSorts = new Set(['featured', 'rating', 'price-asc', 'price-desc']);
  let category = params.get('category') || 'All';
  let search = params.get('search') || '';
  let sort = validSorts.has(params.get('sort')) ? params.get('sort') : 'featured';
  let categories = [];
  let requestNumber = 0;
  let searchTimer = null;

  searchInput.value = search;
  sortSelect.value = sort;

  function skeletons() {
    grid.innerHTML = Array.from(
      { length: 8 },
      () => `
        <div class="skeleton-card">
          <div class="skeleton skeleton-media"></div>
          <div class="skeleton skeleton-line"></div>
          <div class="skeleton skeleton-line short"></div>
        </div>`
    ).join('');
  }

  function renderChips() {
    const allCategories = ['All', ...categories];
    if (!allCategories.includes(category)) category = 'All';

    chipsHost.innerHTML = allCategories
      .map(
        (item) => `
          <button class="chip ${item === category ? 'is-active' : ''}" type="button" data-category="${Store.escapeHtml(item)}">
            ${Store.escapeHtml(item)}
          </button>`
      )
      .join('');
  }

  function syncUrl() {
    const url = new URL(window.location.href);
    if (category && category !== 'All') url.searchParams.set('category', category);
    else url.searchParams.delete('category');

    if (search.trim()) url.searchParams.set('search', search.trim());
    else url.searchParams.delete('search');

    if (sort !== 'featured') url.searchParams.set('sort', sort);
    else url.searchParams.delete('sort');

    window.history.replaceState({}, '', url);
  }

  function showEmpty(message, isError = false) {
    grid.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7"/>
            <path d="m20 20-3.6-3.6"/>
          </svg>
        </span>
        <h3>${isError ? 'We hit a small snag' : 'Nothing matched'}</h3>
        <p>${Store.escapeHtml(message)}</p>
        <button class="button button-outline" type="button" data-clear-filters>View all products</button>
      </div>`;
  }

  async function loadProducts(showSkeletons = true) {
    const currentRequest = ++requestNumber;
    if (showSkeletons) skeletons();

    const query = new URLSearchParams();
    if (category && category !== 'All') query.set('category', category);
    if (search.trim()) query.set('search', search.trim());
    query.set('sort', sort);

    try {
      const data = await Store.api(`/api/products?${query.toString()}`);
      if (currentRequest !== requestNumber) return;

      categories = data.categories;
      renderChips();
      Store.renderProductGrid(grid, data.products);

      resultCount.textContent = `${data.products.length} ${
        data.products.length === 1 ? 'piece' : 'pieces'
      }${search.trim() ? ` for “${search.trim()}”` : ''}`;
      sectionCount.textContent = `${categories.length} categories · ${data.products.length} shown`;
      clearButton.hidden = !search.trim() && category === 'All' && sort === 'featured';

      if (!data.products.length) {
        showEmpty(
          'Try a different search or browse the full collection — there is plenty more to see.'
        );
      }

      syncUrl();
    } catch (error) {
      if (currentRequest !== requestNumber) return;
      resultCount.textContent = 'Unable to load products';
      showEmpty('The shop could not be loaded just now. Check the connection and try again.', true);
    }
  }

  function resetFilters() {
    category = 'All';
    search = '';
    sort = 'featured';
    searchInput.value = '';
    sortSelect.value = 'featured';
    loadProducts();
  }

  chipsHost.addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    category = button.dataset.category;
    loadProducts();
  });

  searchInput.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      search = searchInput.value;
      loadProducts();
    }, 250);
  });

  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      window.clearTimeout(searchTimer);
      search = searchInput.value;
      loadProducts();
    }
  });

  sortSelect.addEventListener('change', () => {
    sort = sortSelect.value;
    loadProducts();
  });

  clearButton.addEventListener('click', resetFilters);

  grid.addEventListener('click', (event) => {
    if (event.target.closest('[data-clear-filters]')) resetFilters();
  });

  loadProducts();
})();
