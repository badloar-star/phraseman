// Инструменты учителя на клиенте (вариант A, владелец 2026-08-16) — чистый модуль.
//
// Учитель (OpenAI Realtime, format 'tutor') вызывает функции через data channel:
//   start_scene(scene_id)  → сцена из ai_dialog_scenarios (сервер сцен не знает)
//   end_scene()            → назад к роли учителя
//   mark_phrase_result(phrase, result) → уверенный/неуверенный итог устной попытки
//   assign_homework(phrases, meanings) → 2–3 фразы на завтра + значения (память + тренажёр)
//   set_next_topic(topic)  → тема следующего урока
//   set_language_preference(mode) → «говори со мной по-английски / по-русски» — на будущие уроки
//   end_call()             → учитель попрощался — экран мягко завершает звонок
// Клиент исполняет их ЛОКАЛЬНО (ноль серверных вызовов) и отвечает
// function_call_output. Здесь — детерминированная логика без React/сети: каталог
// сцен под уровень, ответы модели, сбор домашки; экран лишь подключает колбэки.

import type { DialogScenario } from './ai_dialog_scenarios';
import type { TutorBoardPayload, TutorConversationMode } from './max_tutor_live_board_state';
import type { MaxVoiceStudyTarget } from './max_target_gate';
import { DebugLogger } from './debug-logger';

export type TutorBoardToolPayload = Omit<TutorBoardPayload, 'shownAtMs' | 'expiresAtMs'>;

export interface TutorSceneItem {
  id: string;
  cefr: DialogScenario['cefr'];
  role: string;
  setting: string;
}

/** Сколько сцен показываем учителю в промпте (короткий список — дешевле и точнее). */
export const TUTOR_SCENE_CATALOG_LIMIT = 14;
export const TUTOR_HOMEWORK_MAX = 3;
export const TUTOR_HOMEWORK_PHRASE_MAX_CHARS = 80;

const CEFR_RANK: Record<string, number> = { A1: 0, A2: 1, B1: 2, B2: 3 };

/**
 * СТАБИЛЬНЫЙ каталог сцен: одинаковый для всех учеников и во все дни.
 *
 * зачем (владелец 2026-08-23, «урезать стоимость минуты хотя бы на 70»):
 * prompt cache OpenAI совпадает по ТОЧНОМУ префиксу. Персональный каталог
 * (фильтр по уровню + дневная ротация) давал 4 разных префикса в день и 28 за
 * неделю — каждый со своим холодным кэшем, то есть ~500 токенов каталога плюс
 * всё, что идёт после него, оплачивались по полной цене почти всегда.
 *
 * Педагогика не страдает: у КАЖДОЙ строки каталога уже написан её уровень
 * ("level A2"), а промпт велит играть сцену "at their level". Уровень ученика
 * учитель видит в блоке YOUR LEARNER, поэтому выбирает подходящую сцену сам —
 * фильтр в коде лишь дублировал то, что и так видно в тексте.
 *
 * Порядок детерминирован (по уровню, затем по id), поэтому строка стабильна
 * байт-в-байт между звонками и попадает в общий кэш организации.
 */
export function buildStableTutorSceneCatalog(
  scenarios: readonly DialogScenario[],
  limit = TUTOR_SCENE_CATALOG_LIMIT,
): TutorSceneItem[] {
  const eligible = scenarios
    .filter((s) => s.active && typeof s.id === 'string' && s.id !== '' && s.role && s.setting)
    .map((s) => ({ id: s.id, cefr: s.cefr, role: s.role, setting: s.setting }))
    .sort((a, b) => (CEFR_RANK[a.cefr] ?? 1) - (CEFR_RANK[b.cefr] ?? 1) || a.id.localeCompare(b.id));
  if (eligible.length <= limit) return eligible;

  // Круговой обход уровней: каждый уровень обязан быть представлен, иначе
  // простое slice(14) отдало бы только A1/A2 и учителю было бы нечего
  // предложить сильному ученику.
  const byLevel = new Map<string, TutorSceneItem[]>();
  for (const item of eligible) {
    const bucket = byLevel.get(item.cefr);
    if (bucket) bucket.push(item);
    else byLevel.set(item.cefr, [item]);
  }
  const levels = [...byLevel.keys()].sort((a, b) => (CEFR_RANK[a] ?? 1) - (CEFR_RANK[b] ?? 1));
  const picked: TutorSceneItem[] = [];
  for (let round = 0; picked.length < limit; round += 1) {
    let addedThisRound = false;
    for (const level of levels) {
      const bucket = byLevel.get(level);
      if (!bucket || round >= bucket.length) continue;
      picked.push(bucket[round]);
      addedThisRound = true;
      if (picked.length >= limit) break;
    }
    if (!addedThisRound) break;
  }
  return picked;
}

/**
 * Каталог сцен под уровень: сцены уровня ученика и на одну ступень выше
 * (учитель сам подстроит язык), активные, детерминированный порядок — по
 * близости уровня, затем по id. Ротация «сегодня другие сцены» — параметром
 * seed (например, номер урока), чтобы список не был одинаковым каждый день.
 *
 * ⚠️ Для промпта учителя больше НЕ используется (ломало кэш) — см.
 * buildStableTutorSceneCatalog выше. Оставлена для других вызовов и тестов.
 */
export function buildTutorSceneCatalog(
  scenarios: readonly DialogScenario[],
  cefr: string,
  seed = 0,
  limit = TUTOR_SCENE_CATALOG_LIMIT,
): TutorSceneItem[] {
  const target = CEFR_RANK[String(cefr).toUpperCase()] ?? 1;
  const eligible = scenarios
    .filter((s) => s.active && typeof s.id === 'string' && s.id !== '' && s.role && s.setting)
    .filter((s) => {
      const rank = CEFR_RANK[s.cefr] ?? 1;
      return rank >= target - 1 && rank <= target + 1;
    })
    .map((s) => ({ id: s.id, cefr: s.cefr, role: s.role, setting: s.setting }))
    .sort((a, b) => {
      const da = Math.abs((CEFR_RANK[a.cefr] ?? 1) - target);
      const db = Math.abs((CEFR_RANK[b.cefr] ?? 1) - target);
      return da - db || a.id.localeCompare(b.id);
    });
  if (eligible.length <= limit) return eligible;
  // Ротация: сдвиг окна по seed внутри самых близких по уровню.
  const start = ((seed % eligible.length) + eligible.length) % eligible.length;
  const rotated = [...eligible.slice(start), ...eligible.slice(0, start)];
  return rotated.slice(0, limit);
}

/** Текст каталога для промпта: одна строка на сцену, компактно. */
export function renderTutorSceneCatalog(items: readonly TutorSceneItem[]): string {
  return items.map((s) => `${s.id}: ${s.setting} (you play ${s.role}; level ${s.cefr})`).join('\n');
}

export interface TutorToolResult {
  /** Что вернуть модели в function_call_output. */
  output: string;
  /** Нужен ли response.create после ответа (end_call — нет). */
  respond: boolean;
}

export interface TutorToolRunnerDeps {
  /** Каталог, который ушёл в промпт: только эти id принимаются. */
  scenes: readonly TutorSceneItem[];
  /** Normalized language of this call; absent legacy callers remain English. */
  studyTarget?: MaxVoiceStudyTarget;
  /** Полный блок сцены (role/setting/goal…) — тот же текст, что для формата scenario. */
  sceneBlock(id: string): string | null;
  onSceneChange?(scene: TutorSceneItem | null): void;
  onHomework?(phrases: string[]): void;
  onNextTopic?(topic: string): void;
  onLiveBoard?(payload: TutorBoardToolPayload): void;
  onLiveTopic?(payload: { topic: string; mode: TutorConversationMode }): void;
  onEndCall?(): void;
  /** Текущая серверная проекция цели; нужна, чтобы UI не показывал ложный скачок mastery. */
  currentGoal?(): { id: string; mastery: number; sceneIds?: string[] } | null;
}

export type TutorLanguagePreference = 'more_target' | 'more_native' | 'default';

/** Категория flag_safety: MAX отправляет только обезличенный сигнал без сохранения разговора. */
export interface TutorSafetyFlag {
  kind: string;
  note: string;
}
const SAFETY_KINDS = new Set(['self_harm', 'abuse', 'harassment', 'sexual', 'violence', 'hate', 'illicit', 'minor', 'other']);

/** Домашняя фраза + значение на родном языке (для карточки тренажёра). */
export interface TutorHomeworkItem {
  text: string;
  meaning: string;
}

export interface TutorPhraseResult {
  text: string;
  result: TutorSpeechResult;
}

export type TutorSpeechResult = 'pass' | 'needs_work' | 'uncertain' | 'invalid';
const TUTOR_SPEECH_RESULTS = new Set<TutorSpeechResult>(['pass', 'needs_work', 'uncertain', 'invalid']);

export type TutorSceneOutcome = 'done' | 'partial' | 'skipped';

export interface TutorGoalProgress {
  goalId: string;
  mastery: number;
  evidence?: 'scene' | 'novel_context';
  sceneId?: string;
}

export interface TutorToolRunner {
  handle(name: string, args: Record<string, unknown>): TutorToolResult;
  /** Домашка и тема, собранные за урок — уходят в разбор (память учителя). */
  homework(): string[];
  /** Домашка со значениями — для карточек тренажёра. */
  homeworkItems(): TutorHomeworkItem[];
  /** Итоги повторения речи за урок (mark_phrase_result). */
  phraseResults(): TutorPhraseResult[];
  /** Итог последней сцены-задачи ('' — сцены не было). */
  sceneOutcome(): TutorSceneOutcome | '';
  /** Прогресс по текущей речевой цели (mark_goal_progress); null — не отмечал. */
  goalProgress(): TutorGoalProgress | null;
  nextTopic(): string;
  /** Просьба ученика за урок, как говорить; '' — не просил (память не трогать). */
  languagePreference(): TutorLanguagePreference | '';
  /** Знакомство в первом уроке: как обращаться и зачем учит (remember_learner). */
  preferredName(): string;
  learningGoal(): string;
  /** Флаги безопасности за урок (дедуп по виду). */
  safetyFlags(): TutorSafetyFlag[];
  activeScene(): TutorSceneItem | null;
  /** Учитель вызвал end_call — экран завершит звонок мягко. */
  endRequested(): boolean;
}

function cleanPhrase(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, TUTOR_HOMEWORK_PHRASE_MAX_CHARS);
}

function cleanBounded(value: unknown, maxChars: number): string | null {
  const cleaned = String(value ?? '').replace(/\s+/g, ' ').trim();
  return cleaned.length <= maxChars ? cleaned : null;
}

export function createTutorToolRunner(deps: TutorToolRunnerDeps): TutorToolRunner {
  const sceneLanguage = deps.studyTarget === 'fr'
    ? 'French'
    : deps.studyTarget === 'es'
      ? 'Spanish'
      : 'English';
  let homework: string[] = [];
  let homeworkMeanings: string[] = [];
  const phraseResults: TutorPhraseResult[] = [];
  let sceneOutcome: TutorSceneOutcome | '' = '';
  let completedSceneId = '';
  let goalProgress: TutorGoalProgress | null = null;
  let nextTopic = '';
  let languagePreference: TutorLanguagePreference | '' = '';
  let preferredName = '';
  let learningGoal = '';
  const safetyFlags: TutorSafetyFlag[] = [];
  let activeScene: TutorSceneItem | null = null;
  let endRequested = false;

  const handle = (name: string, args: Record<string, unknown>): TutorToolResult => {
    switch (name) {
      case 'start_scene': {
        const id = String(args.scene_id ?? '').trim();
        // Каталог в промпте — подсказка модели; принимаем ЛЮБУЮ известную сцену
        // (учитель мог запомнить id из вчерашнего списка — это не ошибка).
        const block = id ? deps.sceneBlock(id) : null;
        const scene = block
          ? (deps.scenes.find((s) => s.id === id) ?? { id, cefr: 'A2' as const, role: '', setting: '' })
          : null;
        if (!scene || !block) {
          const ids = deps.scenes.map((s) => s.id).join(', ');
          return {
            output: `Unknown scene_id "${id}". Choose one of: ${ids}. Or continue the lesson without a scene.`,
            respond: true,
          };
        }
        activeScene = scene;
        try { deps.onSceneChange?.(scene); } catch (e) {
      DebugLogger.error('max_call_tutor_tools:ids', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
        return {
          output:
            `SCENE STARTED. Play this role in ${sceneLanguage} at the learner's level for 4-8 exchanges, then call end_scene():\n` +
            block,
          respond: true,
        };
      }
      case 'end_scene': {
        const had = activeScene !== null;
        const endedSceneId = activeScene?.id ?? '';
        activeScene = null;
        const outcome = String(args.outcome ?? '').trim();
        if (had) {
          sceneOutcome = outcome === 'done' || outcome === 'partial' || outcome === 'skipped' ? outcome : 'partial';
          completedSceneId = endedSceneId;
        }
        try { deps.onSceneChange?.(null); } catch (e) {
      DebugLogger.error('max_call_tutor_tools:outcome', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
        return {
          output: had
            ? 'Scene ended. You are the teacher again: give one short sentence of feedback (in the learner\'s native language for A1/A2), then continue the lesson.'
            : 'No scene was active. Continue the lesson.',
          respond: true,
        };
      }
      case 'mark_phrase_result': {
        const text = cleanPhrase(args.phrase);
        if (!text) return { output: 'Empty phrase; nothing recorded.', respond: false };
        const raw = String(args.result ?? '').trim();
        // Старые уже открытые realtime-сессии могли прислать boolean `ok`.
        const result: TutorSpeechResult | null = TUTOR_SPEECH_RESULTS.has(raw as TutorSpeechResult)
          ? raw as TutorSpeechResult
          : typeof args.ok === 'boolean'
            ? (args.ok ? 'pass' : 'needs_work')
            : null;
        if (!result) return { output: 'Unknown speech result; record nothing and clarify with the learner.', respond: false };
        const idx = phraseResults.findIndex((r) => r.text.toLowerCase() === text.toLowerCase());
        if (idx >= 0) phraseResults[idx] = { text, result }; else phraseResults.push({ text, result });
        // Тихо: учитель уже отреагировал вслух; response.create не нужен.
        const output = result === 'pass'
          ? 'Recorded: confident pass.'
          : result === 'needs_work'
            ? 'Recorded: confident needs work.'
            : 'Recorded as neutral: do not correct or penalize; clarify naturally if useful.';
        return { output, respond: false };
      }
      case 'assign_homework': {
        const raw = Array.isArray(args.phrases) ? args.phrases : [];
        const rawMeanings = Array.isArray(args.meanings) ? args.meanings : [];
        const pairs = raw.map((p, i) => ({ text: cleanPhrase(p), meaning: cleanPhrase(rawMeanings[i]).slice(0, 120) })).filter((p) => p.text !== '');
        const unique: TutorHomeworkItem[] = [];
        for (const p of pairs) {
          if (!unique.some((u) => u.text.toLowerCase() === p.text.toLowerCase())) unique.push(p);
          if (unique.length >= TUTOR_HOMEWORK_MAX) break;
        }
        if (unique.length === 0) {
          return { output: 'No phrases received. Say 2-3 short phrases aloud and call assign_homework again with them (and their meanings).', respond: true };
        }
        if (unique.some((item) => item.meaning === '')) {
          return { output: 'Every homework phrase needs a meaning in the learner\'s native language. Nothing was saved; provide all meanings and call assign_homework again.', respond: true };
        }
        const passed = new Set(
          phraseResults.filter((item) => item.result === 'pass').map((item) => item.text.toLowerCase()),
        );
        if (unique.some((item) => !passed.has(item.text.toLowerCase()))) {
          return {
            output: 'Homework must contain only phrases the learner confidently practised in this lesson (mark_phrase_result = pass). Nothing was saved.',
            respond: true,
          };
        }
        homework = unique.map((u) => u.text);
        homeworkMeanings = unique.map((u) => u.meaning);
        try { deps.onHomework?.(homework); } catch (e) {
      DebugLogger.error('max_call_tutor_tools:passed', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
        return {
          // зачем (аудит MAX 2026-08-30): прежний текст обещал «added to their
          // Trainer», учитель повторял это вслух — а ингеста в тренажёр не
          // существует. Обещаем ровно то, что происходит: разбор после урока и
          // устное повторение в следующих звонках (phraseQueue сервера).
          output: `Homework saved (${unique.length}): ${homework.join(' | ')}. It will be shown to the learner after the lesson, and you will ask them to say these phrases again in the next lessons.`,
          respond: true,
        };
      }
      case 'set_next_topic': {
        const topic = cleanPhrase(args.topic).slice(0, 140);
        if (!topic) return { output: 'Topic is empty. Say the topic aloud and call set_next_topic again.', respond: true };
        nextTopic = topic;
        try { deps.onNextTopic?.(topic); } catch (e) {
      DebugLogger.error('max_call_tutor_tools:topic', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
        return { output: `Next topic saved: ${topic}.`, respond: true };
      }
      case 'show_tutor_board': {
        const kind = String(args.kind ?? '').trim();
        const source = String(args.source ?? '').trim();
        const targetText = cleanBounded(args.target_text, 100);
        const meaning = cleanBounded(args.meaning, 140);
        const validKind = kind === 'hint' || kind === 'recast' || kind === 'translation';
        const validSource = source === 'learner_request' || source === 'silence' || source === 'confident_correction';
        const validRecast = kind !== 'recast' || source === 'confident_correction';
        if (!validKind || !validSource || !targetText || meaning === null || !validRecast) {
          return { output: 'Invalid tutor board. Use a supported kind/source, keep text within limits, and only recast a confident correction.', respond: false };
        }
        const payload: TutorBoardToolPayload = {
          kind,
          targetText,
          meaning,
          source,
        };
        try { deps.onLiveBoard?.(payload); } catch (e) {
      DebugLogger.error('max_call_tutor_tools:validRecast', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
        return { output: 'Tutor board shown.', respond: false };
      }
      case 'set_live_topic': {
        const topic = cleanBounded(args.topic, 80);
        const mode = String(args.mode ?? '').trim();
        if (topic === '') return { output: 'Topic is empty. Ask what the learner wants to discuss.', respond: false };
        if (topic === null) return { output: 'Topic is too long. Keep it within 80 characters.', respond: false };
        if (mode !== 'guided' && mode !== 'free_talk') {
          return { output: 'Unknown topic mode. Use "guided" or "free_talk".', respond: false };
        }
        try { deps.onLiveTopic?.({ topic, mode }); } catch (e) {
      DebugLogger.error('max_call_tutor_tools:mode', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
        return { output: 'Live topic updated.', respond: false };
      }
      case 'flag_safety': {
        // Тихая пометка для людей: ученику ничего не говорим, урок продолжается
        // по SAFETY PLAYBOOK промпта. Ответ без response.create — учитель уже
        // сказал всё нужное вслух до вызова.
        const kind = String(args.kind ?? '').trim();
        if (!SAFETY_KINDS.has(kind)) return { output: 'Unknown kind; nothing recorded.', respond: false };
        const note = cleanPhrase(args.note).slice(0, 200);
        if (!safetyFlags.some((f) => f.kind === kind)) safetyFlags.push({ kind, note });
        return { output: 'Noted for human review. Continue exactly as the SAFETY PLAYBOOK says; do not mention this.', respond: false };
      }
      case 'mark_goal_progress': {
        const goalId = cleanPhrase(args.goal_id).slice(0, 40);
        const n = Number(args.mastery);
        if (!goalId || !Number.isFinite(n)) return { output: 'Need goal_id and mastery 0-3.', respond: false };
        const current = deps.currentGoal?.() ?? null;
        if (current && current.id !== goalId) {
          return { output: `This is not the current goal. Record only ${current.id}.`, respond: false };
        }
        const requested = Math.min(3, Math.max(0, Math.floor(n)));
        const currentMastery = current?.mastery ?? 0;
        let mastery = Math.min(requested, currentMastery + 1);
        if (mastery >= 3) {
          const evidence = String(args.transfer_evidence ?? '').trim();
          const approvedScenes = current?.sceneIds ?? [];
          if (approvedScenes.length > 0) {
            const relevantSceneDone = evidence === 'scene'
              && sceneOutcome === 'done'
              && approvedScenes.includes(completedSceneId);
            if (!relevantSceneDone) {
              goalProgress = { goalId, mastery: 2 };
              return {
                output: `Mastery 3 needs a completed approved transfer scene for this goal (${approvedScenes.join(', ')}). Mastery 2 recorded.`,
                respond: false,
              };
            }
            goalProgress = { goalId, mastery, evidence: 'scene', sceneId: completedSceneId };
            return { output: `Goal ${goalId} mastery ${mastery}/3 recorded.`, respond: false };
          }
          if (evidence !== 'novel_context') {
            goalProgress = { goalId, mastery: 2 };
            return {
              output: 'Mastery 3 needs a lower-support mini role-play in a new context. Mastery 2 recorded.',
              respond: false,
            };
          }
          goalProgress = { goalId, mastery, evidence: 'novel_context' };
          return { output: `Goal ${goalId} mastery ${mastery}/3 recorded.`, respond: false };
        }
        goalProgress = { goalId, mastery };
        return { output: `Goal ${goalId} mastery ${goalProgress.mastery}/3 recorded.`, respond: false };
      }
      case 'remember_learner': {
        // зачем (владелец 2026-08-23): вау-эффект «он меня помнит». В первом
        // уроке учитель голосом спрашивает имя и цель; здесь копим ответы, а
        // финализация кладёт их в память (PII-фильтр там же, на сервере).
        const name = cleanPhrase(args.preferred_name).slice(0, 60);
        const goal = cleanPhrase(args.learning_goal).slice(0, 160);
        if (!name && !goal) return { output: 'Nothing to save.', respond: false };
        if (name) preferredName = name;
        if (goal) learningGoal = goal;
        return { output: 'Saved. Use it naturally and never ask again.', respond: false };
      }
      case 'set_language_preference': {
        // 'more_english' — старое имя из первых сборок; читаем как more_target.
        const raw = String(args.mode ?? '').trim();
        const mode = raw === 'more_english' ? 'more_target' : raw;
        if (mode !== 'more_target' && mode !== 'more_native' && mode !== 'default') {
          return { output: 'Unknown mode. Use "more_target", "more_native" or "default".', respond: true };
        }
        languagePreference = mode;
        return {
          output: `Language preference saved: ${mode}. Apply it for the rest of this lesson and it will be remembered next time.`,
          respond: true,
        };
      }
      case 'end_call': {
        endRequested = true;
        try { deps.onEndCall?.(); } catch (e) {
      DebugLogger.error('max_call_tutor_tools:mode', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
        // Ответ без response.create: учитель уже попрощался, новых реплик не надо.
        return { output: 'The lesson is ending now. Do not speak further.', respond: false };
      }
      default:
        return { output: `Unknown tool "${name}". Continue the lesson without it.`, respond: true };
    }
  };

  return {
    handle,
    homework: () => [...homework],
    homeworkItems: () => homework.map((text, i) => ({ text, meaning: homeworkMeanings[i] ?? '' })),
    phraseResults: () => phraseResults.map((r) => ({ ...r })),
    sceneOutcome: () => sceneOutcome,
    goalProgress: () => (goalProgress ? { ...goalProgress } : null),
    nextTopic: () => nextTopic,
    languagePreference: () => languagePreference,
    preferredName: () => preferredName,
    learningGoal: () => learningGoal,
    safetyFlags: () => safetyFlags.map((f) => ({ ...f })),
    activeScene: () => activeScene,
    endRequested: () => endRequested,
  };
}

/* expo-router route shim: файлы в app/ считаются роутами и требуют default export. */
export default function __RouteShim() {
  return null;
}
