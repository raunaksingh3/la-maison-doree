// ============================================================
//  LA MAISON DORÉE — Customer JS
// ============================================================

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  initPreloader();
  initCursor();
  initNav();
  initParticles();
  renderProducts('all');
  initCategoryFilter();
  updateCartUI();
  checkLoggedIn();
  initPaymentMethods();
});

// ---- PRELOADER ----
function initPreloader() {
  setTimeout(() => {
    document.getElementById('preloader').classList.add('done');
    document.body.style.overflow = 'auto';
  }, 3000);
  document.body.style.overflow = 'hidden';
}

// ---- CURSOR ----
function initCursor() {
  const cursor = document.getElementById('cursor');
  const follower = document.getElementById('cursor-follower');
  document.addEventListener('mousemove', e => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
    setTimeout(() => {
      follower.style.left = e.clientX + 'px';
      follower.style.top = e.clientY + 'px';
    }, 80);
  });
  document.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.style.transform = 'translate(-50%,-50%) scale(2.5)');
    el.addEventListener('mouseleave', () => cursor.style.transform = 'translate(-50%,-50%) scale(1)');
  });
}

// ---- NAV ----
function initNav() {
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  });
}

// ---- PARTICLES ----
function initParticles() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 1;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random()*100}%; top:${Math.random()*100}%;
      --dur:${Math.random()*10+5}s; --delay:${Math.random()*8}s;
    `;
    container.appendChild(p);
  }
}

// ---- PRODUCTS ----
let currentFilter = 'all';
let searchQuery = '';
let displayCount = 20;

function getFilteredProducts() {
  let filtered = currentFilter === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === currentFilter);
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }
  return filtered;
}

function renderProducts(cat) {
  const grid = document.getElementById('products-grid');
  const filtered = getFilteredProducts();
  const toShow = filtered.slice(0, displayCount);

  grid.innerHTML = toShow.map((p, i) => {
    const cartItem = getCart().find(c => c.id == p.id);
    const qty = cartItem ? cartItem.qty : 0;
    let cartControls;
    if (qty > 0) {
      cartControls = '<div class="qty-controls">'
        + '<button class="qty-btn" onclick="changeQty(' + p.id + ',-1)">&#8722;</button>'
        + '<span class="qty-num">' + qty + '</span>'
        + '<button class="qty-btn" onclick="changeQty(' + p.id + ',1)">&#43;</button>'
        + '</div>';
    } else {
      cartControls = '<button class="add-to-cart-btn" onclick="addToCart(' + p.id + ')">Add to Cart</button>';
    }
    return '<div class="product-card" style="animation-delay:' + (i % 10) * 0.06 + 's">'
      + '<span class="product-emoji">' + p.emoji + '</span>'
      + '<div class="product-info">'
      + '<div class="product-category">' + p.category + '</div>'
      + '<div class="product-name">' + p.name + '</div>'
      + '<div class="product-desc">' + p.desc + '</div>'
      + '<div class="product-footer">'
      + '<div>'
      + '<div class="product-price">&#8377;' + p.price + '</div>'
      + '<div class="product-price-sub">per piece</div>'
      + '</div>'
      + cartControls
      + '</div>'
      + '</div>'
      + '</div>';
  }).join('');

  const loadBtn = document.getElementById('load-more-btn');
  loadBtn.style.display = filtered.length > displayCount ? 'inline-flex' : 'none';
}

function loadMore() {
  displayCount += 20;
  renderProducts(currentFilter);
}

function filterProducts() {
  searchQuery = document.getElementById('product-search').value;
  displayCount = 20;
  renderProducts(currentFilter);
}

function initCategoryFilter() {
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.cat;
      displayCount = 20;
      renderProducts(currentFilter);
    });
  });
}

// ---- CART ----
function getCart() { return JSON.parse(localStorage.getItem('lmd_cart') || '[]'); }
function saveCart(cart) { localStorage.setItem('lmd_cart', JSON.stringify(cart)); }

function addToCart(id) {
  id = parseInt(id, 10);
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return;
  const cart = getCart();
  const existing = cart.find(c => c.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id, name: product.name, price: product.price, emoji: product.emoji, qty: 1 });
  }
  saveCart(cart);
  updateCartUI();
  renderProducts(currentFilter);
  showToast(product.name + ' added to cart \u2713', 'success');
}

function changeQty(id, delta) {
  id = parseInt(id, 10);
  delta = parseInt(delta, 10);
  const cart = getCart();
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    const idx = cart.indexOf(item);
    cart.splice(idx, 1);
  }
  saveCart(cart);
  updateCartUI();
  renderProducts(currentFilter);
}

function removeFromCart(id) {
  id = parseInt(id, 10);
  const cart = getCart().filter(c => c.id != id);
  saveCart(cart);
  updateCartUI();
  renderCartSidebar();
  renderProducts(currentFilter);
}

function getCartTotals() {
  const cart = getCart();
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

function updateCartUI() {
  const cart = getCart();
  const count = cart.reduce((s, i) => s + i.qty, 0);
  document.getElementById('cart-count').textContent = count;
  const { subtotal, tax, total } = getCartTotals();
  document.getElementById('cart-subtotal').textContent = `₹${subtotal}`;
  document.getElementById('cart-tax').textContent = `₹${tax}`;
  document.getElementById('cart-total').textContent = `₹${total}`;
  renderCartSidebar();
}

function renderCartSidebar() {
  const cart = getCart();
  const container = document.getElementById('cart-items');
  if (cart.length === 0) {
    container.innerHTML = `<div class="empty-cart"><span class="empty-cart-icon">🛒</span><p>Your cart is empty</p></div>`;
    return;
  }
  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <span class="cart-item-emoji">${item.emoji}</span>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">₹${item.price} × ${item.qty} = ₹${item.price * item.qty}</div>
      </div>
      <div class="cart-item-controls">
        <div class="qty-controls">
          <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
        </div>
        <button class="cart-remove-btn" onclick="removeFromCart(${item.id})">✕</button>
      </div>
    </div>`).join('');
}

function openCart() { document.getElementById('cart-sidebar').classList.add('open'); document.getElementById('cart-overlay').classList.add('open'); }
function closeCart() { document.getElementById('cart-sidebar').classList.remove('open'); document.getElementById('cart-overlay').classList.remove('open'); }

// ---- AUTH ----
function getUsers() { return JSON.parse(localStorage.getItem('lmd_users') || '[]'); }
function saveUsers(u) { localStorage.setItem('lmd_users', JSON.stringify(u)); }
function getLoggedInUser() { return JSON.parse(localStorage.getItem('lmd_logged_in') || 'null'); }
function setLoggedInUser(u) { localStorage.setItem('lmd_logged_in', JSON.stringify(u)); }

function checkLoggedIn() {
  const user = getLoggedInUser();
  const el = document.getElementById('nav-user-name');
  if (user) {
    el.textContent = user.fname;
    el.parentElement.onclick = showUserMenu;
  } else {
    el.textContent = 'Login';
    el.parentElement.onclick = openAuthModal;
  }
}

function showUserMenu() {
  const user = getLoggedInUser();
  if (!user) { openAuthModal(); return; }
  const actions = confirm(`Logged in as ${user.fname} ${user.lname}\n\nClick OK to logout, Cancel to stay logged in.`);
  if (actions) { localStorage.removeItem('lmd_logged_in'); checkLoggedIn(); showToast('Logged out successfully', 'success'); }
}

function openAuthModal() { document.getElementById('auth-modal-overlay').classList.add('open'); }
function closeAuthModal() { document.getElementById('auth-modal-overlay').classList.remove('open'); }

function switchTab(tab) {
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('signup-form').classList.toggle('hidden', tab !== 'signup');
  document.getElementById('login-tab').classList.toggle('active', tab === 'login');
  document.getElementById('signup-tab').classList.toggle('active', tab === 'signup');
}

function loginUser() {
  const email = document.getElementById('login-email').value.trim();
  const pw = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  if (!email || !pw) { errEl.textContent = 'Please fill in all fields.'; return; }
  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === hashPw(pw));
  if (!user) { errEl.textContent = 'Invalid email or password. Please try again.'; return; }
  setLoggedInUser(user);
  closeAuthModal();
  checkLoggedIn();
  showToast(`Welcome back, ${user.fname}! 🎉`, 'success');
}

function registerUser() {
  const fname = document.getElementById('su-fname').value.trim();
  const lname = document.getElementById('su-lname').value.trim();
  const email = document.getElementById('su-email').value.trim();
  const phone = document.getElementById('su-phone').value.trim();
  const password = document.getElementById('su-password').value;
  const confirm = document.getElementById('su-confirm-password').value;
  const addr1 = document.getElementById('su-addr1').value.trim();
  const pin = document.getElementById('su-pin').value.trim();
  const city = document.getElementById('su-city').value.trim();
  const state = document.getElementById('su-state').value.trim();
  const errEl = document.getElementById('signup-error');
  errEl.textContent = '';

  if (!fname || !lname || !email || !phone || !password || !addr1 || !pin) { errEl.textContent = 'Please fill all required fields (marked with *).'; return; }
  if (!/^\S+@\S+\.\S+$/.test(email)) { errEl.textContent = 'Please enter a valid email address.'; return; }
  if (!/^\d{10}$/.test(phone)) { errEl.textContent = 'Phone must be 10 digits.'; return; }
  if (password.length < 8) { errEl.textContent = 'Password must be at least 8 characters.'; return; }
  if (password !== confirm) { errEl.textContent = 'Passwords do not match.'; return; }
  if (!/^\d{6}$/.test(pin)) { errEl.textContent = 'PIN code must be 6 digits.'; return; }

  const users = getUsers();
  if (users.find(u => u.email === email)) { errEl.textContent = 'An account with this email already exists.'; return; }

  const newUser = {
    id: Date.now(), fname, lname, email, phone,
    password: hashPw(password),
    address: { line1: addr1, line2: document.getElementById('su-addr2').value.trim(), pin, city, state, country: 'India' },
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  saveUsers(users);
  setLoggedInUser(newUser);
  closeAuthModal();
  checkLoggedIn();
  showToast(`Welcome to La Maison Dorée, ${fname}! 🥐`, 'success');
}

function hashPw(pw) {
  // Simple hash for local storage (not secure for production)
  let hash = 0;
  for (let i = 0; i < pw.length; i++) { hash = ((hash << 5) - hash) + pw.charCodeAt(i); hash |= 0; }
  return hash.toString();
}

function togglePw(id) {
  const input = document.getElementById(id);
  input.type = input.type === 'password' ? 'text' : 'password';
}

function checkPasswordStrength(pw) {
  const fill = document.getElementById('pw-strength-fill');
  const text = document.getElementById('pw-strength-text');
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { pct: '0%', color: 'transparent', label: '' },
    { pct: '25%', color: '#ff4444', label: 'Weak' },
    { pct: '50%', color: '#ff9800', label: 'Fair' },
    { pct: '75%', color: '#2196F3', label: 'Good' },
    { pct: '100%', color: '#4caf50', label: 'Strong' }
  ];
  const l = levels[score];
  fill.style.width = l.pct;
  fill.style.background = l.color;
  text.textContent = l.label;
}

function fetchPincode(pin) {
  if (pin.length === 6 && PINCODES[pin]) {
    const data = PINCODES[pin];
    document.getElementById('su-city').value = data.city;
    document.getElementById('su-state').value = data.state;
  } else if (pin.length === 6) {
    document.getElementById('su-city').value = '';
    document.getElementById('su-state').value = '';
  }
}

// ---- CHECKOUT ----
function proceedToCheckout() {
  const user = getLoggedInUser();
  if (!user) {
    closeCart();
    openAuthModal();
    showToast('Please login to place an order', 'error');
    return;
  }
  const cart = getCart();
  if (cart.length === 0) { showToast('Your cart is empty', 'error'); return; }

  const { subtotal, tax, total } = getCartTotals();
  const delivery = 40;
  const grandTotal = total + delivery;

  document.getElementById('checkout-items-list').innerHTML = `
    <div class="checkout-items-list">
    ${cart.map(i => `
      <div class="co-item">
        <span class="co-item-name">${i.emoji} ${i.name} × ${i.qty}</span>
        <span class="co-item-price">₹${i.price * i.qty}</span>
      </div>`).join('')}
    </div>`;

  const addr = user.address;
  document.getElementById('checkout-address-display').innerHTML = `
    <div class="checkout-address-text">
      ${user.fname} ${user.lname} · ${user.phone}<br>
      ${addr.line1}${addr.line2 ? ', ' + addr.line2 : ''}<br>
      ${addr.city}, ${addr.state} - ${addr.pin}
    </div>`;

  document.getElementById('co-subtotal').textContent = `₹${subtotal}`;
  document.getElementById('co-tax').textContent = `₹${tax}`;
  document.getElementById('co-total').textContent = `₹${grandTotal}`;

  closeCart();
  document.getElementById('checkout-modal-overlay').classList.add('open');
  window._orderTotal = grandTotal;
}

function closeCheckout() { document.getElementById('checkout-modal-overlay').classList.remove('open'); }

function goToPayment() {
  closeCheckout();
  const amount = window._orderTotal || 0;
  document.getElementById('pay-amount-display').textContent = `₹${amount}`;
  document.getElementById('confirm-amount').textContent = `₹${amount}`;
  document.getElementById('payment-modal-overlay').classList.add('open');
}

function closePayment() { document.getElementById('payment-modal-overlay').classList.remove('open'); }

function initPaymentMethods() {
  document.querySelectorAll('.pay-method-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pay-method-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.pay-section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      const method = btn.dataset.method;
      document.getElementById(`pay-${method}`).classList.add('active');
    });
  });
}

function formatCard(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 16);
  input.value = val.replace(/(.{4})/g, '$1 ').trim();
}

function confirmPayment() {
  const checkbox = document.getElementById('payment-confirm-checkbox');
  if (!checkbox.checked) { showToast('Please confirm the payment to proceed', 'error'); return; }

  // Validate active method
  const activeMethod = document.querySelector('.pay-method-btn.active').dataset.method;
  if (activeMethod === 'upi') {
    const upiId = document.getElementById('upi-id').value.trim();
    if (!upiId) { showToast('Please enter your UPI ID', 'error'); return; }
  } else if (activeMethod === 'card') {
    const cardNum = document.getElementById('card-num').value.trim();
    const cardExp = document.getElementById('card-exp').value.trim();
    const cardCvv = document.getElementById('card-cvv').value.trim();
    if (!cardNum || !cardExp || !cardCvv) { showToast('Please fill in all card details', 'error'); return; }
  }

  // Place order
  placeOrder(activeMethod);
}

function placeOrder(paymentMethod) {
  const user = getLoggedInUser();
  const cart = getCart();
  const { subtotal, tax, total } = getCartTotals();
  const delivery = 40;
  const grandTotal = total + delivery;
  
  const order = {
    id: 'ORD' + Date.now(),
    userId: user.id,
    userName: user.fname + ' ' + user.lname,
    userEmail: user.email,
    userPhone: user.phone,
    address: user.address,
    items: cart,
    subtotal, tax, delivery,
    total: grandTotal,
    paymentMethod,
    status: 'Confirmed',
    placedAt: new Date().toISOString(),
    estimatedDelivery: getDeliveryTime(),
  };

  // Save to localStorage
  const orders = JSON.parse(localStorage.getItem('lmd_orders') || '[]');
  orders.push(order);
  localStorage.setItem('lmd_orders', JSON.stringify(orders));

  // Clear cart
  saveCart([]);

  // Close payment modal
  closePayment();

  // Redirect to invoice page
  localStorage.setItem('lmd_last_order', JSON.stringify(order));
  setTimeout(() => { window.location.href = 'invoice.html'; }, 500);
  showToast('🎉 Order placed successfully!', 'success');
}

function getDeliveryTime() {
  const now = new Date();
  const minTime = new Date(now.getTime() + 60 * 60 * 1000); // +1hr
  const maxTime = new Date(now.getTime() + 4 * 60 * 60 * 1000); // +4hr
  return `${formatTime(minTime)} – ${formatTime(maxTime)}`;
}

function formatTime(d) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ---- TOAST ----
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}
