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
  const id = req.query.id;

  if (req.method === "GET") {
    // Get a single product by ID
    if (dbType === "pg") {
      try {
        const result = await pool.query("SELECT * FROM products WHERE id = $1", [id]);
        const row = result.rows[0];
        if (!row) return res.status(404).json({ error: "Product not found" });
        let sizesParsed = [];
        let imagesParsed = [];
        try {
          sizesParsed = row.sizes ? JSON.parse(row.sizes) : [];
        } catch {
          sizesParsed = [];
        }
        try {
          imagesParsed = row.images ? JSON.parse(row.images) : [];
        } catch {
          imagesParsed = [];
        }
        res.status(200).json({
          ...row,
          sizes: sizesParsed,
          images: imagesParsed,
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
      }
    } else {
      db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: err.message });
        }
        if (!row) return res.status(404).json({ error: "Product not found" });
        let product = {
          ...row,
          images: row.images ? JSON.parse(row.images) : [],
        };
        if (typeof product.sizes === "string") {
          try {
            product.sizes = JSON.parse(product.sizes);
          } catch {
            product.sizes = [];
          }
        }
        res.status(200).json(product);
      });
    }
  } else if (req.method === "PATCH") {
    // Update a product by ID (with file upload)
    const form = formidable({ multiples: true, maxFileSize: 15 * 1024 * 1024 });
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Error parsing form data" });
      }
      const { name, featured, brand, finish, description, sizes, key_features } = fields;

      // Convert featured to boolean
      let featuredBool = false;
      if (typeof featured === "string") {
        featuredBool = featured.trim() === "true" || featured.trim() === "1";
      } else if (typeof featured === "number") {
        featuredBool = featured === 1;
      } else if (typeof featured === "boolean") {
        featuredBool = featured;
      } else {
        featuredBool = false;
      }

      // Ensure all text fields are plain strings
      const nameToStore = typeof name === "string" ? name : String(name);
      const brandToStore = typeof brand === "string" ? brand : String(brand);
      const finishToStore = typeof finish === "string" ? finish : String(finish);
      const descriptionToStore = typeof description === "string" ? description : String(description);

      // Correct handling for sizesToStore
      let sizesToStore = sizes;
      if (typeof sizesToStore !== 'string') {
        sizesToStore = JSON.stringify(sizesToStore);
      }
      if (
        sizesToStore.trim().startsWith('["[') &&
        sizesToStore.trim().endsWith(']"]')
      ) {
        sizesToStore = sizesToStore.trim().slice(2, -2);
      }

      // Remove all backslashes
      sizesToStore = sizesToStore.replace(/\\/g, "");
      
            let keyFeaturesToStore = key_features;
      if (typeof keyFeaturesToStore !== "string") {
        keyFeaturesToStore = JSON.stringify(keyFeaturesToStore);
      }
      if (typeof keyFeaturesToStore !== 'string') {
        keyFeaturesToStore = JSON.stringify(keyFeaturesToStore);
      }
      if (
        keyFeaturesToStore.trim().startsWith('["[') &&
        keyFeaturesToStore.trim().endsWith(']"]')
      ) {
        keyFeaturesToStore = keyFeaturesToStore.trim().slice(2, -2);
      }
      
      let keyFeaturesParsed = [];
      if (Array.isArray(key_features)) {
        keyFeaturesParsed = key_features.map(f => String(f).trim()).filter(f => f);
      } else if (typeof key_features === "string") {
        const trimmed = key_features.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          try {
            keyFeaturesParsed = JSON.parse(trimmed).map(f => String(f).trim()).filter(f => f);
          } catch {
            keyFeaturesParsed = [];
          }
        } else if (trimmed.includes(",")) {
          keyFeaturesParsed = trimmed.split(",").map(f => f.trim()).filter(f => f);
        } else if (trimmed.length > 0) {
          keyFeaturesParsed = [trimmed];
        }
      }

      console.log("keyFeaturesParsed to DB:", keyFeaturesParsed);

      // 1. Get kept images from request body
      let keptImages = [];
      if (fields.images) {
        try {
          if (Array.isArray(fields.images)) {
            // If it's an array, check if any element is a stringified array
            keptImages = fields.images.flatMap(img => {
              if (typeof img === "string" && img.trim().startsWith("[")) {
                try {
                  return JSON.parse(img);
                } catch {
                  return [];
                }
              }
              return [img];
            });
          } else if (typeof fields.images === "string" && fields.images.trim().startsWith("[")) {
            // If it's a stringified array
            keptImages = JSON.parse(fields.images);
          } else if (typeof fields.images === "string") {
            keptImages = [fields.images];
          }
        } catch {
          keptImages = [];
        }
      }
      if (!Array.isArray(keptImages)) {
        keptImages = [];
      }

      // 2. Upload new images to Firebase Storage
      const newImageUrls = [];
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
        newImageUrls.push(firebaseFile.publicUrl());
        fs.unlinkSync(file.filepath); // Remove temp file
      }

      // 3. Merge kept images and new image URLs, only keep valid URLs
      const isValidUrl = (url) =>
        typeof url === "string" &&
        (url.startsWith("http://") || url.startsWith("https://"));

      const finalImages = [
        ...keptImages.filter(isValidUrl),
        ...newImageUrls.filter(isValidUrl),
      ];

      let finalImagesToStore = JSON.stringify(finalImages);

      // 4. Update the product in the DB
      if (dbType === "pg") {
        try {
          const result = await pool.query(
            "UPDATE products SET name = $1, brand = $2, finish = $3, description = $4, images = $5, sizes = $6, featured = $7, key_features = $8 WHERE id = $9",
            [
              nameToStore,
              brandToStore,
              finishToStore,
              descriptionToStore,
              finalImagesToStore, 
              sizesToStore || [], 
              featuredBool,
              keyFeaturesParsed, 
              id,
            ]
          );
          if (result.rowCount === 0)
            return res.status(404).json({ error: "Product not found" });
          res.status(200).json({ success: true });
        } catch (err) {
          console.error(err);
          res.status(500).json({ error: err.message });
        }
      } else {
        db.run(
          "UPDATE products SET name = ?, featured = ?, brand = ?, finish = ?, description = ?, images = ?, sizes = ?, key_features = ? WHERE id = ?",
          [
            nameToStore,
            featuredBool,
            brandToStore,
            finishToStore,
            descriptionToStore,
            finalImagesToStore,
            sizesToStore || [],
            keyFeaturesParsed,
            id,
          ],
          function (err) {
            if (err) {
              console.error(err);
              return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0)
              return res.status(404).json({ error: "Product not found" });
            res.status(200).json({ success: true });
          }
        );
      }
    });
  } else if (req.method === "DELETE") {
    // Delete a product by ID
    if (dbType === "pg") {
      try {
        await pool.query("DELETE FROM products WHERE id = $1", [id]);
        res.status(200).json({ success: true });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
      }
    } else {
      db.run("DELETE FROM products WHERE id = ?", [id], function (err) {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: err.message });
        }
        res.status(200).json({ success: true });
      });
    }
  } else {
    res.status(405).send("Method Not Allowed");
  }
}