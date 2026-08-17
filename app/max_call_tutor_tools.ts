// Инструменты учителя на клиенте (вариант A, владелец 2026-08-16) — чистый модуль.
//
// Учитель (OpenAI Realtime, format 'tutor') вызывает функции через data channel:
//   start_scene(scene_id)  → сцена из ai_dialog_scenarios (сервер сцен не знает)
//   end_scene()            → назад к роли учителя
//   mark_phrase_result(phrase, ok) → повторение речи: сказал/не смог (двигает интервал в памяти)
//   assign_homework(phrases, meanings) → 2–3 фразы на завтра + значения (память + тренажёр)
//   set_next_topic(topic)  → тема следующего урока
//   set_language_preference(mode) → «говори со мной по-английски / по-русски» — на будущие уроки
//   end_call()             → учитель попрощался — экран мягко завершает звонок
// Клиент исполняет их ЛОКАЛЬНО (ноль серверных вызовов) и отвечает
// function_call_output. Здесь — детерминированная логика без React/сети: каталог
// сцен под уровень, ответы модели, сбор домашки; экран лишь подключает колбэки.

import type { DialogScenario } from './ai_dialog_scenarios';

export interface TutorSceneItem {
  id: string;
  cefr: DialogScenario['cefr'];
  role: string;
  setting: string;
}

/** Сколько сцен показываем учителю в промпте (короткий список — дешевле и точнее). */
export const TUTOR_SCENE_CATALOG_LIMIT = 14;
export const TUTOR_HOMEWORK_MAX = 4;
export const TUTOR_HOMEWORK_PHRASE_MAX_CHARS = 80;

const CEFR_RANK: Record<string, number> = { A1: 0, A2: 1, B1: 2, B2: 3 };

/**
 * Каталог сцен под уровень: сцены уровня ученика и на одну ступень выше
 * (учитель сам подстроит язык), активные, детерминированный порядок — по
 * близости уровня, затем по id. Ротация «сегодня другие сцены» — параметром
 * seed (например, номер урока), чтобы список не был одинаковым каждый день.
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
  /** Полный блок сцены (role/setting/goal…) — тот же текст, что для формата scenario. */
  sceneBlock(id: string): string | null;
  onSceneChange?(scene: TutorSceneItem | null): void;
  onHomework?(phrases: string[]): void;
  onNextTopic?(topic: string): void;
  onEndCall?(): void;
}

export type TutorLanguagePreference = 'more_target' | 'more_native' | 'default';

/** Флаг безопасности, поставленный учителем (инструмент flag_safety) — уходит в разбор → safety_flags + Telegram. */
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
  ok: boolean;
}

export type TutorSceneOutcome = 'done' | 'partial' | 'skipped';

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
  goalProgress(): { goalId: string; mastery: number } | null;
  nextTopic(): string;
  /** Просьба ученика за урок, как говорить; '' — не просил (память не трогать). */
  languagePreference(): TutorLanguagePreference | '';
  /** Флаги безопасности за урок (дедуп по виду). */
  safetyFlags(): TutorSafetyFlag[];
  activeScene(): TutorSceneItem | null;
  /** Учитель вызвал end_call — экран завершит звонок мягко. */
  endRequested(): boolean;
}

function cleanPhrase(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, TUTOR_HOMEWORK_PHRASE_MAX_CHARS);
}

export function createTutorToolRunner(deps: TutorToolRunnerDeps): TutorToolRunner {
  let homework: string[] = [];
  let homeworkMeanings: string[] = [];
  const phraseResults: TutorPhraseResult[] = [];
  let sceneOutcome: TutorSceneOutcome | '' = '';
  let goalProgress: { goalId: string; mastery: number } | null = null;
  let nextTopic = '';
  let languagePreference: TutorLanguagePreference | '' = '';
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
        try { deps.onSceneChange?.(scene); } catch {}
        return {
          output:
            'SCENE STARTED. Play this role in English at the learner\'s level for 4-8 exchanges, then call end_scene():\n' +
            block,
          respond: true,
        };
      }
      case 'end_scene': {
        const had = activeScene !== null;
        activeScene = null;
        const outcome = String(args.outcome ?? '').trim();
        if (had) sceneOutcome = outcome === 'done' || outcome === 'partial' || outcome === 'skipped' ? outcome : 'partial';
        try { deps.onSceneChange?.(null); } catch {}
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
        const ok = args.ok === true;
        const idx = phraseResults.findIndex((r) => r.text.toLowerCase() === text.toLowerCase());
        if (idx >= 0) phraseResults[idx] = { text, ok }; else phraseResults.push({ text, ok });
        // Тихо: учитель уже отреагировал вслух; response.create не нужен.
        return { output: ok ? 'Recorded: said correctly.' : 'Recorded: needs more practice.', respond: false };
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
        homework = unique.map((u) => u.text);
        homeworkMeanings = unique.map((u) => u.meaning);
        try { deps.onHomework?.(homework); } catch {}
        const missing = unique.filter((u) => u.meaning === '').length;
        return {
          output: `Homework saved (${unique.length}): ${homework.join(' | ')}. It will be shown to the learner after the lesson and added to their Trainer.` +
            (missing ? ` ${missing} phrase(s) have no meaning — call assign_homework again with "meanings" in the learner's native language if you can.` : ''),
          respond: true,
        };
      }
      case 'set_next_topic': {
        const topic = cleanPhrase(args.topic).slice(0, 140);
        if (!topic) return { output: 'Topic is empty. Say the topic aloud and call set_next_topic again.', respond: true };
        nextTopic = topic;
        try { deps.onNextTopic?.(topic); } catch {}
        return { output: `Next topic saved: ${topic}.`, respond: true };
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
        goalProgress = { goalId, mastery: Math.min(3, Math.max(0, Math.floor(n))) };
        return { output: `Goal ${goalId} mastery ${goalProgress.mastery}/3 recorded.`, respond: false };
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
        try { deps.onEndCall?.(); } catch {}
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
    safetyFlags: () => safetyFlags.map((f) => ({ ...f })),
    activeScene: () => activeScene,
    endRequested: () => endRequested,
  };
}

/* expo-router route shim: файлы в app/ считаются роутами и требуют default export. */
export default function __RouteShim() {
  return null;
}
