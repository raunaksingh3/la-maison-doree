// ============================================================
//  LA MAISON DORÉE — Admin JS (Complete)
// ============================================================

let charts = {};
let currentOrderId = null;
let customProducts = [];

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('page-date').textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  // Enter on password
  document.getElementById('admin-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') adminLogin();
  });
  checkAdminSession();
});

// ---- AUTH ----
function adminLogin() {
  const user = document.getElementById('admin-username').value.trim();
  const pass = document.getElementById('admin-password').value;
  const err = document.getElementById('admin-login-error');
  err.textContent = '';
  if (user === 'admin' && pass === 'password') {
    localStorage.setItem('lmd_admin_session', 'true');
    document.getElementById('admin-login-screen').classList.add('hidden');
    document.getElementById('admin-app').classList.remove('hidden');
    initAdminApp();
  } else {
    err.textContent = 'Invalid credentials. Use: admin / password';
  }
}

function checkAdminSession() {
  if (localStorage.getItem('lmd_admin_session') === 'true') {
    document.getElementById('admin-login-screen').classList.add('hidden');
    document.getElementById('admin-app').classList.remove('hidden');
    initAdminApp();
  }
}

function adminLogout() {
  localStorage.removeItem('lmd_admin_session');
  window.location.reload();
}

function initAdminApp() {
  customProducts = JSON.parse(localStorage.getItem('lmd_custom_products') || '[]');
  showSection('dashboard');
  updateNewOrdersBadge();
}

// ---- DATA HELPERS ----
function getOrders() { return JSON.parse(localStorage.getItem('lmd_orders') || '[]'); }
function getExpenses() { return JSON.parse(localStorage.getItem('lmd_expenses') || '[]'); }
function getUsers() { return JSON.parse(localStorage.getItem('lmd_users') || '[]'); }
function getAllProducts() { return [...PRODUCTS, ...customProducts]; }

function formatNum(n) {
  if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return Math.round(n).toString();
}

function getOrderStats() {
  const orders = getOrders();
  const expenses = getExpenses();
  const validOrders = orders.filter(o => o.status !== 'Cancelled');
  const totalRevenue = validOrders.reduce((s, o) => s + (o.total || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalOrders = orders.length;
  const deliveredOrders = orders.filter(o => o.status === 'Delivered').length;
  const cancelledOrders = orders.filter(o => o.status === 'Cancelled').length;
  const profit = totalRevenue - totalExpenses;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / Math.max(validOrders.length, 1)) : 0;
  const totalCustomers = getUsers().length;
  return { totalRevenue, totalExpenses, totalOrders, deliveredOrders, cancelledOrders, profit, avgOrderValue, totalCustomers };
}

function getTodayStats() {
  const today = new Date().toDateString();
  const orders = getOrders().filter(o => new Date(o.placedAt).toDateString() === today);
  const revenue = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.total || 0), 0);
  return { orders: orders.length, revenue };
}

function getThisMonthStats() {
  const now = new Date();
  const orders = getOrders().filter(o => {
    const d = new Date(o.placedAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const revenue = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.total || 0), 0);
  return { orders: orders.length, revenue };
}

function updateNewOrdersBadge() {
  const newCount = getOrders().filter(o => o.status === 'Confirmed').length;
  const badge = document.getElementById('new-orders-badge');
  badge.textContent = newCount > 0 ? newCount : '';
}

function getStatusClass(status) {
  const map = {
    'Confirmed': 'status-confirmed',
    'Preparing': 'status-preparing',
    'Out for Delivery': 'status-delivery',
    'Delivered': 'status-delivered',
    'Cancelled': 'status-cancelled'
  };
  return map[status] || '';
}

// ---- SECTIONS ----
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  document.querySelector('[data-section="' + name + '"]').classList.add('active');

  const titles = {
    dashboard: 'Dashboard', orders: 'Orders Management',
    customers: 'Customer Management', products: 'Product Management',
    expenses: 'Expense Tracker', sales: 'Sales Tracking',
    analytics: 'Analytics', reports: 'Reports & Analytics', backup: 'Data Backup'
  };
  document.getElementById('page-title').textContent = titles[name] || name;

  // Destroy old charts to prevent canvas reuse errors
  destroyCharts(name);

  const renders = {
    dashboard: renderDashboard,
    orders: renderOrders,
    customers: renderCustomers,
    products: renderAdminProducts,
    expenses: renderExpenses,
    sales: renderSales,
    analytics: renderAnalytics,
    reports: () => {},
    backup: renderBackup
  };
  if (renders[name]) renders[name]();
}

function destroyCharts(section) {
  const sectionCharts = {
    dashboard: ['revenue', 'category'],
    expenses: ['expense'],
    sales: ['salesExpense', 'profit'],
    analytics: ['analyticsCateg', 'customerSeg', 'peakHours', 'payment', 'aov']
  };
  (sectionCharts[section] || []).forEach(key => {
    if (charts[key]) { charts[key].destroy(); delete charts[key]; }
  });
}

// ============================================================
//  DASHBOARD
// ============================================================
function renderDashboard() {
  const stats = getOrderStats();
  const today = getTodayStats();
  const month = getThisMonthStats();

  document.getElementById('kpi-grid').innerHTML = `
    <div class="kpi-card">
      <span class="kpi-icon">💰</span>
      <div class="kpi-label">Total Revenue</div>
      <div class="kpi-value">₹${formatNum(stats.totalRevenue)}</div>
      <div class="kpi-sub">All time</div>
    </div>
    <div class="kpi-card">
      <span class="kpi-icon">📅</span>
      <div class="kpi-label">Today's Revenue</div>
      <div class="kpi-value">₹${formatNum(today.revenue)}</div>
      <div class="kpi-sub">${today.orders} orders today</div>
    </div>
    <div class="kpi-card">
      <span class="kpi-icon">📆</span>
      <div class="kpi-label">This Month</div>
      <div class="kpi-value">₹${formatNum(month.revenue)}</div>
      <div class="kpi-sub">${month.orders} orders</div>
    </div>
    <div class="kpi-card">
      <span class="kpi-icon">📦</span>
      <div class="kpi-label">Total Orders</div>
      <div class="kpi-value">${stats.totalOrders}</div>
      <div class="kpi-sub">${stats.deliveredOrders} delivered</div>
    </div>
    <div class="kpi-card">
      <span class="kpi-icon">👥</span>
      <div class="kpi-label">Customers</div>
      <div class="kpi-value">${stats.totalCustomers}</div>
      <div class="kpi-sub">Registered users</div>
    </div>
    <div class="kpi-card">
      <span class="kpi-icon">🧾</span>
      <div class="kpi-label">Avg Order Value</div>
      <div class="kpi-value">₹${stats.avgOrderValue}</div>
      <div class="kpi-sub">Per order</div>
    </div>
    <div class="kpi-card">
      <span class="kpi-icon">💸</span>
      <div class="kpi-label">Total Expenses</div>
      <div class="kpi-value">₹${formatNum(stats.totalExpenses)}</div>
      <div class="kpi-sub">All time</div>
    </div>
    <div class="kpi-card">
      <span class="kpi-icon">${stats.profit >= 0 ? '📈' : '📉'}</span>
      <div class="kpi-label">Net Profit</div>
      <div class="kpi-value" style="color:${stats.profit >= 0 ? '#4caf50' : '#ff6b6b'}">
        ${stats.profit < 0 ? '-' : ''}₹${formatNum(Math.abs(stats.profit))}
      </div>
      <div class="kpi-sub ${stats.profit >= 0 ? 'up' : 'down'}">${stats.profit >= 0 ? '▲ Profitable' : '▼ Loss'}</div>
    </div>`;

  setTimeout(() => {
    renderRevenueChart();
    renderCategoryChart();
    renderTopProducts();
    renderRecentOrdersMini();
  }, 50);
}

function renderRevenueChart() {
  const canvas = document.getElementById('revenueChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (charts.revenue) { charts.revenue.destroy(); }

  const labels = [], data = [];
  const orders = getOrders();

  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toDateString();
    labels.push(i % 7 === 0 ? d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '');
    const dayRevenue = orders
      .filter(o => new Date(o.placedAt).toDateString() === dateStr && o.status !== 'Cancelled')
      .reduce((s, o) => s + (o.total || 0), 0);
    data.push(dayRevenue);
  }

  charts.revenue = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data, borderColor: '#C9A84C',
        backgroundColor: 'rgba(201,168,76,0.08)',
        borderWidth: 2, fill: true, tension: 0.4,
        pointRadius: 0, pointHoverRadius: 5,
        pointHoverBackgroundColor: '#C9A84C'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8B7D6B', font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8B7D6B', font: { size: 10 }, callback: v => '₹' + formatNum(v) } }
      }
    }
  });
}

function renderCategoryChart() {
  const canvas = document.getElementById('categoryChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (charts.category) { charts.category.destroy(); }

  const orders = getOrders().filter(o => o.status !== 'Cancelled');
  const catCounts = {};
  orders.forEach(o => (o.items || []).forEach(i => {
    catCounts[i.category] = (catCounts[i.category] || 0) + (i.qty || 1);
  }));

  const sorted = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const colors = ['#C9A84C', '#E8C97A', '#9A7A2E', '#d4a853', '#f0c060', '#b89040', '#a07030', '#8B6914'];

  charts.category = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: sorted.map(([k]) => k),
      datasets: [{ data: sorted.map(([, v]) => v), backgroundColor: colors, borderColor: '#1A1511', borderWidth: 2 }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'right', labels: { color: '#8B7D6B', font: { size: 11 }, padding: 12 } }
      }
    }
  });
}

function renderTopProducts() {
  const orders = getOrders().filter(o => o.status !== 'Cancelled');
  const prodStats = {};
  orders.forEach(o => (o.items || []).forEach(i => {
    if (!prodStats[i.id]) prodStats[i.id] = { name: i.name, emoji: i.emoji || '🍰', qty: 0, revenue: 0 };
    prodStats[i.id].qty += (i.qty || 1);
    prodStats[i.id].revenue += (i.price || 0) * (i.qty || 1);
  }));

  const top = Object.values(prodStats).sort((a, b) => b.qty - a.qty).slice(0, 8);
  const maxQty = top[0]?.qty || 1;

  document.getElementById('top-products-list').innerHTML = top.length ? top.map((p, i) => `
    <div class="top-product-row">
      <div class="top-rank">${i + 1}</div>
      <span style="font-size:1.2rem">${p.emoji}</span>
      <div class="top-info">
        <div class="top-name">${p.name}</div>
        <div class="top-meta">${p.qty} sold · ₹${formatNum(p.revenue)}</div>
      </div>
      <div class="top-bar"><div class="top-bar-fill" style="width:${(p.qty / maxQty * 100).toFixed(0)}%"></div></div>
      <div class="top-value">₹${formatNum(p.revenue)}</div>
    </div>`).join('') : '<p style="color:var(--warm-gray);padding:1rem;font-size:0.82rem">No sales data yet</p>';
}

function renderRecentOrdersMini() {
  const orders = getOrders().sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt)).slice(0, 6);
  document.getElementById('recent-orders-mini').innerHTML = orders.length ? orders.map(o => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;border-bottom:1px solid rgba(255,255,255,0.04)">
      <div>
        <div style="font-size:0.82rem;color:var(--cream)">${o.userName}</div>
        <div style="font-size:0.7rem;color:var(--warm-gray)">${o.id} · ${new Date(o.placedAt).toLocaleDateString('en-IN')}</div>
      </div>
      <div style="text-align:right">
        <div style="color:var(--gold);font-family:var(--font-display)">₹${o.total}</div>
        <span class="status ${getStatusClass(o.status)}">${o.status}</span>
      </div>
    </div>`).join('') : '<p style="color:var(--warm-gray);font-size:0.82rem;padding:1rem">No orders yet</p>';
}

// ============================================================
//  ORDERS
// ============================================================
function renderOrders() {
  const search = (document.getElementById('order-search').value || '').toLowerCase();
  const statusFilter = document.getElementById('order-status-filter').value;

  let orders = getOrders().sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
  if (statusFilter !== 'all') orders = orders.filter(o => o.status === statusFilter);
  if (search) orders = orders.filter(o =>
    (o.id || '').toLowerCase().includes(search) ||
    (o.userName || '').toLowerCase().includes(search) ||
    (o.userEmail || '').toLowerCase().includes(search)
  );

  document.getElementById('orders-tbody').innerHTML = orders.length ? orders.map(o => `
    <tr>
      <td><span style="color:var(--gold);font-size:0.78rem">${o.id}</span></td>
      <td>${o.userName}<br><span class="muted" style="font-size:0.72rem">${o.userEmail}</span></td>
      <td>${(o.items || []).length} items</td>
      <td style="color:var(--gold)">₹${o.total}</td>
      <td class="muted">${{ upi: 'UPI', card: 'Card', cod: 'COD' }[o.paymentMethod] || o.paymentMethod || '—'}</td>
      <td class="muted">${new Date(o.placedAt).toLocaleDateString('en-IN')}</td>
      <td><span class="status ${getStatusClass(o.status)}">${o.status}</span></td>
      <td>
        <button class="action-btn" onclick="viewOrderDetail('${o.id}')">View</button>
        <button class="action-btn danger" onclick="deleteOrder('${o.id}')">Delete</button>
      </td>
    </tr>`).join('') : '<tr><td colspan="8" style="text-align:center;color:var(--warm-gray);padding:2rem">No orders found</td></tr>';
}

function viewOrderDetail(orderId) {
  currentOrderId = orderId;
  const order = getOrders().find(o => o.id === orderId);
  if (!order) return;

  document.getElementById('order-detail-content').innerHTML = `
    <div class="order-meta-grid">
      <div class="order-meta-item"><label>Order ID</label><p>${order.id}</p></div>
      <div class="order-meta-item"><label>Date & Time</label><p>${new Date(order.placedAt).toLocaleString('en-IN')}</p></div>
      <div class="order-meta-item"><label>Customer</label><p>${order.userName}</p></div>
      <div class="order-meta-item"><label>Phone</label><p>${order.userPhone || '—'}</p></div>
      <div class="order-meta-item"><label>Email</label><p>${order.userEmail}</p></div>
      <div class="order-meta-item"><label>Payment</label><p>${{ upi: 'UPI', card: 'Card/Debit', cod: 'Cash on Delivery' }[order.paymentMethod] || order.paymentMethod}</p></div>
      <div class="order-meta-item" style="grid-column:span 2"><label>Delivery Address</label>
        <p>${order.address?.line1 || ''}${order.address?.line2 ? ', ' + order.address.line2 : ''}, ${order.address?.city || ''} - ${order.address?.pin || ''}</p>
      </div>
    </div>
    <h4 style="font-size:0.65rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--gold);margin:1rem 0 0.75rem">Order Items</h4>
    <div class="order-detail-items">
      ${(order.items || []).map(i => `
        <div class="od-item">
          <span>${i.emoji || ''} ${i.name} × ${i.qty}</span>
          <span style="color:var(--gold)">₹${(i.price || 0) * (i.qty || 1)}</span>
        </div>`).join('')}
      <div class="od-item"><span style="color:var(--warm-gray)">Subtotal</span><span>₹${order.subtotal || 0}</span></div>
      <div class="od-item"><span style="color:var(--warm-gray)">GST (5%)</span><span>₹${order.tax || 0}</span></div>
      <div class="od-item"><span style="color:var(--warm-gray)">Delivery</span><span>₹${order.delivery || 40}</span></div>
      <div class="od-item" style="font-family:var(--font-display);font-size:1.05rem">
        <span>Total</span><span style="color:var(--gold)">₹${order.total}</span>
      </div>
    </div>`;

  document.getElementById('order-status-select').value = order.status;
  document.getElementById('order-detail-overlay').classList.add('open');
}

function closeOrderDetail() {
  document.getElementById('order-detail-overlay').classList.remove('open');
}

function updateOrderStatus() {
  const orders = getOrders();
  const order = orders.find(o => o.id === currentOrderId);
  if (!order) return;
  order.status = document.getElementById('order-status-select').value;
  localStorage.setItem('lmd_orders', JSON.stringify(orders));
  closeOrderDetail();
  renderOrders();
  updateNewOrdersBadge();
  showAdminToast('Order status updated to ' + order.status, 'success');
}

function deleteOrder(id) {
  if (!confirm('Delete this order? This cannot be undone.')) return;
  const orders = getOrders().filter(o => o.id !== id);
  localStorage.setItem('lmd_orders', JSON.stringify(orders));
  renderOrders();
  updateNewOrdersBadge();
  showAdminToast('Order deleted', 'success');
}

// ============================================================
//  CUSTOMERS
// ============================================================
function renderCustomers() {
  const search = (document.getElementById('cust-search').value || '').toLowerCase();
  const users = getUsers().filter(u =>
    !search ||
    (u.fname || '').toLowerCase().includes(search) ||
    (u.lname || '').toLowerCase().includes(search) ||
    (u.email || '').toLowerCase().includes(search) ||
    (u.phone || '').includes(search)
  );
  const orders = getOrders();

  document.getElementById('customers-tbody').innerHTML = users.length ? users.map(u => {
    const userOrders = orders.filter(o => String(o.userId) === String(u.id));
    const spent = userOrders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.total || 0), 0);
    return `<tr>
      <td>${u.fname || ''} ${u.lname || ''}</td>
      <td class="muted">${u.email}</td>
      <td class="muted">+91 ${u.phone || '—'}</td>
      <td class="muted">${u.address?.city || '—'}</td>
      <td style="color:var(--gold);text-align:center">${userOrders.length}</td>
      <td style="color:var(--gold)">₹${formatNum(spent)}</td>
      <td class="muted">${u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--warm-gray);padding:2rem">No customers found</td></tr>';
}

// ============================================================
//  PRODUCTS
// ============================================================
function renderAdminProducts() {
  const search = (document.getElementById('prod-search').value || '').toLowerCase();
  const allProds = getAllProducts().filter(p =>
    !search || p.name.toLowerCase().includes(search) || p.category.toLowerCase().includes(search)
  );
  const orders = getOrders().filter(o => o.status !== 'Cancelled');
  const prodStats = {};
  orders.forEach(o => (o.items || []).forEach(i => {
    if (!prodStats[i.id]) prodStats[i.id] = { qty: 0, revenue: 0 };
    prodStats[i.id].qty += (i.qty || 1);
    prodStats[i.id].revenue += (i.price || 0) * (i.qty || 1);
  }));

  document.getElementById('products-tbody').innerHTML = allProds.map(p => {
    const stat = prodStats[p.id] || { qty: 0, revenue: 0 };
    const isCustom = !!customProducts.find(cp => cp.id === p.id);
    return `<tr>
      <td style="font-size:1.4rem">${p.emoji}</td>
      <td>${p.name}${isCustom ? ' <span style="color:var(--gold);font-size:0.6rem;border:1px solid rgba(201,168,76,0.4);padding:0 4px">CUSTOM</span>' : ''}</td>
      <td class="muted">${p.category}</td>
      <td style="color:var(--gold)">₹${p.price}</td>
      <td>${stat.qty}</td>
      <td style="color:var(--gold)">₹${formatNum(stat.revenue)}</td>
      <td>
        ${isCustom ? `
          <button class="action-btn" onclick="editProduct(${p.id})">Edit</button>
          <button class="action-btn danger" onclick="deleteProduct(${p.id})">Delete</button>
        ` : '<span class="muted" style="font-size:0.7rem">Default</span>'}
      </td>
    </tr>`;
  }).join('');
}

function openAddProduct() {
  document.getElementById('product-modal-title').textContent = 'Add New Product';
  document.getElementById('edit-product-id').value = '';
  ['np-name', 'np-price', 'np-emoji', 'np-desc'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('np-cat').value = 'croissants';
  document.getElementById('add-product-overlay').classList.add('open');
}

function closeAddProduct() {
  document.getElementById('add-product-overlay').classList.remove('open');
}

function editProduct(id) {
  const prod = getAllProducts().find(p => p.id === id);
  if (!prod) return;
  document.getElementById('product-modal-title').textContent = 'Edit Product';
  document.getElementById('edit-product-id').value = id;
  document.getElementById('np-name').value = prod.name;
  document.getElementById('np-cat').value = prod.category;
  document.getElementById('np-price').value = prod.price;
  document.getElementById('np-emoji').value = prod.emoji;
  document.getElementById('np-desc').value = prod.desc || '';
  document.getElementById('add-product-overlay').classList.add('open');
}

function saveProduct() {
  const name = document.getElementById('np-name').value.trim();
  const cat = document.getElementById('np-cat').value;
  const price = parseFloat(document.getElementById('np-price').value);
  const emoji = document.getElementById('np-emoji').value.trim() || '🍰';
  const desc = document.getElementById('np-desc').value.trim();
  if (!name || !price) { showAdminToast('Please fill in name and price', 'error'); return; }
  const editId = parseInt(document.getElementById('edit-product-id').value);
  if (editId) {
    const idx = customProducts.findIndex(p => p.id === editId);
    if (idx >= 0) customProducts[idx] = { id: editId, name, category: cat, price, emoji, desc };
    else customProducts.push({ id: editId, name, category: cat, price, emoji, desc });
  } else {
    customProducts.push({ id: Date.now(), name, category: cat, price, emoji, desc });
  }
  localStorage.setItem('lmd_custom_products', JSON.stringify(customProducts));
  closeAddProduct();
  renderAdminProducts();
  showAdminToast('Product saved successfully!', 'success');
}

function deleteProduct(id) {
  if (!confirm('Delete this custom product?')) return;
  customProducts = customProducts.filter(p => p.id !== id);
  localStorage.setItem('lmd_custom_products', JSON.stringify(customProducts));
  renderAdminProducts();
  showAdminToast('Product deleted', 'success');
}

// ============================================================
//  EXPENSES
// ============================================================
function renderExpenses() {
  const expenses = getExpenses().sort((a, b) => new Date(b.date) - new Date(a.date));
  const now = new Date();
  const monthlyTotal = expenses
    .filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
    .reduce((s, e) => s + (e.amount || 0), 0);
  document.getElementById('expense-monthly-total').textContent = '₹' + formatNum(monthlyTotal);

  document.getElementById('expenses-tbody').innerHTML = expenses.slice(0, 60).map(e => `
    <tr>
      <td class="muted">${new Date(e.date).toLocaleDateString('en-IN')}</td>
      <td><span style="color:var(--gold)">${e.category}</span></td>
      <td>${e.description}</td>
      <td style="color:var(--cream);font-weight:500">₹${(e.amount || 0).toLocaleString('en-IN')}</td>
      <td>
        <button class="action-btn" onclick="editExpense('${e.id}')">Edit</button>
        <button class="action-btn danger" onclick="deleteExpense('${e.id}')">Delete</button>
      </td>
    </tr>`).join('');

  setTimeout(() => renderExpenseChart(expenses), 50);
}

function renderExpenseChart(expenses) {
  const canvas = document.getElementById('expenseChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (charts.expense) { charts.expense.destroy(); }

  const catTotals = {};
  expenses.forEach(e => catTotals[e.category] = (catTotals[e.category] || 0) + (e.amount || 0));
  const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const colors = ['#C9A84C', '#E8C97A', '#9A7A2E', '#d4a853', '#f0c060', '#b89040', '#a07030', '#8B6914'];

  charts.expense = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(([k]) => k),
      datasets: [{ data: sorted.map(([, v]) => v), backgroundColor: colors, borderRadius: 2 }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8B7D6B' } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8B7D6B', callback: v => '₹' + formatNum(v) } }
      }
    }
  });
}

function openAddExpense() {
  document.getElementById('edit-expense-id').value = '';
  document.getElementById('exp-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('exp-cat').value = 'Ingredients';
  document.getElementById('exp-desc').value = '';
  document.getElementById('exp-amount').value = '';
  document.getElementById('add-expense-overlay').classList.add('open');
}

function closeAddExpense() {
  document.getElementById('add-expense-overlay').classList.remove('open');
}

function editExpense(id) {
  const expense = getExpenses().find(e => e.id === id);
  if (!expense) return;
  document.getElementById('edit-expense-id').value = id;
  document.getElementById('exp-date').value = expense.date;
  document.getElementById('exp-cat').value = expense.category;
  document.getElementById('exp-desc').value = expense.description;
  document.getElementById('exp-amount').value = expense.amount;
  document.getElementById('add-expense-overlay').classList.add('open');
}

function saveExpense() {
  const date = document.getElementById('exp-date').value;
  const category = document.getElementById('exp-cat').value;
  const description = document.getElementById('exp-desc').value.trim();
  const amount = parseFloat(document.getElementById('exp-amount').value);
  if (!date || !amount) { showAdminToast('Please fill date and amount', 'error'); return; }

  const expenses = getExpenses();
  const editId = document.getElementById('edit-expense-id').value;

  if (editId) {
    const idx = expenses.findIndex(e => e.id === editId);
    if (idx >= 0) expenses[idx] = { ...expenses[idx], date, category, description, amount };
  } else {
    expenses.push({ id: 'EXP' + Date.now(), date, category, description, amount });
  }
  localStorage.setItem('lmd_expenses', JSON.stringify(expenses));
  closeAddExpense();
  renderExpenses();
  showAdminToast('Expense saved!', 'success');
}

function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  const expenses = getExpenses().filter(e => e.id !== id);
  localStorage.setItem('lmd_expenses', JSON.stringify(expenses));
  renderExpenses();
  showAdminToast('Expense deleted', 'success');
}
