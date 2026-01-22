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
    if (dbType === "pg") {
      try {
        const result = await pool.query(
          "SELECT id, images FROM products WHERE featured = TRUE"
        );
        const products = result.rows
          .map((row) => {
            try {
              const arr = JSON.parse(row.images);
              return Array.isArray(arr) && arr[0]
                ? { id: row.id, imageUrl: arr[0] }
                : null;
            } catch {
              return null;
            }
          })
          .filter(Boolean);
        res.status(200).json(products);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    } else {
      db.all(
        "SELECT id, images FROM products WHERE featured = 1",
        [],
        (err, rows) => {
          if (err) return res.status(500).json({ error: err.message });
          const products = rows
            .map((row) => {
              try {
                const arr = JSON.parse(row.images);
                return Array.isArray(arr) && arr[0]
                  ? { id: row.id, imageUrl: arr[0] }
                  : null;
              } catch {
                return null;
              }
            })
            .filter(Boolean);
          res.status(200).json(products);
        }
      );
    }
  } else {
    res.status(405).send("Method Not Allowed");
  }
}