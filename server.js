const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' })); // For base64 images and sizes
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
  image TEXT,
  sizes TEXT -- Store sizes (with gauge/dots) as JSON string
)`);

// Get all products
app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    // Parse sizes JSON before sending to frontend
    const products = rows.map(row => ({
      ...row,
      sizes: row.sizes ? JSON.parse(row.sizes) : []
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
      sizes: row.sizes ? JSON.parse(row.sizes) : []
    });
  });
});

// Add a new product
app.post('/api/products', (req, res) => {
  const { name, brand, finish, description, image, sizes } = req.body;
  db.run(
    'INSERT INTO products (name, brand, finish, description, image, sizes) VALUES (?, ?, ?, ?, ?, ?)',
    [name, brand, finish, description, image, JSON.stringify(sizes || [])],
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

app.listen(3000, () => console.log('Server running on http://localhost:3000'));