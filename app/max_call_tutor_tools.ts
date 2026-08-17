// Инструменты учителя на клиенте (вариант A, владелец 2026-08-16) — чистый модуль.
//
// Учитель (OpenAI Realtime, format 'tutor') вызывает функции через data channel:
//   start_scene(scene_id)  → сцена из ai_dialog_scenarios (сервер сцен не знает)
//   end_scene()            → назад к роли учителя
//   assign_homework(...)   → 2–3 фразы на завтра (уезжают в память с разбором)
//   set_next_topic(topic)  → тема следующего урока
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

export interface TutorToolRunner {
  handle(name: string, args: Record<string, unknown>): TutorToolResult;
  /** Домашка и тема, собранные за урок — уходят в разбор (память учителя). */
  homework(): string[];
  nextTopic(): string;
  activeScene(): TutorSceneItem | null;
  /** Учитель вызвал end_call — экран завершит звонок мягко. */
  endRequested(): boolean;
}

function cleanPhrase(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, TUTOR_HOMEWORK_PHRASE_MAX_CHARS);
}

export function createTutorToolRunner(deps: TutorToolRunnerDeps): TutorToolRunner {
  let homework: string[] = [];
  let nextTopic = '';
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
        try { deps.onSceneChange?.(null); } catch {}
        return {
          output: had
            ? 'Scene ended. You are the teacher again: give one short sentence of feedback (in the learner\'s native language for A1/A2), then continue the lesson.'
            : 'No scene was active. Continue the lesson.',
          respond: true,
        };
      }
      case 'assign_homework': {
        const raw = Array.isArray(args.phrases) ? args.phrases : [];
        const phrases = raw.map(cleanPhrase).filter((p) => p !== '');
        const unique: string[] = [];
        for (const p of phrases) {
          if (!unique.some((u) => u.toLowerCase() === p.toLowerCase())) unique.push(p);
          if (unique.length >= TUTOR_HOMEWORK_MAX) break;
        }
        if (unique.length === 0) {
          return { output: 'No phrases received. Say 2-3 short English phrases aloud and call assign_homework again with them.', respond: true };
        }
        homework = unique;
        try { deps.onHomework?.(unique); } catch {}
        return { output: `Homework saved (${unique.length}): ${unique.join(' | ')}. It will be shown to the learner after the lesson.`, respond: true };
      }
      case 'set_next_topic': {
        const topic = cleanPhrase(args.topic).slice(0, 140);
        if (!topic) return { output: 'Topic is empty. Say the topic aloud and call set_next_topic again.', respond: true };
        nextTopic = topic;
        try { deps.onNextTopic?.(topic); } catch {}
        return { output: `Next topic saved: ${topic}.`, respond: true };
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
    nextTopic: () => nextTopic,
    activeScene: () => activeScene,
    endRequested: () => endRequested,
  };
}

/* expo-router route shim: файлы в app/ считаются роутами и требуют default export. */
export default function __RouteShim() {
  return null;
}
