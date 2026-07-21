// Сид бот-персон турниров в Firestore (botProfiles/).
// Запуск: node functions/scripts/seed_tournament_bots.js [--count 200] [--overwrite]
// Детерминировано (seed 'tournament-bots-v1'): повторный запуск пишет те же профили.

const admin = require('firebase-admin');
const serviceAccount = require('../../service-account.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const args = process.argv.slice(2);
const countArg = args.indexOf('--count');
const COUNT = countArg >= 0 ? Math.max(1, parseInt(args[countArg + 1], 10) || 200) : 200;
const OVERWRITE = args.includes('--overwrite');
const SEED = 'tournament-bots-v1';

const BOT_NAMES = [
  'Марина', 'Тёма', 'Соня', 'Дэн', 'Лера', 'Гоша', 'Настя', 'Петрович',
  'Юля', 'Сева', 'Кира', 'Макс', 'Олеся', 'Тимур', 'Вера', 'Гриша',
  'Даша', 'Эльдар', 'Милана', 'Савва', 'Алиса', 'Ратмир', 'Злата', 'Егор',
];
const BOT_EMOJI = ['🦊', '🐼', '🦉', '🐸', '🐯', '🦁', '🐨', '🦜', '🐳', '🦄', '🐝', '🦖'];
const BOT_RANKS = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
const BOT_COLORS = ['#47C870', '#FFC800', '#FF5B6C', '#16B7D9', '#B78CFF', '#FF9F43'];
const BOT_TITLES = ['Фразовый маньяк', 'Спринтер', 'Тихий охотник', 'Ветеран слотов', 'Словарный запас'];

function hash32(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function prng(seed) {
  let a = hash32(seed);
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateBotProfile(index) {
  const rand = prng(`${SEED}:bot:${index}`);
  const name = BOT_NAMES[Math.floor(rand() * BOT_NAMES.length)];
  const avatarEmoji = BOT_EMOJI[Math.floor(rand() * BOT_EMOJI.length)];
  const rank = BOT_RANKS[Math.floor(rand() * BOT_RANKS.length)];
  const color = BOT_COLORS[Math.floor(rand() * BOT_COLORS.length)];
  const titlesCount = rand() < 0.4 ? 1 : 0;
  const titles = Array.from({ length: titlesCount }, () => BOT_TITLES[Math.floor(rand() * BOT_TITLES.length)]);
  const winRate = Math.min(0.85, Math.max(0.15, Math.round(((rand() + rand()) / 2) * 70 + 15) / 100));
  return {
    botId: `bot_${String(index + 1).padStart(3, '0')}`,
    name,
    avatarEmoji,
    rank,
    titles,
    winRate,
    color,
  };
}

async function main() {
  const nowMs = Date.now();
  let written = 0;
  for (let i = 0; i < COUNT; i += 400) {
    const batch = db.batch();
    for (let j = i; j < Math.min(COUNT, i + 400); j += 1) {
      const profile = generateBotProfile(j);
      batch.set(db.collection('botProfiles').doc(profile.botId), {
        ...profile,
        isBot: true,
        seedVersion: SEED,
        updatedAt: nowMs,
      }, { merge: OVERWRITE });
      written += 1;
    }
    await batch.commit();
    console.log(`seeded ${written}/${COUNT}`);
  }
  console.log(`Done: ${written} botProfiles (overwrite=${OVERWRITE})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
