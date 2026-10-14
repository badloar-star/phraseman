// ═══════════════════════════════════════════════════════════════════════════
// welcome_back_gate.ts — показывать ли окно «С возвращением» сейчас (D193). Только локальные данные, без сети.
//
// зачем (координатор 14.10): окно заменяет winback-пейвол. Решение: флаг moments_v3 (кэш remote_config, как окно недели Пика) →
// снимок возвращения (welcome_back_signal) → «уже показывали после этой отлучки» (welcome_back_shown_at_v1) → цифры из кэша статистики
// → чистое decideWelcomeBack. Каждое решение и каждый ранний выход пишет [WELCOME-BACK] с причиной и значением.
// «Показано» ставится НЕ здесь, а когда окно реально получило слот в очереди окон (хук).
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isMomentsV3Enabled } from '../../components/spire/moments/moments_flag';
import { readRemoteConfigCacheRaw } from '../../app/remote_config_client';
import { readLifetimeProfileStatsCache } from '../../app/lifetime_profile_stats';
import { decideWelcomeBack, type WelcomeBackDecision } from './welcome_back_model';
import { peekWelcomeBackReturnGap } from './welcome_back_signal';

export const WELCOME_BACK_SHOWN_AT_KEY = 'welcome_back_shown_at_v1';
const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__ === true;
const DEV_ENV_ON = process.env.EXPO_PUBLIC_MOMENTS_V3 === '1';

const log = (message: string): void => {
  console.log(`[WELCOME-BACK] ${message}`); // guard-ok: решение показа окна — единичные строки на возврат
};

export type WelcomeBackGateInput = Readonly<{
  studyTarget: string;
  coinRank: number | null;
  energy: Readonly<{ current: number; max: number }> | null;
  nowMs?: number;
}>;

export type WelcomeBackGateResult =
  | Readonly<{ show: false; reason: string }>
  | Readonly<{ show: true; decision: Extract<WelcomeBackDecision, { show: true }>; lastActiveMs: number }>;

async function readFlag(): Promise<boolean> {
  try {
    const raw = await readRemoteConfigCacheRaw();
    const bools = raw ? (JSON.parse(raw) as { bools?: Record<string, unknown> }).bools : null;
    const remote = isMomentsV3Enabled(bools);
    log(`флаг moments_v3: remote=${String(remote)} dev=${String(IS_DEV && DEV_ENV_ON)} кэш=${raw ? 'есть' : 'нет'}`);
    return remote || (IS_DEV && DEV_ENV_ON);
  } catch (error) {
    log(`флаг moments_v3: кэш конфига не прочитался — окно выключено (${String(error).slice(0, 120)})`);
    return false;
  }
}

async function readShownAt(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(WELCOME_BACK_SHOWN_AT_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch (error) {
    // Не прочитали отметку — считаем «не показывали»: худший случай — окно ещё раз, а не потеря.
    log(`отметка «показано» не прочиталась (${String(error).slice(0, 120)}) — считаем, что не показывали`);
    return null;
  }
}

async function readCounts(studyTarget: string): Promise<{ phrases: number; cards: number; from: string }> {
  try {
    const cache = await readLifetimeProfileStatsCache();
    if (!cache) return { phrases: 0, cards: 0, from: 'no_cache' };
    const row = (cache.byTarget as Record<string, { phrasesLearned: number; flashcardsSaved: number }> | undefined)?.[studyTarget];
    if (row) return { phrases: row.phrasesLearned, cards: row.flashcardsSaved, from: `cache_by_target:${studyTarget}` };
    return { phrases: cache.phrasesLearned, cards: cache.flashcardsSaved, from: 'cache_total' };
  } catch (error) {
    log(`цифры: кэш статистики не прочитался (${String(error).slice(0, 120)}) — цифры не показываем`);
    return { phrases: 0, cards: 0, from: 'cache_error' };
  }
}

/** Решить, показывать ли окно. Ничего не помечает. */
export async function resolveWelcomeBack(input: WelcomeBackGateInput): Promise<WelcomeBackGateResult> {
  const nowMs = input.nowMs ?? Date.now();
  log(`вход study=${input.studyTarget} rank=${String(input.coinRank)} energy=${input.energy ? `${input.energy.current}/${input.energy.max}` : 'нет'}`);
  if (!(await readFlag())) { log('не показываем: флаг moments_v3 выключен'); return { show: false, reason: 'flag_off' }; }
  const gap = peekWelcomeBackReturnGap();
  if (!gap) { log('не показываем: снимка возвращения нет (не было долгой отлучки в этом запуске)'); return { show: false, reason: 'no_return_gap' }; }
  const shownAtMs = await readShownAt();
  const counts = await readCounts(input.studyTarget);
  log(`цифры: фраз=${counts.phrases} карточек=${counts.cards} источник=${counts.from} shownAt=${shownAtMs ? new Date(shownAtMs).toISOString() : 'никогда'} источник_снимка=${gap.source}`);
  const decision = decideWelcomeBack({
    nowMs,
    lastActiveMs: gap.lastActiveMs,
    shownAtMs,
    phrasesLearned: counts.phrases,
    coinRank: input.coinRank ?? 0,
    energy: input.energy,
    aliveStreakDays: null,
    cardsDue: 0,
    cardsSaved: counts.cards,
    currentLessonId: null,
  });
  if (!decision.show) { log(`не показываем: ${decision.reason}`); return { show: false, reason: decision.reason }; }
  log(`ПОКАЗАТЬ: дней=${decision.stats.awayDays} фраз=${decision.stats.phrasesLearned} ранг=${decision.stats.coinRank} энергия_полная=${String(decision.stats.energyFull)} кнопка=${decision.primary.kind}${decision.primary.kind === 'cards' ? `×${decision.primary.count}` : ''}`);
  return { show: true, decision, lastActiveMs: gap.lastActiveMs };
}

/** Окно реально получило слот и стоит на экране. */
export async function markWelcomeBackShown(nowMs: number = Date.now()): Promise<void> {
  try {
    await AsyncStorage.setItem(WELCOME_BACK_SHOWN_AT_KEY, String(nowMs));
    log(`показано: отметка ${new Date(nowMs).toISOString()}`);
  } catch (error) {
    log(`отметка «показано» не записалась (${String(error).slice(0, 120)}) — окно может прийти ещё раз в этом возвращении`);
  }
}
