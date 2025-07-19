const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Firebase Admin setup
const env = process.env.NODE_ENV || 'development';

const serviceAccount = require(
  env === 'production'
    ? './firebase-service-account.prod.json'
    : './firebase-service-account.dev.json'
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: env === 'production'
    ? process.env.FIREBASE_BUCKET_PROD
    : process.env.FIREBASE_BUCKET_DEV
});

const bucket = admin.storage().bucket();
const upload = multer({ dest: 'uploads/' }); // Temporary local storage

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
    await pool.query('SET search_path TO public');
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
      // Only select id, name, and images
      const result = await pool.query('SELECT id, name, images FROM products');
      // Only send the first image as thumbnail
      const products = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        thumbnail: (row.images ? JSON.parse(row.images)[0] : null) || null
      }));
      res.json(products);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    db.all('SELECT id, name, images FROM products', [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const products = rows.map(row => ({
        id: row.id,
        name: row.name,
        thumbnail: (row.images ? JSON.parse(row.images)[0] : null) || null
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
      let product = {
        ...row,
        images: row.images ? JSON.parse(row.images) : [],
      };
      if (typeof product.sizes === 'string') {
        try {
          product.sizes = JSON.parse(product.sizes);
        } catch {
          product.sizes = [];
        }
      }
      res.json(product);
    });
  }
});

// Product creation endpoint
app.post('/api/products', upload.array('images', 8), async (req, res) => {
  const { name, brand, finish, description, sizes } = req.body;
  const imageUrls = [];

  // Upload each file to Firebase Storage
  for (const file of req.files) {
    const firebaseFile = bucket.file(Date.now() + '-' + file.originalname);
    await firebaseFile.save(fs.readFileSync(file.path), {
      metadata: { contentType: file.mimetype }
    });
    await firebaseFile.makePublic();
    imageUrls.push(firebaseFile.publicUrl());
    fs.unlinkSync(file.path); // Remove temp file
  }

  let sizesToStore = sizes;
  if (typeof sizesToStore !== 'string') {
    sizesToStore = JSON.stringify(sizesToStore);
  }

  // Save product with imageUrls in DB as before
  if (dbType === 'pg') {
    try {
      const result = await pool.query(
        'INSERT INTO products (name, brand, finish, description, images, sizes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [name, brand, finish, description, JSON.stringify(imageUrls), sizesToStore]
      );
      res.json({ id: result.rows[0].id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    db.run(
      'INSERT INTO products (name, brand, finish, description, images, sizes) VALUES (?, ?, ?, ?, ?, ?)',
      [name, brand, finish, description, JSON.stringify(imageUrls), sizesToStore],
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
app.patch('/api/products/:id', upload.array('images', 8), async (req, res) => {
  const { name, featured, brand, finish, description, sizes } = req.body;
  const id = req.params.id;
  let sizesToStore = sizes;
  if (typeof sizesToStore !== 'string') {
    sizesToStore = JSON.stringify(sizesToStore);
  }
  // 1. Get kept images from request body
  let keptImages = [];
  if (req.body.images) {
    try {
      keptImages = Array.isArray(req.body.images)
        ? req.body.images
        : JSON.parse(req.body.images);
    } catch {
      keptImages = [];
    }
  }

  // 2. Upload new images to Firebase Storage
  const newImageUrls = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const firebaseFile = bucket.file(Date.now() + '-' + file.originalname);
      await firebaseFile.save(fs.readFileSync(file.path), {
        metadata: { contentType: file.mimetype }
      });
      await firebaseFile.makePublic();
      newImageUrls.push(firebaseFile.publicUrl());
      fs.unlinkSync(file.path); // Remove temp file
    }
  }

  // 3. Merge kept images and new image URLs
  const finalImages = [...keptImages, ...newImageUrls];

  // 4. Update the product in the DB
  if (dbType === 'pg') {
    try {
      const result = await pool.query(
        'UPDATE products SET name = $1, brand = $2, finish = $3, description = $4, images = $5, sizes = $6 WHERE id = $7',
        [name, brand, finish, description, JSON.stringify(finalImages), sizesToStore || [], id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Product not found' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    db.run(
      'UPDATE products SET name = ?, featured = ?, brand = ?, finish = ?, description = ?, images = ?, sizes = ? WHERE id = ?',
      [name, featured, brand, finish, description, JSON.stringify(finalImages), sizesToStore || [], id],
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

// Featured products endpoint: returns array of objects { id, imageUrl } from all products
app.get('/api/featured-products', async (req, res) => {
  if (dbType === 'pg') {
    try {
      const result = await pool.query('SELECT id, images FROM products');
      const products = result.rows
        .map(row => {
          try {
            const arr = JSON.parse(row.images);
            return (Array.isArray(arr) && arr[0])
              ? { id: row.id, imageUrl: arr[0] }
              : null;
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      res.json(products);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    db.all('SELECT id, images FROM products WHERE featured = 1', [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const products = rows
        .map(row => {
          try {
            const arr = JSON.parse(row.images);
            return (Array.isArray(arr) && arr[0])
              ? { id: row.id, imageUrl: arr[0] }
              : null;
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      res.json(products);
    });
  }
});

// Serve the frontend
app.listen(3000, () => console.log('Server running on http://localhost:3000'));