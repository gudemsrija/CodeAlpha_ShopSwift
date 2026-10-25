const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, 'data', 'store.db');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT NOT NULL,
    image TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    rating REAL NOT NULL DEFAULT 0,
    review_count INTEGER NOT NULL DEFAULT 0,
    badge TEXT,
    highlights TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    cart TEXT NOT NULL DEFAULT '{}',
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    subtotal REAL NOT NULL,
    shipping REAL NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'Processing',
    shipping_name TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    shipping_city TEXT NOT NULL,
    shipping_postal TEXT NOT NULL,
    shipping_country TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    image TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
`);

const products = [
  {
    slug: 'aura-wireless-headphones',
    name: 'Aura Wireless Headphones',
    category: 'Audio',
    price: 129,
    description:
      'Immersive over-ear sound with adaptive noise cancelling, plush memory-foam cushions and 40 hours of battery life. Designed for deep focus and long listening sessions.',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=85',
    stock: 24,
    rating: 4.8,
    review_count: 284,
    badge: 'Bestseller',
    highlights: [
      'Adaptive active noise cancellation',
      '40-hour battery with USB-C fast charge',
      'Memory-foam ear cushions',
      'Bluetooth 5.3 with multipoint pairing'
    ]
  },
  {
    slug: 'orbit-smartwatch',
    name: 'Orbit Smartwatch',
    category: 'Wearables',
    price: 189,
    description:
      'A quietly capable everyday smartwatch. Track workouts, sleep and heart rate on a crisp always-on display, wrapped in a lightweight recycled aluminium case.',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=85',
    stock: 16,
    rating: 4.7,
    review_count: 163,
    badge: 'New',
    highlights: [
      'Always-on 1.4" AMOLED display',
      'Heart rate, sleep and SpO2 tracking',
      '7-day battery life',
      '5 ATM water resistance'
    ]
  },
  {
    slug: 'drift-canvas-backpack',
    name: 'Drift Canvas Backpack',
    category: 'Bags',
    price: 74.5,
    description:
      'A hard-wearing canvas daypack with thoughtful organisation for work and weekends. Fits a 15-inch laptop, with a padded back panel and weatherproof base.',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=85',
    stock: 32,
    rating: 4.6,
    review_count: 98,
    badge: null,
    highlights: [
      '18L capacity with padded laptop sleeve',
      'Water-resistant waxed canvas',
      'Ergonomic padded shoulder straps',
      'Hidden security pocket'
    ]
  },
  {
    slug: 'solstice-sunglasses',
    name: 'Solstice Sunglasses',
    category: 'Eyewear',
    price: 59,
    description:
      'Classic silhouettes, modern optics. Solstice pairs bio-acetate frames with polarised lenses for easy, everyday eye protection.',
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=1000&q=85',
    stock: 27,
    rating: 4.5,
    review_count: 76,
    badge: null,
    highlights: [
      'Polarised UV400 lenses',
      'Bio-acetate frame',
      'Lightweight at just 24g',
      'Protective case included'
    ]
  },
  {
    slug: 'frame-x-mirrorless-camera',
    name: 'Frame X Mirrorless Camera',
    category: 'Photography',
    price: 899,
    description:
      'A compact mirrorless system for stills and video. The 26MP sensor, in-body stabilisation and tactile dials make every frame feel intentional.',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1000&q=85',
    stock: 8,
    rating: 4.9,
    review_count: 142,
    badge: 'Limited',
    highlights: [
      '26MP APS-C sensor',
      '5-axis in-body stabilisation',
      '4K/60p video recording',
      'Weather-sealed magnesium body'
    ]
  },
  {
    slug: 'pulse-portable-speaker',
    name: 'Pulse Portable Speaker',
    category: 'Audio',
    price: 89,
    description:
      'Big, room-filling sound in a packable package. Pulse is waterproof, dustproof and ready to soundtrack everything from picnics to road trips.',
    image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=1000&q=85',
    stock: 21,
    rating: 4.7,
    review_count: 119,
    badge: null,
    highlights: [
      '360° room-filling sound',
      'IP67 waterproof and dustproof',
      '18-hour battery life',
      'Pair two speakers for stereo'
    ]
  },
  {
    slug: 'tactile-mechanical-keyboard',
    name: 'Tactile Mechanical Keyboard',
    category: 'Workspace',
    price: 119,
    description:
      'A compact 75% mechanical keyboard with hot-swappable switches, a gasket-mounted plate and a satisfying, low-key sound profile.',
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1000&q=85',
    stock: 19,
    rating: 4.8,
    review_count: 121,
    badge: 'Staff pick',
    highlights: [
      'Hot-swappable tactile switches',
      'Gasket-mounted for a soft typing feel',
      'Wireless, Bluetooth and USB-C',
      'PBT keycaps with Mac and PC layouts'
    ]
  },
  {
    slug: 'lumen-desk-lamp',
    name: 'Lumen Desk Lamp',
    category: 'Home',
    price: 64,
    description:
      'Soft, glare-free task lighting with a sculptural steel arm. Lumen adjusts from warm evening glow to crisp daylight with a single touch.',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1000&q=85',
    stock: 30,
    rating: 4.6,
    review_count: 58,
    badge: null,
    highlights: [
      'Five brightness levels',
      'Adjustable colour temperature',
      'Integrated USB-C charging port',
      'Powder-coated steel build'
    ]
  },
  {
    slug: 'form-ceramic-mug',
    name: 'Form Ceramic Mug',
    category: 'Home',
    price: 24,
    description:
      'A perfectly weighted 350ml mug, hand-finished in a speckled matte glaze. Made for slow mornings and second cups.',
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=1000&q=85',
    stock: 45,
    rating: 4.9,
    review_count: 204,
    badge: 'Bestseller',
    highlights: [
      '350ml stoneware capacity',
      'Hand-finished speckled glaze',
      'Dishwasher and microwave safe',
      'Comfort-grip handle'
    ]
  },
  {
    slug: 'trail-running-sneakers',
    name: 'Trail Running Sneakers',
    category: 'Footwear',
    price: 134,
    description:
      'Lightweight trail shoes with a grippy lug pattern and responsive foam. Equally at home on city streets and muddy weekend paths.',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=85',
    stock: 26,
    rating: 4.7,
    review_count: 187,
    badge: 'Bestseller',
    highlights: [
      'Responsive nitrogen-infused foam',
      'Multi-directional traction lugs',
      'Breathable recycled knit upper',
      'Rock plate for underfoot protection'
    ]
  },
  {
    slug: 'everyday-leather-tote',
    name: 'Everyday Leather Tote',
    category: 'Bags',
    price: 149,
    description:
      'A minimal carry-all cut from full-grain leather that only gets better with age. Roomy enough for a laptop, a notebook and the rest of your day.',
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1000&q=85',
    stock: 14,
    rating: 4.8,
    review_count: 89,
    badge: null,
    highlights: [
      'Full-grain vegetable-tanned leather',
      'Fits a 14-inch laptop',
      'Internal zip pocket',
      'Reinforced base and handles'
    ]
  },
  {
    slug: 'analog-instant-camera',
    name: 'Analog Instant Camera',
    category: 'Photography',
    price: 109,
    description:
      'Point, shoot, print. A playful instant camera with a sharp glass lens, automatic exposure and a built-in selfie mirror for keeping the good moments physical.',
    image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=1000&q=85',
    stock: 12,
    rating: 4.6,
    review_count: 73,
    badge: 'New',
    highlights: [
      'Automatic exposure control',
      'Built-in selfie mirror',
      'Sharp 2-element glass lens',
      'USB-C rechargeable battery'
    ]
  }
];

if (db.prepare('SELECT COUNT(*) AS count FROM products').get().count === 0) {
  const insert = db.prepare(`
    INSERT INTO products
      (slug, name, category, price, description, image, stock, rating, review_count, badge, highlights)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN');
  try {
    for (const product of products) {
      insert.run(
        product.slug,
        product.name,
        product.category,
        product.price,
        product.description,
        product.image,
        product.stock,
        product.rating,
        product.review_count,
        product.badge,
        JSON.stringify(product.highlights)
      );
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function hydrateProduct(row) {
  if (!row) return null;
  let highlights = [];
  try {
    highlights = JSON.parse(row.highlights || '[]');
  } catch {
    highlights = [];
  }
  return { ...row, highlights };
}

module.exports = {
  db,
  dbPath,
  hydrateProduct,
  sessionTtlMs: 7 * 24 * 60 * 60 * 1000
};
