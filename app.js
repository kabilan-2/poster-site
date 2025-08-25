// app.js - poster shop frontend logic
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

const state = {
  products: [],
  filters: { category: new Set(), orientation: new Set(), size: new Set() },
  sortBy: 'popularity',
  search: '',
  cart: JSON.parse(localStorage.getItem('cart.v1') || '[]')
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const els = {
  grid: $('#productsGrid'),
  empty: $('#emptyState'),
  results: $('#resultsCount'),
  sort: $('#sortBy'),
  search: $('#search'),
  cartButton: $('#cartButton'),
  cartDrawer: $('#cartDrawer'),
  cartItems: $('#cartItems'),
  subtotal: $('#subtotal'),
  grand: $('#grandTotal'),
  count: $('#cartCount'),
  clear: $('#clearFilters'),
  year: $('#year')
};

if (els.year) els.year.textContent = new Date().getFullYear();

async function loadProducts() {
  try {
    const res = await fetch('products.json');
    const data = await res.json();
    state.products = data;
    buildFilterChips(data);
    render();
  } catch (err) {
    console.error('Failed loading products.json', err);
    els.grid.innerHTML = '<div class="empty">Failed to load products.</div>';
  }
}

function buildFilterChips(data) {
  const cats = [...new Set(data.map(p => p.category))];
  const orients = [...new Set(data.map(p => p.orientation))];
  const sizes = [...new Set(data.flatMap(p => p.variants.map(v => v.size)))];
  makeChips('#filter-category', 'category', cats);
  makeChips('#filter-orientation', 'orientation', orients);
  makeChips('#filter-size', 'size', sizes);
}

function makeChips(selector, key, values) {
  const wrap = document.querySelector(selector);
  if (!wrap) return;
  wrap.innerHTML = '';
  values.sort().forEach(val => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = val;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      const set = state.filters[key];
      if (set.has(val)) { set.delete(val); b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); }
      else { set.add(val); b.classList.add('active'); b.setAttribute('aria-pressed', 'true'); }
      render();
    });
    wrap.appendChild(b);
  });
}

function filtered() {
  let list = state.products.slice();
  if (state.search.trim()) {
    const q = state.search.toLowerCase();
    list = list.filter(p => [p.title, p.artist, p.description, ...(p.tags || [])].join(' ').toLowerCase().includes(q));
  }
  const { category, orientation, size } = state.filters;
  if (category.size) list = list.filter(p => category.has(p.category));
  if (orientation.size) list = list.filter(p => orientation.has(p.orientation));
  if (size.size) list = list.filter(p => p.variants.some(v => size.has(v.size)));
  switch (state.sortBy) {
    case 'price-asc': list.sort((a, b) => a.basePrice - b.basePrice); break;
    case 'price-desc': list.sort((a, b) => b.basePrice - a.basePrice); break;
    case 'newest': list.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt)); break;
    default: list.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }
  return list;
}

function render() {
  const list = filtered();
  if (els.results) els.results.textContent = `${list.length} poster${list.length !== 1 ? 's' : ''}`;
  if (!els.grid) return;
  els.grid.innerHTML = '';
  if (!list.length) { els.empty.classList.remove('hidden'); return; } else { els.empty.classList.add('hidden'); }

  const frag = document.createDocumentFragment();
  list.forEach(p => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <img src="${p.images[0].src}" alt="${p.images[0].alt}">
      <div class="p">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <h3 style="margin:0;font-size:16px">${p.title}</h3>
          <div class="price">${currency.format(p.basePrice)}</div>
        </div>
        <div class="muted small">${p.category} • ${p.orientation}</div>
        <button class="btn small block" data-id="${p.id}">View</button>
      </div>`;
    card.querySelector('button').addEventListener('click', () => openModal(p.id));
    frag.appendChild(card);
  });
  els.grid.appendChild(frag);
  renderCart();
}

function openModal(id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return alert('Product not found');
  const dlg = document.getElementById('productModal');
  document.getElementById('modalImage').src = p.images[0].src;
  document.getElementById('modalImage').alt = p.images[0].alt || p.title;
  document.getElementById('modalTitle').textContent = p.title;
  document.getElementById('modalArtist').textContent = `by ${p.artist}`;
  document.getElementById('modalDesc').textContent = p.description || '';

  const sizeSel = document.getElementById('modalSize');
  sizeSel.innerHTML = '';
  const sizes = [...new Set(p.variants.map(v => v.size))];

  sizes.forEach(s => sizeSel.append(new Option(s, s)));

  function updatePrice() {
    const variant = p.variants.find(v => v.size === sizeSel.value) || { price: p.basePrice };
    document.getElementById('modalPrice').textContent = currency.format(variant.price);
  }
  updatePrice();
  sizeSel.addEventListener('change', updatePrice);

  const addBtn = document.getElementById('addToCartBtn');
  addBtn.onclick = () => {
    const variant = p.variants.find(v => v.size === sizeSel.value );
    if (!variant) { alert('Variant not available'); return; }
    addToCart({ id: p.id, title: p.title, thumb: p.images[0].src, variant, price: variant.price });
    dlg.close();
    toggleDrawer(true);
  };

  dlg.showModal();
}

function addToCart(item) {
  const key = `${item.id}:${item.variant.size}`;
  const existing = state.cart.find(ci => ci.key === key);
  if (existing) existing.qty += 1;
  else state.cart.push({ key, ...item, qty: 1 });
  persistCart();
  renderCart();
}

function persistCart() { localStorage.setItem('cart.v1', JSON.stringify(state.cart)); }

function renderCart() {
  els.count.textContent = state.cart.reduce((s, i) => s + i.qty, 0);
  els.cartItems.innerHTML = '';
  if (state.cart.length === 0) {
    els.cartItems.innerHTML = '<div class="muted">Your cart is empty.</div>';
  } else {
    state.cart.forEach((ci, idx) => {
      const row = document.createElement('div');
      row.className = 'cart-item';
      row.innerHTML = `
        <img src="${ci.thumb}" alt="">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>${ci.title}</strong>
            <button class="btn small" data-remove="${idx}">Remove</button>
          </div>
          <div class="small muted">${ci.variant.size}</div>
          <div class="qty">
            <button class="btn small" data-dec="${idx}">−</button>
            <span aria-live="polite">${ci.qty}</span>
            <button class="btn small" data-inc="${idx}">+</button>
          </div>
        </div>
        <div class="price">${currency.format(ci.price * ci.qty)}</div>
      `;
      els.cartItems.appendChild(row);
    });
  }
  const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  els.subtotal.textContent = currency.format(subtotal);
  els.grand.textContent = currency.format(subtotal);
}

function toggleDrawer(open) {
  const dlg = els.cartDrawer;
  if (open) { dlg.showModal(); els.cartButton.setAttribute('aria-expanded', 'true'); }
  else { dlg.close(); els.cartButton.setAttribute('aria-expanded', 'false'); }
}

// Event bindings
els.cartButton.addEventListener('click', () => toggleDrawer(!els.cartDrawer.open));
$$('[data-close]').forEach(b => b.addEventListener('click', e => e.target.closest('dialog').close()));
els.sort.addEventListener('change', e => { state.sortBy = e.target.value; render(); });
els.search.addEventListener('input', e => { state.search = e.target.value; render(); });
els.clear.addEventListener('click', () => {
  Object.values(state.filters).forEach(set => set.clear());
  $$('.chip.active').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
  render();
});
els.cartItems.addEventListener('click', (e) => {
  const inc = e.target.getAttribute('data-inc');
  const dec = e.target.getAttribute('data-dec');
  const rem = e.target.getAttribute('data-remove');
  if (inc !== null) { state.cart[+inc].qty++; }
  if (dec !== null) { state.cart[+dec].qty = Math.max(1, state.cart[+dec].qty - 1); }
  if (rem !== null) { state.cart.splice(+rem, 1); }
  persistCart(); renderCart();
});

// start
loadProducts();