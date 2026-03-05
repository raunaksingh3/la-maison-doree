// ============================================================
//  ADMIN JS PART 2 — Sales, Analytics, Reports, Backup
// ============================================================

// ============================================================
//  SALES
// ============================================================
function renderSales() {
  const stats = getOrderStats();
  const month = getThisMonthStats();
  const orders = getOrders();
  const expenses = getExpenses();

  // Monthly revenue & expense for current year
  const now = new Date();
  const monthlyRevenue = [], monthlyExpenses = [], monthlyProfit = [];
  const monthLabels = [];

  for (let m = 0; m < 12; m++) {
    const label = new Date(now.getFullYear(), m, 1).toLocaleString('en-IN', { month: 'short' });
    monthLabels.push(label);

    const rev = orders
      .filter(o => { const d = new Date(o.placedAt); return d.getMonth() === m && d.getFullYear() === now.getFullYear() && o.status !== 'Cancelled'; })
      .reduce((s, o) => s + (o.total || 0), 0);

    const exp = expenses
      .filter(e => { const d = new Date(e.date); return d.getMonth() === m && d.getFullYear() === now.getFullYear(); })
      .reduce((s, e) => s + (e.amount || 0), 0);

    monthlyRevenue.push(rev);
    monthlyExpenses.push(exp);
    monthlyProfit.push(rev - exp);
  }

  // KPIs
  const cancelRate = stats.totalOrders > 0 ? ((stats.cancelledOrders / stats.totalOrders) * 100).toFixed(1) : 0;
  const profitMargin = stats.totalRevenue > 0 ? ((stats.profit / stats.totalRevenue) * 100).toFixed(1) : 0;

  document.getElementById('sales-kpi-grid').innerHTML = `
    <div class="kpi-card"><span class="kpi-icon">🎯</span>
      <div class="kpi-label">Total Revenue</div>
      <div class="kpi-value">₹${formatNum(stats.totalRevenue)}</div>
      <div class="kpi-sub">All time</div></div>
    <div class="kpi-card"><span class="kpi-icon">💰</span>
      <div class="kpi-label">Net Profit</div>
      <div class="kpi-value" style="color:${stats.profit>=0?'#4caf50':'#ff6b6b'}">${stats.profit<0?'-':''}₹${formatNum(Math.abs(stats.profit))}</div>
      <div class="kpi-sub ${stats.profit>=0?'up':'down'}">${profitMargin}% margin</div></div>
    <div class="kpi-card"><span class="kpi-icon">📦</span>
      <div class="kpi-label">Total Orders</div>
      <div class="kpi-value">${stats.totalOrders}</div>
      <div class="kpi-sub">${stats.deliveredOrders} delivered</div></div>
    <div class="kpi-card"><span class="kpi-icon">❌</span>
      <div class="kpi-label">Cancellations</div>
      <div class="kpi-value">${stats.cancelledOrders}</div>
      <div class="kpi-sub">${cancelRate}% cancel rate</div></div>
    <div class="kpi-card"><span class="kpi-icon">📈</span>
      <div class="kpi-label">This Month Rev</div>
      <div class="kpi-value">₹${formatNum(month.revenue)}</div>
      <div class="kpi-sub">${month.orders} orders</div></div>
    <div class="kpi-card"><span class="kpi-icon">🧾</span>
      <div class="kpi-label">Avg Order Value</div>
      <div class="kpi-value">₹${stats.avgOrderValue}</div>
      <div class="kpi-sub">Per completed order</div></div>`;

  setTimeout(() => {
    renderSalesExpenseChart(monthLabels, monthlyRevenue, monthlyExpenses);
    renderProfitChart(monthLabels, monthlyProfit);
  }, 50);
}

function renderSalesExpenseChart(labels, revenue, expenses) {
  const canvas = document.getElementById('salesExpenseChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (charts.salesExpense) { charts.salesExpense.destroy(); }

  charts.salesExpense = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Revenue', data: revenue, backgroundColor: 'rgba(201,168,76,0.8)', borderRadius: 3 },
        { label: 'Expenses', data: expenses, backgroundColor: 'rgba(255,107,107,0.6)', borderRadius: 3 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#8B7D6B' } } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8B7D6B' } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8B7D6B', callback: v => '₹' + formatNum(v) } }
      }
    }
  });
}

function renderProfitChart(labels, profit) {
  const canvas = document.getElementById('profitChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (charts.profit) { charts.profit.destroy(); }

  const colors = profit.map(v => v >= 0 ? 'rgba(76,175,80,0.8)' : 'rgba(255,107,107,0.8)');

  charts.profit = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Profit/Loss', data: profit, backgroundColor: colors, borderRadius: 3 }]
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

// ============================================================
//  ANALYTICS
// ============================================================
function renderAnalytics() {
  const orders = getOrders();
  const validOrders = orders.filter(o => o.status !== 'Cancelled');
  const now = new Date();

  // Build product stats
  const prodStats = {};
  validOrders.forEach(o => (o.items || []).forEach(i => {
    if (!prodStats[i.id]) prodStats[i.id] = { name: i.name, emoji: i.emoji || '🍰', qty: 0, revenue: 0, profit: 0 };
    prodStats[i.id].qty += (i.qty || 1);
    prodStats[i.id].revenue += (i.price || 0) * (i.qty || 1);
    prodStats[i.id].profit += (i.price || 0) * (i.qty || 1) * 0.35; // ~35% margin est.
  }));

  // This month's top sellers
  const thisMonthOrders = validOrders.filter(o => {
    const d = new Date(o.placedAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthProdStats = {};
  thisMonthOrders.forEach(o => (o.items || []).forEach(i => {
    if (!monthProdStats[i.id]) monthProdStats[i.id] = { name: i.name, emoji: i.emoji || '🍰', qty: 0, revenue: 0 };
    monthProdStats[i.id].qty += (i.qty || 1);
    monthProdStats[i.id].revenue += (i.price || 0) * (i.qty || 1);
  }));

  const topMonthSellers = Object.values(monthProdStats).sort((a, b) => b.qty - a.qty).slice(0, 8);
  const maxQty = topMonthSellers[0]?.qty || 1;

  document.getElementById('analytics-top-products').innerHTML = topMonthSellers.length
    ? topMonthSellers.map((p, i) => `
      <div class="top-product-row">
        <div class="top-rank">${['🥇','🥈','🥉','4','5','6','7','8'][i]}</div>
        <span style="font-size:1.2rem">${p.emoji}</span>
        <div class="top-info">
          <div class="top-name">${p.name}</div>
          <div class="top-meta">${p.qty} sold this month</div>
        </div>
        <div class="top-bar"><div class="top-bar-fill" style="width:${(p.qty/maxQty*100).toFixed(0)}%"></div></div>
        <div class="top-value">₹${formatNum(p.revenue)}</div>
      </div>`).join('')
    : '<p style="color:var(--warm-gray);padding:1rem;font-size:0.82rem">No data for this month yet</p>';

  // Most profitable
  const topProfitable = Object.values(prodStats).sort((a, b) => b.profit - a.profit).slice(0, 8);
  const maxProfit = topProfitable[0]?.profit || 1;

  document.getElementById('analytics-profitable').innerHTML = topProfitable.length
    ? topProfitable.map((p, i) => `
      <div class="top-product-row">
        <div class="top-rank">${i + 1}</div>
        <span style="font-size:1.2rem">${p.emoji}</span>
        <div class="top-info">
          <div class="top-name">${p.name}</div>
          <div class="top-meta">Est. profit: ₹${formatNum(p.profit)}</div>
        </div>
        <div class="top-bar"><div class="top-bar-fill" style="width:${(p.profit/maxProfit*100).toFixed(0)}%"></div></div>
        <div class="top-value" style="color:#4caf50">₹${formatNum(p.profit)}</div>
      </div>`).join('')
    : '<p style="color:var(--warm-gray);padding:1rem;font-size:0.82rem">No data yet</p>';

  // Heatmap (last 90 days)
  renderHeatmap(orders);

  setTimeout(() => {
    renderAnalyticsCategoryChart(validOrders);
    renderCustomerSegChart(orders);
    renderPeakHoursChart(validOrders);
    renderPaymentChart(orders);
    renderAOVChart(orders);
  }, 50);
}

function renderHeatmap(orders) {
  const container = document.getElementById('heatmap-container');
  const cells = [];
  const ordersByDay = {};

  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    ordersByDay[key] = 0;
  }
  orders.forEach(o => {
    const key = new Date(o.placedAt).toDateString();
    if (ordersByDay[key] !== undefined) ordersByDay[key]++;
  });

  const values = Object.values(ordersByDay);
  const maxVal = Math.max(...values, 1);
  const entries = Object.entries(ordersByDay);

  let html = '<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:0.5rem">';
  entries.forEach(([dateStr, count]) => {
    const intensity = count / maxVal;
    const d = new Date(dateStr);
    html += `<div title="${d.toLocaleDateString('en-IN')}: ${count} orders" 
      style="width:14px;height:14px;border-radius:2px;background:rgba(201,168,76,${0.05 + intensity * 0.9});cursor:pointer"></div>`;
  });
  html += '</div>';
  html += '<div style="display:flex;gap:0.5rem;align-items:center;margin-top:0.5rem">';
  html += '<span style="font-size:0.65rem;color:var(--warm-gray)">Less</span>';
  [0.05, 0.25, 0.5, 0.75, 0.95].forEach(v => {
    html += `<div style="width:12px;height:12px;border-radius:2px;background:rgba(201,168,76,${v})"></div>`;
  });
  html += '<span style="font-size:0.65rem;color:var(--warm-gray)">More</span></div>';
  container.innerHTML = html;
}

function renderAnalyticsCategoryChart(orders) {
  const canvas = document.getElementById('analyticsCategChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (charts.analyticsCateg) { charts.analyticsCateg.destroy(); }

  const catRevenue = {};
  orders.forEach(o => (o.items || []).forEach(i => {
    catRevenue[i.category] = (catRevenue[i.category] || 0) + (i.price || 0) * (i.qty || 1);
  }));
  const sorted = Object.entries(catRevenue).sort((a, b) => b[1] - a[1]);
  const colors = ['#C9A84C','#E8C97A','#9A7A2E','#d4a853','#f0c060','#b89040','#a07030','#8B6914','#76591e','#634a19','#503c14'];

  charts.analyticsCateg = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: sorted.map(([k]) => k),
      datasets: [{ data: sorted.map(([,v]) => v), backgroundColor: colors, borderColor: '#1A1511', borderWidth: 2 }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { color: '#8B7D6B', font: { size: 10 }, padding: 8 } } }
    }
  });
}

function renderCustomerSegChart(orders) {
  const canvas = document.getElementById('customerSegChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (charts.customerSeg) { charts.customerSeg.destroy(); }

  const spendByUser = {};
  orders.filter(o => o.status !== 'Cancelled').forEach(o => {
    spendByUser[o.userId] = (spendByUser[o.userId] || 0) + (o.total || 0);
  });
  const spends = Object.values(spendByUser);
  const segments = {
    'VIP (₹5000+)': spends.filter(s => s >= 5000).length,
    'Regular (₹2-5K)': spends.filter(s => s >= 2000 && s < 5000).length,
    'Occasional (₹500-2K)': spends.filter(s => s >= 500 && s < 2000).length,
    'New (<₹500)': spends.filter(s => s < 500).length,
  };

  charts.customerSeg = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(segments),
      datasets: [{ data: Object.values(segments), backgroundColor: ['#C9A84C','#9A7A2E','#E8C97A','#5a4a20'], borderColor: '#1A1511', borderWidth: 2 }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { color: '#8B7D6B', font: { size: 10 }, padding: 8 } } }
    }
  });
}

function renderPeakHoursChart(orders) {
  const canvas = document.getElementById('peakHoursChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (charts.peakHours) { charts.peakHours.destroy(); }

  const hourCounts = Array(24).fill(0);
  orders.forEach(o => { const h = new Date(o.placedAt).getHours(); hourCounts[h]++; });
  const labels = Array.from({ length: 24 }, (_, i) => i < 12 ? `${i||12}AM` : `${i===12?12:i-12}PM`);
  const colors = hourCounts.map(v => {
    const max = Math.max(...hourCounts, 1);
    const intensity = v / max;
    return `rgba(201,168,76,${0.2 + intensity * 0.8})`;
  });

  charts.peakHours = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: hourCounts, backgroundColor: colors, borderRadius: 2 }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#8B7D6B', font: { size: 9 } } },
        y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#8B7D6B' } }
      }
    }
  });
}

function renderPaymentChart(orders) {
  const canvas = document.getElementById('paymentChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (charts.payment) { charts.payment.destroy(); }

  const paymentCounts = { UPI: 0, Card: 0, COD: 0 };
  orders.forEach(o => {
    const m = { upi: 'UPI', card: 'Card', cod: 'COD' }[o.paymentMethod];
    if (m) paymentCounts[m]++;
  });

  charts.payment = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(paymentCounts),
      datasets: [{ data: Object.values(paymentCounts), backgroundColor: ['#C9A84C','#9A7A2E','#E8C97A'], borderColor: '#1A1511', borderWidth: 2 }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { color: '#8B7D6B', font: { size: 11 }, padding: 10 } } }
    }
  });
}

function renderAOVChart(orders) {
  const canvas = document.getElementById('aovChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (charts.aov) { charts.aov.destroy(); }

  const weeklyAOV = {};
  orders.filter(o => o.status !== 'Cancelled').forEach(o => {
    const d = new Date(o.placedAt);
    const weekKey = `W${Math.ceil(d.getDate()/7)} ${d.toLocaleString('en-IN',{month:'short'})}`;
    if (!weeklyAOV[weekKey]) weeklyAOV[weekKey] = { total: 0, count: 0 };
    weeklyAOV[weekKey].total += (o.total || 0);
    weeklyAOV[weekKey].count++;
  });

  const entries = Object.entries(weeklyAOV).slice(-12);
  const labels = entries.map(([k]) => k);
  const data = entries.map(([, v]) => v.count > 0 ? Math.round(v.total / v.count) : 0);

  charts.aov = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Avg Order Value', data,
        borderColor: '#C9A84C', backgroundColor: 'rgba(201,168,76,0.1)',
        borderWidth: 2, fill: true, tension: 0.4, pointRadius: 4,
        pointBackgroundColor: '#C9A84C'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#8B7D6B', font: { size: 9 } } },
        y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#8B7D6B', callback: v => '₹' + v } }
      }
    }
  });
}

// ============================================================
//  REPORTS — Download as Excel/CSV
// ============================================================
function generateReport(type) {
  const period = document.getElementById('report-period')?.value || 'month';
  const orders = filterByPeriod(getOrders(), period);
  const expenses = filterByPeriod(getExpenses(), period);
  const users = getUsers();

  let csv = '', filename = '';

  if (type === 'sales') {
    filename = 'sales-report.csv';
    csv = 'Order ID,Customer,Items,Subtotal (INR),Tax (INR),Delivery (INR),Total (INR),Payment,Status,Date\n';
    orders.forEach(o => {
      const dateStr = new Date(o.placedAt).toLocaleDateString('en-GB'); // DD/MM/YYYY avoids comma
      csv += '"' + o.id + '",'
        + '"' + (o.userName||'').replace(/"/g,'""') + '",'
        + (o.items||[]).length + ','
        + (o.subtotal||0) + ','
        + (o.tax||0) + ','
        + (o.delivery||40) + ','
        + (o.total||0) + ','
        + '"' + (o.paymentMethod||'') + '",'
        + '"' + (o.status||'') + '",'
        + '"' + dateStr + '"\n';
    });
    const totalRev = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.total||0), 0);
    const totalOrders = orders.filter(o => o.status !== 'Cancelled').length;
    csv += '\n"TOTAL",,,,,,,' + totalRev + ',,\n';
    csv += '"Total Valid Orders",' + totalOrders + '\n';
    csv += '"Total Revenue (INR)",' + totalRev + '\n';

  } else if (type === 'expenses') {
    filename = 'expenses-report.csv';
    csv = 'Expense ID,Date,Category,Description,Amount (INR)\n';
    expenses.forEach(e => {
      csv += '"' + (e.id||'') + '",'
        + '"' + (e.date||'') + '",'
        + '"' + (e.category||'') + '",'
        + '"' + (e.description||'').replace(/"/g,'""') + '",'
        + (e.amount||0) + '\n';
    });
    const totalExp = expenses.reduce((s, e) => s + (e.amount||0), 0);
    csv += '\n"Total Expenses (INR)",' + totalExp + '\n';

  } else if (type === 'orders') {
    filename = 'orders-report.csv';
    csv = 'Order ID,Customer,Email,Phone,City,Items Count,Total (INR),Payment,Status,Date\n';
    orders.forEach(o => {
      const dateStr = new Date(o.placedAt).toLocaleDateString('en-GB');
      csv += '"' + (o.id||'') + '",'
        + '"' + (o.userName||'').replace(/"/g,'""') + '",'
        + '"' + (o.userEmail||'') + '",'
        + '"' + (o.userPhone||'') + '",'
        + '"' + (o.address?.city||'') + '",'
        + (o.items||[]).length + ','
        + (o.total||0) + ','
        + '"' + (o.paymentMethod||'') + '",'
        + '"' + (o.status||'') + '",'
        + '"' + dateStr + '"\n';
    });
    const grandTotal = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.total||0), 0);
    csv += '\n"Grand Total (INR)",,,,,' + ',' + grandTotal + '\n';

  } else if (type === 'customers') {
    filename = 'customers-report.csv';
    csv = 'Name,Email,Phone,City,State,PIN,Total Orders,Total Spent (INR),Joined Date\n';
    const allOrders = getOrders();
    users.forEach(u => {
      const userOrders = allOrders.filter(o => String(o.userId) === String(u.id));
      const spent = userOrders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.total||0), 0);
      const joinDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB') : '';
      csv += '"' + ((u.fname||'') + ' ' + (u.lname||'')).trim() + '",'
        + '"' + (u.email||'') + '",'
        + '"' + (u.phone||'') + '",'
        + '"' + (u.address?.city||'') + '",'
        + '"' + (u.address?.state||'') + '",'
        + '"' + (u.address?.pin||'') + '",'
        + userOrders.length + ','
        + spent + ','
        + '"' + joinDate + '"\n';
    });

  } else if (type === 'pnl') {
    filename = 'profit-loss-statement.csv';
    const validOrders = orders.filter(o => o.status !== 'Cancelled');
    const totalRevenue = validOrders.reduce((s, o) => s + (o.total||0), 0);
    const totalTax = validOrders.reduce((s, o) => s + (o.tax||0), 0);
    const netRevenue = totalRevenue - totalTax;
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount||0), 0);
    const grossProfit = netRevenue - totalExpenses;
    const margin = netRevenue > 0 ? ((grossProfit / netRevenue) * 100).toFixed(2) : 0;

    csv = 'La Maison Doree - Profit & Loss Statement\n\n';
    csv += 'Period,"' + period + '"\n';
    csv += 'Generated,"' + new Date().toLocaleDateString('en-GB') + '"\n\n';
    csv += 'REVENUE\n';
    csv += 'Gross Revenue (INR),' + totalRevenue + '\n';
    csv += 'Less GST Collected (INR),' + totalTax + '\n';
    csv += 'Net Revenue (INR),' + netRevenue + '\n\n';
    csv += 'EXPENSES\n';
    csv += 'Category,Amount (INR)\n';
    const catExp = {};
    expenses.forEach(e => catExp[e.category] = (catExp[e.category]||0) + (e.amount||0));
    Object.entries(catExp).forEach(([k, v]) => { csv += '"' + k + '",' + v + '\n'; });
    csv += 'Total Expenses (INR),' + totalExpenses + '\n\n';
    csv += 'PROFIT / LOSS\n';
    csv += 'Net Profit/Loss (INR),' + grossProfit + '\n';
    csv += 'Profit Margin (%),' + margin + '\n';
    csv += 'Total Orders,' + orders.length + '\n';
    csv += 'Cancelled Orders,' + orders.filter(o => o.status === 'Cancelled').length + '\n';

  } else if (type === 'products') {
    filename = 'product-performance.csv';
    const allOrders = getOrders().filter(o => o.status !== 'Cancelled');
    const prodStats = {};
    allOrders.forEach(o => (o.items||[]).forEach(i => {
      if (!prodStats[i.id]) prodStats[i.id] = { name: i.name, category: i.category||'', price: i.price||0, qty: 0, revenue: 0 };
      prodStats[i.id].qty += (i.qty||1);
      prodStats[i.id].revenue += (i.price||0) * (i.qty||1);
    }));
    csv = 'Product Name,Category,Unit Price (INR),Units Sold,Total Revenue (INR),Est Profit 35pct (INR)\n';
    Object.values(prodStats).sort((a, b) => b.revenue - a.revenue).forEach(p => {
      csv += '"' + p.name.replace(/"/g,'""') + '",'
        + '"' + p.category + '",'
        + p.price + ','
        + p.qty + ','
        + p.revenue + ','
        + Math.round(p.revenue * 0.35) + '\n';
    });
    const grandRevenue = Object.values(prodStats).reduce((s, p) => s + p.revenue, 0);
    csv += '\n"Grand Total (INR)",,,' + ',' + grandRevenue + '\n';
  }

  downloadCSV(csv, filename);
  showAdminToast('Report downloaded: ' + filename, 'success');
}

function filterByPeriod(items, period) {
  const now = new Date();
  return items.filter(item => {
    const d = new Date(item.placedAt || item.date);
    if (isNaN(d)) return true;
    switch (period) {
      case 'today': return d.toDateString() === now.toDateString();
      case 'week': { const s = new Date(now); s.setDate(s.getDate()-7); return d >= s; }
      case 'month': return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      case 'quarter': { const s = new Date(now); s.setMonth(s.getMonth()-3); return d >= s; }
      case '3months': { const s = new Date(now); s.setDate(s.getDate()-90); return d >= s; }
      default: return true;
    }
  });
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ============================================================
//  BACKUP
// ============================================================
function renderBackup() {
  const history = JSON.parse(localStorage.getItem('lmd_backup_history') || '[]');
  const orders = getOrders().length;
  const expenses = getExpenses().length;
  const customers = getUsers().length;

  document.getElementById('backup-status').textContent = `Current data: ${orders} orders · ${expenses} expenses · ${customers} customers`;

  document.getElementById('backup-history').innerHTML = history.length
    ? history.slice().reverse().map(b => `
      <div class="backup-history-item">
        <div>
          <div style="font-size:0.82rem;color:var(--cream)">${b.label}</div>
          <div class="muted">${b.orders} orders · ${b.expenses} expenses · ${b.customers} customers</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:0.75rem;color:var(--warm-gray)">${new Date(b.timestamp).toLocaleString('en-IN')}</div>
          <button class="action-btn" style="margin-top:4px" onclick="restoreFromHistory('${b.timestamp}')">Restore</button>
        </div>
      </div>`).join('')
    : '<p style="color:var(--warm-gray);padding:1rem;font-size:0.82rem">No backups created yet</p>';
}

function createLocalBackup() {
  const snapshot = {
    timestamp: new Date().toISOString(),
    label: 'Manual Backup — ' + new Date().toLocaleDateString('en-IN'),
    orders: getOrders(),
    expenses: getExpenses(),
    users: getUsers(),
    customProducts: customProducts,
    ordersCount: getOrders().length,
    expenses: getExpenses(),
    expensesCount: getExpenses().length,
    customers: getUsers().length,
  };

  // Save snapshot
  const snapKey = 'lmd_backup_' + snapshot.timestamp;
  try {
    localStorage.setItem(snapKey, JSON.stringify(snapshot));
  } catch (e) {
    showAdminToast('Storage full — exporting JSON instead', 'error');
  }

  // Update history
  const history = JSON.parse(localStorage.getItem('lmd_backup_history') || '[]');
  history.push({ timestamp: snapshot.timestamp, label: snapshot.label, orders: snapshot.ordersCount, expenses: snapshot.expensesCount, customers: snapshot.customers, snapKey });
  if (history.length > 10) history.shift(); // Keep last 10
  localStorage.setItem('lmd_backup_history', JSON.stringify(history));

  // Also download as JSON
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `lmd-backup-${new Date().toISOString().slice(0,10)}.json`;
  link.click();

  renderBackup();
  showAdminToast('Backup created & downloaded!', 'success');
}

function exportAllData() {
  const orders = getOrders();
  const expenses = getExpenses();
  const users = getUsers();
  const allOrders = orders.filter(o => o.status !== 'Cancelled');
  const prodStats = {};
  allOrders.forEach(o => (o.items||[]).forEach(i => {
    if (!prodStats[i.id]) prodStats[i.id] = { name: i.name, category: i.category||'', qty: 0, revenue: 0 };
    prodStats[i.id].qty += (i.qty||1);
    prodStats[i.id].revenue += (i.price||0)*(i.qty||1);
  }));

  // Multi-sheet workaround: download multiple CSVs
  const files = [
    { name: 'lmd-orders.csv', content: buildOrdersCSV(orders) },
    { name: 'lmd-expenses.csv', content: buildExpensesCSV(expenses) },
    { name: 'lmd-customers.csv', content: buildCustomersCSV(users, orders) },
    { name: 'lmd-products.csv', content: buildProductsCSV(prodStats) },
    { name: 'lmd-summary.csv', content: buildSummaryCSV(orders, expenses) },
  ];

  files.forEach((f, i) => {
    setTimeout(() => {
      const blob = new Blob([f.content], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = f.name;
      link.click();
    }, i * 400);
  });

  showAdminToast('Exporting 5 CSV files — check downloads!', 'success');
}

function buildOrdersCSV(orders) {
  let csv = 'Order ID,Customer,Email,Phone,Items,Subtotal (INR),Tax (INR),Delivery (INR),Total (INR),Payment,Status,Date\n';
  orders.forEach(o => {
    const dateStr = new Date(o.placedAt).toLocaleDateString('en-GB');
    csv += '"' + (o.id||'') + '",'
      + '"' + (o.userName||'').replace(/"/g,'""') + '",'
      + '"' + (o.userEmail||'') + '",'
      + '"' + (o.userPhone||'') + '",'
      + (o.items||[]).length + ','
      + (o.subtotal||0) + ','
      + (o.tax||0) + ','
      + (o.delivery||40) + ','
      + (o.total||0) + ','
      + '"' + (o.paymentMethod||'') + '",'
      + '"' + (o.status||'') + '",'
      + '"' + dateStr + '"\n';
  });
  const grandTotal = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.total||0), 0);
  csv += '\n"Grand Total (INR)",,,,,,,,,' + grandTotal + '\n';
  return csv;
}

function buildExpensesCSV(expenses) {
  let csv = 'Expense ID,Date,Category,Description,Amount (INR)\n';
  expenses.forEach(e => {
    csv += '"' + (e.id||'') + '",'
      + '"' + (e.date||'') + '",'
      + '"' + (e.category||'') + '",'
      + '"' + (e.description||'').replace(/"/g,'""') + '",'
      + (e.amount||0) + '\n';
  });
  const total = expenses.reduce((s, e) => s + (e.amount||0), 0);
  csv += '\n"Total Expenses (INR)",' + total + '\n';
  return csv;
}

function buildCustomersCSV(users, orders) {
  let csv = 'Name,Email,Phone,City,State,PIN,Orders,Total Spent (INR),Joined Date\n';
  users.forEach(u => {
    const uOrders = orders.filter(o => String(o.userId) === String(u.id));
    const spent = uOrders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.total||0), 0);
    const joinDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB') : '';
    csv += '"' + ((u.fname||'') + ' ' + (u.lname||'')).trim() + '",'
      + '"' + (u.email||'') + '",'
      + '"' + (u.phone||'') + '",'
      + '"' + (u.address?.city||'') + '",'
      + '"' + (u.address?.state||'') + '",'
      + '"' + (u.address?.pin||'') + '",'
      + uOrders.length + ','
      + spent + ','
      + '"' + joinDate + '"\n';
  });
  return csv;
}

function buildProductsCSV(prodStats) {
  let csv = 'Product Name,Category,Units Sold,Total Revenue (INR),Est Profit 35pct (INR)\n';
  Object.values(prodStats).sort((a, b) => b.revenue - a.revenue).forEach(p => {
    csv += '"' + (p.name||'').replace(/"/g,'""') + '",'
      + '"' + (p.category||'') + '",'
      + (p.qty||0) + ','
      + (p.revenue||0) + ','
      + Math.round((p.revenue||0) * 0.35) + '\n';
  });
  const grandRev = Object.values(prodStats).reduce((s, p) => s + (p.revenue||0), 0);
  csv += '\n"Grand Total Revenue (INR)",,,' + grandRev + '\n';
  return csv;
}

function buildSummaryCSV(orders, expenses) {
  const valid = orders.filter(o => o.status !== 'Cancelled');
  const revenue = valid.reduce((s, o) => s + (o.total||0), 0);
  const totalExp = expenses.reduce((s, e) => s + (e.amount||0), 0);
  const profit = revenue - totalExp;
  const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : 0;

  let csv = 'La Maison Doree - Business Summary\n\n';
  csv += 'Generated Date,"' + new Date().toLocaleDateString('en-GB') + '"\n\n';
  csv += 'Metric,Value\n';
  csv += 'Total Orders,' + orders.length + '\n';
  csv += 'Completed Orders,' + valid.length + '\n';
  csv += 'Cancelled Orders,' + orders.filter(o => o.status === 'Cancelled').length + '\n';
  csv += 'Total Revenue (INR),' + revenue + '\n';
  csv += 'Total Expenses (INR),' + totalExp + '\n';
  csv += 'Net Profit (INR),' + profit + '\n';
  csv += 'Profit Margin (%),' + margin + '\n';
  csv += 'Total Customers,' + getUsers().length + '\n';
  csv += 'Avg Order Value (INR),' + (valid.length > 0 ? Math.round(revenue / valid.length) : 0) + '\n';
  return csv;
}

function restoreBackup(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.orders && !data.expenses) throw new Error('Invalid backup file');
      if (!confirm(`Restore backup from ${new Date(data.timestamp).toLocaleString('en-IN')}?\nThis will REPLACE current data.`)) return;
      if (data.orders) localStorage.setItem('lmd_orders', JSON.stringify(data.orders));
      if (data.expenses) localStorage.setItem('lmd_expenses', JSON.stringify(data.expenses));
      if (data.users) localStorage.setItem('lmd_users', JSON.stringify(data.users));
      if (data.customProducts) { customProducts = data.customProducts; localStorage.setItem('lmd_custom_products', JSON.stringify(customProducts)); }
      renderBackup();
      showAdminToast('Backup restored successfully!', 'success');
    } catch (err) {
      showAdminToast('Invalid backup file: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

function restoreFromHistory(timestamp) {
  const snapKey = 'lmd_backup_' + timestamp;
  const snap = localStorage.getItem(snapKey);
  if (!snap) { showAdminToast('Snapshot not found in storage', 'error'); return; }
  try {
    const data = JSON.parse(snap);
    if (!confirm('Restore this backup? Current data will be replaced.')) return;
    if (data.orders) localStorage.setItem('lmd_orders', JSON.stringify(data.orders));
    if (data.expenses) localStorage.setItem('lmd_expenses', JSON.stringify(data.expenses));
    if (data.users) localStorage.setItem('lmd_users', JSON.stringify(data.users));
    renderBackup();
    showAdminToast('Restored from history backup!', 'success');
  } catch {
    showAdminToast('Restore failed', 'error');
  }
}

function restoreSampleData() {
  if (!confirm('This will re-add 3 months of sample orders, customers and expenses.\n\nExisting real data will NOT be affected. Continue?')) return;
  localStorage.removeItem('lmd_sample_injected');
  generateSampleData(); // defined in admin-data.js
  renderBackup();
  updateNewOrdersBadge();
  showAdminToast('Sample data restored successfully! Reload the page to see all charts.', 'success');
  setTimeout(() => location.reload(), 1800);
}

function clearSampleData() {
  if (!confirm('Remove all sample/demo data? This keeps only real orders and customers.')) return;
  const orders = getOrders().filter(o => !o.isSample);
  const expenses = getExpenses().filter(e => !e.isSample);
  const users = getUsers().filter(u => u.id < 10000);
  localStorage.setItem('lmd_orders', JSON.stringify(orders));
  localStorage.setItem('lmd_expenses', JSON.stringify(expenses));
  localStorage.setItem('lmd_users', JSON.stringify(users));
  localStorage.removeItem('lmd_sample_injected');
  renderBackup();
  showAdminToast('Sample data cleared. Kept real data only.', 'success');
}

// ============================================================
//  TOAST
// ============================================================
function showAdminToast(msg, type = 'success') {
  const toast = document.getElementById('admin-toast');
  toast.textContent = msg;
  toast.className = 'toast ' + type + ' show';
  setTimeout(() => toast.classList.remove('show'), 3500);
}
