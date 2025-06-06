const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const app = express();

app.use(cors());
app.use(express.json({ limit: '15mb' })); // For base64 images and sizes
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Initialize SQLite database
const db = new sqlite3.Database('./products.db');

// Create products table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  brand TEXT,
  finish TEXT,
  description TEXT,
  images TEXT,  --Store up to 3 images as JSON array
  sizes TEXT -- Store sizes (with gauge/dots) as JSON string
)`);

// Get all products
app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const products = rows.map(row => ({
      ...row,
      sizes: row.sizes ? JSON.parse(row.sizes) : [],
      images: row.images ? JSON.parse(row.images) : [], // Parse images array
    }));
    res.json(products);
  });
});

// Get a single product by ID
app.get('/api/products/:id', (req, res) => {
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Product not found' });
    res.json({
      ...row,
      sizes: row.sizes ? JSON.parse(row.sizes) : [],
      images: row.images ? JSON.parse(row.images) : [],
    });
  });
});

// Add a new product
app.post('/api/products', (req, res) => {
  const { name, brand, finish, description, images, sizes } = req.body;
  db.run(
    'INSERT INTO products (name, brand, finish, description, images, sizes) VALUES (?, ?, ?, ?, ?, ?)',
    [name, brand, finish, description, JSON.stringify(images || []), JSON.stringify(sizes || [])],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// Delete a product by ID
app.delete('/api/products/:id', (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Update a product by ID
app.patch('/api/products/:id', (req, res) => {
  const { name, brand, finish, description, images, sizes } = req.body;
  db.run(
    'UPDATE products SET name = ?, brand = ?, finish = ?, description = ?, images = ?, sizes = ? WHERE id = ?',
    [name, brand, finish, description, JSON.stringify(images || []), JSON.stringify(sizes || []), req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Product not found' });
      res.json({ success: true });
    }
  );
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