import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.FIREBASE_BUCKET_PROD,
  });
}
const bucket = getStorage().bucket();

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).send("Method Not Allowed");
    return;
  }
  const file = bucket.file("catalogue.pdf");
  const [exists] = await file.exists();
  if (!exists) {
    res.status(404).send("File not found.");
    return;
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'inline; filename="catalogue.pdf"');
  file.createReadStream().pipe(res);
}