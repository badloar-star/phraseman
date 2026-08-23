// Сборка запроса maxVoiceMint и callable-обвязка MAX-звонка.
//
// Зачем отдельный модуль: минт теперь делают ДВА экрана — пре-экран
// (max_call_session; прежний prestart теперь лишь совместимый route-alias —
// владелец 2026-08-16) и экран звонка (max_call_session, если заготовки нет
// или это ре-минт реконнекта). Промпт-поля (personaName/personaRole/
// scenarioBlock/memoryBlock) обязаны собираться ОДИНАКОВО в обоих
// местах — сервер строит instructions из них и по scenarioId ничего не
// резолвит. Здесь — единственная реализация.

import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import {
  DIALOG_SCENARIOS,
  getScenarioById,
  scenarioObjectives,
  scenarioTemperament,
  type DialogScenario,
} from './ai_dialog_scenarios';
import { buildCompanionMemory } from './ai_companion_memory';
import type { DialogMemory } from './ai_dialog_client';
import { loadMistakePracticeInsights } from './mistake_practice_insights';
import { peekHomeScreenHydration } from './home_screen_hydration';
import { getLessonData } from './lesson_data_all';
import { lessonGrammarEntry } from './lesson_grammar_map';
import {
  buildStableTutorSceneCatalog,
  renderTutorSceneCatalog,
  type TutorSceneItem,
} from './max_call_tutor_tools';
import {
  parseMintResponse,
  type MaxVoiceMintRequest,
  type MaxVoiceMintResponse,
} from './max_call_client';
import { MaxVoiceStageError, maxVoiceFailureReason } from './max_voice_error';
import {
  maxTutorPreviewKey,
  parseMaxTutorPreview,
  primeMaxTutorPreview,
  type MaxTutorPreview,
} from './max_tutor_preview';

const FUNCTIONS_REGION = 'us-central1';

/** Тонкая обвязка callable: App Check → httpsCallable → data. */
export function maxVoiceCallable<TRes>(name: string): (req: Record<string, unknown>) => Promise<TRes> {
  return async (req) => {
    await initFirebaseAppCheckIfAvailable();
    const fn = httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), name);
    const res = await fn(req);
    return res.data as TRes;
  };
}

/**
 * Имя персонажа из persona-строки (копия приёма ai_dialog_session: там функция
 * не экспортируется, а тянуть 2800-строчный экран ради регэкспа — дороже).
 */
export function extractPersonaName(persona?: string): string {
  if (!persona) return '';
  const match = persona.match(/your name is\s+((?:(?:Mr|Mrs|Ms|Dr|Prof)\.\s+)?[^.,]+)/i);
  return match ? match[1].trim() : '';
}

// Формат блока — как ai_dialog_session собирает для premiumDialogSend
// (role/setting/persona/goalEn/objectives/temperament), только связным текстом:
// без [[...]]-маркеров и JSON-конверта mood (спека §7).

/** Текстовый SCENARIO_BLOCK по формату раздела 7 спеки. */
export function buildScenarioBlock(scenario: DialogScenario): string {
  const lines: string[] = ['SCENARIO'];
  lines.push(`You are ${scenario.role}.`);
  lines.push(`Setting: ${scenario.setting}.`);
  if (scenario.persona) lines.push(`Persona: ${scenario.persona}`);
  const temperament = scenarioTemperament(scenario);
  lines.push(`Temperament: ${temperament.patience} patience, ${temperament.warmth} warmth.`);
  lines.push(`Goal of the conversation: ${scenario.goalEn}.`);
  const objectives = scenarioObjectives(scenario);
  if (objectives.length > 0) {
    lines.push(
      `The learner should accomplish: ${objectives.map((o) => o.en || o.id).join('; ')}.`,
    );
  }
  lines.push('Drive toward the goal in 5-8 exchanges.');
  return lines.join('\n');
}

/** COMPANION-память → текстовый блок «WHAT YOU REMEMBER ABOUT THIS LEARNER». */
export function formatMemoryBlock(memory: DialogMemory): string {
  const lines: string[] = ['WHAT YOU REMEMBER ABOUT THIS LEARNER'];
  if (memory.profile) lines.push(memory.profile);
  if (memory.weakWords && memory.weakWords.length > 0) {
    // Слабые места из новой системы ошибок вплетаются в вопросы естественно.
    lines.push(`Words to weave naturally into your questions: ${memory.weakWords.join(', ')}.`);
  }
  if (memory.summary) lines.push(memory.summary);
  return lines.join('\n');
}

/**
 * Промпт-поля минта по формату звонка. Никогда не бросает: минт без памяти /
 * без памяти хуже минта без звонка — сервер деградирует к дефолтам сам.
 */
export async function buildMintExtras(
  format: MaxVoiceMintRequest['format'],
  scenario: DialogScenario | undefined,
  cefr: string | undefined,
): Promise<Partial<MaxVoiceMintRequest>> {
  const extras: Partial<MaxVoiceMintRequest> = {};
  if (scenario) {
    extras.scenarioBlock = buildScenarioBlock(scenario);
    const name = extractPersonaName(scenario.persona);
    if (name !== '') extras.personaName = name;
    extras.personaRole = scenario.role;
  }
  if (format === 'companion') {
    extras.personaName = 'Alex';
    extras.personaRole = 'a friendly conversation partner who knows the learner';
    try {
      extras.memoryBlock = formatMemoryBlock(await buildCompanionMemory(cefr ?? 'A2'));
    } catch {
      // Память недоступна (чистый профиль/сбой стора) — компаньон без памяти.
    }
  }
  return extras;
}

/** Параметры звонка, общие для пре-экрана и экрана звонка (из route params). */
export interface MaxCallParams {
  format: MaxVoiceMintRequest['format'];
  scenarioId: string;
  cefr?: string;
  devMode: boolean;
  /** Язык интерфейса (родной язык ученика) — учителю для объяснений новичкам. */
  interfaceLang?: string;
  /** Изучаемый язык ('en' | 'fr') — учитель ведёт урок именно на нём и не переключается по просьбе. */
  studyTarget?: string;
}

/**
 * Уровень ученика по прогрессу уроков (та же эвристика, что у диалогов урока в
 * ai_dialog_session: ≤8 → A1, ≤20 → A2, дальше B1). Без прогресса — A1: учитель
 * с новичком говорит на родном языке, это безопаснее, чем завысить.
 */
export function guessLearnerCefr(): 'A1' | 'A2' | 'B1' {
  const home = peekHomeScreenHydration();
  const lessons = Math.max(home?.lessonsCompleted ?? 0, home?.lastLessonId ?? 0);
  if (lessons <= 0) return 'A1';
  return lessons <= 8 ? 'A1' : lessons <= 20 ? 'A2' : 'B1';
}

// зачем (аудит 2026-08-23): tutorSceneItems(cefr, seed) удалена. После рычага 2
// её не звал никто, но экспорт оставался ловушкой: любой новый вызов вернул бы
// каталог, зависящий от уровня и дня, и молча развалил бы кэш префикса.
// Единственная точка входа теперь — tutorStableSceneItems() ниже.

/**
 * Каталог сцен для ПРОМПТА и для валидации id в звонке — один и тот же,
 * стабильный для всех учеников и дней (рычаг 2, кэш префикса).
 * Обе точки обязаны звать именно его, иначе учитель предложит сцену,
 * которую клиент отвергнет как неизвестную.
 */
export function tutorStableSceneItems(): TutorSceneItem[] {
  return buildStableTutorSceneCatalog(DIALOG_SCENARIOS);
}

/** Полный блок сцены по id — тот же формат, что у формата scenario. */
export function tutorSceneBlock(id: string): string | null {
  const scenario = getScenarioById(id);
  return scenario ? buildScenarioBlock(scenario) : null;
}

/**
 * Снимок ученика для промпта учителя: только то, о чём учитель может честно
 * сказать (имя, серия, уроки, тренажёр, слабые слова). Никогда не бросает.
 */
export async function buildLearnerSnapshot(
  cefr: string | undefined,
  studyTarget: 'en' | 'fr' = 'en',
): Promise<string> {
  const lines: string[] = [];
  try {
    const home = peekHomeScreenHydration();
    if (home) {
      if (home.userName && home.userName.trim() !== '') lines.push(`name: ${home.userName.trim().slice(0, 40)}`);
      lines.push(`streak: ${Math.max(0, home.streak)} days`);
      lines.push(`lessons completed: ${Math.max(0, home.lessonsCompleted)}`);
      if (home.lastLessonId) lines.push(`last lesson: ${home.lastLessonId}`);
    }
  } catch {}
  try {
    const insights = await loadMistakePracticeInsights(studyTarget);
    lines.push(`mistakes ready to practise: ${insights.dueWords + insights.duePhrases}`);
    const words = insights.topMistakes.slice(0, 6).map((item) => item.phrase.trim()).filter(Boolean);
    if (words.length > 0) lines.push(`frequent mistakes to revisit naturally: ${words.join(', ')}`);
  } catch {}
  if (cefr) lines.push(`level in the app: ${cefr}`);
  return lines.join('\n');
}

/**
 * Учебный план урока: фразы текущего и следующего урока курса + грамматика.
 *
 * зачем (владелец 2026-08-17): «а план обучения у тутора есть или от фонаря?».
 * План = курс приложения: учитель ведёт звонок по тому же контенту, что ученик
 * видит в уроках, а не выбирает тему наугад. Контент в бандле, сеть не нужна.
 *
 * зачем ОТДЕЛЬНО от снимка (владелец 2026-08-23, рычаг 3): этот текст зависит
 * ТОЛЬКО от номера урока. Пока он ехал внутри learnerSnapshot вперемешку с
 * именем и серией, вся склейка (~900 токенов) была уникальной для каждого
 * ученика и переотправлялась КАЖДЫЙ ход по полной цене — это давало 44% счёта
 * за урок. Вынесенный отдельно, план одинаков у всех на этом уроке и попадает
 * в общий prompt cache.
 */
export function buildLessonSyllabusBlock(): string {
  const lines: string[] = [];
  try {
    const home = peekHomeScreenHydration();
    const current = Math.max(1, home?.lastLessonId ?? Math.max(1, (home?.lessonsCompleted ?? 0) + 1));
    const phrasesOf = (lessonId: number, limit: number): string[] =>
      getLessonData(lessonId)
        .map((phrase) => String(phrase.english ?? '').trim())
        .filter((p) => p !== '')
        .slice(0, limit);
    const currentPhrases = phrasesOf(current, 10);
    if (currentPhrases.length > 0) {
      lines.push(`SYLLABUS — current app lesson ${current} phrases (teach and practise 2-3 of these today): ${currentPhrases.join(' | ')}`);
    }
    // Грамматика урока из карты (единый источник: lesson_grammar_map) — учитель
    // объясняет конструкцию (на родном для A1/A2) и даёт 2 подстановки.
    const grammar = lessonGrammarEntry(current);
    if (grammar && grammar.constructions.length > 0) {
      lines.push(`SYLLABUS — grammar point of lesson ${current} (${grammar.level}): ${grammar.constructions.join(', ')} — explain it simply and practise it in two substitutions.`);
    }
    const nextPhrases = phrasesOf(current + 1, 6);
    if (nextPhrases.length > 0) {
      lines.push(`SYLLABUS — next app lesson ${current + 1} phrases (preview; a natural "next topic"): ${nextPhrases.join(' | ')}`);
    }
  } catch {}
  return lines.join('\n');
}

/** Сценарий для промпт-полей: companion — без сценария. */
export function scenarioForCall(params: MaxCallParams): DialogScenario | undefined {
  return params.format === 'companion' ? undefined : getScenarioById(params.scenarioId);
}

/** Тело первого минта звонка (без reconnect-полей) из параметров экрана. */
export function initialMintRequest(params: MaxCallParams): MaxVoiceMintRequest {
  return {
    format: params.format,
    scenarioId: params.format === 'companion' ? undefined : params.scenarioId,
    cefr: params.cefr,
    ...(params.devMode ? { devMode: true } : {}),
  };
}

/**
 * Настоящий минт: промпт-поля + callable + защитный разбор ответа. Ошибка —
 * MaxVoiceStageError со стабильным reason для UI. Используется и для первого
 * минта (пре-экран или экран звонка), и для ре-минтов реконнекта (req несёт
 * reconnectOf/reconnectSummary; extras собираются заново — сервер строит
 * instructions с нуля и на переносе резерва).
 */
export async function performMaxVoiceMint(
  params: MaxCallParams,
  req: MaxVoiceMintRequest,
): Promise<MaxVoiceMintResponse> {
  try {
    const extras = params.format === 'tutor'
      ? await buildTutorMintExtras(params)
      : await buildMintExtras(params.format, scenarioForCall(params), params.cefr);
    const data = await maxVoiceCallable<unknown>('maxVoiceMint')(
      { ...extras, ...req } as unknown as Record<string, unknown>,
    );
    return parseMintResponse(data);
  } catch (error) {
    if (__DEV__) console.warn('[MAX Voice] mint failed', error);
    throw new MaxVoiceStageError(maxVoiceFailureReason(error, 'mint_failed'), error);
  }
}

/**
 * Bounded, read-only lesson preview prefetch. Unlike premint this never creates
 * a provider token or voice reservation, so Home may safely warm it on focus.
 */
export function prefetchMaxTutorPreview(
  params: MaxCallParams,
  nowMs = Date.now(),
): Promise<MaxTutorPreview | null> {
  const key = maxTutorPreviewKey(params);
  return primeMaxTutorPreview(key, async () => {
    const raw = await maxVoiceCallable<unknown>('maxVoicePreflight')({
      format: 'tutor',
      cefr: params.cefr,
      interfaceLang: params.interfaceLang ?? 'ru',
      studyTarget: params.studyTarget ?? 'en',
    });
    const envelope = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const preview = parseMaxTutorPreview(envelope.tutorPreview, params.interfaceLang ?? 'ru');
    if (!preview) return null;
    return {
      ...preview,
      ...(envelope.limits && typeof envelope.limits === 'object'
        ? { limits: envelope.limits as Record<string, unknown> }
        : {}),
    };
  }, nowMs);
}

/**
 * Промпт-поля учителя: язык, каталог сцен под уровень, снимок ученика.
 * Ротация каталога — по дню (сегодня одни сцены, завтра другие).
 */
export async function buildTutorMintExtras(params: MaxCallParams): Promise<Partial<MaxVoiceMintRequest>> {
  const cefr = params.cefr ?? guessLearnerCefr();
  return {
    cefr,
    interfaceLang: params.interfaceLang ?? 'ru',
    studyTarget: params.studyTarget ?? 'en',
    // зачем (рычаг 2, кэш): каталог больше НЕ зависит ни от уровня, ни от дня —
    // одинаковая строка для всех попадает в общий prompt cache. Уровень каждой
    // сцены написан прямо в строке ("level A2"), а уровень ученика учитель
    // видит в блоке YOUR LEARNER, поэтому выбирает подходящую сам.
    sceneCatalog: renderTutorSceneCatalog(tutorStableSceneItems()),
    // Учебный план отдельным полем — он общий для всех на этом уроке и потому
    // кэшируется; личный снимок идёт следом и остаётся уникальным (рычаг 3).
    syllabusBlock: buildLessonSyllabusBlock(),
    learnerSnapshot: await buildLearnerSnapshot(cefr, params.studyTarget === 'fr' ? 'fr' : 'en'),
  };
}

/**
 * Возврат резерва заготовленного, но не использованного минта (юзер ушёл с
 * пре-экрана, заготовка протухла): maxVoiceSessionEnd 'dropped' с нулём секунд
 * и нулевым usage. Сервер видит «ни одного heartbeat» и отпускает резерв целиком.
 * Никогда не бросает: если не доехало — вытеснит следующий минт или watchdog.
 */
export async function releaseUnusedMint(mint: MaxVoiceMintResponse): Promise<void> {
  try {
    await maxVoiceCallable<unknown>('maxVoiceSessionEnd')({
      sessionId: mint.session_id,
      endReason: 'dropped',
      elapsedSec: 0,
      usage: { audioInputTokens: 0, audioOutputTokens: 0, cachedTokens: 0, textTokens: 0 },
      channel: 'realtime',
    });
  } catch {
    // См. docstring: серверные страховки дожмут.
  }
}

/* expo-router route shim: файлы в app/ считаются роутами и требуют default export. */
export default function __RouteShim() {
  return null;
}
