import { Asset } from "expo-asset";
import { File } from "expo-file-system";

import type { LEARNING_V2_BOOTSTRAP_AUDIO_ENTRIES_V1 } from "./learning_v2_bootstrap_audio_assets_v1.generated";
import { learningV2NativeDecoderIdentityForAudioFileV1 } from "./learning_v2_audio_identity_v1";
import { learningV2FactoryRemoteAudioFilesForContentHashesV1 } from "./learning_v2_factory_production_audio_v1";
import {
  prepareLearningV2VoiceAudioOfflineBytesV1,
  resolvePreparedLearningV2VoiceAudioOfflineFileV1,
  type LearningV2VoiceAudioOfflineCacheHandleV1,
} from "../modules/learning-v2/runtime/voice_audio_offline_cache_v1";
import type { LearningV2NativeDecoderIdentityV1 } from "../modules/learning-v2/runtime/voice_native_decoder_observer_v1";

type LearningV2BootstrapAudioEntryV1 = (typeof LEARNING_V2_BOOTSTRAP_AUDIO_ENTRIES_V1)[number];
/**
 * зачем (координатор 17.10, [COLD-START]): _layout импортирует этот модуль статически, а набор — 1,2 МБ и 3801 require(mp3):
 * при прежнем импорте все ассеты регистрировались и набор дважды обходился (Map + filter) ДО первого кадра, хотя посев идёт
 * только после первого кадра Главной. Теперь набор подключается при первом обращении (посев, поиск файла занятия).
 */
/** Построчный журнал поиска — только в разработке (в тестовой среде __DEV__ может отсутствовать). */
const AUDIO_MAP_TRACE = typeof __DEV__ !== "undefined" && __DEV__;
let bootstrapEntriesCache: readonly LearningV2BootstrapAudioEntryV1[] | null = null;
function bootstrapAudioEntries(caller: string): readonly LearningV2BootstrapAudioEntryV1[] {
  if (bootstrapEntriesCache) return bootstrapEntriesCache;
  // зачем (координатор 17.10, проверка регрессии «Материал занятия не собрался»): каждая ветка ленивой карты — в журнал [V2-AUDIO-MAP].
  // Загрузка синхронная: первый же вызов возвращает полный набор, «ещё не готово» не бывает; сбой require — в журнал и дальше вызывающему.
  const startedAt = Date.now();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- зачем: ленивая загрузка тяжёлого набора, не в холодный старт
    const mod = require("./learning_v2_bootstrap_audio_assets_v1.generated") as typeof import("./learning_v2_bootstrap_audio_assets_v1.generated");
    bootstrapEntriesCache = mod.LEARNING_V2_BOOTSTRAP_AUDIO_ENTRIES_V1;
    console.log(`[V2-AUDIO-MAP] first_load ${JSON.stringify({ caller, entries: bootstrapEntriesCache.length, launchSeed: bootstrapEntriesCache.filter((e) => e.launchSeed).length, ms: Date.now() - startedAt })}`);
    return bootstrapEntriesCache;
  } catch (error: unknown) {
    console.warn(`[V2-AUDIO-MAP] first_load_failed ${JSON.stringify({ caller, ms: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) })}`);
    throw error;
  }
}
let entryByContentHashCache: Map<string, LearningV2BootstrapAudioEntryV1> | null = null;
function entryByContentHash(): Map<string, LearningV2BootstrapAudioEntryV1> {
  if (!entryByContentHashCache) entryByContentHashCache = new Map(bootstrapAudioEntries("resolve_offline_file").map((entry) => [entry.contentHash, entry]));
  return entryByContentHashCache;
}
// зачем (координатор 15.10, урок 1 целиком в сборку): в наборе теперь все занятия до потолка (до 1120 файлов),
// а посев при запуске считает sha256 каждого тела в JS (~1 с на 140 файлов, профили Сверки 13.10). Сеем только
// первые занятия (флаг launchSeed от генератора); остальные файлы занятие готовит само по запросу через
// resolveLearningV2BootstrapAudioOfflineFileV1 — набор для поиска остаётся полным.
let launchSeedEntriesCache: readonly LearningV2BootstrapAudioEntryV1[] | null = null;
function launchSeedEntries(): readonly LearningV2BootstrapAudioEntryV1[] {
  if (!launchSeedEntriesCache) launchSeedEntriesCache = bootstrapAudioEntries("launch_seed").filter((entry) => entry.launchSeed);
  return launchSeedEntriesCache;
}
let assetPrewarm: Promise<void> | null = null;
let durableSeed: Promise<void> | null = null;

/**
 * Потолок ожидания загрузки ОДНОГО звукового ассета.
 *
 * зачем: владелец 21.09 — прогрев занятия 2 не давал НИ `ready`, НИ ошибки:
 * висел вечно. Корень — `asset.downloadAsync()` ниже: в дев-сборке ассеты
 * тянутся по сети с бандлера, и у этого вызова НЕ БЫЛО срока. Один мёртвый
 * запрос останавливал подготовку занятия целиком и отравлял кэш подготовок
 * незавершённым промисом.
 *
 * 8 секунд на файл: озвучка одной фразы — это десятки килобайт, столько не
 * качается даже на слабой связи. Не уложились — честный отказ, который выше
 * по стеку превращается в «озвучки нет», а не в вечное ожидание.
 */
const BOOTSTRAP_AUDIO_ASSET_TIMEOUT_MS = 8_000;

/** Отклоняет обещание по сроку, называя причину (немой отказ запрещён). */
async function withAssetTimeout<T>(
  promise: Promise<T>,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                `learning_v2_bootstrap_audio_timeout: ${label} ${BOOTSTRAP_AUDIO_ASSET_TIMEOUT_MS}ms`,
              ),
            ),
          BOOTSTRAP_AUDIO_ASSET_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function runBootstrapSeedPool(
  length: number,
  work: (index: number) => Promise<void>,
): Promise<void> {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, length) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= length) return;
      await work(index);
    }
  }));
}

export function preloadLearningV2BootstrapAudioAssetsV1(): Promise<void> {
  if (assetPrewarm) return assetPrewarm;
  // зачем срок: это массовая загрузка ВСЕХ звуковых ассетов, в дев-сборке —
  // по сети с бандлера. Без него одна мёртвая загрузка вешала посев кэша
  // озвучки на всё время жизни приложения. Срок на пачку больше, чем на файл.
  assetPrewarm = Promise.race([
    Asset.loadAsync(
      launchSeedEntries().map((entry) => entry.assetModule),
    ).then(() => undefined),
    new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("learning_v2_bootstrap_audio_timeout: preload_all")),
        BOOTSTRAP_AUDIO_ASSET_TIMEOUT_MS * 4,
      );
    }),
  ]).catch((error) => {
    // Сбрасываем, чтобы следующая попытка началась заново, а не подхватила
    // мёртвое обещание (та же болезнь, что в кэше подготовок занятий).
    assetPrewarm = null;
    throw error;
  });
  return assetPrewarm;
}

export function seedLearningV2BootstrapAudioCacheV1(): Promise<void> {
  if (durableSeed) return durableSeed;
  durableSeed = preloadLearningV2BootstrapAudioAssetsV1()
    .then(async () => {
      const files = learningV2FactoryRemoteAudioFilesForContentHashesV1(
        launchSeedEntries().map((entry) => entry.contentHash),
      );
      // зачем: раньше ЛЮБОЙ упавший файл рвал весь посев, и остальные записи
      // не попадали в кэш вовсе. С появлением сроков это стало бы обычным
      // делом: один медленный файл обнулял бы работу по всем остальным.
      // Считаем отказы, сеем что можем, и сообщаем итог одной строкой.
      let failed = 0;
      let lastReason = "";
      await runBootstrapSeedPool(files.length, async (itemIndex) => {
        const file = files[itemIndex]!;
        const identity = learningV2NativeDecoderIdentityForAudioFileV1(file, itemIndex);
        try {
          const prepared = await resolveLearningV2BootstrapAudioOfflineFileV1(identity);
          if (!prepared) throw new Error("learning_v2_bootstrap_audio_seed_missing");
        } catch (error) {
          // Немой catch запрещён: причина обязана быть названа.
          failed += 1;
          lastReason = String(error);
        }
      });
      if (failed > 0) {
        throw new Error(
          `learning_v2_bootstrap_audio_seed_incomplete: ${failed}/${files.length} last=${lastReason}`,
        );
      }
    })
    .catch((error) => {
      durableSeed = null;
      throw error;
    });
  return durableSeed;
}

export async function resolveLearningV2BootstrapAudioOfflineFileV1(
  identity: LearningV2NativeDecoderIdentityV1,
): Promise<LearningV2VoiceAudioOfflineCacheHandleV1 | null> {
  const entry = entryByContentHash().get(identity.contentHash);
  if (!entry || entry.byteSize !== identity.byteSize) {
    if (AUDIO_MAP_TRACE) console.log(`[V2-AUDIO-MAP] lookup ${JSON.stringify({ hash: identity.contentHash.slice(0, 12), result: entry ? "size_mismatch" : "not_in_set", wantBytes: identity.byteSize, setBytes: entry?.byteSize ?? null })}`); // guard-ok: ранний выход — файла нет в наборе сборки, вызывающий берёт другой источник
    return null;
  }
  if (AUDIO_MAP_TRACE) console.log(`[V2-AUDIO-MAP] lookup ${JSON.stringify({ hash: identity.contentHash.slice(0, 12), result: "hit" })}`); // guard-ok: ветка поиска
  const existing = await resolvePreparedLearningV2VoiceAudioOfflineFileV1(identity);
  if (existing) return existing;
  const asset = Asset.fromModule(entry.assetModule);
  // зачем срок (владелец 21.09, «надо чинить», лог без ready и без ошибки):
  // в дев-сборке downloadAsync тянет файл по сети с бандлера. Без срока один
  // мёртвый запрос останавливал подготовку занятия НАВСЕГДА.
  if (!asset.localUri) {
    await withAssetTimeout(
      asset.downloadAsync(),
      `download ${identity.contentHash}`,
    );
  }
  const localUri = asset.localUri ?? asset.uri;
  if (!localUri) throw new Error("learning_v2_bootstrap_audio_asset_unavailable");
  return prepareLearningV2VoiceAudioOfflineBytesV1({
    identity,
    loadBytes: async () => {
      // Чтение с диска тоже под сроком: localUri в дев-сборке может указывать
      // на http-адрес бандлера, и тогда это снова сеть, а не файл.
      const bytes = await withAssetTimeout(
        new File(localUri).bytes(),
        `bytes ${identity.contentHash}`,
      );
      if (bytes.byteLength !== entry.byteSize)
        throw new Error("learning_v2_bootstrap_audio_asset_invalid");
      return bytes;
    },
  });
}
