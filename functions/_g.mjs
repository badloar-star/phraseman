import admin from 'firebase-admin';
import fs from 'fs';
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync('../service-account.json','utf8'))) });
const doc = await admin.firestore().collection('users').doc('b5e09aea-0f75-4fb0-a5c3-04f5789789a2').get();
const p = doc.data()?.progress ?? {};
console.log('progress ключей:', Object.keys(p).length);
console.log('есть user_frame:', 'user_frame' in p);
process.exit(0);
