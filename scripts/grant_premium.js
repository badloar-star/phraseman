/**
 * Grant 1-year premium to a list of users via RevenueCat API
 *
 * Usage:
 *   1. Set REVENUECAT_SECRET_API_KEY below (from RevenueCat Dashboard → API Keys → Secret keys)
 *   2. Add user IDs to USERS list
 *   3. Run: node scripts/grant_premium.js
 */

const REVENUECAT_SECRET_API_KEY = 'YOUR_SECRET_KEY_HERE'; // RevenueCat → API Keys → Secret key (NOT public SDK key)
const ENTITLEMENT_ID = 'premium'; // название entitlement в RevenueCat

// Список app_user_id пользователей которые получат премиум на 1 год
const USERS = [
  'user_id_1',
  'user_id_2',
  'user_id_3',
  // добавляй сюда...
];

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

async function grantPremium(appUserId) {
  const endTimestamp = Math.floor(Date.now() / 1000) + ONE_YEAR_SECONDS;

  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}/entitlements/${ENTITLEMENT_ID}/promotional`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REVENUECAT_SECRET_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        duration: 'yearly',        // 'daily' | 'weekly' | 'monthly' | 'two_month' | 'three_month' | 'six_month' | 'yearly' | 'lifetime'
        start_time_ms: Date.now(), // с сейчас
      }),
    }
  );

  if (response.ok) {
    console.log(`✅ ${appUserId} — премиум выдан до ${new Date(endTimestamp * 1000).toLocaleDateString('ru-RU')}`);
  } else {
    const err = await response.text();
    console.error(`❌ ${appUserId} — ошибка: ${response.status} ${err}`);
  }
}

async function main() {
  console.log(`Выдаём премиум ${USERS.length} пользователям...\n`);

  for (const userId of USERS) {
    await grantPremium(userId);
    // небольшая задержка чтобы не перегружать API
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\nГотово!');
}

main().catch(console.error);
