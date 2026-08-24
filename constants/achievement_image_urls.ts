/**
 * Публичные URL арта достижений в Firebase Storage.
 *
 * зачем: статуэтки не едут в нативный бинарь (Фаза 4 «Бандл-диеты», решение
 * владельца 2026-08-24) — они лежат в Storage под `achievement-images/<id>.webp`
 * и живут в дисковом кэше expo-image.
 *
 * Почему формула, а не таблица: правило
 * `match /achievement-images/{allPaths=**} { allow get: if true; }` делает
 * объекты публичными, поэтому download-токен в URL не нужен и адрес однозначно
 * выводится из id. Прежняя AUTO-GENERATED карта перечисляла лишь 35 из 70
 * статуэток и молча расходилась с тем, что реально залито; формула такой
 * рассинхронизации не допускает.
 *
 * «Ядро» (constants/achievementCoreArt.ts) сюда не попадает — оно в бандле и
 * работает офлайн с первого кадра.
 */
import { isCoreAchievementArt } from './achievementCoreArt';

const BUCKET = 'phraseman-ea0b3.firebasestorage.app';
const STORAGE_PREFIX = 'achievement-images';

/** Путь объекта в бакете — та же формула, что у скриптов заливки. */
export function achievementObjectPath(id: string): string {
  return `${STORAGE_PREFIX}/${id}.webp`;
}

/** URL арта достижения (undefined — арт в бандле, сеть не нужна). */
export function getAchievementImageUrl(id: string): string | undefined {
  if (isCoreAchievementArt(id)) return undefined;
  const encoded = encodeURIComponent(achievementObjectPath(id));
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encoded}?alt=media`;
}
