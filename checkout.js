// checkout.js - demo checkout logic (no payment)
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const cart = JSON.parse(localStorage.getItem('cart.v1') || '[]');
const summary = document.getElementById('summaryItems');
const sumSubtotal = document.getElementById('sumSubtotal');
const sumDiscount = document.getElementById('sumDiscount');
const sumShipping = document.getElementById('sumShipping');
const sumTotal = document.getElementById('sumTotal');
const dialog = document.getElementById('orderSuccess');

function renderSummary(){
  if (!summary) return;
  summary.innerHTML = '';
  if(!cart.length){ summary.innerHTML = '<div class="muted">Your cart is empty.</div>'; }
  cart.forEach(ci => {
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <img src="${ci.thumb}" alt="">
      <div>
        <strong>${ci.title}</strong>
        <div class="small muted">${ci.variant.size}</div>
        <div class="small">${ci.qty} × ${currency.format(ci.price)}</div>
      </div>
      <div class="price">${currency.format(ci.price * ci.qty)}</div>
    `;
    summary.appendChild(row);
  });
  const subtotal = cart.reduce((s,i)=>s+i.price*i.qty,0);
  if (sumSubtotal) sumSubtotal.textContent = currency.format(subtotal);
  const shipping = cart.length ? 99 : 0;
  if (sumShipping) sumShipping.textContent = currency.format(shipping);
  const discount = 0;
  if (sumDiscount) sumDiscount.textContent = currency.format(discount);
  if (sumTotal) sumTotal.textContent = currency.format(subtotal + shipping - discount);
}
renderSummary();

const form = document.getElementById('checkoutForm');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // collect shipping form data
    const formData = new FormData(e.target);
    const shipping = Object.fromEntries(formData.entries());

    // collect cart items
    const items = cart.map(ci => ({
      title: ci.title,
      size: ci.variant.size,
      qty: ci.qty
    }));

    try {
      const response = await fetch('http://localhost:3000/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipping, items })
      });

      const result = await response.json();
      if (response.ok) {
        document.getElementById('orderId').textContent = result.orderId;
        if (dialog) dialog.showModal();
        localStorage.removeItem('cart.v1');
      } else {
        alert(result.error || 'Something went wrong');
      }
    } catch (err) {
      alert('Failed to connect to server');
    }
  });
}
