import admin from 'firebase-admin';
import fs from 'fs';
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync('../service-account.json','utf8'))) });
const doc = await admin.firestore().collection('users').doc('b5e09aea-0f75-4fb0-a5c3-04f5789789a2').get();
const d = doc.data() ?? {};
console.log('last_active_at:', d.last_active_at, d.last_active_at ? '→ КОНТРОЛЬНАЯ ЗАПИСЬ ПРОШЛА' : '→ контрольной записи НЕТ');
console.log('updatedAt:', d.updatedAt);
console.log('progress ключей:', Object.keys(d.progress ?? {}).length);
process.exit(0);
