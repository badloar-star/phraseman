import type { ShareCardLang } from './streakCardCopy';

export function getAchievementCardHeadline(lang: ShareCardLang): string {
  if (lang === 'uk') return 'Досягнення';
  if (lang === 'es') return 'Logro';
  return 'Достижение';
}

function clip(s: string, max: number) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '\u2026';
}

export function clipAchievementTitle(title: string, max = 34) {
  return clip(title, max);
}
