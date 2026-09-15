import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import { triLang, type Lang } from '../constants/i18n';
import type { MistakeFacet, MistakeStudyTarget } from '../modules/mistake-practice/contracts';
import { canonicalJsonV1, sha256Utf8 } from '../modules/learning-v2/policies/decision_registry';
import { isAiExplainConsentGranted } from './ai_explain_consent';
import { withExplainCallableTimeout } from './explain_callable_timeout';
import { getNetStatus } from './net_status';
import { mistakeFacetLabel, mistakeSourceLabel } from './mistake_facet_copy';
import { HOME_MISTAKES_UNLOCK_AT } from './home_mistakes_pulse_model';
import {
  loadMistakePracticeHubSnapshot,
  type MistakePracticeHubSnapshot,
  type MistakePracticeInsights,
  type MistakeSourceGroup,
} from './mistake_practice_insights';
import { getStableId } from './stable_id';

/**
 * Подсказка хаба «Работа над ошибками»: одна фраза наблюдения о слабом месте
 * и одна о карте источников.
 *
 * зачем (владелец 2026-09-14): «ИИ раз в сутки» и «все сгенерированные тексты
 * должны быть готовы до того, как юзер откроет раздел». Поэтому:
 *  - кэш на устройстве на текущий день (AsyncStorage), читается при открытии;
 *  - обновление только фоном: при заходе на Главную (prewarm) и после сессии;
 *  - сервер `mistakeHubAdvice` сам держит кап «одна генерация в сутки»;
 *  - пока кэша нет (первый день, офлайн, нет согласия на ИИ) - текст по
 *    правилам из тех же чисел, мгновенно и бесплатно.
 * В сводку уходят только учебные фразы, типы ошибок и счётчики - без PII.
 */

const STORAGE_PREFIX = 'mistake_hub_advice:v1:';
const FUNCTIONS_REGION = 'us-central1';
const CALLABLE_TIMEOUT_MS = 12_000;
const MAX_TOP_PHRASES = 5;

export interface MistakeHubAdviceSummary {
  readonly studyTarget: MistakeStudyTarget;
  readonly lang: Lang;
  readonly active: number;
  readonly ready: number;
  readonly corrected: number;
  readonly mistakes7d: number;
  readonly mistakesPrevious7d: number;
  readonly facets: readonly Readonly<{ facet: MistakeFacet; count: number }>[];
  readonly sources: readonly Readonly<{ source: MistakeSourceGroup; count: number }>[];
  readonly topPhrases: readonly Readonly<{ phrase: string; count: number; facet: MistakeFacet }>[];
}

export interface MistakeHubAdvice {
  /** Наблюдение о слабом месте - главная карточка хаба. */
  readonly hub: string;
  /** Наблюдение о карте источников. */
  readonly map: string;
  readonly source: 'ai' | 'rules';
  readonly day: string;
  readonly fingerprint: string;
  readonly generatedAtMs: number;
}

export function localDayKey(atMs = Date.now()): string {
  const date = new Date(atMs);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function buildMistakeHubAdviceSummary(input: Readonly<{
  insights: MistakePracticeInsights;
  readyCount: number;
  studyTarget: MistakeStudyTarget;
  lang: Lang;
}>): MistakeHubAdviceSummary {
  const { insights } = input;
  return Object.freeze({
    studyTarget: input.studyTarget,
    lang: input.lang,
    active: insights.active,
    ready: input.readyCount,
    corrected: insights.corrected,
    mistakes7d: insights.mistakeCount7d,
    mistakesPrevious7d: insights.mistakeCountPrevious7d,
    facets: insights.frequentFacets,
    sources: insights.frequentSources,
    topPhrases: Object.freeze(insights.topMistakes.slice(0, MAX_TOP_PHRASES).map((item) => Object.freeze({
      phrase: item.phrase,
      count: item.count,
      facet: item.facet,
    }))),
  });
}

/** Отпечаток сводки: изменились цифры - подсказка устарела. */
export function mistakeHubAdviceFingerprint(summary: MistakeHubAdviceSummary): string {
  return sha256Utf8(canonicalJsonV1({
    t: summary.studyTarget,
    l: summary.lang,
    a: summary.active,
    r: summary.ready,
    c: summary.corrected,
    f: summary.facets,
    s: summary.sources,
    p: summary.topPhrases.map((item) => item.phrase),
  })).slice(0, 24);
}

const percent = (count: number, total: number): number =>
  total > 0 ? Math.round((count / total) * 100) : 0;

/**
 * Текст по правилам - мгновенный фолбэк из тех же чисел. Тон: наблюдение, не
 * упрёк; без пометки «ИИ», без персонажа (решение владельца 2026-09-14).
 */
/**
 * Сколько промахов нужно, чтобы слово «чаще всего» было правдой.
 *
 * зачем (владелец 2026-09-15): при одной-двух ошибках фраза «чаще всего промахи
 * в порядке слов: 100%» — бессмыслица. Одна ошибка не бывает «чаще всего», и
 * «больше всего приходят из уроков» при единственном промахе звучит как
 * захардкоженный текст. Обобщение разрешено только когда за ним есть выборка.
 */
export const MISTAKE_ADVICE_MIN_SAMPLE = 5;
/** И доля лидера должна быть заметной, иначе «чаще всего» тоже неправда. */
const MISTAKE_ADVICE_MIN_LEAD_SHARE = 0.34;

export function buildMistakeHubAdviceFallback(summary: MistakeHubAdviceSummary): MistakeHubAdvice {
  const { lang } = summary;
  const totalFacets = summary.facets.reduce((sum, item) => sum + item.count, 0);
  const totalSources = summary.sources.reduce((sum, item) => sum + item.count, 0);
  const top = summary.facets[0];
  const topSource = summary.sources[0];

  // Обобщать можно только по настоящей выборке И при заметном перевесе лидера.
  const facetsTellAStory = !!top
    && totalFacets >= MISTAKE_ADVICE_MIN_SAMPLE
    && top.count / totalFacets >= MISTAKE_ADVICE_MIN_LEAD_SHARE;
  const sourcesTellAStory = !!topSource
    && totalSources >= MISTAKE_ADVICE_MIN_SAMPLE
    && topSource.count / totalSources >= MISTAKE_ADVICE_MIN_LEAD_SHARE;

  const hub = facetsTellAStory
    ? triLang(lang, {
      ru: `Чаще всего промахи в «${mistakeFacetLabel(lang, top!.facet)}»: ${percent(top!.count, totalFacets)}% за 30 дней. Начнём с них?`,
      uk: `Найчастіше промахи в «${mistakeFacetLabel(lang, top!.facet)}»: ${percent(top!.count, totalFacets)}% за 30 днів. Почнемо з них?`,
      en: `Most slips are in “${mistakeFacetLabel(lang, top!.facet)}”: ${percent(top!.count, totalFacets)}% over 30 days. Start there?`,
      es: `La mayoría de los fallos están en «${mistakeFacetLabel(lang, top!.facet)}»: ${percent(top!.count, totalFacets)}% en 30 días. ¿Empezamos por ahí?`,
      'pt-BR': `A maioria dos erros está em “${mistakeFacetLabel(lang, top!.facet)}”: ${percent(top!.count, totalFacets)}% em 30 dias. Começamos por aí?`,
      vi: `Phần lớn lỗi nằm ở “${mistakeFacetLabel(lang, top!.facet)}”: ${percent(top!.count, totalFacets)}% trong 30 ngày. Bắt đầu từ đó nhé?`,
      id: `Sebagian besar kesalahan ada di “${mistakeFacetLabel(lang, top!.facet)}”: ${percent(top!.count, totalFacets)}% dalam 30 hari. Mulai dari situ?`,
      tr: `Hataların çoğu “${mistakeFacetLabel(lang, top!.facet)}” alanında: 30 günde %${percent(top!.count, totalFacets)}. Oradan başlayalım mı?`,
      pl: `Najwięcej potknięć w „${mistakeFacetLabel(lang, top!.facet)}”: ${percent(top!.count, totalFacets)}% w 30 dni. Zaczniemy od nich?`,
    })
    // Выборки нет — говорим ровно то, что есть: сколько ошибок ждёт разбора.
    : summary.ready > 0
      ? triLang(lang, {
        ru: `Ждут разбора: ${summary.ready}. Разберём сейчас, пока свежие?`,
        uk: `Чекають на розбір: ${summary.ready}. Розберемо зараз, поки свіжі?`,
        en: `Waiting to be practised: ${summary.ready}. Shall we do them while they are fresh?`,
        es: `Pendientes de repasar: ${summary.ready}. ¿Los vemos ahora que están frescos?`,
        'pt-BR': `Aguardando prática: ${summary.ready}. Vamos ver agora, enquanto estão frescos?`,
        vi: `Đang chờ luyện: ${summary.ready}. Làm ngay khi còn mới nhé?`,
        id: `Menunggu dilatih: ${summary.ready}. Kita kerjakan selagi masih segar?`,
        tr: `Çalışılmayı bekleyen: ${summary.ready}. Tazeyken halledelim mi?`,
        pl: `Czekają na powtórkę: ${summary.ready}. Zrobimy je, póki świeże?`,
      })
      : triLang(lang, {
        ru: 'Готовых к разбору ошибок сейчас нет.',
        uk: 'Готових до розбору помилок зараз немає.',
        en: 'Nothing is ready to practise right now.',
        es: 'Ahora mismo no hay nada listo para practicar.',
        'pt-BR': 'No momento não há nada pronto para praticar.',
        vi: 'Hiện chưa có gì sẵn sàng để luyện.',
        id: 'Saat ini belum ada yang siap dilatih.',
        tr: 'Şu anda çalışmaya hazır bir şey yok.',
        pl: 'Na razie nie ma nic gotowego do ćwiczenia.',
      });

  const map = sourcesTellAStory
    ? triLang(lang, {
      ru: `Больше всего ошибок приходит из раздела «${mistakeSourceLabel(lang, topSource!.source)}».`,
      uk: `Найбільше помилок приходить із розділу «${mistakeSourceLabel(lang, topSource!.source)}».`,
      en: `Most mistakes come from “${mistakeSourceLabel(lang, topSource!.source)}”.`,
      es: `La mayoría de los errores vienen de «${mistakeSourceLabel(lang, topSource!.source)}».`,
      'pt-BR': `A maioria dos erros vem de “${mistakeSourceLabel(lang, topSource!.source)}”.`,
      vi: `Hầu hết lỗi đến từ “${mistakeSourceLabel(lang, topSource!.source)}”.`,
      id: `Sebagian besar kesalahan berasal dari “${mistakeSourceLabel(lang, topSource!.source)}”.`,
      tr: `Hataların çoğu “${mistakeSourceLabel(lang, topSource!.source)}” bölümünden geliyor.`,
      pl: `Najwięcej błędów pochodzi z sekcji „${mistakeSourceLabel(lang, topSource!.source)}”.`,
    })
    // Одна-две ошибки — про источники сказать нечего. Молчим, а не выдумываем.
    : '';

  return Object.freeze({
    hub,
    map,
    source: 'rules',
    day: localDayKey(),
    fingerprint: mistakeHubAdviceFingerprint(summary),
    generatedAtMs: Date.now(),
  });
}

function storageKey(accountScope: string, studyTarget: MistakeStudyTarget, lang: Lang): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(accountScope)}:${studyTarget}:${lang}`;
}

function parseAdvice(raw: string | null): MistakeHubAdvice | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<MistakeHubAdvice>;
    if (typeof parsed.hub !== 'string' || typeof parsed.day !== 'string' || typeof parsed.fingerprint !== 'string') return null;
    return Object.freeze({
      hub: parsed.hub,
      map: typeof parsed.map === 'string' ? parsed.map : '',
      source: parsed.source === 'ai' ? 'ai' : 'rules',
      day: parsed.day,
      fingerprint: parsed.fingerprint,
      generatedAtMs: Number.isFinite(parsed.generatedAtMs) ? Number(parsed.generatedAtMs) : 0,
    });
  } catch (error: unknown) {
    console.warn('[MISTAKES-ADVICE] cache:parse → null', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/** Кэш на сегодня (любой отпечаток): показываем сразу, без ожидания сети. */
export async function readMistakeHubAdviceCached(input: Readonly<{
  accountScope: string;
  studyTarget: MistakeStudyTarget;
  lang: Lang;
}>): Promise<MistakeHubAdvice | null> {
  const cached = parseAdvice(await AsyncStorage.getItem(storageKey(input.accountScope, input.studyTarget, input.lang)));
  const fresh = cached !== null && cached.day === localDayKey() && cached.source === 'ai';
  console.log('[MISTAKES-ADVICE] cache:read', JSON.stringify({ found: cached !== null, day: cached?.day ?? null, fresh }));
  return fresh ? cached : null;
}

/**
 * Что показать прямо сейчас: кэш ИИ на сегодня или текст по правилам.
 * Никогда не ждёт сеть - это правило владельца «готово до открытия».
 */
export async function resolveMistakeHubAdvice(input: Readonly<{
  accountScope: string;
  summary: MistakeHubAdviceSummary;
}>): Promise<MistakeHubAdvice> {
  const cached = await readMistakeHubAdviceCached({
    accountScope: input.accountScope,
    studyTarget: input.summary.studyTarget,
    lang: input.summary.lang,
  });
  return cached ?? buildMistakeHubAdviceFallback(input.summary);
}

interface MistakeHubAdviceResponse {
  ok: true;
  hub: string;
  map: string;
  fromCache: boolean;
}

type CallAdvice = (summary: MistakeHubAdviceSummary) => Promise<MistakeHubAdviceResponse>;

async function callMistakeHubAdviceDefault(summary: MistakeHubAdviceSummary): Promise<MistakeHubAdviceResponse> {
  const functions = getFunctions(getApp(), FUNCTIONS_REGION);
  const callable = httpsCallable<MistakeHubAdviceSummary, MistakeHubAdviceResponse>(functions, 'mistakeHubAdvice');
  // День клиента задаёт серверное окно «одна генерация в сутки».
  const result = await withExplainCallableTimeout(callable({ ...summary, day: localDayKey() } as MistakeHubAdviceSummary), 'mistakeHubAdvice', CALLABLE_TIMEOUT_MS);
  return result.data;
}

const refreshInFlight = new Map<string, Promise<MistakeHubAdvice | null>>();

/**
 * Фоновое обновление: один вызов на устройство в сутки на (аккаунт, язык, цель).
 * Возвращает свежую подсказку или null (кэш актуален / офлайн / нет согласия /
 * ошибка) - вызывающий ничего не ждёт, экран уже показал кэш или фолбэк.
 */
export async function refreshMistakeHubAdvice(input: Readonly<{
  accountScope: string;
  summary: MistakeHubAdviceSummary;
  call?: CallAdvice;
  nowMs?: number;
}>): Promise<MistakeHubAdvice | null> {
  const key = storageKey(input.accountScope, input.summary.studyTarget, input.summary.lang);
  const pending = refreshInFlight.get(key);
  if (pending) return pending;
  const work = (async (): Promise<MistakeHubAdvice | null> => {
    const day = localDayKey(input.nowMs ?? Date.now());
    const fingerprint = mistakeHubAdviceFingerprint(input.summary);
    const cached = parseAdvice(await AsyncStorage.getItem(key));
    if (cached && cached.day === day && cached.source === 'ai') {
      console.log('[MISTAKES-ADVICE] refresh:skip cache-fresh', JSON.stringify({ day, sameFingerprint: cached.fingerprint === fingerprint }));
      return null;
    }
    // зачем (владелец 2026-09-15 + аудит): раздел открывается только от порога,
    // и обобщать можно лишь по настоящей выборке. Иначе ИИ честно напишет
    // «чаще всего... 100%» на одной ошибке — ровно то, что владелец поймал.
    // Побочно: ноль вызовов OpenAI для каждого новичка с парой промахов.
    const sample = input.summary.facets.reduce((sum, item) => sum + item.count, 0);
    if (input.summary.active < HOME_MISTAKES_UNLOCK_AT || sample < MISTAKE_ADVICE_MIN_SAMPLE) {
      console.log('[MISTAKES-ADVICE] refresh:skip below-threshold', JSON.stringify({
        active: input.summary.active, sample, unlockAt: HOME_MISTAKES_UNLOCK_AT, minSample: MISTAKE_ADVICE_MIN_SAMPLE,
      }));
      return null;
    }
    if (!isAiExplainConsentGranted()) {
      console.log('[MISTAKES-ADVICE] refresh:skip consent-not-granted');
      return null;
    }
    const net = getNetStatus();
    if (net === 'offline') {
      console.log('[MISTAKES-ADVICE] refresh:skip offline');
      return null;
    }
    const startedAt = Date.now();
    try {
      const response = await (input.call ?? callMistakeHubAdviceDefault)(input.summary);
      const hub = String(response?.hub ?? '').trim();
      if (!hub) {
        console.warn('[MISTAKES-ADVICE] refresh:empty-hub', JSON.stringify({ ms: Date.now() - startedAt, fromCache: response?.fromCache ?? null }));
        return null;
      }
      const advice: MistakeHubAdvice = Object.freeze({
        hub,
        map: String(response.map ?? '').trim(),
        source: 'ai',
        day,
        fingerprint,
        generatedAtMs: Date.now(),
      });
      await AsyncStorage.setItem(key, JSON.stringify(advice));
      console.log('[MISTAKES-ADVICE] refresh:out', JSON.stringify({ ms: Date.now() - startedAt, fromCache: response.fromCache, hubLen: hub.length, mapLen: advice.map.length }));
      return advice;
    } catch (error: unknown) {
      console.warn('[MISTAKES-ADVICE] refresh:catch → keep fallback', JSON.stringify({
        ms: Date.now() - startedAt,
        message: error instanceof Error ? error.message : String(error),
      }));
      return null;
    }
  })().finally(() => { refreshInFlight.delete(key); });
  refreshInFlight.set(key, work);
  return work;
}

let prewarmDayDone: string | null = null;

/**
 * Прогрев с Главной: подсказка готова до того, как человек откроет раздел.
 * Раз в сутки на процесс; читает локальный журнал (без сети), сеть - только
 * если кэш на сегодня пуст.
 */
export async function prewarmMistakeHubAdvice(input: Readonly<{
  studyTarget: MistakeStudyTarget;
  lang: Lang;
  snapshot?: MistakePracticeHubSnapshot;
}>): Promise<void> {
  const day = localDayKey();
  const stamp = `${day}:${input.studyTarget}:${input.lang}`;
  if (prewarmDayDone === stamp) return;
  prewarmDayDone = stamp;
  try {
    const accountScope = await getStableId();
    const snapshot = input.snapshot ?? await loadMistakePracticeHubSnapshot(input.studyTarget);
    const summary = buildMistakeHubAdviceSummary({
      insights: snapshot.insights,
      readyCount: snapshot.readyCount,
      studyTarget: input.studyTarget,
      lang: input.lang,
    });
    await refreshMistakeHubAdvice({ accountScope, summary });
  } catch (error: unknown) {
    // зачем: прогрев не должен падать молча - иначе «подсказка всегда по
    // правилам» выглядит как норма, а не как сломанный прогрев.
    prewarmDayDone = null;
    console.warn('[MISTAKES-ADVICE] prewarm:catch', error instanceof Error ? error.message : String(error));
  }
}

/* expo-router route shim: keeps this app utility from being treated as a route */
export default function __RouteShim() {
  return null;
}
