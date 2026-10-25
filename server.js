const express = require('express');
const crypto = require('crypto');
const path = require('path');
const { exec } = require('child_process');
const { db, dbPath, hydrateProduct, sessionTtlMs } = require('./db');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const publicDir = path.join(__dirname, 'public');
const SESSION_COOKIE = 'ca_sid';
const FREE_SHIPPING_THRESHOLD = 75;
const SHIPPING_FEE = 6.95;

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false }));

function parseCookies(header = '') {
  return header.split(';').reduce((cookies, part) => {
    const separator = part.indexOf('=');
    if (separator === -1) return cookies;
    const key = part.slice(0, separator).trim();
    if (!key) return cookies;
    try {
      cookies[key] = decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      cookies[key] = part.slice(separator + 1).trim();
    }
    return cookies;
  }, {});
}

function createSession(res) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + sessionTtlMs;
  db.prepare('INSERT INTO sessions (token, user_id, cart, expires_at) VALUES (?, NULL, ?, ?)').run(
    token,
    '{}',
    expiresAt
  );
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: sessionTtlMs,
    path: '/'
  });
  return { token, user_id: null, cart: '{}', expires_at: expiresAt };
}

app.use('/api', (req, res, next) => {
  const cookies = parseCookies(req.headers.cookie);
  const existingToken = cookies[SESSION_COOKIE];
  let session = null;

  if (existingToken) {
    session = db
      .prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > ?')
      .get(existingToken, Date.now());
  }

  if (!session) {
    if (existingToken) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(existingToken);
      res.clearCookie(SESSION_COOKIE, { path: '/' });
    }
    session = createSession(res);
  }

  let cart = {};
  try {
    const parsed = JSON.parse(session.cart || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) cart = parsed;
  } catch {
    cart = {};
  }

  req.sessionToken = session.token;
  req.userId = session.user_id;
  req.cart = cart;
  next();
});

function saveCart(req) {
  db.prepare('UPDATE sessions SET cart = ?, expires_at = ? WHERE token = ?').run(
    JSON.stringify(req.cart),
    Date.now() + sessionTtlMs,
    req.sessionToken
  );
}

function setSessionUser(req, userId) {
  db.prepare('UPDATE sessions SET user_id = ?, expires_at = ? WHERE token = ?').run(
    userId,
    Date.now() + sessionTtlMs,
    req.sessionToken
  );
  req.userId = userId;
}

function getPublicUser(req) {
  if (!req.userId) return null;
  return (
    db
      .prepare('SELECT id, name, email, created_at FROM users WHERE id = ?')
      .get(req.userId) || null
  );
}

function requireUser(req, res, next) {
  const user = getPublicUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }
  req.user = user;
  next();
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function buildCart(cart) {
  const ids = Object.keys(cart)
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);

  if (!ids.length) {
    return {
      items: [],
      subtotal: 0,
      shipping: 0,
      total: 0,
      count: 0,
      freeShippingRemaining: FREE_SHIPPING_THRESHOLD
    };
  }

  const placeholders = ids.map(() => '?').join(',');
  const products = db
    .prepare(
      `SELECT id, slug, name, category, price, image, stock
       FROM products
       WHERE id IN (${placeholders})`
    )
    .all(...ids);

  const productMap = new Map(products.map((product) => [product.id, product]));
  const items = [];

  for (const id of ids) {
    const product = productMap.get(id);
    if (!product) continue;
    const quantity = Math.min(
      Math.max(parseInt(cart[id], 10) || 0, 0),
      Math.max(product.stock, 0)
    );
    if (quantity === 0) continue;

    items.push({
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      price: product.price,
      image: product.image,
      stock: product.stock,
      quantity,
      lineTotal: roundMoney(product.price * quantity)
    });
  }

  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = roundMoney(subtotal + shipping);

  return {
    items,
    subtotal,
    shipping,
    total,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    freeShippingRemaining: Math.max(0, roundMoney(FREE_SHIPPING_THRESHOLD - subtotal))
  };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function orderReference(id) {
  return `CA-${String(id).padStart(4, '0')}`;
}

function getOrder(orderId, userId) {
  const order = db
    .prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
    .get(orderId, userId);
  if (!order) return null;

  const items = db
    .prepare(
      `SELECT product_id, name, image, price, quantity
       FROM order_items
       WHERE order_id = ?
       ORDER BY id`
    )
    .all(orderId);

  return { ...order, reference: orderReference(order.id), items };
}

app.use(express.static(publicDir, { maxAge: '1h', index: false }));

app.get('/', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
app.get('/product/:slug', (req, res) => res.sendFile(path.join(publicDir, 'product.html')));
app.get('/cart', (req, res) => res.sendFile(path.join(publicDir, 'cart.html')));
app.get('/checkout', (req, res) => res.sendFile(path.join(publicDir, 'checkout.html')));
app.get('/login', (req, res) => res.sendFile(path.join(publicDir, 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(publicDir, 'register.html')));
app.get('/orders', (req, res) => res.sendFile(path.join(publicDir, 'orders.html')));
app.get('/order/:id', (req, res) => res.sendFile(path.join(publicDir, 'order-confirmation.html')));

app.get('/api/me', (req, res) => {
  const cart = buildCart(req.cart);
  res.json({ user: getPublicUser(req), cartCount: cart.count });
});

app.get('/api/products', (req, res) => {
  const category = String(req.query.category || '').trim();
  const search = String(req.query.search || '').trim();
  const sort = String(req.query.sort || 'featured');
  const conditions = [];
  const params = [];

  if (category && category.toLowerCase() !== 'all') {
    conditions.push('category = ?');
    params.push(category);
  }

  if (search) {
    conditions.push('(name LIKE ? OR category LIKE ? OR description LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  const sorts = {
    featured: 'id ASC',
    'price-asc': 'price ASC',
    'price-desc': 'price DESC',
    rating: 'rating DESC',
    name: 'name ASC'
  };
  const orderBy = sorts[sort] || sorts.featured;
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const products = db
    .prepare(
      `SELECT id, slug, name, category, price, image, stock, rating, review_count, badge
       FROM products
       ${where}
       ORDER BY ${orderBy}`
    )
    .all(...params)
    .map((product) => ({
      ...product,
      inStock: product.stock > 0,
      lowStock: product.stock > 0 && product.stock <= 5
    }));

  const categories = db
    .prepare('SELECT DISTINCT category FROM products ORDER BY category')
    .all()
    .map((row) => row.category);

  res.json({ products, categories });
});

app.get('/api/products/:slug', (req, res) => {
  const product = hydrateProduct(
    db.prepare('SELECT * FROM products WHERE slug = ?').get(req.params.slug)
  );
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const related = db
    .prepare(
      `SELECT id, slug, name, category, price, image, stock, rating, review_count, badge
       FROM products
       WHERE category = ? AND id != ?
       ORDER BY rating DESC
       LIMIT 4`
    )
    .all(product.category, product.id)
    .map((item) => ({
      ...item,
      inStock: item.stock > 0,
      lowStock: item.stock > 0 && item.stock <= 5
    }));

  product.inStock = product.stock > 0;
  product.lowStock = product.stock > 0 && product.stock <= 5;
  res.json({ product, related });
});

app.post('/api/register', (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');

  if (name.length < 2 || name.length > 80) {
    return res.status(400).json({ error: 'Please enter your name (2–80 characters).' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (password.length < 6 || password.length > 128) {
    return res.status(400).json({ error: 'Password must be 6–128 characters.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const result = db
    .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name, email, hashPassword(password));

  setSessionUser(req, Number(result.lastInsertRowid));
  const user = getPublicUser(req);
  res.status(201).json({ user });
});

app.post('/api/login', (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const user = db
    .prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?')
    .get(email);

  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }

  setSessionUser(req, user.id);
  res.json({ user: { id: user.id, name: user.name, email: user.email } });
});

app.post('/api/logout', (req, res) => {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(req.sessionToken);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
});

app.get('/api/cart', (req, res) => {
  res.json(buildCart(req.cart));
});

app.post('/api/cart/items', (req, res) => {
  const productId = Number(req.body.productId);
  const quantity = Number(req.body.quantity || 1);

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: 'Invalid product.' });
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    return res.status(400).json({ error: 'Quantity must be between 1 and 20.' });
  }

  const product = db.prepare('SELECT id, stock FROM products WHERE id = ?').get(productId);
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  if (product.stock < 1) return res.status(409).json({ error: 'This product is out of stock.' });

  const current = parseInt(req.cart[productId], 10) || 0;
  req.cart[productId] = Math.min(current + quantity, product.stock);
  saveCart(req);

  res.json({ cart: buildCart(req.cart) });
});

app.patch('/api/cart/items/:productId', (req, res) => {
  const productId = Number(req.params.productId);
  const quantity = Number(req.body.quantity);

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: 'Invalid product.' });
  }
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 20) {
    return res.status(400).json({ error: 'Quantity must be between 0 and 20.' });
  }

  if (quantity === 0) {
    delete req.cart[productId];
  } else {
    const product = db.prepare('SELECT id, stock FROM products WHERE id = ?').get(productId);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    if (product.stock < 1) {
      delete req.cart[productId];
      saveCart(req);
      return res.status(409).json({ error: 'This product is out of stock.' });
    }
    req.cart[productId] = Math.min(quantity, product.stock);
  }

  saveCart(req);
  res.json({ cart: buildCart(req.cart) });
});

app.delete('/api/cart/items/:productId', (req, res) => {
  const productId = Number(req.params.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: 'Invalid product.' });
  }

  delete req.cart[productId];
  saveCart(req);
  res.json({ cart: buildCart(req.cart) });
});

app.post('/api/checkout', requireUser, (req, res) => {
  const shippingName = String(req.body.name || '').trim();
  const shippingAddress = String(req.body.address || '').trim();
  const shippingCity = String(req.body.city || '').trim();
  const shippingPostal = String(req.body.postal || '').trim();
  const shippingCountry = String(req.body.country || '').trim();

  if (!shippingName || !shippingAddress || !shippingCity || !shippingPostal || !shippingCountry) {
    return res.status(400).json({ error: 'Please complete all shipping fields.' });
  }

  const maxLengths = {
    name: 100,
    address: 200,
    city: 100,
    postal: 30,
    country: 100
  };
  const fields = {
    name: shippingName,
    address: shippingAddress,
    city: shippingCity,
    postal: shippingPostal,
    country: shippingCountry
  };
  for (const [field, value] of Object.entries(fields)) {
    if (value.length > maxLengths[field]) {
      return res.status(400).json({ error: 'One or more shipping fields are too long.' });
    }
  }

  const cart = buildCart(req.cart);
  if (!cart.items.length) {
    return res.status(400).json({ error: 'Your cart is empty.' });
  }

  let orderId;
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const item of cart.items) {
      const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(item.id);
      if (!product || product.stock < item.quantity) {
        throw new Error(`INSUFFICIENT_STOCK:${item.name}`);
      }
    }

    const result = db
      .prepare(
        `INSERT INTO orders
          (user_id, subtotal, shipping, total, status, shipping_name,
           shipping_address, shipping_city, shipping_postal, shipping_country)
         VALUES (?, ?, ?, ?, 'Processing', ?, ?, ?, ?, ?)`
      )
      .run(
        req.user.id,
        cart.subtotal,
        cart.shipping,
        cart.total,
        shippingName,
        shippingAddress,
        shippingCity,
        shippingPostal,
        shippingCountry
      );
    orderId = Number(result.lastInsertRowid);

    const insertItem = db.prepare(
      `INSERT INTO order_items (order_id, product_id, name, image, price, quantity)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

    for (const item of cart.items) {
      insertItem.run(orderId, item.id, item.name, item.image, item.price, item.quantity);
      updateStock.run(item.quantity, item.id);
    }

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    if (String(error.message).startsWith('INSUFFICIENT_STOCK:')) {
      const itemName = String(error.message).split(':')[1];
      return res.status(409).json({
        error: `Not enough stock for ${itemName}. Please update your cart.`
      });
    }
    throw error;
  }

  req.cart = {};
  saveCart(req);

  res.status(201).json({ orderId, reference: orderReference(orderId) });
});

app.get('/api/orders', requireUser, (req, res) => {
  const orders = db
    .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC')
    .all(req.user.id)
    .map((order) => {
      const items = db
        .prepare(
          `SELECT product_id, name, image, price, quantity
           FROM order_items WHERE order_id = ? ORDER BY id`
        )
        .all(order.id);
      return { ...order, reference: orderReference(order.id), items };
    });

  res.json({ orders });
});

app.get('/api/orders/:id', requireUser, (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ error: 'Invalid order.' });
  }
  const order = getOrder(orderId, req.user.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  res.json({ order });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(publicDir, '404.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  if (req.path.startsWith('/api')) {
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
  res.status(500).send('Something went wrong.');
});

const server = app.listen(PORT, () => {
  console.log('');
  console.log('  ShopSwift is running');
  console.log(`  Local:  http://localhost:${PORT}`);
  console.log(`  Database: ${dbPath}`);
  console.log('');
  console.log('  Press Ctrl+C to stop the server.');
  console.log('');

  if (process.platform === 'win32' && process.env.NO_BROWSER !== '1') {
    setTimeout(() => {
      exec(`start "" "http://localhost:${PORT}"`);
    }, 400);
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Close the other server and try again.`);
  } else {
    console.error(error);
  }
  process.exit(1);
});

setInterval(() => {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
}, 60 * 60 * 1000).unref();
