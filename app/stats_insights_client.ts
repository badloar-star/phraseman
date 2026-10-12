// ═══════════════════════════════════════════════════════════════════════════
// stats_insights_client.ts — клиентский слой ИИ-микротекстов под блоками статы.
//
// Отвечает за локальные заметки, кэш AsyncStorage и частоту обновления.
// Сервер не генерирует и не выбирает тексты статистики.
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';
import { triLang, type Lang } from '../constants/i18n';
import { statsInsightsStorageKey, type RuntimeStudyTarget } from './target_storage_keys';

const DAY_MS = 24 * 60 * 60 * 1000;
const PREMIUM_WINDOW_DAYS = 3;
const FREE_WINDOW_DAYS = 7;

/** Ключи локальных блоков заметок. */
export const STATS_INSIGHT_BLOCKS = ['balance', 'rhythm', 'year', 'lifetime'] as const;
export type StatsInsightBlock = (typeof STATS_INSIGHT_BLOCKS)[number];
export type StatsInsightsNotes = Record<StatsInsightBlock, string>;

/** Briefing — уже посчитанные числа по блокам (собирает экран статистики). */
export interface StatsInsightsBriefing {
  lang: Lang;
  studyTarget?: RuntimeStudyTarget;
  balance: { score: number; isWarmup: boolean; active7: number; avgMinutes: number };
  rhythm: { active7: number; minutes7: number; bestDay: string };
  year: { activeDays: number; currentStreak: number; longestStreak: number; bestMonth: string; goalPct: number };
  lifetime: { words: number; phrases: number; daysActive: number };
  weakCategories: Array<{ label: string; pct: number }>;
}

export interface StatsInsightsStored {
  notes: StatsInsightsNotes;
  generatedAtMs: number;
  nextAllowedAtMs: number;
  lang: Lang;
}

export type StatsInsightsState =
  | { kind: 'none' }
  | { kind: 'cached'; notes: StatsInsightsNotes; nextAllowedAtMs: number; lang: Lang }
  | { kind: 'insufficient_data' }
  | { kind: 'error'; code: StatsInsightsErrorCode; notes: StatsInsightsNotes | null };

export type StatsInsightsErrorCode = 'offline' | 'not_ready' | 'insufficient_data' | 'provider_failed' | 'unknown';

function emptyNotes(): StatsInsightsNotes {
  return { balance: '', rhythm: '', year: '', lifetime: '' };
}

/** Приводит произвольный объект заметок к известной форме (4 строковых блока). */
function normalizeNotes(raw: Partial<StatsInsightsNotes> | undefined): StatsInsightsNotes {
  const notes = emptyNotes();
  if (!raw) return notes;
  for (const key of STATS_INSIGHT_BLOCKS) {
    const v = (raw as Record<string, unknown>)[key];
    notes[key] = typeof v === 'string' ? guardLearnerFacingNote(key, v) : '';
  }
  return notes;
}

function guardLearnerFacingNote(key: StatsInsightBlock, note: string): string {
  const clean = note.trim();
  if (!clean) return '';
  if (key === 'rhythm' && /\bXP\b/i.test(clean)) return '';
  if (key !== 'balance') return clean;
  const lower = clean.toLocaleLowerCase();
  const hasInternalBalancePhrase =
    /\d+\s*(?:\/\s*100\s*)?(?:балл|балла|баллов|points?|pts?|score)/i.test(clean) ||
    /(?:score|points?|pts?)\s*\d+/i.test(clean) ||
    /(?:балл|балла|баллов|points?|pts?|score).{0,24}(?:баланс|balance)/i.test(clean) ||
    /(?:баланс|balance).{0,24}(?:балл|балла|баллов|points?|pts?|score)/i.test(clean) ||
    lower.includes('practice balance score') ||
    lower.includes('balance score');
  return hasInternalBalancePhrase ? '' : clean;
}

function hasAnyNote(notes: StatsInsightsNotes): boolean {
  return STATS_INSIGHT_BLOCKS.some((k) => !!notes[k]);
}

async function loadStored(studyTarget?: RuntimeStudyTarget): Promise<StatsInsightsStored | null> {
  try {
    const raw = await AsyncStorage.getItem(statsInsightsStorageKey(studyTarget));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StatsInsightsStored>;
    const notes = normalizeNotes(parsed?.notes);
    if (!hasAnyNote(notes)) return null;
    return {
      notes,
      generatedAtMs: Number(parsed.generatedAtMs ?? 0),
      nextAllowedAtMs: Number(parsed.nextAllowedAtMs ?? 0),
      lang: (parsed.lang ?? 'ru') as Lang,
    };
  } catch {
    return null;
  }
}

async function saveStored(stored: StatsInsightsStored, studyTarget?: RuntimeStudyTarget): Promise<void> {
  try {
    await AsyncStorage.setItem(statsInsightsStorageKey(studyTarget), JSON.stringify(stored));
  } catch (err) {
    DebugLogger.error('stats_insights_client:save', err, 'warning');
  }
}

function windowDaysFor(isPremium: boolean): number {
  return isPremium ? PREMIUM_WINDOW_DAYS : FREE_WINDOW_DAYS;
}

function canGenerateNow(stored: StatsInsightsStored | null, nowMs: number): boolean {
  if (!stored) return true;
  return nowMs >= stored.nextAllowedAtMs;
}

function isStoredForLang(stored: StatsInsightsStored | null, lang: Lang): stored is StatsInsightsStored {
  return !!stored && stored.lang === lang;
}

/** Состояние для UI без сети — показать кэш мгновенно. */
export async function getStatsInsightsState(
  studyTarget?: RuntimeStudyTarget,
  nowMs: number = Date.now(),
  lang?: Lang,
): Promise<StatsInsightsState> {
  void nowMs;
  const stored = await loadStored(studyTarget);
  if (!stored) return { kind: 'none' };
  if (lang && !isStoredForLang(stored, lang)) return { kind: 'none' };
  return { kind: 'cached', notes: stored.notes, nextAllowedAtMs: stored.nextAllowedAtMs, lang: stored.lang };
}

export interface GenerateStatsInsightsOptions {
  briefing: StatsInsightsBriefing;
  isPremium: boolean;
  force?: boolean;
  nowMs?: number;
}

function localText(
  lang: Lang,
  ru: string,
  uk: string,
  en: string,
  es: string,
  ptBR: string,
  vi: string,
  id: string,
  tr: string,
  pl: string,
): string {
  return triLang(lang, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });
}

function hasEnoughStatsSignal(briefing: StatsInsightsBriefing): boolean {
  return (
    briefing.rhythm.active7 >= 2 ||
    briefing.lifetime.daysActive >= 3 ||
    briefing.lifetime.words + briefing.lifetime.phrases >= 8 ||
    briefing.balance.active7 >= 2
  );
}

export function buildLocalStatsInsights(briefing: StatsInsightsBriefing): StatsInsightsNotes {
  const weak = briefing.weakCategories[0];
  const bestDay = briefing.rhythm.bestDay || '—';
  const bestMonth = briefing.year.bestMonth || '—';
  const totalItems = briefing.lifetime.words + briefing.lifetime.phrases;

  return {
    balance: briefing.balance.isWarmup
      ? localText(
          briefing.lang,
          `Пока мало данных для честного вывода: за 7 дней было ${briefing.balance.active7} активных дн. Продолжай короткими сессиями.`,
          `Поки мало даних для чесного висновку: за 7 днів було ${briefing.balance.active7} активних дн. Продовжуй короткими сесіями.`,
          `Not enough data for a fair verdict yet: ${briefing.balance.active7} active days in the last 7. Keep going with short sessions.`,
          `Aún hay pocos datos: en 7 días tuviste ${briefing.balance.active7} días activos. Sigue con sesiones cortas.`,
          `Ainda há poucos dados: em 7 dias você teve ${briefing.balance.active7} dias ativos. Continue com sessões curtas.`,
          `Vẫn còn ít dữ liệu: trong 7 ngày bạn có ${briefing.balance.active7} ngày hoạt động. Hãy tiếp tục với các phiên ngắn.`,
          `Data masih sedikit: dalam 7 hari kamu punya ${briefing.balance.active7} hari aktif. Lanjutkan dengan sesi singkat.`,
          `Henüz az veri var: son 7 günde ${briefing.balance.active7} aktif günün oldu. Kısa oturumlarla devam et.`,
          `Na razie jest mało danych: w 7 dni było ${briefing.balance.active7} aktywnych dni. Kontynuuj krótkimi sesjami.`,
        )
      : localText(
          briefing.lang,
          `За 7 дней у тебя ${briefing.balance.active7} активных дн., средняя сессия — ${Math.round(briefing.balance.avgMinutes)} мин. Лучше держать короткий фокус, чем растягивать практику.`,
          `За 7 днів у тебе ${briefing.balance.active7} активних дн., середня сесія — ${Math.round(briefing.balance.avgMinutes)} хв. Краще тримати короткий фокус, ніж розтягувати практику.`,
          `In the last 7 days you had ${briefing.balance.active7} active days, average session ${Math.round(briefing.balance.avgMinutes)} min. Short focus beats stretched-out practice.`,
          `En 7 días tuviste ${briefing.balance.active7} días activos; sesión media: ${Math.round(briefing.balance.avgMinutes)} min. Mejor foco corto que práctica alargada.`,
          `Em 7 dias você teve ${briefing.balance.active7} dias ativos; sessão média: ${Math.round(briefing.balance.avgMinutes)} min. Melhor foco curto do que prática alongada.`,
          `Trong 7 ngày bạn có ${briefing.balance.active7} ngày hoạt động; phiên trung bình: ${Math.round(briefing.balance.avgMinutes)} phút. Tập trung ngắn vẫn tốt hơn kéo dài buổi học.`,
          `Dalam 7 hari kamu punya ${briefing.balance.active7} hari aktif; sesi rata-rata ${Math.round(briefing.balance.avgMinutes)} menit. Fokus singkat lebih baik daripada latihan yang terlalu panjang.`,
          `Son 7 günde ${briefing.balance.active7} aktif günün var; ortalama oturum ${Math.round(briefing.balance.avgMinutes)} dk. Uzatılmış pratiktense kısa odak daha iyi.`,
          `W 7 dni masz ${briefing.balance.active7} aktywnych dni; średnia sesja to ${Math.round(briefing.balance.avgMinutes)} min. Lepszy krótki fokus niż przeciąganie nauki.`,
        ),
    rhythm: localText(
      briefing.lang,
      `За 7 дней: ${briefing.rhythm.active7} активн. дн., ${briefing.rhythm.minutes7} мин. Лучший день: ${bestDay}.`,
      `За 7 днів: ${briefing.rhythm.active7} активн. дн., ${briefing.rhythm.minutes7} хв. Найкращий день: ${bestDay}.`,
      `Last 7 days: ${briefing.rhythm.active7} active days, ${briefing.rhythm.minutes7} min. Best day: ${bestDay}.`,
      `En 7 días: ${briefing.rhythm.active7} días activos, ${briefing.rhythm.minutes7} min. Mejor día: ${bestDay}.`,
      `Em 7 dias: ${briefing.rhythm.active7} dias ativos, ${briefing.rhythm.minutes7} min. Melhor dia: ${bestDay}.`,
      `Trong 7 ngày: ${briefing.rhythm.active7} ngày hoạt động, ${briefing.rhythm.minutes7} phút. Ngày tốt nhất: ${bestDay}.`,
      `Dalam 7 hari: ${briefing.rhythm.active7} hari aktif, ${briefing.rhythm.minutes7} menit. Hari terbaik: ${bestDay}.`,
      `Son 7 gün: ${briefing.rhythm.active7} aktif gün, ${briefing.rhythm.minutes7} dk. En iyi gün: ${bestDay}.`,
      `W 7 dni: ${briefing.rhythm.active7} aktywnych dni, ${briefing.rhythm.minutes7} min. Najlepszy dzień: ${bestDay}.`,
    ),
    year: localText(
      briefing.lang,
      `Годовой ритм: ${briefing.year.activeDays} активных дней, серия ${briefing.year.currentStreak}, рекорд ${briefing.year.longestStreak}. Лучший месяц: ${bestMonth}.`,
      `Річний ритм: ${briefing.year.activeDays} активних днів, серія ${briefing.year.currentStreak}, рекорд ${briefing.year.longestStreak}. Найкращий місяць: ${bestMonth}.`,
      `Yearly rhythm: ${briefing.year.activeDays} active days, streak ${briefing.year.currentStreak}, record ${briefing.year.longestStreak}. Best month: ${bestMonth}.`,
      `Ritmo anual: ${briefing.year.activeDays} días activos, racha ${briefing.year.currentStreak}, récord ${briefing.year.longestStreak}. Mejor mes: ${bestMonth}.`,
      `Ritmo anual: ${briefing.year.activeDays} dias ativos, sequência ${briefing.year.currentStreak}, recorde ${briefing.year.longestStreak}. Melhor mês: ${bestMonth}.`,
      `Nhịp trong năm: ${briefing.year.activeDays} ngày hoạt động, chuỗi ${briefing.year.currentStreak}, kỷ lục ${briefing.year.longestStreak}. Tháng tốt nhất: ${bestMonth}.`,
      `Ritme tahunan: ${briefing.year.activeDays} hari aktif, rentetan ${briefing.year.currentStreak}, rekor ${briefing.year.longestStreak}. Bulan terbaik: ${bestMonth}.`,
      `Yıllık ritim: ${briefing.year.activeDays} aktif gün, seri ${briefing.year.currentStreak}, rekor ${briefing.year.longestStreak}. En iyi ay: ${bestMonth}.`,
      `Roczny rytm: ${briefing.year.activeDays} aktywnych dni, seria ${briefing.year.currentStreak}, rekord ${briefing.year.longestStreak}. Najlepszy miesiąc: ${bestMonth}.`,
    ),
    lifetime: weak
      ? localText(
          briefing.lang,
          `Всего закреплено ${totalItems} слов/фраз. Слабая зона: ${weak.label} (${Math.round(weak.pct)}%) — начни с неё.`,
          `Усього закріплено ${totalItems} слів/висловів. Слабка зона: ${weak.label} (${Math.round(weak.pct)}%) — почни з неї.`,
          `Total mastered: ${totalItems} words/phrases. Weak zone: ${weak.label} (${Math.round(weak.pct)}%) — start there.`,
          `Tienes ${totalItems} palabras/frases trabajadas. Zona débil: ${weak.label} (${Math.round(weak.pct)}%); empieza ahí.`,
          `Você trabalhou ${totalItems} palavras/frases. Zona fraca: ${weak.label} (${Math.round(weak.pct)}%); comece por ela.`,
          `Bạn đã ôn ${totalItems} từ/cụm từ. Vùng yếu: ${weak.label} (${Math.round(weak.pct)}%); hãy bắt đầu từ đó.`,
          `Total sudah dilatih: ${totalItems} kata/frasa. Area lemah: ${weak.label} (${Math.round(weak.pct)}%); mulai dari sana.`,
          `Toplam ${totalItems} kelime/ifade pekiştirildi. Zayıf alan: ${weak.label} (${Math.round(weak.pct)}%); buradan başla.`,
          `Łącznie utrwalono ${totalItems} słów/fraz. Słabszy obszar: ${weak.label} (${Math.round(weak.pct)}%); zacznij od niego.`,
        )
      : localText(
          briefing.lang,
          `Всего закреплено ${totalItems} слов/фраз. Продолжай маленькими повторениями.`,
          `Усього закріплено ${totalItems} слів/висловів. Продовжуй малими повтореннями.`,
          `Total mastered: ${totalItems} words/phrases. Keep going with small reviews.`,
          `Tienes ${totalItems} palabras/frases trabajadas. Sigue con repasos pequeños.`,
          `Você trabalhou ${totalItems} palavras/frases. Continue com pequenas revisões.`,
          `Bạn đã ôn ${totalItems} từ/cụm từ. Hãy tiếp tục với các lượt ôn nhỏ.`,
          `Kamu sudah melatih ${totalItems} kata/frasa. Lanjutkan dengan pengulangan kecil.`,
          `Toplam ${totalItems} kelime/ifade pekişti. Küçük tekrarlarla devam et.`,
          `Łącznie utrwalono ${totalItems} słów/fraz. Kontynuuj małymi powtórkami.`,
        ),
  };
}

/**
 * Генерирует заметки локальным шаблоном (если окно позволяет).
 * Возвращает обновлённое состояние без сетевого вызова.
 */
export async function generateStatsInsights(options: GenerateStatsInsightsOptions): Promise<StatsInsightsState> {
  const { briefing, isPremium } = options;
  const studyTarget = briefing.studyTarget;
  const lang = briefing.lang;
  const nowMs = options.nowMs ?? Date.now();
  const stored = await loadStored(studyTarget);
  const storedForCurrentLang = isStoredForLang(stored, lang) ? stored : null;

  // Локальный гейт: рано — отдаём кэш.
  if (!options.force && !canGenerateNow(storedForCurrentLang, nowMs) && storedForCurrentLang?.notes.balance) {
    if (storedForCurrentLang) return { kind: 'cached', notes: storedForCurrentLang.notes, nextAllowedAtMs: storedForCurrentLang.nextAllowedAtMs, lang: storedForCurrentLang.lang };
    return { kind: 'none' };
  }

  if (!hasEnoughStatsSignal(briefing)) {
    return storedForCurrentLang
      ? { kind: 'cached', notes: storedForCurrentLang.notes, nextAllowedAtMs: storedForCurrentLang.nextAllowedAtMs, lang: storedForCurrentLang.lang }
      : { kind: 'insufficient_data' };
  }

  const notes = buildLocalStatsInsights(briefing);
  const nextStored: StatsInsightsStored = {
    notes,
    generatedAtMs: nowMs,
    nextAllowedAtMs: nowMs + windowDaysFor(isPremium) * DAY_MS,
    lang,
  };
  await saveStored(nextStored, studyTarget);
  return { kind: 'cached', notes, nextAllowedAtMs: nextStored.nextAllowedAtMs, lang };
}
