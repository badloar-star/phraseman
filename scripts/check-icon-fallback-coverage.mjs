import fs from 'node:fs';

const REQUIRED_MARKERS = [
  {
    file: 'app/achievements_screen.tsx',
    markers: ['AchievementImageWithFallback', 'CategoryIconImageWithFallback'],
  },
  {
    file: 'app/club_screen.tsx',
    markers: ['LeagueIconImageWithFallback'],
  },
  {
    file: 'app/shards_shop.tsx',
    markers: ['ShopIconImageWithFallback'],
  },
  {
    file: 'components/AvatarView.tsx',
    markers: ['AvatarImageWithFallback'],
  },
  {
    file: 'components/CustomAvatarBadge.tsx',
    markers: ['CustomAvatarImageWithFallback'],
  },
  {
    file: 'app/(tabs)/quizzes.tsx',
    markers: ['QuizCardBackgroundImageWithFallback', 'QuizCardLogoImageWithFallback'],
  },
];

const missing = [];

for (const item of REQUIRED_MARKERS) {
  const text = fs.existsSync(item.file) ? fs.readFileSync(item.file, 'utf8') : '';
  for (const marker of item.markers) {
    if (!text.includes(marker)) {
      missing.push(`${item.file}: missing ${marker}`);
    }
  }
}

if (missing.length > 0) {
  console.error('Critical icon slots must render image fallbacks:');
  for (const line of missing) console.error(`- ${line}`);
  process.exit(1);
}

console.log('Critical icon fallback coverage OK');
