import admin from 'firebase-admin';
import { readFileSync } from 'fs';

let db;

export function initFirestore() {
  if (db) return db;

  try {
    // Try to find existing service account key
    const possiblePaths = [
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
      '/home/ubuntu/.config/google/serviceAccountKey.json',
      '/home/ubuntu/clawd/config/serviceAccountKey.json',
    ].filter(Boolean);

    let serviceAccount;
    for (const path of possiblePaths) {
      try {
        serviceAccount = JSON.parse(readFileSync(path, 'utf8'));
        console.log(`✓ Found Firebase credentials at ${path}`);
        break;
      } catch (err) {
        continue;
      }
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      // Fall back to Application Default Credentials (works on Cloud Run, etc.)
      console.log('⚠ No service account found, using Application Default Credentials');
      admin.initializeApp();
    }

    db = admin.firestore();
    console.log('✓ Firestore initialized');
    return db;

  } catch (error) {
    console.error('✗ Firestore initialization failed:', error.message);
    throw error;
  }
}

export function getDb() {
  if (!db) {
    return initFirestore();
  }
  return db;
}

export default { initFirestore, getDb };
