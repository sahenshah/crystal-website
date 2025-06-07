const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

let dbType, db, pool;
const isProduction = process.env.DATABASE_URL || process.env.ENV === 'production';

if (isProduction) {
  // Use PostgreSQL in production
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  });
  dbType = 'pg';

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
} else {
  // Use SQLite locally
  const sqlite3 = require('sqlite3').verbose();
  db = new sqlite3.Database('./products.db');
  dbType = 'sqlite';

  // Ensure products table exists
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        brand TEXT,
        finish TEXT,
        description TEXT,
        images TEXT,
        sizes TEXT
      )
    `);
  });
}

// Get all products
app.get('/api/products', async (req, res) => {
  if (dbType === 'pg') {
    try {
      const result = await pool.query('SELECT * FROM products');
      const products = result.rows.map(row => ({
        ...row,
        sizes: row.sizes ? JSON.parse(row.sizes) : [],
        images: row.images ? JSON.parse(row.images) : [],
      }));
      res.json(products);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    db.all('SELECT * FROM products', [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const products = rows.map(row => ({
        ...row,
        sizes: row.sizes ? JSON.parse(row.sizes) : [],
        images: row.images ? JSON.parse(row.images) : [],
      }));
      res.json(products);
    });
  }
});

// Get a single product by ID
app.get('/api/products/:id', async (req, res) => {
  const id = req.params.id;
  if (dbType === 'pg') {
    try {
      const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
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
  } else {
    db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Product not found' });
      res.json({
        ...row,
        sizes: row.sizes ? JSON.parse(row.sizes) : [],
        images: row.images ? JSON.parse(row.images) : [],
      });
    });
  }
});

// Add a new product
app.post('/api/products', async (req, res) => {
  const { name, brand, finish, description, images, sizes } = req.body;
  if (dbType === 'pg') {
    try {
      const result = await pool.query(
        'INSERT INTO products (name, brand, finish, description, images, sizes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [name, brand, finish, description, JSON.stringify(images || []), JSON.stringify(sizes || [])]
      );
      res.json({ id: result.rows[0].id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    db.run(
      'INSERT INTO products (name, brand, finish, description, images, sizes) VALUES (?, ?, ?, ?, ?, ?)',
      [name, brand, finish, description, JSON.stringify(images || []), JSON.stringify(sizes || [])],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
      }
    );
  }
});

// Delete a product by ID
app.delete('/api/products/:id', async (req, res) => {
  const id = req.params.id;
  if (dbType === 'pg') {
    try {
      await pool.query('DELETE FROM products WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    db.run('DELETE FROM products WHERE id = ?', [id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  }
});

// Update a product by ID
app.patch('/api/products/:id', async (req, res) => {
  const { name, brand, finish, description, images, sizes } = req.body;
  const id = req.params.id;
  if (dbType === 'pg') {
    try {
      const result = await pool.query(
        'UPDATE products SET name = $1, brand = $2, finish = $3, description = $4, images = $5, sizes = $6 WHERE id = $7',
        [name, brand, finish, description, JSON.stringify(images || []), JSON.stringify(sizes || []), id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Product not found' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    db.run(
      'UPDATE products SET name = ?, brand = ?, finish = ?, description = ?, images = ?, sizes = ? WHERE id = ?',
      [name, brand, finish, description, JSON.stringify(images || []), JSON.stringify(sizes || []), id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Product not found' });
        res.json({ success: true });
      }
    );
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