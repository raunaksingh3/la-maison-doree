// ============================================================
//  SAMPLE DATA GENERATOR — 3 months of realistic bakery data
// ============================================================

function generateSampleData() {
  const existing = JSON.parse(localStorage.getItem('lmd_sample_injected') || 'false');
  if (existing) return; // Don't re-generate

  const users = [];
  const orders = [];
  const expenses = [];

  // Sample customers
  const sampleCustomers = [
    { fname:'Priya', lname:'Sharma', email:'priya.sharma@gmail.com', phone:'9876543210', city:'Bandra West, Mumbai', state:'Maharashtra', pin:'400051' },
    { fname:'Rahul', lname:'Mehta', email:'rahul.mehta@gmail.com', phone:'9765432109', city:'Andheri West, Mumbai', state:'Maharashtra', pin:'400057' },
    { fname:'Anita', lname:'Patel', email:'anita.patel@gmail.com', phone:'9654321098', city:'Powai, Mumbai', state:'Maharashtra', pin:'400080' },
    { fname:'Vikram', lname:'Singh', email:'vikram.singh@gmail.com', phone:'9543210987', city:'Khar West, Mumbai', state:'Maharashtra', pin:'400053' },
    { fname:'Sneha', lname:'Gupta', email:'sneha.gupta@gmail.com', phone:'9432109876', city:'Santacruz West, Mumbai', state:'Maharashtra', pin:'400054' },
    { fname:'Amit', lname:'Joshi', email:'amit.joshi@gmail.com', phone:'9321098765', city:'Malad West, Mumbai', state:'Maharashtra', pin:'400061' },
    { fname:'Kavita', lname:'Nair', email:'kavita.nair@gmail.com', phone:'9210987654', city:'Goregaon East, Mumbai', state:'Maharashtra', pin:'400060' },
    { fname:'Deepak', lname:'Reddy', email:'deepak.reddy@gmail.com', phone:'9109876543', city:'Chembur, Mumbai', state:'Maharashtra', pin:'400086' },
    { fname:'Meena', lname:'Iyer', email:'meena.iyer@gmail.com', phone:'9098765432', city:'Kandivali West, Mumbai', state:'Maharashtra', pin:'400063' },
    { fname:'Suresh', lname:'Kumar', email:'suresh.kumar@gmail.com', phone:'9987654321', city:'Thane West', state:'Maharashtra', pin:'400601' },
  ];

  sampleCustomers.forEach((c, i) => {
    users.push({
      id: 10000 + i, fname: c.fname, lname: c.lname, email: c.email,
      phone: c.phone, password: '1234567890',
      address: { line1: `Flat ${i+101}, Building ${String.fromCharCode(65+i)}`, line2: 'Near Market', pin: c.pin, city: c.city, state: c.state, country: 'India' },
      createdAt: randomDate(90, 0).toISOString()
    });
  });

  // Sample product catalog (for orders)
  const sampleProducts = [
    {id:1,name:'Classic Butter Croissant',emoji:'🥐',price:85,category:'croissants'},
    {id:2,name:'Almond Croissant',emoji:'🥐',price:120,category:'croissants'},
    {id:26,name:'Fraisier',emoji:'🎂',price:650,category:'cakes'},
    {id:81,name:'Raspberry Macaron',emoji:'🍬',price:85,category:'macarons'},
    {id:92,name:'Macaron Box (6pc)',emoji:'🍬',price:480,category:'macarons'},
    {id:11,name:'Country Sourdough',emoji:'🍞',price:320,category:'breads'},
    {id:15,name:'Baguette',emoji:'🥖',price:90,category:'breads'},
    {id:46,name:'Classic Éclair',emoji:'🍫',price:110,category:'pastries'},
    {id:66,name:'Chocolate Chip Cookie',emoji:'🍪',price:55,category:'cookies'},
    {id:96,name:'Lemon Tart',emoji:'🍋',price:195,category:'tarts'},
    {id:120,name:'Café au Lait',emoji:'☕',price:120,category:'beverages'},
    {id:108,name:'Blueberry Muffin',emoji:'🫐',price:90,category:'muffins'},
    {id:135,name:'Croque Monsieur',emoji:'🥪',price:220,category:'savory'},
    {id:30,name:'Chocolate Fondant Cake',emoji:'🎂',price:580,category:'cakes'},
    {id:84,name:'Rose Lychee Macaron',emoji:'🍬',price:90,category:'macarons'},
  ];

  const paymentMethods = ['upi', 'card', 'cod'];
  const statuses = ['Delivered', 'Delivered', 'Delivered', 'Confirmed', 'Preparing', 'Out for Delivery', 'Cancelled'];

  // Generate 200+ orders over 90 days
  let orderCount = 0;
  for (let daysAgo = 90; daysAgo >= 0; daysAgo--) {
    // Vary orders per day (10-30)
    const ordersPerDay = Math.floor(Math.random() * 20) + 10;
    for (let o = 0; o < ordersPerDay; o++) {
      const user = sampleCustomers[Math.floor(Math.random() * sampleCustomers.length)];
      const userId = 10000 + sampleCustomers.indexOf(user);
      const numItems = Math.floor(Math.random() * 4) + 1;
      const items = [];
      const usedProducts = new Set();

      for (let i = 0; i < numItems; i++) {
        let prod;
        do { prod = sampleProducts[Math.floor(Math.random() * sampleProducts.length)]; } while (usedProducts.has(prod.id));
        usedProducts.add(prod.id);
        items.push({ id: prod.id, name: prod.name, emoji: prod.emoji, price: prod.price, qty: Math.floor(Math.random() * 3) + 1, category: prod.category });
      }

      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      const tax = Math.round(subtotal * 0.05);
      const delivery = 40;
      const total = subtotal + tax + delivery;

      const orderDate = randomDate(daysAgo + 1, daysAgo);
      const status = daysAgo > 5 ? 'Delivered' : statuses[Math.floor(Math.random() * statuses.length)];

      orders.push({
        id: 'ORD' + (1000000 + orderCount++),
        userId, userName: user.fname + ' ' + user.lname,
        userEmail: user.email, userPhone: user.phone,
        address: { line1: `Flat ${userId}, Building A`, city: user.city, state: user.state, pin: user.pin, country: 'India' },
        items, subtotal, tax, delivery, total,
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        status,
        placedAt: orderDate.toISOString(),
        estimatedDelivery: '2:00 PM – 5:00 PM',
        isSample: true
      });
    }
  }

  // Generate expenses for 3 months
  const expenseCategories = [
    { cat: 'Ingredients', range: [15000, 35000] },
    { cat: 'Staff Salary', range: [40000, 50000] },
    { cat: 'Rent', range: [25000, 25000] },
    { cat: 'Utilities', range: [5000, 12000] },
    { cat: 'Packaging', range: [3000, 8000] },
    { cat: 'Marketing', range: [2000, 8000] },
    { cat: 'Equipment', range: [0, 15000] },
    { cat: 'Others', range: [1000, 5000] },
  ];

  let expCount = 0;
  for (let daysAgo = 90; daysAgo >= 0; daysAgo--) {
    if (Math.random() < 0.3) { // ~30% chance of expense per day
      const catData = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
      const amount = Math.floor(Math.random() * (catData.range[1] - catData.range[0]) + catData.range[0]);
      if (amount > 0) {
        expenses.push({
          id: 'EXP' + (1000 + expCount++),
          date: randomDate(daysAgo + 1, daysAgo).toISOString().split('T')[0],
          category: catData.cat,
          description: getExpenseDesc(catData.cat),
          amount,
          isSample: true
        });
      }
    }
  }

  // Add regular monthly expenses
  for (let m = 0; m < 3; m++) {
    const monthDate = new Date();
    monthDate.setMonth(monthDate.getMonth() - m);
    const monthStr = monthDate.toISOString().split('T')[0].slice(0, 7);

    expenses.push({ id: 'EXP_R_' + m + '_1', date: monthStr + '-01', category: 'Rent', description: 'Monthly shop rent - Bandra West', amount: 25000, isSample: true });
    expenses.push({ id: 'EXP_R_' + m + '_2', date: monthStr + '-05', category: 'Staff Salary', description: 'Chef salary x2 + helpers x3', amount: 45000, isSample: true });
    expenses.push({ id: 'EXP_R_' + m + '_3', date: monthStr + '-10', category: 'Ingredients', description: 'Monthly flour, butter, sugar, eggs', amount: 28000, isSample: true });
    expenses.push({ id: 'EXP_R_' + m + '_4', date: monthStr + '-15', category: 'Utilities', description: 'Electricity + gas bill', amount: 8500, isSample: true });
    expenses.push({ id: 'EXP_R_' + m + '_5', date: monthStr + '-20', category: 'Packaging', description: 'Boxes, bags, tissue paper', amount: 4500, isSample: true });
  }

  // Save to localStorage
  const existingUsers = JSON.parse(localStorage.getItem('lmd_users') || '[]');
  localStorage.setItem('lmd_users', JSON.stringify([...existingUsers, ...users]));

  const existingOrders = JSON.parse(localStorage.getItem('lmd_orders') || '[]');
  localStorage.setItem('lmd_orders', JSON.stringify([...existingOrders, ...orders]));

  const existingExpenses = JSON.parse(localStorage.getItem('lmd_expenses') || '[]');
  localStorage.setItem('lmd_expenses', JSON.stringify([...existingExpenses, ...expenses]));

  localStorage.setItem('lmd_sample_injected', 'true');
  console.log(`✅ Sample data injected: ${orders.length} orders, ${expenses.length} expenses, ${users.length} customers`);
}

function randomDate(maxDaysAgo, minDaysAgo = 0) {
  const now = new Date();
  const daysAgo = Math.random() * (maxDaysAgo - minDaysAgo) + minDaysAgo;
  const d = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
  d.setHours(Math.floor(Math.random() * 14) + 7, Math.floor(Math.random() * 60));
  return d;
}

function getExpenseDesc(cat) {
  const descs = {
    'Ingredients': ['French butter import', 'Premium flour stock', 'Organic eggs bulk', 'Chocolate & cocoa', 'Fresh cream & milk', 'Almond & pistachio'],
    'Utilities': ['Electricity bill', 'Gas supply', 'Water charges', 'Internet & phone'],
    'Staff Salary': ['Part-time baker payment', 'Delivery staff', 'Counter assistant'],
    'Equipment': ['Oven maintenance', 'Mixer repair', 'New baking trays', 'Display case repair'],
    'Marketing': ['Instagram ads', 'Google ads', 'Flyer printing', 'Influencer collaboration'],
    'Packaging': ['Eco boxes order', 'Custom tissue paper', 'Ribbon & stickers', 'Carry bags restock'],
    'Rent': ['Monthly shop rent', 'Storage space rent'],
    'Others': ['Miscellaneous', 'Cleaning supplies', 'Office supplies', 'Bank charges'],
  };
  const list = descs[cat] || ['Expense'];
  return list[Math.floor(Math.random() * list.length)];
}

// Run on load
generateSampleData();
