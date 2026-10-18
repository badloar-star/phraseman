import * as admin from 'firebase-admin';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasPermission, type AdminPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { assertJobEnabled, resolveJobConfig } from './openai_jobs_config';
import { recordAiOperationUsage } from './ai_operation_billing';
import { reserveContentFactoryBudget } from './content_factory/content_factory_budget';
import { PAID_AI_FETCH_TIMEOUT_MS, paidAiFetchFailureReason } from './paid_ai_fetch_timeout';
import { normalizeVideoPhraseList, type VideoPhrase } from '../../shared/video_phrases_contract';
import { cleanPackSourceTitle } from '../../shared/pack_source_title';
import { normalizeVideoPackTitles, type VideoPackTitles } from './video_pack_title';
import { officialVideoPackAuthorId } from '../../shared/official_pack_marker';
import {
  parseYoutubeCatalogManifest,
  parseYoutubeChannelSnapshot,
  parseYoutubeVideoSnapshot,
  type YoutubeVideoSnapshot,
} from '../../shared/youtube_catalog_contract';
import { reserveDailySpend } from './spend_cap';

const REGION = 'us-central1';
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
/** PM-231: потолок входа разбора документа (~15k токенов) и вывода модели. */
export const VIDEO_PHRASES_MAX_INPUT_CHARS = 60_000;
export const VIDEO_PHRASES_MAX_OUTPUT_TOKENS = 8_000;
const ROOT = 'video_phrase_sets';

function adminRole(token: Record<string, unknown>): AdminRole {
  return hasAdminRole(token.adminRole) ? token.adminRole : 'owner';
}

function requireAdmin(request: CallableRequest<unknown>, permission: AdminPermission): { uid: string; role: AdminRole } {
  if (!request.auth?.uid || !request.auth.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
  const role = adminRole(request.auth.token as Record<string, unknown>);
  if (!hasPermission(role, permission)) throw new HttpsError('permission-denied', 'Role cannot access video phrases');
  return { uid: request.auth.uid, role };
}

function videoId(value: unknown): string {
  const id = String(value ?? '').trim();
  if (!/^[0-9A-Za-z_-]{11}$/.test(id)) throw new HttpsError('invalid-argument', 'video_id_invalid');
  return id;
}

function versionId(value: unknown): string {
  const id = String(value ?? '').trim();
  if (!/^[0-9A-Za-z._-]{1,80}$/.test(id)) throw new HttpsError('invalid-argument', 'version_id_invalid');
  return id;
}

function asPhrases(id: string, value: unknown): readonly VideoPhrase[] {
  try { return normalizeVideoPhraseList(id, value); }
  catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'phrases_invalid'); }
}

function workspaceSnapshot(db: FirebaseFirestore.Firestore, id: string) {
  return db.collection(ROOT).doc(id);
}

/* ══════════════ НАБОР КАРТОЧЕК ИЗ ФРАЗ РОЛИКА ══════════════ */

const COMMUNITY_PACKS = 'community_packs';
/** Детерминированный id: повторная публикация ОБНОВЛЯЕТ набор, а не плодит копии. */
const videoPackId = (id: string) => `video_${id}`;

/** Языки наборов — ровно те же, что в `app/flashcards/pack_languages.ts`. */
// зачем (PM-109, D130): итальянский — язык наборов; без него итальянский ролик
// получал бы чужой язык и прятался фильтром.
const PACK_LANGUAGES = ['en', 'fr', 'de', 'es', 'it'] as const;
type PackLanguageCode = (typeof PACK_LANGUAGES)[number];

/**
 * Приметы языка по самим фразам: буквы и частые служебные слова.
 *
 * зачем угадывать, а не брать язык канала: связь «канал → язык» живёт только в
 * манифесте каталога YouTube, а ролик может быть добавлен ссылкой и не
 * принадлежать ни одному каналу оттуда. Фразы же есть всегда — это самый
 * надёжный доступный признак.
 *
 * Сомнение трактуем в пользу английского: он и был бы значением по умолчанию,
 * а ошибка в сторону английского не прячет набор от большинства.
 */
function detectPackLanguage(phrases: readonly VideoPhrase[]): PackLanguageCode {
  const sample = phrases.slice(0, 40).map((p) => p.phrase).join(' ').toLowerCase();
  if (!sample.trim()) return 'en';
  const score: Record<PackLanguageCode, number> = { en: 0, fr: 0, de: 0, es: 0, it: 0 };
  // Диакритика — сильный признак, служебные слова — подтверждающий.
  if (/[àâçéèêëîïôûùü]/.test(sample)) score.fr += 3;
  if (/[äöüß]/.test(sample)) score.de += 3;
  if (/[áéíóúñ¿¡]/.test(sample)) score.es += 3;
  const has = (re: RegExp, lang: PackLanguageCode, weight = 1) => { if (re.test(sample)) score[lang] += weight; };
  /**
   * Слова НЕ должны пересекаться между языками, иначе счёт становится ничьёй и
   * решает случайный порядок перебора. Поэтому «la» (общее для fr и es) и
   * «ist/est» (de/fr) в списках отсутствуют.
   */
  has(/\b(the|is|are|you|and|to|of|it)\b/, 'en', 2);
  has(/\b(le|les|des|une|vous|dans|pour|avec|c'est)\b/, 'fr', 2);
  has(/\b(der|die|das|und|nicht|ein|mit|ich)\b/, 'de', 2);
  has(/\b(el|los|las|una|que|para|con|por|muy)\b/, 'es', 2);
  // Итальянская «è/à» общая с французской (+3 там), поэтому итальянские
  // служебные слова весят больше — иначе ничья уходит французскому.
  has(/[ìò]/, 'it', 3);
  has(/\b(gli|sono|della|questo|questa|anche|grazie|molto|che|io)\b/, 'it', 4);
  let best: PackLanguageCode = 'en';
  for (const code of PACK_LANGUAGES) if (score[code] > score[best]) best = code;
  return score[best] > 0 ? best : 'en';
}

/**
 * Документ набора из фраз ролика — ЧИСТАЯ функция, без Firestore.
 *
 * зачем отдельно от записи: именно здесь живут значения, ошибка в которых
 * ломает раздел молча и целиком — `category` не из списка, пустой `titleRu`
 * (маппер каталога отбрасывает такой набор), `listingStatus`, `packLanguage`,
 * `videoId`. Проверять это на моках Firestore бессмысленно: мок ответит «ок»
 * на любой мусор. Чистую функцию можно сверить с контрактом напрямую.
 */
export function buildVideoPackDoc(args: Readonly<{
  videoId: string;
  phrases: readonly VideoPhrase[];
  sourceName: string;
  actorUid: string;
  nowMs: number;
  keepSocial: boolean;
  /** R110: автоназвание (2–3 слова) на 9 языках из админки; нет — прежнее имя документа. */
  packTitles?: VideoPackTitles | null;
}>): Record<string, unknown> {
  const { videoId: id, phrases, sourceName, actorUid, nowMs, keepSocial, packTitles } = args;
  // зачем (владелец, журнал строка 5): sourceName = имя файла из админки («… 500 фраз.docx») — в витрину без хвоста файла.
  const videoTitle = cleanPackSourceTitle(sourceName).slice(0, 240);
  /** Маппер каталога отбрасывает набор с пустым titleRu — запасное имя обязательно. */
  const fallbackTitle = videoTitle || 'Фразы из видео';
  // зачем (владелец 17.10, R110): название набора — короткое живое название по смыслу фраз, на всех языках витрины;
  // имя файла остаётся в videoTitle/origin (по нему узнаётся источник), но в витрину больше не идёт.
  const titles: VideoPackTitles = packTitles ?? {
    Ru: fallbackTitle, Uk: fallbackTitle, En: fallbackTitle, Es: fallbackTitle, PtBr: fallbackTitle,
    Vi: fallbackTitle, Id: fallbackTitle, Tr: fallbackTitle, Pl: fallbackTitle,
  };
  const title = titles.Ru;
  const detectedLanguage = detectPackLanguage(phrases);
  const cards = phrases.map((phrase) => ({
    id: `p${phrase.ordinal}`,
    en: phrase.phrase,
    targetText: phrase.phrase,
    translationText: phrase.translation,
    ru: phrase.translation,
    /** Объяснение → шеврон подробностей на карточке (решение владельца). */
    description: phrase.explanation,
    origin: { source: 'video', sourceId: id, sourceTitle: videoTitle || id },
    /**
     * зачем: D131 (PM-288) — тап по фразе в наборе из видео открывает ролик на
     * её секунде. Таймкод уже есть у фразы (транскрипт в «Видео-студии» →
     * черновик → публикация), но раньше терялся ровно здесь. Кладём в карточку,
     * чтобы клиент получил его тем же чтением документа набора, без запроса к
     * `video_phrase_sets`. Нет таймкода — нет поля, и фраза не нажимается.
     */
    ...(typeof phrase.startSec === 'number' ? { videoStartSec: phrase.startSec } : {}),
  }));

  return {
    title,
    titleRu: titles.Ru,
    titleUk: titles.Uk,
    titleEn: titles.En,
    titleEs: titles.Es,
    titlePtBr: titles.PtBr,
    titleVi: titles.Vi,
    titleId: titles.Id,
    titleTr: titles.Tr,
    titlePl: titles.Pl,
    titleSource: packTitles ? 'auto_or_admin' : 'source_name',
    description: '',
    descriptionRu: '',
    descriptionUk: '',
    descriptionEs: '',
    /** Только из списка FlashcardPackCategory: business|travel|daily|exam|slang|verbs. */
    category: 'daily',
    cards,
    cardCount: cards.length,
    /**
     * Язык определяется по самим фразам: выбор языка на экране «Из видео»
     * фильтрует наборы именно по нему. Жёсткий 'en' прятал бы французские и
     * немецкие ролики от их зрителей.
     */
    packLanguage: detectedLanguage,
    studyTarget: detectedLanguage,
    /** Связь с роликом — по ней клиент отбирает раздел «Из видео». */
    videoId: id,
    videoTitle,
    /** Длительности в данных фраз нет — бейдж времени не рисуем (0 = нет бейджа). */
    videoDurationSec: 0,
    status: 'published',
    listingStatus: 'published_video',
    priceRunes: 0,
    /** Признак официального набора (shared/official_pack_marker.ts) — по нему клиент пишет «Professor Lingman». */
    authorStableId: officialVideoPackAuthorId(id),
    publishedAtMs: nowMs,
    publishedBy: actorUid,
    updatedAt: nowMs,
    /** Перепубликация НЕ обнуляет лайки и добавления уже живущего набора. */
    ...(keepSocial ? {} : { likesCount: 0, addedCount: 0, salesCount: 0 }),
  };
}

/**
 * Собрать/обновить набор карточек из опубликованных фраз ролика.
 *
 * Решение владельца 2026-09-23: набор создаётся АВТОМАТИЧЕСКИ при публикации
 * фраз, и это ОБЫЧНЫЙ документ `community_packs` плюс поле `videoId` — тогда
 * лайки, «Добавить себе», тренировка, витрина и топ работают без единой строки
 * нового кода. Отдельная сущность потребовала бы второй копии социального слоя.
 *
 * `explanation` фразы кладётся в `description` карточки: именно это поле даёт
 * шеврон подробностей (`cardHasDetails`), тот самый механизм наборов за жемчуг,
 * на который указал владелец.
 *
 * Функция НЕ бросает наружу: публикация фраз не должна падать из-за набора.
 * Каждый отказ логируется с причиной — немой catch запрещён.
 */
async function syncVideoPack(
  db: FirebaseFirestore.Firestore,
  args: Readonly<{ videoId: string; phrases: readonly VideoPhrase[]; sourceName: string; actorUid: string; nowMs: number; packTitles?: VideoPackTitles | null }>,
): Promise<{ ok: boolean; reason?: string }> {
  const { videoId: id, phrases, sourceName, actorUid, nowMs, packTitles } = args;
  try {
    if (phrases.length === 0) {
      console.warn(`[VIDEO-PACK] набор не создан: у ролика ${id} ноль фраз`);
      return { ok: false, reason: 'no_phrases' };
    }

    /**
     * Заголовок берём из `sourceName` версии — его ввёл админ при создании
     * черновика, и это обязательное поле (`source_name_required`).
     *
     * зачем НЕ из каталога роликов: ролики лежат в снимке
     * `youtube_catalog_snapshots/{version}/channels/{id}/videos/{id}`, то есть
     * искать пришлось бы обходом всех каналов. Хуже того, ролик может вообще не
     * быть из каталога — админка позволяет вставить ссылку на любое видео.
     * `sourceName` есть всегда и не требует ни одного лишнего чтения.
     */
    const packRef = db.collection(COMMUNITY_PACKS).doc(videoPackId(id));
    const existing = await packRef.get();
    /** Лайки и добавления существующего набора переживают перепубликацию. */
    const keepSocial = existing.exists;
    const payload = buildVideoPackDoc({ videoId: id, phrases, sourceName, actorUid, nowMs, keepSocial, packTitles });
    const title = String(payload.titleRu);
    console.log(`[VIDEO-PACK-TITLE] набор ${videoPackId(id)}: источник названия=${packTitles ? 'автоназвание/админ' : 'имя документа'}, ru="${title}"`);

    await packRef.set(payload, { merge: true });

    console.log(`[VIDEO-PACK] набор ${videoPackId(id)} сохранён: карточек ${payload.cardCount}, язык=${payload.packLanguage}, заголовок="${title}", обновление=${keepSocial}`);
    return { ok: true };
  } catch (error) {
    console.error(`[VIDEO-PACK] набор для ролика ${id} НЕ сохранён: ${String(error)}`);
    return { ok: false, reason: 'write_failed' };
  }
}

/**
 * PM-109: решение публикации — ЧИСТАЯ функция, чтобы контракт проверялся без
 * моков Firestore.
 * - повтор публикации той же (уже активной) версии — успех без записи, а не
 *   ошибка: ретрай админки после обрыва сети не плодит дубли и не пугает отказом;
 * - публиковать можно только черновик;
 * - пустой список фраз не публикуется: набор ролика без карточек недоступен
 *   людям, а раздел «Из видео» показал бы пустую строку.
 */
export type VideoPhrasePublishDecision =
  | Readonly<{ action: 'publish' }>
  | Readonly<{ action: 'already_published' }>
  | Readonly<{ action: 'reject'; reason: 'draft_version_required' | 'phrases_empty' }>;

export function decideVideoPhrasePublish(args: Readonly<{
  versionExists: boolean;
  versionStatus: unknown;
  phraseCount: number;
  activeVersion: string;
  selectedVersion: string;
}>): VideoPhrasePublishDecision {
  if (!args.versionExists) return { action: 'reject', reason: 'draft_version_required' };
  if (args.versionStatus === 'published' && args.activeVersion === args.selectedVersion) {
    return { action: 'already_published' };
  }
  if (args.versionStatus !== 'draft') return { action: 'reject', reason: 'draft_version_required' };
  if (args.phraseCount <= 0) return { action: 'reject', reason: 'phrases_empty' };
  return { action: 'publish' };
}

type VideoPhraseSetStatus = 'none' | 'draft' | 'published' | 'published_with_draft';

export function publishedRootPatch(args: Readonly<{
  videoId: string;
  versionId: string;
  phraseCount: number;
  actorUid: string;
  nowMs: number;
}>): Record<string, unknown> {
  return {
    videoId: args.videoId,
    activeVersion: args.versionId,
    activePhraseCount: args.phraseCount,
    draftVersion: null,
    draftPhraseCount: 0,
    publishedAtMs: args.nowMs,
    publishedBy: args.actorUid,
    updatedAtMs: args.nowMs,
    updatedBy: args.actorUid,
  };
}

function phraseSetStatus(meta: FirebaseFirestore.DocumentData | undefined): {
  status: VideoPhraseSetStatus;
  activeVersion: string | null;
  draftVersion: string | null;
  activePhraseCount: number;
  draftPhraseCount: number;
  updatedAtMs: number | null;
} {
  const activeVersion = String(meta?.activeVersion ?? '').trim() || null;
  const draftVersion = String(meta?.draftVersion ?? '').trim() || null;
  const activePhraseCount = Number.isFinite(Number(meta?.activePhraseCount)) ? Number(meta?.activePhraseCount) : 0;
  const draftPhraseCount = Number.isFinite(Number(meta?.draftPhraseCount)) ? Number(meta?.draftPhraseCount) : 0;
  const status: VideoPhraseSetStatus = activeVersion
    ? (draftVersion && draftVersion !== activeVersion ? 'published_with_draft' : 'published')
    : (draftVersion ? 'draft' : 'none');
  const updatedAtMs = Number.isFinite(Number(meta?.updatedAtMs)) ? Number(meta?.updatedAtMs) : null;
  return { status, activeVersion, draftVersion, activePhraseCount, draftPhraseCount, updatedAtMs };
}

async function readPhraseSetMeta(
  db: FirebaseFirestore.Firestore,
  ids: readonly string[],
): Promise<Map<string, ReturnType<typeof phraseSetStatus>>> {
  const result = new Map<string, ReturnType<typeof phraseSetStatus>>();
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    const snapshots = await Promise.all(chunk.map((id) => workspaceSnapshot(db, id).get()));
    snapshots.forEach((snapshot, offset) => {
      result.set(chunk[offset], phraseSetStatus(snapshot.exists ? snapshot.data() : undefined));
    });
  }
  return result;
}

function publicVideo(video: YoutubeVideoSnapshot, phraseSet: ReturnType<typeof phraseSetStatus>) {
  return { ...video, phraseSet };
}

/**
 * Read model for the daily content-operations screen. YouTube remains the
 * source of truth for channel/video freshness; phrase-set metadata is joined
 * server-side so the admin does not need one Firestore read per row.
 */
export const adminGetVideoStudioWorkspace = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  requireAdmin(request, 'content.read');
  const db = admin.firestore();
  const [manifestSnapshot, syncSnapshot] = await Promise.all([
    db.doc('youtube_catalog/public').get(),
    db.doc('youtube_catalog/sync_state').get(),
  ]);
  if (!manifestSnapshot.exists) {
    return {
      ok: true,
      generatedAt: null,
      sourceRefreshedAt: null,
      syncState: syncSnapshot.exists ? syncSnapshot.data() : null,
      channels: [],
      counts: { channels: 0, videos: 0, live: 0, upcoming: 0, regular: 0, phraseSets: 0, drafts: 0 },
    };
  }

  let manifest;
  try {
    manifest = parseYoutubeCatalogManifest(manifestSnapshot.data());
  } catch (error) {
    throw new HttpsError('data-loss', error instanceof Error ? error.message : 'youtube_catalog_manifest_invalid');
  }
  const snapshotRoot = db.doc(`youtube_catalog_snapshots/${manifest.activeVersion}`);
  const snapshot = await snapshotRoot.get();
  if (!snapshot.exists || snapshot.data()?.status !== 'ready') {
    throw new HttpsError('unavailable', 'youtube_catalog_snapshot_not_ready');
  }

  const channels = (await Promise.all(manifest.channels
    .slice()
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
    .map(async (manifestChannel) => {
      const channelRef = snapshotRoot.collection('channels').doc(manifestChannel.id);
      const [channelSnapshot, videosSnapshot] = await Promise.all([
        channelRef.get(),
        channelRef.collection('videos').get(),
      ]);
      if (!channelSnapshot.exists) return null;
      try {
        const channel = parseYoutubeChannelSnapshot(channelSnapshot.data());
        const videos = videosSnapshot.docs
          .map((doc) => {
            try { return parseYoutubeVideoSnapshot({ ...(doc.data() ?? {}), id: doc.id }); }
            catch { return null; }
          })
          .filter((video): video is YoutubeVideoSnapshot => Boolean(video))
          .filter((video) => video.channelId === channel.id)
          .sort((left, right) => {
            const leftTime = Date.parse(left.publishedAt ?? left.scheduledStartTime ?? '') || 0;
            const rightTime = Date.parse(right.publishedAt ?? right.scheduledStartTime ?? '') || 0;
            return rightTime - leftTime;
          });
        return { channel, videos };
      } catch {
        return null;
      }
    })))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const allVideos = channels.flatMap((entry) => entry.videos);
  const phraseSets = await readPhraseSetMeta(db, allVideos.map((video) => video.id));
  const channelPayload = channels.map((entry) => ({
    channel: entry.channel,
    videos: entry.videos.map((video) => publicVideo(video, phraseSets.get(video.id) ?? phraseSetStatus(undefined))),
  }));
  const allPhraseSets = allVideos.map((video) => phraseSets.get(video.id) ?? phraseSetStatus(undefined));
  return {
    ok: true,
    generatedAt: manifest.generatedAt,
    sourceRefreshedAt: manifest.sourceRefreshedAt,
    activeVersion: manifest.activeVersion,
    syncState: syncSnapshot.exists ? syncSnapshot.data() : null,
    channels: channelPayload,
    counts: {
      channels: channelPayload.length,
      videos: allVideos.length,
      live: allVideos.filter((video) => video.state === 'live').length,
      upcoming: allVideos.filter((video) => video.state === 'upcoming').length,
      regular: allVideos.filter((video) => video.state === 'video' || video.state === 'completed').length,
      phraseSets: allPhraseSets.filter((set) => set.status === 'published' || set.status === 'published_with_draft').length,
      drafts: allPhraseSets.filter((set) => set.status === 'draft' || set.status === 'published_with_draft').length,
    },
  };
});

export const adminGetVideoPhraseWorkspace = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  requireAdmin(request, 'content.read');
  const id = videoId(request.data?.videoId);
  const root = workspaceSnapshot(admin.firestore(), id);
  const [meta, versions] = await Promise.all([root.get(), root.collection('versions').orderBy('createdAtMs', 'desc').limit(20).get()]);
  return { ok: true, videoId: id, meta: meta.exists ? meta.data() : null, versions: versions.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
});

export const adminSaveVideoPhraseDraft = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const actor = requireAdmin(request, 'content.draft.write');
  const id = videoId(request.data?.videoId);
  const phrases = asPhrases(id, request.data?.phrases);
  const sourceName = String(request.data?.sourceName ?? '').trim().slice(0, 240);
  if (!sourceName) throw new HttpsError('invalid-argument', 'source_name_required');
  // R110: автоназвание набора (можно поправить руками) — хранится в черновике, публикация и пересборка берут его оттуда
  const packTitles = request.data?.packTitles === undefined ? null : normalizeVideoPackTitles(request.data?.packTitles);
  console.log('[VIDEO-PACK-TITLE] save-draft', JSON.stringify({ videoId: id, hasTitles: Boolean(packTitles), ru: packTitles?.Ru ?? null }));
  const requestedVersion = String(request.data?.versionId ?? '').trim();
  const draftId = requestedVersion || `draft-${Date.now()}`;
  if (!/^[0-9A-Za-z._-]{1,80}$/.test(draftId)) throw new HttpsError('invalid-argument', 'version_id_invalid');
  const db = admin.firestore();
  const root = workspaceSnapshot(db, id);
  const version = root.collection('versions').doc(draftId);
  const now = Date.now();
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(version);
    if (existing.exists && existing.data()?.status === 'published') throw new HttpsError('failed-precondition', 'published_version_immutable');
    tx.set(version, { schemaVersion: 1, videoId: id, status: 'draft', sourceName, ...(packTitles ? { packTitles } : {}), phrases, phraseCount: phrases.length, createdAtMs: existing.data()?.createdAtMs ?? now, updatedAtMs: now, updatedBy: actor.uid }, { merge: true });
    tx.set(root, { videoId: id, draftVersion: draftId, draftPhraseCount: phrases.length, updatedAtMs: now, updatedBy: actor.uid }, { merge: true });
  });
  return { ok: true, videoId: id, versionId: draftId, phraseCount: phrases.length };
});

export const adminPublishVideoPhrases = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const actor = requireAdmin(request, 'content.publish');
  const id = videoId(request.data?.videoId);
  const selectedVersion = versionId(request.data?.versionId);
  const db = admin.firestore();
  const root = workspaceSnapshot(db, id);
  const version = root.collection('versions').doc(selectedVersion);
  /** Фразы, попавшие в публикацию: нужны для сборки набора ПОСЛЕ транзакции. */
  let publishedPhrases: readonly VideoPhrase[] = [];
  let publishedAtMs = Date.now();
  /** Имя источника из версии — оно же станет заголовком набора. */
  let publishedSourceName = '';
  let publishedPackTitles: VideoPackTitles | null = null;
  let alreadyPublished = false;
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(version);
    const current = await tx.get(root);
    const data = snapshot.data() ?? {};
    const previousVersion = String(current.data()?.activeVersion ?? '').trim();
    const rawPhrases = Array.isArray(data.phrases) ? data.phrases : [];
    const decision = decideVideoPhrasePublish({
      versionExists: snapshot.exists,
      versionStatus: data.status,
      phraseCount: rawPhrases.length,
      activeVersion: previousVersion,
      selectedVersion,
    });
    console.log('[PM109-PUBLISH] decision', {
      videoId: id, selectedVersion, previousVersion: previousVersion || null,
      versionStatus: String(data.status ?? 'none'), phraseCount: rawPhrases.length,
      decision: decision.action, reason: decision.action === 'reject' ? decision.reason : null,
    });
    if (decision.action === 'reject') throw new HttpsError('failed-precondition', decision.reason);
    const phrases = asPhrases(id, data.phrases);
    if (decision.action === 'already_published') {
      // Без записей: фразы уже активны. Набор ниже пересобирается идемпотентно
      // (тот же id video_<videoId>) — это лечит набор, не собравшийся в прошлый раз.
      alreadyPublished = true;
      publishedPhrases = phrases;
      publishedAtMs = Number(data.publishedAtMs) || publishedAtMs;
      publishedSourceName = String(data.sourceName ?? '').trim();
      publishedPackTitles = normalizeVideoPackTitles(data.packTitles);
      return;
    }
    const now = Date.now();
    tx.set(version, { status: 'published', publishedAtMs: now, publishedBy: actor.uid, phrases }, { merge: true });
    if (previousVersion && previousVersion !== selectedVersion) tx.set(root.collection('versions').doc(previousVersion), { status: 'archived', archivedAtMs: now }, { merge: true });
    tx.set(root, publishedRootPatch({ videoId: id, versionId: selectedVersion, phraseCount: phrases.length, actorUid: actor.uid, nowMs: now }), { merge: true });
    publishedPhrases = phrases;
    publishedAtMs = now;
    publishedSourceName = String(data.sourceName ?? '').trim();
    publishedPackTitles = normalizeVideoPackTitles(data.packTitles);
  });

  /**
   * Набор карточек собирается ПОСЛЕ транзакции и НЕ внутри неё.
   *
   * зачем именно так: внутри транзакции пришлось бы читать метаданные ролика
   * тем же tx, и любой сбой отката снёс бы саму публикацию фраз. Публикация —
   * главное действие админа, она обязана пройти. Набор не собрался — фразы всё
   * равно опубликованы, а причина записана в лог и вернулась вызывающему.
   */
  const pack = await syncVideoPack(db, {
    videoId: id,
    phrases: publishedPhrases,
    sourceName: publishedSourceName,
    actorUid: actor.uid,
    nowMs: publishedAtMs,
    packTitles: publishedPackTitles,
  });

  return { ok: true, videoId: id, activeVersion: selectedVersion, alreadyPublished, packCreated: pack.ok, packReason: pack.reason ?? null };
});

export const adminParseVideoPhraseDocument = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, secrets: [OPENAI_API_KEY], timeoutSeconds: 120 }, async (request) => {
  const actor = requireAdmin(request, 'content.draft.write');
  const id = videoId(request.data?.videoId);
  const sourceText = String(request.data?.text ?? '').trim();
  if (!sourceText) throw new HttpsError('invalid-argument', 'document_text_invalid');
  // зачем: PM-231 — вход до 500 000 знаков (~125k токенов) без max_tokens и тайм-аута
  // давал один админ-вызов на доллары и висел до потолка функции. Потолок входа,
  // вывода и времени — до OpenAI.
  if (sourceText.length > VIDEO_PHRASES_MAX_INPUT_CHARS) {
    console.warn('[AI-LIMIT] adminParseVideoPhraseDocument input too long', { chars: sourceText.length, max: VIDEO_PHRASES_MAX_INPUT_CHARS });
    throw new HttpsError('invalid-argument', 'document_text_too_long', { maxChars: VIDEO_PHRASES_MAX_INPUT_CHARS, chars: sourceText.length });
  }
  const db = admin.firestore();
  const config = await resolveJobConfig(db, 'video_phrases');
  assertJobEnabled(config, 'video_phrases');
  await reserveContentFactoryBudget(db, `video-phrases:${id}:${String(request.data?.operationId ?? actor.uid)}`, config.globalDailyCap);
  const apiKey = String(OPENAI_API_KEY.value() || '').trim();
  if (!apiKey) throw new HttpsError('failed-precondition', 'openai_key_missing');
  let response: Response;
  try {
    // зачем (владелец 18.10: «не больше 20 $ в день в принципе»): общий дневной потолок расходов — резерв до платного вызова.
    await reserveDailySpend({ fn: 'adminVideoPhrases', kind: 'chat', model: config.model, inTokens: 8000, outTokens: 3000 });
    response = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: config.model, temperature: 0, max_tokens: VIDEO_PHRASES_MAX_OUTPUT_TOKENS, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'Извлеки из документа фразы для изучения языка. Верни JSON {"phrases":[{"phrase":"...","translation":"...","explanation":"..."}]}. Только phrase, translation, explanation. Не добавляй examples, grammar, exercises. Сохрани порядок. Не выдумывай отсутствующие значения.' }, { role: 'user', content: sourceText }] }), signal: AbortSignal.timeout(PAID_AI_FETCH_TIMEOUT_MS.adminVideoPhrases) });
  } catch (error) {
    console.error('[AI-LIMIT] adminParseVideoPhraseDocument provider fetch failed', { reason: paidAiFetchFailureReason(error), timeoutMs: PAID_AI_FETCH_TIMEOUT_MS.adminVideoPhrases });
    throw new HttpsError('unavailable', 'openai_request_failed');
  }
  if (!response.ok) {
    console.error('[AI-LIMIT] adminParseVideoPhraseDocument provider status', { status: response.status });
    throw new HttpsError('unavailable', 'openai_request_failed');
  }
  const payload = await response.json() as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  // зачем: PM-231 A3 — расход разбора документа виден по operation (fire-and-forget, сбой пишется в лог).
  void recordAiOperationUsage('admin_video_phrases_parse', { model: config.model, promptTokens: payload.usage?.prompt_tokens, completionTokens: payload.usage?.completion_tokens }, actor.uid);
  let parsed: unknown;
  try { parsed = JSON.parse(String(payload.choices?.[0]?.message?.content ?? '')); }
  catch { throw new HttpsError('data-loss', 'openai_json_invalid'); }
  const phrases = asPhrases(id, (parsed as Record<string, unknown>)?.phrases);
  return { ok: true, videoId: id, sourceName: String(request.data?.sourceName ?? 'Документ').trim().slice(0, 240), phrases };
});

/**
 * Разовая сборка наборов по УЖЕ опубликованным фразам роликов.
 *
 * зачем она вообще нужна (провал 2026-09-23): создание набора стояло ТОЛЬКО
 * внутри `adminPublishVideoPhrases`, то есть срабатывало лишь при новом нажатии
 * «Опубликовать». У роликов, опубликованных раньше, набора не появлялось
 * никогда — раздел «Из видео» был пуст при полной базе фраз. Ровно тот класс
 * бага, что уже ловили: «механизм есть, а данных не дали».
 *
 * Идемпотентна: id набора детерминирован (`video_{videoId}`), повторный прогон
 * обновляет тот же документ, а `keepSocial` бережёт лайки и добавления.
 * Ничего не удаляет.
 */
export const adminBackfillVideoPacks = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 540 }, async (request) => {
  const actor = requireAdmin(request, 'content.publish');
  const db = admin.firestore();
  const now = Date.now();

  /** Страницами, а не всей коллекцией разом: чтений меньше и память предсказуема. */
  const PAGE = 100;
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  let scanned = 0;
  let created = 0;
  const skipped: { videoId: string; reason: string }[] = [];

  for (;;) {
    let query = db.collection(ROOT).orderBy(admin.firestore.FieldPath.documentId()).limit(PAGE);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    if (page.empty) break;

    for (const doc of page.docs) {
      scanned += 1;
      const id = doc.id;
      const activeVersion = String(doc.data()?.activeVersion ?? '').trim();
      if (!activeVersion) {
        // Каждый пропуск обязан называть причину: пустой результат должен
        // объяснять себя сам, иначе «почему ничего не создалось» ищут кругами.
        skipped.push({ videoId: id, reason: 'no_active_version' });
        continue;
      }
      try {
        const versionSnap = await doc.ref.collection('versions').doc(activeVersion).get();
        if (!versionSnap.exists) {
          skipped.push({ videoId: id, reason: 'version_missing' });
          continue;
        }
        const data = versionSnap.data() ?? {};
        if (data.status !== 'published') {
          skipped.push({ videoId: id, reason: `status_${String(data.status ?? 'none')}` });
          continue;
        }
        let phrases: readonly VideoPhrase[];
        try {
          phrases = normalizeVideoPhraseList(id, data.phrases);
        } catch (error) {
          skipped.push({ videoId: id, reason: 'phrases_invalid' });
          console.warn(`[VIDEO-PACK] backfill ${id}: фразы не прошли контракт — ${String(error)}`);
          continue;
        }
        const res = await syncVideoPack(db, {
          videoId: id,
          phrases,
          sourceName: String(data.sourceName ?? '').trim(),
          actorUid: actor.uid,
          nowMs: now,
          // зачем: пересборка не должна затирать автоназвание названием файла
          packTitles: normalizeVideoPackTitles(data.packTitles),
        });
        if (res.ok) created += 1;
        else skipped.push({ videoId: id, reason: res.reason ?? 'sync_failed' });
      } catch (error) {
        // Один битый ролик не должен обрывать весь прогон.
        skipped.push({ videoId: id, reason: 'read_failed' });
        console.warn(`[VIDEO-PACK] backfill ${id}: чтение версии отказало — ${String(error)}`);
      }
    }

    if (page.docs.length < PAGE) break;
    cursor = page.docs[page.docs.length - 1];
  }

  console.log(`[VIDEO-PACK] backfill завершён: просмотрено ${scanned}, создано/обновлено ${created}, пропущено ${skipped.length}`);
  return { ok: true, scanned, created, skipped: skipped.slice(0, 50), skippedTotal: skipped.length };
});

export const __videoPhrasesTestHooks = { publishedRootPatch, buildVideoPackDoc, detectPackLanguage, decideVideoPhrasePublish };
