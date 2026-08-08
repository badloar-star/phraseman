import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACHIEVEMENT_IMAGE_URL_MAP } from '../constants/achievementImageUrlMap.generated';

/**
 * Фоновый прогрев дискового кэша арта достижений.
 *
 * зачем: ~165 иконок достижений больше не бандлятся (−5.5 МБ), они лежат в
 * Firebase Storage. Чтобы пользователь НИКОГДА не увидел заглушку вместо
 * заслуженной награды, арт скачивается заранее — задолго до того, как
 * достижение будет получено, — и дальше живёт в дисковом кэше expo-image.
 *
 * Экономия трафика и стоимости Storage:
 *  - выполняется ОДИН раз на устройство (флаг в AsyncStorage с версией карты);
 *  - стартует только после первого кадра и грузит малыми пачками, чтобы не
 *    конкурировать с контентом, который пользователь видит прямо сейчас;
 *  - объекты отдаются с `Cache-Control: immutable, max-age=1 год`, поэтому
 *    повторных обращений к Storage не будет даже после сброса флага;
 *  - при неудаче (нет сети) флаг НЕ ставится — прогрев просто повторится
 *    при следующем запуске, а до тех пор работает щит-заглушка.
 */

// Версия завязана на размер карты: пополнили арт — прогрев пройдёт заново.
const PREFETCH_FLAG_KEY = `achievement_art_prefetched_v${Object.keys(ACHIEVEMENT_IMAGE_URL_MAP).length}`;

// Малые пачки: сеть не забивается, первый экран не тормозит.
const BATCH_SIZE = 8;
const BATCH_PAUSE_MS = 400;
// Стартуем заметно позже первого кадра — приоритет у видимого контента.
const START_DELAY_MS = 4000;

let started = false;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Запускает прогрев в фоне. Безопасно вызывать многократно — реально сработает
 * один раз за сессию и один раз за устройство.
 */
export function prefetchAchievementArtInBackground(): void {
  if (started || __DEV__) return;
  started = true;
  void run();
}

async function run(): Promise<void> {
  try {
    const done = await AsyncStorage.getItem(PREFETCH_FLAG_KEY);
    if (done === '1') return;

    await sleep(START_DELAY_MS);

    const urls = Object.values(ACHIEVEMENT_IMAGE_URL_MAP);
    if (!urls.length) return;

    let failures = 0;
    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const batch = urls.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        // cachePolicy 'disk' — арт нужен на будущее, память под него занимать не нужно.
        batch.map((url) => Image.prefetch(url, { cachePolicy: 'disk' })),
      );
      failures += results.filter((r) => r.status === 'rejected').length;

      // Сети нет — не долбим её впустую: прогрев повторится при следующем старте.
      if (failures >= BATCH_SIZE * 2) return;

      if (i + BATCH_SIZE < urls.length) await sleep(BATCH_PAUSE_MS);
    }

    // Ставим флаг только при по-настоящему успешном проходе.
    if (failures === 0) await AsyncStorage.setItem(PREFETCH_FLAG_KEY, '1');
  } catch {
    // Прогрев — «best effort»: любая ошибка молча откладывает его до следующего
    // запуска, а показ никогда не остаётся пустым благодаря щиту-заглушке.
  }
}
