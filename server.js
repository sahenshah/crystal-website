const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
const app = express();

app.use(cors());
app.use(express.json({ limit: '15mb' })); // For base64 images and sizes
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// PostgreSQL pool configuration
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
      }
    : {
        user: 'crystal',
        host: 'localhost',
        database: 'products',
        password: 'crystal',
        port: 5432,
      }
);

// Ensure products table exists
async function ensureProductsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT,
      brand TEXT,
      finish TEXT,
      description TEXT,
      images TEXT,
      sizes TEXT
    )
  `);
}
ensureProductsTable().catch(console.error);

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products');
    const products = result.rows.map(row => ({
      ...row,
      sizes: row.sizes ? JSON.parse(row.sizes) : [],
      images: row.images ? JSON.parse(row.images) : [], // Parse images array
    }));
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Product not found' });
    res.json({
      ...row,
      sizes: row.sizes ? JSON.parse(row.sizes) : [],
      images: row.images ? JSON.parse(row.images) : [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new product
app.post('/api/products', async (req, res) => {
  const { name, brand, finish, description, images, sizes } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO products (name, brand, finish, description, images, sizes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [name, brand, finish, description, JSON.stringify(images || []), JSON.stringify(sizes || [])]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a product by ID
app.delete('/api/products/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a product by ID
app.patch('/api/products/:id', async (req, res) => {
  const { name, brand, finish, description, images, sizes } = req.body;
  try {
    const result = await pool.query(
      'UPDATE products SET name = $1, brand = $2, finish = $3, description = $4, images = $5, sizes = $6 WHERE id = $7',
      [name, brand, finish, description, JSON.stringify(images || []), JSON.stringify(sizes || []), req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;
  // Configure your transporter (use real credentials in production)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'crystal.industries.website@gmail.com',
      pass: 'zhurkjembtwfcfig'
    }
  });
  await transporter.sendMail({
    from: '"Crystal Website Contact" <crystal.industries.website@gmail.com>',
    to: 'sahenshah95@gmail.com',
    replyTo: email,
    subject: `Contact Form: ${name}`,
    text: `From: ${name} <${email}>\n\n${message}`
  });
  res.json({ success: true });
});

// Serve the frontend
app.listen(3000, () => console.log('Server running on http://localhost:3000'));