import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { Pool } from "pg";
import sqlite3 from "sqlite3";
import fs from "fs";
import formidable from "formidable";

let dbType, db, pool;
const isProduction = process.env.DATABASE_URL || process.env.ENV === "production";

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: isProduction
      ? process.env.FIREBASE_BUCKET_PROD
      : process.env.FIREBASE_BUCKET_DEV,
  });
}
const bucket = getStorage().bucket();

if (isProduction) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  });
  dbType = "pg";
} else {
  db = new sqlite3.Database("./products.db");
  dbType = "sqlite";
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    // Get all products
    if (dbType === "pg") {
      try {
        const result = await pool.query(
          "SELECT id, name, featured, brand, finish, images FROM products"
        );
        const products = result.rows.map((row) => ({
          id: row.id,
          name: row.name,
          featured: row.featured,
          brand: row.brand,
          finish: row.finish,
          thumbnail: (row.images ? JSON.parse(row.images)[0] : null) || null,
        }));
        res.status(200).json(products);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    } else {
      db.all(
        "SELECT id, name, featured, brand, finish, images FROM products",
        [],
        (err, rows) => {
          if (err) return res.status(500).json({ error: err.message });
          const products = rows.map((row) => ({
            id: row.id,
            name: row.name,
            featured: row.featured,
            brand: row.brand,
            finish: row.finish,
            thumbnail: (row.images ? JSON.parse(row.images)[0] : null) || null,
          }));
          res.status(200).json(products);
        }
      );
    }
  } else if (req.method === "POST") {
    // Product creation endpoint (with file upload)
    const form = formidable({ multiples: true, maxFileSize: 15 * 1024 * 1024 });
    form.parse(req, async (err, fields, files) => {
      if (err) {
        res.status(400).json({ error: "Error parsing form data" });
        return;
      }
      const { name, brand, finish, description, sizes, featured, key_features } = fields;
      const imageUrls = [];

      // Handle file uploads (can be array or single file)
      let fileList = [];
      if (files.images) {
        if (Array.isArray(files.images)) {
          fileList = files.images;
        } else {
          fileList = [files.images];
        }
      }

      for (const file of fileList) {
        const firebaseFile = bucket.file(Date.now() + "-" + file.originalFilename);
        await firebaseFile.save(fs.readFileSync(file.filepath), {
          metadata: { contentType: file.mimetype },
        });
        await firebaseFile.makePublic();
        imageUrls.push(firebaseFile.publicUrl());
        fs.unlinkSync(file.filepath); // Remove temp file
      }

      // Ensure all text fields are plain strings
      const nameToStore = typeof name === "string" ? name : String(name);
      const brandToStore = typeof brand === "string" ? brand : String(brand);
      const finishToStore = typeof finish === "string" ? finish : String(finish);
      const descriptionToStore = typeof description === "string" ? description : String(description);

      // Correct handling for sizesToStore
      let sizesToStore = sizes;
      // if (typeof sizesToStore !== 'string') {
      //   sizesToStore = JSON.stringify(sizesToStore);
      // }

      let keyFeaturesToStore = key_features;
      if (typeof keyFeaturesToStore !== "string") {
        keyFeaturesToStore = JSON.parse(keyFeaturesToStore);
      }

      let keyFeaturesParsed = [];
      if (
        typeof keyFeaturesToStore === "string" &&
        keyFeaturesToStore.trim().startsWith("[")
      ) {
        try {
          keyFeaturesParsed = JSON.parse(keyFeaturesToStore);
        } catch (e) {
          keyFeaturesParsed = [];
        }
      }

      const featuredBool =
        featured === "true" ||
        featured === "1" ||
        featured === 1 ||
        featured === true;

      if (dbType === "pg") {
        try {
          const result = await pool.query(
            "INSERT INTO products (name, brand, finish, description, images, sizes, featured, key_features) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
            [
              nameToStore,
              brandToStore,
              finishToStore,
              descriptionToStore,
              JSON.stringify(imageUrls),
              sizesToStore,
              featuredBool,
              keyFeaturesParsed
            ]
          );
          res.json({ id: result.rows[0].id });
        } catch (err) {
          console.error("DB Error:", err);
          res.status(500).json({ error: err.message });
        }
      } else {
        db.run(
          "INSERT INTO products (name, brand, finish, description, images, sizes, featured, key_features) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [
            nameToStore,
            brandToStore,
            finishToStore,
            descriptionToStore,
            JSON.stringify(imageUrls),
            sizesToStore,
            featured || 0,
            keyFeaturesToStore
          ],
          function (err) {
            if (err) {
              console.error("DB Error:", err);
              return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID });
          }
        );
      }
    });
  } else {
    res.status(405).send("Method Not Allowed");
  }
}