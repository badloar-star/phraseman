/**
 * Ресурс-файлы пакетов фразы дня es/de/it (D163): чтение текста пакета с диска.
 *
 * зачем (координатор 12.10, замер hermesc -O): как JS-модули три пакета добавляли +2,27 МБ байт-кода в бандл — его грузит
 * каждый холодный старт, и растёт размер в сторе. Ресурс `.dpk` (JSON-текст, расширение зарегистрировано в metro.config.js)
 * лежит рядом с бандлом и читается только при первом открытии фразы дня этой цели. Приём: Asset.downloadAsync под
 * сроком — в dev-сборке это сеть до сборщика (так же делал удалённый 22.10 прогрев записей урока).
 * Логи: `[DAILY-PHRASE-GATE] asset …` — каждый шаг и каждый отказ с причиной.
 */
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import type { BundledDailyPhraseTarget } from './daily_phrase_bundled_packs';

const ASSET_TIMEOUT_MS = 15_000;

function assetModuleFor(target: BundledDailyPhraseTarget): number {
  // Номер ресурса, а не данные: сами байты в JS-бандл не попадают.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  if (target === 'es') return require('../assets/daily_phrase_packs/es.dpk') as number;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  if (target === 'de') return require('../assets/daily_phrase_packs/de.dpk') as number;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../assets/daily_phrase_packs/it.dpk') as number;
}

function withTimeout<T>(promise: Promise<T>, step: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`daily_phrase_pack_asset_timeout:${step}`)), ASSET_TIMEOUT_MS);
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/** Текст пакета или null (каждая причина отказа в журнале). */
export async function readDailyPhrasePackText(target: BundledDailyPhraseTarget): Promise<string | null> {
  const startedAt = Date.now();
  try {
    const asset = Asset.fromModule(assetModuleFor(target));
    const hadLocal = Boolean(asset.localUri);
    if (!asset.localUri) await withTimeout(asset.downloadAsync(), `download_${target}`);
    const localUri = asset.localUri ?? asset.uri;
    if (!localUri) {
      console.warn('[DAILY-PHRASE-GATE] asset: no uri', JSON.stringify({ target })); // guard-ok: ранний выход называет причину
      return null;
    }
    const text = await withTimeout(new File(localUri).text(), `read_${target}`);
    console.log('[DAILY-PHRASE-GATE] asset: read', JSON.stringify({ target, hadLocal, bytes: text.length, ms: Date.now() - startedAt }));
    return text;
  } catch (error) {
    console.warn('[DAILY-PHRASE-GATE] asset: read failed', JSON.stringify({ target, ms: Date.now() - startedAt, message: error instanceof Error ? error.message : String(error) })); // guard-ok: catch называет причину
    return null;
  }
}

export default function __DailyPhrasePackAssetsRouteShim() {
  return null;
}
