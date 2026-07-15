/**
 * Хук запроса объяснения для шторки «Объясни как для 5-летнего» (план 04).
 *
 * v1 НЕ стримит (см. CONTEXT «Streaming: explicit status»): httpsCallable отдаёт
 * один ответ, поэтому хук просто вызывает callExplainPhrase на открытии и держит
 * {loading, text, status, fromCache, error}. Cache HIT → текст приходит сразу;
 * cache MISS → пока промис не зарезолвился, loading=true и UI показывает скелетон.
 *
 * ИНВАРИАНТ: клиент НЕ решает «годен/не годен». Хук рендерит то, что вернул сервер
 * (включая серверный fallback при status 'rejected'/'exhausted'/'pending'). На сетевой
 * ошибке (промис упал) сервер ничего не вернул — выставляем error, а UI показывает
 * собственный мягкий fallback-текст (никогда сырой стек).
 *
 * Чистые хелперы (resolveExplainDisplay / loadingLineForLang) вынесены наружу, чтобы
 * их можно было покрыть unit-тестами без рендера RN-дерева (jest здесь node-окружение).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  callExplainPhrase,
  type ExplainPhraseRequest,
  type ExplainPhraseResponse,
} from './explain_phrase_client';
import { triLang, type Lang } from '../constants/i18n';
import { SOURCE_LOCALES } from './source_locales';

/**
 * Сузить произвольную строку языка до Lang для triLang (контракт клиента — string,
 * а triLang требует Lang). Неизвестный язык → 'ru' (как и legacyRuUk по умолчанию).
 * Экспортируется, чтобы компоненты не дублировали приведение.
 */
export function asLang(lang: string): Lang {
  return (SOURCE_LOCALES as readonly string[]).includes(lang) ? (lang as Lang) : 'ru';
}

/** Статусы из контракта CF (plan-02) + локальный 'error' для сетевого сбоя. */
export type ExplainRequestStatus = ExplainPhraseResponse['status'] | 'error';

/** Состояние запроса, которым живёт шторка. */
export interface ExplainRequestState {
  /** true пока идёт генерация/сетевой вызов и текста ещё нет (cache MISS). */
  loading: boolean;
  /** Текст объяснения (или серверный fallback). Пусто, пока грузится. */
  text: string;
  /** Статус ответа сервера, либо 'error' при упавшем промисе. */
  status: ExplainRequestStatus;
  /** Пришло ли из глобального кэша (для аналитики и «мгновенного» UX). */
  fromCache: boolean;
  /** true, если сетевой вызов упал (сервер ничего не вернул). */
  error: boolean;
}

const INITIAL_STATE: ExplainRequestState = {
  loading: true,
  text: '',
  status: 'pending',
  fromCache: false,
  error: false,
};

const EXPLAIN_RESULT_CACHE_LIMIT = 80;
const explainResultCache = new Map<string, ExplainRequestState>();

function explainRequestKey(req: ExplainPhraseRequest): string {
  return JSON.stringify({
    phraseEn: String(req.phraseEn ?? '').trim(),
    phraseMeaning: String(req.phraseMeaning ?? '').trim(),
    lang: String(req.lang ?? '').trim(),
    studyTarget: String(req.studyTarget ?? 'en').trim(),
  });
}

export function canReuseExplainRequestState(
  state: ExplainRequestState | undefined,
): state is ExplainRequestState {
  return Boolean(
    state &&
      !state.loading &&
      !state.error &&
      state.status === 'ok' &&
      typeof state.text === 'string' &&
      state.text.trim().length > 0,
  );
}

function rememberExplainResult(key: string, state: ExplainRequestState): void {
  if (!canReuseExplainRequestState(state)) return;
  if (explainResultCache.has(key)) explainResultCache.delete(key);
  explainResultCache.set(key, state);
  while (explainResultCache.size > EXPLAIN_RESULT_CACHE_LIMIT) {
    const oldest = explainResultCache.keys().next().value;
    if (!oldest) break;
    explainResultCache.delete(oldest);
  }
}

/**
 * Что реально показать в теле шторки.
 * Чистая функция: на ошибке возвращает НЕЙТРАЛЬНЫЙ локализованный fallback, иначе —
 * серверный text как есть. КЛИЕНТ НЕ правит и НЕ оценивает текст сервера.
 *
 * `degraded` = в теле НЕ настоящее объяснение, а запасной текст (сетевая ошибка или серверный
 * fallback) — шторка показывает кнопку «Попробовать ещё раз». Контракт CF: fallback лежит в text
 * при status exhausted/pending и при rejected ИЗ КЭША; live-rejected (fromCache=false) несёт
 * НАСТОЯЩИЙ сгенерированный текст (сервер рискует показать его одному юзеру, не всем) — это
 * НЕ degraded, ретрай не нужен.
 *
 * ВАЖНО (зафиксировано с юзером 2026-06-10): фича объясняет английскую грамматику и НИКОГДА
 * не пересказывает смысл/перевод фразы. Поэтому на ошибке мы НЕ показываем родной перевод
 * (старый fallback показывал — это и был баг «русский пересказ»). `_fallbackMeaning` оставлен
 * в сигнатуре только ради совместимости вызовов; в тексте он НЕ используется.
 */
export function resolveExplainDisplay(
  state: ExplainRequestState,
  lang: string,
  _fallbackMeaning?: string,
): { showSkeleton: boolean; text: string; degraded: boolean } {
  if (state.loading) {
    return { showSkeleton: true, text: '', degraded: false };
  }
  if (state.error) {
    // Сеть упала — сервер ничего не отдал. Показываем НЕЙТРАЛЬНЫЙ запасной текст:
    // ни перевода, ни смысла фразы (это объяснялка грамматики, не словарь).
    const text = triLang(asLang(lang), {
      ru: 'Не получилось загрузить объяснение. Попробуй ещё раз позже.',
      uk: 'Не вдалося завантажити пояснення. Спробуй ще раз пізніше.',
      es: 'No se pudo cargar la explicación. Inténtalo de nuevo más tarde.',
      'pt-BR': 'Não foi possível carregar a explicação. Tente de novo mais tarde.',
      vi: 'Không tải được phần giải thích. Hãy thử lại sau.',
      id: 'Penjelasan gagal dimuat. Coba lagi nanti.',
      tr: 'Açıklama yüklenemedi. Daha sonra tekrar dene.',
      pl: 'Nie udało się wczytać wyjaśnienia. Spróbuj ponownie później.',
    });
    return { showSkeleton: false, text, degraded: true };
  }
  // status 'ok' | 'rejected' | 'exhausted' | 'pending' — сервер ВСЕГДА положил text
  // (для не-ok это его собственный нейтральный fallback). Рендерим как есть.
  const degraded =
    state.status === 'exhausted' ||
    state.status === 'pending' ||
    state.status === 'rejected';
  return { showSkeleton: false, text: state.text, degraded };
}

/** Сегмент текста объяснения: английский фрагмент (подсветить) или обычная проза. */
export interface ExplainSegment {
  text: string;
  /** true — латинский (английский) фрагмент, рендерится акцентным цветом. */
  en: boolean;
}

// Ран английских слов: латиница с апострофами/дефисами внутри, включая пробелы МЕЖДУ
// латинскими словами — "I am ready" подсвечивается как ОДИН кусок, не три.
const EN_RUN_RE = /[A-Za-z][A-Za-z'’-]*(?:\s+[A-Za-z][A-Za-z'’-]*)*/g;

/**
 * Разбить текст объяснения на сегменты «английский / не английский» для подсветки.
 * Чистая функция (тестируется в node без рендера). Кавычки вокруг английского остаются
 * в обычных сегментах — подсвечиваются только сами латинские слова.
 */
export function splitExplainSegments(text: string): ExplainSegment[] {
  const s = String(text ?? '');
  if (!s) return [];
  const out: ExplainSegment[] = [];
  let last = 0;
  for (const match of s.matchAll(EN_RUN_RE)) {
    const start = match.index ?? 0;
    if (start > last) out.push({ text: s.slice(last, start), en: false });
    out.push({ text: match[0], en: true });
    last = start + match[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last), en: false });
  return out;
}

/** Абзацы объяснения: режем по пустой строке, мусорные края убираем. */
export function splitExplainParagraphs(text: string): string[] {
  return String(text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/** Дружелюбная строка скелетон-лоадера на время генерации (cache MISS). */
export function loadingLineForLang(lang: string): string {
  return triLang(asLang(lang), {
    ru: 'готовлю объяснение…',
    uk: 'готую пояснення…',
    es: 'preparando la explicación…',
    'pt-BR': 'preparando a explicação…',
    vi: 'đang chuẩn bị lời giải thích…',
    id: 'menyiapkan penjelasan…',
    tr: 'açıklama hazırlanıyor…',
    pl: 'przygotowuję wyjaśnienie…',
  });
}

/** Состояние запроса + ручной повтор (кнопка «Попробовать ещё раз» на degraded-пути). */
export interface ExplainRequestHandle extends ExplainRequestState {
  retry: () => void;
}

/**
 * Запросить объяснение фразы. Вызывается на открытии шторки (enabled=true).
 * Повторный вызов при той же фразе не дёргает сеть, если уже есть результат.
 * retry() форсит новый сетевой вызов (после ошибки/фолбэка) — кэш-хит бесплатен.
 */
export function useExplainRequest(
  req: ExplainPhraseRequest,
  enabled: boolean,
): ExplainRequestHandle {
  const [state, setState] = useState<ExplainRequestState>(INITIAL_STATE);
  const key = explainRequestKey(req);
  // Сторожим против setState после размонтажа (шторку могли закрыть до ответа).
  const mountedRef = useRef(true);
  const activeRequestKeyRef = useRef<string | null>(null);
  const runIdRef = useRef(0);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(async (force = false) => {
    if (!force) {
      const cached = explainResultCache.get(key);
      if (canReuseExplainRequestState(cached)) {
        activeRequestKeyRef.current = key;
        setState(cached);
        return;
      }
    }

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    activeRequestKeyRef.current = key;
    setState({ ...INITIAL_STATE, loading: true });
    try {
      const res = await callExplainPhrase(req);
      const nextState: ExplainRequestState = {
        loading: false,
        text: res.text,
        status: res.status,
        fromCache: res.fromCache,
        error: false,
      };
      rememberExplainResult(key, nextState);
      if (!mountedRef.current || activeRequestKeyRef.current !== key || runIdRef.current !== runId) return;
      setState(nextState);
    } catch (error) {
      if (!mountedRef.current || activeRequestKeyRef.current !== key || runIdRef.current !== runId) return;
      // Сервер не вернул объяснение. Не выдаём аварийный текст за учебный ответ:
      // resolveExplainDisplay покажет честное локализованное состояние и retry.
      setState({
        loading: false,
        text: '',
        status: 'error',
        fromCache: false,
        error: true,
      });
    }
    // req раскладываем по полям: иначе новый объект-литерал на каждый рендер
    // дёргал бы эффект бесконечно.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, req.phraseEn, req.phraseMeaning, req.lang, req.studyTarget]);

  useEffect(() => {
    if (!enabled) return;
    void run();
  }, [enabled, run]);

  const retry = useCallback(() => {
    void run(true);
  }, [run]);

  return { ...state, retry };
}
