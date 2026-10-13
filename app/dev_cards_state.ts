/**
 * DEV-состояния Карточек для робот-съёмки: `dev_state?hold=…&fail=…&speech=…&train_gate=…` (R1_SHOT_LIST «нет пути», Н-1…Н-12 в R1_SHOT_LIST_CARDS.md).
 *
 * зачем (координатор 12.10): часть состояний Карточек штатно не воспроизвести — транзиентные загрузки живут доли секунды, локальные источники
 * не падают, микрофона у робота нет, сбои слоя отложенной выдачи тренировки глотает fail-open. Здесь — флаги В ПАМЯТИ процесса (не диск,
 * не Firestore, без сети): точки внедрения в экранах читают геттеры. Перезапуск приложения сбрасывает всё.
 * Только `__DEV__ && !IS_STORE_RELEASE`: в стор-сборке геттеры всегда «выключено», а установка отклоняется. Логи: [DEV-STATE].
 */
import { IS_STORE_RELEASE } from './config';
import type { PackComment } from './community_packs/packComments';

/** Удержание состояния загрузки до снятия (`hold=off`). */
export const DEV_CARDS_HOLDS = [
  'hub_loading', 'saved_loading', 'catalog_loading', 'setup_loading', 'quota_waiting', 'quota_failed', 'voices_loading', 'swipe_quickstart',
  // зачем (Макеты 12.10, cards-054…059): «отклик отправляется» — публикация отклика под демо-набором висит.
  'comment_send',
] as const;
export type DevCardsHold = (typeof DEV_CARDS_HOLDS)[number];

/** Искусственный сбой чтения/записи (`fail=off` снимает всё). */
export const DEV_CARDS_FAILS = [
  'saved_load', 'setup_decks', 'recall_load', 'card_write', 'pack_write', 'publish_daily_limit',
  // зачем (координатор 12.10, съёмка R1 Карточек): лайк не прошёл (gap-033), публикация не ушла (gap-028, cards-072),
  // удаление карточки опубликованного набора — «минимум 10» / «нет связи» (gap-029/031), отклик/жалоба не отправились.
  'pack_like', 'publish_error', 'pack_remove_min', 'pack_remove_net', 'comment_send', 'report_send',
  // зачем (cards-082): ролик не открылся — без браузера на эмуляторе.
  'video_open',
  // зачем (Макеты 12.10, cards-v2-044): каталог сообщества «без сети» (с catalog=empty).
  'catalog_load',
  // зачем (Авторизация 12.10, cards-030): список роликов «Из видео» не загрузился — «Сейчас недоступно» без отключения сети.
  'video_list',
] as const;
export type DevCardsFail = (typeof DEV_CARDS_FAILS)[number];

/** «Устно»: что подставить вместо реального микрофона. */
// зачем (Макеты 12.10, dialogs-024/025): hold — «запись» держится и после отпускания (робот снимает кадр после шага);
// preparing — держится «Готовлю микрофон…» (Диалоги). Снять — speech=off.
export const DEV_SPEECH_MODES = ['correct', 'wrong', 'denied', 'no_speech', 'unavailable', 'hold', 'preparing'] as const;
export type DevSpeechMode = (typeof DEV_SPEECH_MODES)[number];

/** Отказ слоя отложенной выдачи тренировки (экраны «Тренировка не открылась» и т. п.). */
/** Блиц: робот не знает верный вариант (слово в вопросе случайное) — экран помечает нужный вариант testID `fc-blitz-opt-target` (только dev). */
export const DEV_BLITZ_ANSWERS = ['correct', 'wrong'] as const;
export type DevBlitzAnswer = (typeof DEV_BLITZ_ANSWERS)[number];

export const DEV_TRAIN_GATES = ['fail_blitz', 'fail_speaking', 'fail_swipe_prepare', 'fail_swipe_quota'] as const;

/** Голоса озвучки (cards-gap-036/038): demo — образцовый список, none — голосов нет (только «Системный»). */
export const DEV_CARDS_VOICES = ['demo', 'none'] as const;
export type DevCardsVoices = (typeof DEV_CARDS_VOICES)[number];
export type DevTrainGate = (typeof DEV_TRAIN_GATES)[number];

const LOG = '[DEV-STATE]';

type State = {
  holds: ReadonlySet<DevCardsHold>;
  fails: ReadonlySet<DevCardsFail>;
  speech: DevSpeechMode | null;
  trainGate: DevTrainGate | null;
  /** Блиц: какой вариант помечать для робота — верный или заведомо неверный (`blitz_answer=correct|wrong`). */
  blitzAnswer: DevBlitzAnswer | null;
  /** Список голосов озвучки вместо голосов эмулятора (`voices=demo|none`). */
  voices: DevCardsVoices | null;
  /** «Правда/ложь» и «Напиши»: какой ответ дать роботу (`answer=correct|wrong`), см. getDevAnswerTarget. */
  answer: DevBlitzAnswer | null;
};
const EMPTY: State = { holds: new Set(), fails: new Set(), speech: null, trainGate: null, blitzAnswer: null, voices: null, answer: null };
let state: State = EMPTY;
// зачем (координатор 12.10, «сперва логи», cards-v2-033): подмены живут в памяти процесса и переживают переход на следующую ссылку робота — в журнале старта нужно видеть, когда и какими ключами их выставили
let lastPatch: { atMs: number; keys: string[]; count: number } | null = null;

function devCardsAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Выставить флаги. Любое поле необязательно: не переданное не меняется. В стор-сборке — отказ с логом, ничего не меняется. */
export function setDevCardsState(patch: Partial<{ holds: readonly DevCardsHold[]; fails: readonly DevCardsFail[]; speech: DevSpeechMode | null; trainGate: DevTrainGate | null; blitzAnswer: DevBlitzAnswer | null; voices: DevCardsVoices | null; answer: DevBlitzAnswer | null }>): boolean {
  if (!devCardsAvailable()) {
    console.warn(`${LOG} cards: отклонено — не dev-сборка`, { keys: Object.keys(patch) }); // guard-ok: ранний выход логируется
    return false;
  }
  state = {
    holds: patch.holds ? new Set(patch.holds) : state.holds,
    fails: patch.fails ? new Set(patch.fails) : state.fails,
    speech: patch.speech !== undefined ? patch.speech : state.speech,
    trainGate: patch.trainGate !== undefined ? patch.trainGate : state.trainGate,
    blitzAnswer: patch.blitzAnswer !== undefined ? patch.blitzAnswer : state.blitzAnswer,
    voices: patch.voices !== undefined ? patch.voices : state.voices,
    answer: patch.answer !== undefined ? patch.answer : state.answer,
  };
  lastPatch = { atMs: Date.now(), keys: Object.keys(patch), count: (lastPatch?.count ?? 0) + 1 };
  console.log(`${LOG} cards: ${JSON.stringify({ holds: [...state.holds], fails: [...state.fails], speech: state.speech, trainGate: state.trainGate, blitzAnswer: state.blitzAnswer, answer: state.answer })}`); // guard-ok: единичный лог на ссылку
  return true;
}

export function isDevCardsHeld(hold: DevCardsHold): boolean {
  return devCardsAvailable() && state.holds.has(hold);
}

export function isDevCardsFail(fail: DevCardsFail): boolean {
  return devCardsAvailable() && state.fails.has(fail);
}

export function getDevSpeechMode(): DevSpeechMode | null {
  return devCardsAvailable() ? state.speech : null;
}

export function getDevBlitzAnswer(): DevBlitzAnswer | null {
  return devCardsAvailable() ? state.blitzAnswer : null;
}

/**
 * «Правда/ложь» и «Напиши» (Авторизация 12.10, cards-v2-038/039, cards-section-049/050): карточка и её утверждение случайны, робот не знает верный ответ.
 * `answer=correct|wrong`: «Правда/ложь» помечает нужную кнопку testID `flashcards-truefalse-answer-target`, «Напиши» вписывает в поле верный
 * ответ (или заведомо неверный) и держит порядок карточек как в наборе. Вне dev — всегда null.
 */
export function getDevAnswerTarget(): DevBlitzAnswer | null {
  return devCardsAvailable() ? state.answer : null;
}

/** Подменённый список голосов озвучки (вне dev — всегда null). Форма — как у Speech.getAvailableVoicesAsync. */
export function getDevVoices(): readonly { identifier: string; name: string; quality: string; language: string }[] | null {
  if (!devCardsAvailable() || state.voices === null) return null;
  if (state.voices === 'none') return [];
  return [
    { identifier: 'dev_voice_samantha', name: 'Samantha', quality: 'Enhanced', language: 'en-US' },
    { identifier: 'dev_voice_daniel', name: 'Daniel', quality: 'Enhanced', language: 'en-GB' },
    { identifier: 'dev_voice_karen', name: 'Karen', quality: 'Default', language: 'en-AU' },
    { identifier: 'dev_voice_moira', name: 'Moira', quality: 'Default', language: 'en-IE' },
  ];
}

export function getDevTrainGate(): DevTrainGate | null {
  return devCardsAvailable() ? state.trainGate : null;
}

/** Снимок подмен Карточек для журнала [FLASHCARDS-SESSION]: что включено и ОТКУДА (когда и какими ключами выставлено последний раз; null — ссылка с подменами в этом процессе не приходила). */
export function describeDevCardsState(): Record<string, unknown> {
  if (!devCardsAvailable()) return { build: 'store', active: false };
  return {
    build: 'dev',
    trainGate: state.trainGate,
    blitzAnswer: state.blitzAnswer,
    answer: state.answer,
    holds: [...state.holds],
    fails: [...state.fails],
    speech: state.speech,
    source: lastPatch
      ? { via: 'dev_state-ссылка в памяти процесса', patches: lastPatch.count, lastKeys: lastPatch.keys, lastAgoMs: Date.now() - lastPatch.atMs }
      : { via: 'не выставлялись в этом процессе' },
  };
}

/** Фраза, которую «распознал» несуществующий микрофон: верная — сама цель, неверная — заведомо чужие слова. */
export function devSpeechTranscriptFor(targetText: string): string | null {
  const mode = getDevSpeechMode();
  if (mode === 'correct') return targetText;
  if (mode === 'wrong') return 'banana window river';
  return null;
}

// ───────────────────── Сообщество без сети (координатор + Макеты 12.10, съёмка R1 Карточек) ─────────────────────
// зачем: кадры чужого/своего опубликованного набора, лайка, откликов и жалоб требуют серверного документа набора, которого у
// демо-наборов нет, а лайк/добавление/отклик/жалоба на настоящем сервере — запись в прод. Здесь всё в ПАМЯТИ процесса: карточки и
// мета демо-наборов (кладёт dev_state `packcards=on`), владение, лайки и ветка откликов. Для id `dev_demo_*` / `video_devDemo*`
// при включённом режиме сеть не вызывается вообще — ни чтение, ни запись. В стор-сборке всё выключено (заглушка).

export const DEV_COMMUNITY_COMMENTS = ['demo', 'empty'] as const;
export type DevCommunityComments = (typeof DEV_COMMUNITY_COMMENTS)[number];
export type DevCommunityPack = Readonly<{ meta: Readonly<Record<string, unknown>>; cards: readonly unknown[] }>;

const DEV_COMMUNITY_ID = /^(dev_demo_|video_devDemo)/;
type Community = {
  active: boolean;
  packs: ReadonlyMap<string, DevCommunityPack>;
  comments: DevCommunityComments | null;
  owned: ReadonlySet<string>;
  liked: ReadonlySet<string>;
  /** Отклики, «отправленные» в этом процессе (по набору). */
  posted: ReadonlyMap<string, readonly PackComment[]>;
};
const EMPTY_COMMUNITY: Community = { active: false, packs: new Map(), comments: null, owned: new Set(), liked: new Set(), posted: new Map() };
let community: Community = EMPTY_COMMUNITY;

/** Включить/обновить режим «сообщество без сети». `reset: true` — очистить владение, лайки и отправленные отклики. */
export function setDevCommunityState(patch: Partial<{
  active: boolean; packs: ReadonlyMap<string, DevCommunityPack>; comments: DevCommunityComments | null; owned: readonly string[]; reset: boolean;
}>): boolean {
  if (!devCardsAvailable()) {
    console.warn(`${LOG} community: отклонено — не dev-сборка`, { keys: Object.keys(patch) }); // guard-ok: ранний выход логируется
    return false;
  }
  const base: Community = patch.reset ? { ...EMPTY_COMMUNITY, active: community.active, packs: community.packs, comments: community.comments } : community;
  community = {
    ...base,
    active: patch.active ?? base.active,
    packs: patch.packs ?? base.packs,
    comments: patch.comments !== undefined ? patch.comments : base.comments,
    owned: patch.owned ? new Set([...base.owned, ...patch.owned]) : base.owned,
  };
  console.log(`${LOG} community: ${JSON.stringify({ active: community.active, packs: [...community.packs.keys()], comments: community.comments, owned: [...community.owned], liked: [...community.liked] })}`); // guard-ok: единичный лог на ссылку
  return true;
}

/** Демо-набор под режимом «без сети»: для такого id ни чтений, ни записей в Firestore/callable. */
export function isDevCommunityPackId(packId: string | null | undefined): boolean {
  return devCardsAvailable() && community.active && !!packId && DEV_COMMUNITY_ID.test(packId);
}

export function getDevCommunityPack(packId: string): DevCommunityPack | null {
  return isDevCommunityPackId(packId) ? community.packs.get(packId) ?? null : null;
}

export function getDevCommunityOwnedIds(): readonly string[] {
  return devCardsAvailable() && community.active ? [...community.owned] : [];
}

export function devCommunityMarkOwned(packId: string): void {
  if (!isDevCommunityPackId(packId)) return;
  community = { ...community, owned: new Set([...community.owned, packId]) };
  console.log(`${LOG} community: «добавлено» в памяти pack=${packId}`); // guard-ok: единичный лог на действие
}

export function isDevCommunityOwned(packId: string): boolean {
  return isDevCommunityPackId(packId) && community.owned.has(packId);
}

export function isDevCommunityLiked(packId: string): boolean {
  return isDevCommunityPackId(packId) && community.liked.has(packId);
}

/** Лайк в памяти; true — состояние изменилось. */
export function devCommunitySetLiked(packId: string, liked: boolean): boolean {
  if (!isDevCommunityPackId(packId) || community.liked.has(packId) === liked) return false;
  const next = new Set(community.liked);
  if (liked) next.add(packId); else next.delete(packId);
  community = { ...community, liked: next };
  console.log(`${LOG} community: лайк в памяти pack=${packId} liked=${liked}`); // guard-ok: единичный лог на действие
  return true;
}

/** Ветка откликов демо-набора: null — режим выключен или не демо-набор. */
export function getDevCommunityComments(packId: string): PackComment[] | null {
  if (!isDevCommunityPackId(packId)) return null;
  const posted = [...(community.posted.get(packId) ?? [])];
  if (community.comments !== 'demo') return posted;
  const meta = community.packs.get(packId)?.meta;
  const base = Date.UTC(2026, 9, 12, 9, 0, 0);
  const demo: PackComment[] = [
    { id: 'dev_demo_cm_1', packId, authorId: String(meta?.authorStableId ?? 'dev_demo_author'), authorName: String(meta?.authorName ?? 'Автор'), text: 'Добавила примеры к каждому глаголу — так легче запомнить.', createdAtMs: base - 3 * 3_600_000, pinned: true, reactions: { like: 4 }, myReactions: [], status: 'published' },
    { id: 'dev_demo_cm_2', packId, authorId: 'dev_demo_user_2', authorName: 'Олег', text: 'Claim и convince путал всё время, теперь разобрался.', createdAtMs: base - 2 * 3_600_000, pinned: false, reactions: { like: 2 }, myReactions: [], status: 'published' },
    { id: 'dev_demo_cm_3', packId, authorId: 'dev_demo_user_3', authorName: 'Мария', text: 'Хорошая подборка, прошла за два дня.', createdAtMs: base - 3_600_000, pinned: false, reactions: {}, myReactions: [], status: 'published' },
  ];
  return [...posted, ...demo];
}

/** Запомнить «отправленный» отклик (только память). */
export function devCommunityRecordPosted(comment: PackComment): void {
  if (!isDevCommunityPackId(comment.packId)) return;
  const list = [comment, ...(community.posted.get(comment.packId) ?? [])];
  community = { ...community, posted: new Map([...community.posted, [comment.packId, list]]) };
}

// ───────────────────── Черновик нового набора (cards-072, съёмка R1) ─────────────────────
// зачем: кадр «Набор сохранён на устройстве. Публикация не завершена…» требует нового набора с ≥10 карточками и публикацией;
// набирать 12 карточек роботом — долго и хрупко. `packdraft=on` отдаёт экрану создания готовый черновик из памяти.
// on — 12 карточек в сообщество (cards-072); few — 4 (cards-069 «Минимум 10»); full — 50 (cards-071 лимит); private — 12 без публикации
// (cards-073 «Набор сохранён» без сервера).
// none — «черновика нет» (Макеты 13.10, cards-section-029): строка «Продолжить создание набора» не показывается, даже если на телефоне
// робота остался настоящий черновик от прошлых кадров; черновик НЕ удаляется — только память процесса.
export const DEV_PACK_DRAFTS = ['on', 'few', 'full', 'private', 'none'] as const;
export type DevPackDraft = (typeof DEV_PACK_DRAFTS)[number];
let packDraft: DevPackDraft | null = null;

export function setDevPackDraft(mode: DevPackDraft | null): boolean {
  if (!devCardsAvailable()) {
    console.warn(`${LOG} packdraft: отклонено — не dev-сборка`); // guard-ok: ранний выход логируется
    return false;
  }
  packDraft = mode;
  console.log(`${LOG} packdraft=${mode ?? 'off'}`); // guard-ok: единичный лог на ссылку
  return true;
}

/** Черновик «нового набора» (форма CommunityPackCreateDraftV1) или null (вне dev — всегда null). */
export function isDevPackDraftNone(): boolean {
  return devCardsAvailable() && packDraft === 'none';
}

export function getDevPackDraft(): Readonly<Record<string, unknown>> | null {
  if (!devCardsAvailable() || packDraft === null || packDraft === 'none') return null;
  const words: readonly (readonly [string, string])[] = [
    ['Layover', 'пересадка'], ['Gate', 'выход на посадку'], ['Customs', 'таможня'], ['Boarding pass', 'посадочный талон'],
    ['Luggage', 'багаж'], ['Delay', 'задержка'], ['Aisle seat', 'место у прохода'], ['Window seat', 'место у окна'],
    ['Check-in', 'регистрация'], ['Departure', 'вылет'], ['Arrival', 'прилёт'], ['Carry-on', 'ручная кладь'],
  ];
  const count = packDraft === 'few' ? 4 : packDraft === 'full' ? 50 : words.length;
  const rows = Array.from({ length: count }, (_, i) => {
    const [en, ru] = words[i % words.length];
    return { id: `c${i + 1}`, en: i < words.length ? en : `${en} ${Math.floor(i / words.length) + 1}`, ru, uk: ru };
  });
  return {
    v: 1, title: 'В аэропорту', description: 'Фразы для перелёта', themeIdx: 0, packLanguage: 'en', publishToCommunity: packDraft !== 'private', level: 'A2',
    rows,
    addCardFormOpen: false, draftEn: '', draftRu: '', draftEs: '', draftPlannedTranslation: '', draftNote: '',
  };
}

// ───────────────────── Заполненная новая карточка (Макеты cards-061, 13.10) ─────────────────────
// зачем: кадр «Новая карточка — превью живое» (cards-v2 №24) — поля заполнены «Layover / пересадка», фокуса и клавиатуры нет. Ручной ввод на эмуляторе у Сверки ломается о клавиатуру и прокрутку.
// `cardsdraft=filled` отдаёт редактору создания (create=1) стартовые значения полей из памяти; пользовательские данные и хранилище не трогаются.
export const DEV_CARD_DRAFTS = ['filled'] as const;
export type DevCardDraft = (typeof DEV_CARD_DRAFTS)[number];
let cardDraft: DevCardDraft | null = null;

export function setDevCardDraft(mode: DevCardDraft | null): boolean {
  if (!devCardsAvailable()) {
    console.warn(`${LOG} cardsdraft: отклонено — не dev-сборка`); // guard-ok: ранний выход логируется
    return false;
  }
  cardDraft = mode;
  console.log(`${LOG} cardsdraft=${mode ?? 'off'}`); // guard-ok: единичный лог на ссылку
  return true;
}

/** Стартовые поля новой карточки или null (вне dev — всегда null). */
export function getDevCardDraft(): Readonly<{ en: string; tr: string; description: string }> | null {
  if (!devCardsAvailable() || cardDraft === null) return null;
  return { en: 'Layover', tr: 'пересадка', description: '' };
}

// ───────────────────── Вступление урока (Макеты 12.10, energy-modes) ─────────────────────
// зачем: перед первым заданием урока идут вступительные экраны, число блоков заранее неизвестно — робот листал вслепую.
// `lessonintro=skip` считает вступление уже показанным ТОЛЬКО в памяти (отметка на диск не пишется). В сторе выключено.
let lessonIntroSkip = false;

export function setDevLessonIntroSkip(on: boolean): boolean {
  if (!devCardsAvailable()) {
    console.warn(`${LOG} lessonintro: отклонено — не dev-сборка`); // guard-ok: ранний выход логируется
    return false;
  }
  lessonIntroSkip = on;
  console.log(`${LOG} lessonintro=${on ? 'skip' : 'off'}`); // guard-ok: единичный лог на ссылку
  return true;
}

export function isDevLessonIntroSkip(): boolean {
  return devCardsAvailable() && lessonIntroSkip;
}

/** Только для тестов. */
export function resetDevCardsStateForTests(): void {
  state = EMPTY;
  community = EMPTY_COMMUNITY;
  packDraft = null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

// ───────────────────── Публикация набора — «отправлено» (Авторизация 12.10, cards-gap-025) ─────────────────────
// зачем: успешная публикация пишет в прод (callable communitySubmitPackForReview + локальная отметка). `publish=ok` возвращает «submitted»
// первой строкой publishLocalAuthorPack — без сети и без записи; экран показывает тот же тост «Набор отправлен на публикацию.». В сторе — заглушка.
let publishOk = false;

export function setDevPublishOk(on: boolean): boolean {
  if (!devCardsAvailable()) {
    console.warn(`${LOG} publish: отклонено — не dev-сборка`); // guard-ok: ранний выход логируется
    return false;
  }
  publishOk = on;
  console.log(`${LOG} publish=${on ? 'ok' : 'off'}`); // guard-ok: единичный лог на ссылку
  return true;
}

export function isDevPublishOk(): boolean {
  return devCardsAvailable() && publishOk;
}
