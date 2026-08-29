// ════════════════════════════════════════════════════════════════════════════
// learning_v2_lesson_background_prefetch_v1.ts — фоновая закачка ЦЕЛОГО урока
// Learning V2 (все 56 сессий) вперёд прохождения.
//
// зачем (владелец, 27.08.2026): требование прямое и неизменное — сессия
// обязана быть готова ДО того, как человек её откроет. Прошлая правка
// (learning_v2_course_released_session_client_v3.ts) прогревала только
// СЛЕДУЮЩУЮ сессию, пока человек смотрит на карту. Владелец хочет шире: как
// только он выбрал курс/язык — весь текущий урок (1..56) начинает качаться
// в фоне по порядку номера сессии, несколькими параллельными воркерами
// (не 56 закачек разом и не строго одна за другой). Когда пройдена половина
// урока (сессия 28 из 56) — фоном стартует уже СЛЕДУЮЩИЙ урок.
//
// Порядок = гарантия готовности: воркеры разбирают очередь строго по
// возрастанию sessionOrdinal (курсор растёт последовательно), поэтому ранняя
// сессия всегда попадает в работу раньше поздней, даже при нескольких
// воркерах сразу — к моменту, когда человек дойдёт до сессии N, она либо уже
// готова, либо была начата раньше всех сессий после неё.
//
// Что это НЕ делает: не пытается сделать реальным контент, которого ещё нет.
// Сейчас написана и играбельна только сессия 1 (2-56 — FORBIDDEN/DRAFT для
// авторства), поэтому prepareCurrentLearningV2CourseSessionV3 для них
// закономерно падает — это не ошибка, это отсутствие материала. Падение
// глотается молча, как и в прогреве следующей сессии: пользователь ничего не
// видит, а как только контент появится, эта же очередь начнёт его тянуть без
// изменений кода.
//
// Wi-Fi-гейт: 56 сессий — это потенциально десятки МБ (4 голоса на фразу).
// Владелец попросил тянуть весь урок только по Wi-Fi, чтобы не сжигать чужой
// мобильный лимit молча. На мобильном/неизвестном соединении очередь не
// стартует вовсе — обычный путь (открыл сессию → она догружается сама, уже
// не показывая «Подготавливаем…» для одной сессии благодаря прогреву в
// learning_v2_course_released_session_client_v3.ts) продолжает работать как
// раньше.
// ════════════════════════════════════════════════════════════════════════════
import * as Crypto from "expo-crypto";

import { withBackgroundNetworkLease } from "./interactive_network_quiet";
import { prepareCurrentLearningV2CourseSessionV3 } from "./learning_v2_course_released_session_client_v3";
import {
  LEARNING_V2_COURSE_LESSON_COUNT_V1,
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
} from "../modules/learning-v2/content/course_topology_v1";

// Столько же воркеров, сколько в прогреве фраз (hooks/phrase_audio_prefetch.ts)
// и в предзагрузке Learning V2 — больше заметно отбирает канал у активного
// экрана.
const CONCURRENCY = 3;
// Половина урока (56 сессий) — владелец: «дошёл до 25-й — можно уже качать
// следующий». Порог держим как долю, а не хардкод 28, чтобы не разъехаться,
// если число сессий в уроке когда-нибудь изменится.
const NEXT_LESSON_TRIGGER_FRACTION = 0.5;

type NetInfoLike = Readonly<{
  fetch: () => Promise<Readonly<{ type?: string | null }>>;
}>;

function loadNetInfo(
  load: () => unknown = () => require("@react-native-community/netinfo"),
): NetInfoLike | null {
  try {
    const mod = load() as Readonly<{
      default?: NetInfoLike;
      fetch?: NetInfoLike["fetch"];
    }>;
    if (mod?.default?.fetch) return mod.default;
    if (typeof mod?.fetch === "function") return mod as NetInfoLike;
  } catch {
    // NetInfo недоступен (тесты, web) — трактуем как «не Wi-Fi»: лучше не
    // скачать урок целиком заранее, чем молча сжечь чей-то мобильный трафик.
  }
  return null;
}

async function isOnWifi(netInfo: NetInfoLike | null): Promise<boolean> {
  if (!netInfo) return false;
  try {
    const state = await netInfo.fetch();
    return state?.type === "wifi";
  } catch {
    return false;
  }
}

export type LearningV2LessonBackgroundPrefetchHandle = Readonly<{
  cancel: () => void;
}>;

export type LearningV2LessonBackgroundPrefetchScopeV1 = Readonly<{
  environment: "lab" | "staging" | "production";
  targetLanguage: string;
  studyTarget: string;
  learnerSourceLocale: string;
  seasonId: string;
}>;

// Поколение — ПО УРОКУ, не глобальное: текущий урок и следующий качаются
// фоном ОДНОВРЕМЕННО (владелец просил именно так — следующий стартует, не
// дожидаясь конца текущего). Общий счётчик на всё приложение отменял бы одну
// очередь при старте другой; так каждый урок живёт своей жизнью и не мешает
// соседу.
const lessonGenerations = new Map<string, number>();

const lessonKey = (
  scope: LearningV2LessonBackgroundPrefetchScopeV1,
  lessonOrdinal: number,
): string =>
  `${scope.environment}:${scope.targetLanguage}:${scope.studyTarget}:${scope.learnerSourceLocale}:${scope.seasonId}:${lessonOrdinal}`;

/**
 * Поставить в фоновую очередь ВСЕ сессии указанного урока (по порядку,
 * несколькими воркерами). Не ждут: возвращает handle с cancel().
 *
 * Идемпотентно на урок — повторный вызов с тем же уроком, пока первая
 * очередь ещё актуальна (не отменена и не истёк NetInfo-гейт), ничего не
 * делает. Разные уроки друг другу не мешают и не отменяют друг друга.
 */
export function prefetchLearningV2LessonInBackgroundV1(
  scope: LearningV2LessonBackgroundPrefetchScopeV1,
  lessonOrdinal: number,
  options: Readonly<{ netInfo?: NetInfoLike | null }> = {},
): LearningV2LessonBackgroundPrefetchHandle {
  if (
    !Number.isSafeInteger(lessonOrdinal) ||
    lessonOrdinal < 1 ||
    lessonOrdinal > LEARNING_V2_COURSE_LESSON_COUNT_V1
  ) {
    return Object.freeze({ cancel: () => {} });
  }
  const key = lessonKey(scope, lessonOrdinal);
  if (lessonGenerations.has(key)) {
    return Object.freeze({ cancel: () => {} });
  }

  const generation = (lessonGenerations.get(key) ?? 0) + 1;
  lessonGenerations.set(key, generation);
  const isCurrent = () => lessonGenerations.get(key) === generation;

  void (async () => {
    const netInfo = options.netInfo !== undefined ? options.netInfo : loadNetInfo();
    const onWifi = await isOnWifi(netInfo);
    if (!onWifi || !isCurrent()) return;

    try {
      await withBackgroundNetworkLease(
        "learning-v2.lesson-background-prefetch",
        async (lease) => {
          let cursor = 0;
          const total = LEARNING_V2_LESSON_SESSION_COUNT_V1;
          const workers = Array.from(
            { length: Math.min(CONCURRENCY, total) },
            async () => {
              while (cursor < total) {
                const sessionOrdinal = cursor + 1;
                cursor += 1;
                if (!isCurrent() || lease.signal.aborted) return;
                // Падение одной сессии (пока не написана — 2-56 сейчас
                // FORBIDDEN) не должно уносить с собой воркер и тем более
                // всплывать наружу: это предзагрузка, не запрошенное чтение.
                await prepareCurrentLearningV2CourseSessionV3({
                  locator: { ...scope, lessonOrdinal, sessionOrdinal },
                  sessionRunId: Crypto.randomUUID(),
                }).catch(() => undefined);
              }
            },
          );
          await Promise.all(workers);
        },
      );
    } catch {
      // Лизинг отменён (активная сессия попросила тишину сети) — штатный
      // исход, очередь просто не докачалась в этот раз.
    }
  })();

  return Object.freeze({
    cancel: () => {
      if (lessonGenerations.get(key) === generation) lessonGenerations.delete(key);
    },
  });
}

/**
 * Порог для старта закачки следующего урока: половина сессий текущего урока
 * пройдена. currentSessionOrdinal — это НОМЕР сессии, которую человек будет
 * проходить следующей (т.е. currentSessionOrdinal - 1 уже пройдено).
 */
export function shouldPrefetchNextLearningV2LessonV1(
  currentSessionOrdinal: number,
): boolean {
  if (
    !Number.isSafeInteger(currentSessionOrdinal) ||
    currentSessionOrdinal < 1
  )
    return false;
  const completed = currentSessionOrdinal - 1;
  return completed >= LEARNING_V2_LESSON_SESSION_COUNT_V1 * NEXT_LESSON_TRIGGER_FRACTION;
}

/** Отменить ВСЕ текущие фоновые закачки уроков, ничего не начиная новых. */
export function cancelLearningV2LessonBackgroundPrefetchV1(): void {
  lessonGenerations.clear();
}
