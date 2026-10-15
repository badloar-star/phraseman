// spire_config_offline.ts — что показать, когда конфиг Пика не прочитался (решение координатора 15.10, бета-тест А4).
//
// зачем: при отказе чтения конфига экран падал в замок «Пик откроется чуть позже» — но причина часто сеть, а не «выключено». Здесь по состоянию сети (NetInfo, как у каталога Карточек)
// выбирается, какой дефолт подставить: SPIRE_CONFIG_OFFLINE (тот же замок, но экран пишет «Нет интернета») или обычный SPIRE_CONFIG_DEFAULTS. Запросов в сеть не добавляет.
// Лог [SPIRE-OFFLINE]: вход, вердикт и причина, итог.
import NetInfo from '@react-native-community/netinfo';

import { SPIRE_CONFIG_DEFAULTS, type SpireConfigDoc } from '../../modules/spire/config_contract';
import { catalogOfflineVerdict } from '../../app/flashcards/useCatalogOffline';

/** Отдельный объект (по идентичности отличается от дефолта): экран по нему выбирает текст «Нет интернета». */
export const SPIRE_CONFIG_OFFLINE: SpireConfigDoc = Object.freeze({ ...SPIRE_CONFIG_DEFAULTS });

/** Дефолт конфига при сбое чтения: офлайн-вариант, если сети нет, иначе обычный. */
export async function spireConfigFallback(error: unknown): Promise<SpireConfigDoc> {
  const reason = error instanceof Error ? error.message : String(error);
  try {
    const verdict = catalogOfflineVerdict(await NetInfo.fetch());
    console.log(`[SPIRE-OFFLINE] чтение конфига не удалось (${reason}); сеть: offline=${String(verdict.offline)} ${verdict.reason} → ${verdict.offline ? 'SPIRE_CONFIG_OFFLINE («Нет интернета»)' : 'SPIRE_CONFIG_DEFAULTS («откроется чуть позже»)'}`); // guard-ok: ветка решения называет значения
    return verdict.offline ? SPIRE_CONFIG_OFFLINE : SPIRE_CONFIG_DEFAULTS;
  } catch (probeError) {
    console.warn(`[SPIRE-OFFLINE] проверка сети не удалась (${probeError instanceof Error ? probeError.message : String(probeError)}) → обычный замок`); // guard-ok: причина отказа в catch
    return SPIRE_CONFIG_DEFAULTS;
  }
}
