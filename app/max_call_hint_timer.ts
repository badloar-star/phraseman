// Чистый таймер подсказок MAX-звонка (спека §1 max_call_hint_timer / тест №6).
//
// Зачем отдельный модуль: подсказка при тишине — единственное место, где клиент
// сам инициирует response.create, и любая ошибка тайминга здесь жжёт бюджет и
// перебивает ученика. Поэтому вся логика «когда можно помогать» вынесена в
// детерминированную машину без Date.now и без React — время приходит только
// параметрами nowMs, чтобы тесты управляли часами напрямую.
//
// Ключевые инварианты (из спеки):
//   • взводится ТОЛЬКО в фазе 'listening' — тишина в thinking/ai_speaking/
//     reconnecting/wrapping_up подсказок не порождает (там либо уже есть
//     активный response, либо помогать неуместно);
//   • любой speech_started сбрасывает отсчёт: тишина кончилась, ученик говорит;
//   • после выданной первой подсказки следующая ('second', вопрос с выбором из
//     двух) отсчитывается заново от момента выдачи — «каждая выдача перевзводит»;
//   • суммарный кэп подсказок на сессию: дальше таймер молчит навсегда, чтобы
//     звонок не превратился в монолог ИИ.

export interface HintTimerConfig {
  /** Порог тишины до первой подсказки, сек (per-CEFR: A1/A2 8с, B1/B2 9с). */
  delaySec: number;
  /** Пауза после выданной первой подсказки до either-or вопроса, сек (+10с). */
  secondHintDelaySec: number;
  /** Суммарный кэп подсказок на сессию (hintMaxPerSession=4). */
  maxPerSession: number;
}

export type HintKind = 'first' | 'second';

export interface HintTimer {
  /**
   * Сообщить текущую UI-фазу. Взводит отсчёт только при 'listening'; любая
   * другая фаза (thinking, ai_speaking, reconnecting, wrapping_up, ...)
   * разоружает таймер — это и есть «запрет в reconnecting» и защита от гонки
   * с активным response: пока ход не у ученика, due() всегда null.
   */
  onPhase(phase: string, nowMs: number): void;
  /** Ученик заговорил — тишины больше нет, отсчёт сбрасывается. */
  onSpeechStarted(): void;
  /**
   * Опрос «пора ли помогать». Возвращает вид подсказки не чаще одного раза на
   * порог: сама выдача инкрементит счётчик и перевзводит отсчёт, поэтому
   * повторный вызов в тот же момент времени — null (нет двойного
   * response.create при дребезге поллинга).
   */
  due(nowMs: number): HintKind | null;
  /** Сколько подсказок уже выдано за сессию. */
  firedCount(): number;
}

export function createHintTimer(cfg: HintTimerConfig): HintTimer {
  // null = таймер разоружён (не в listening или тишина прервана).
  let armedAtMs: number | null = null;
  // Какая подсказка следующая: после каждой выдачи эскалируем до 'second';
  // новая тишина после речи ученика начинает цикл заново с 'first'.
  let nextKind: HintKind = 'first';
  let fired = 0;

  const disarm = (): void => {
    armedAtMs = null;
    nextKind = 'first';
  };

  return {
    onPhase(phase: string, nowMs: number): void {
      if (phase === 'listening') {
        // Повторное 'listening' при уже взведённом таймере — no-op: дубль
        // события не должен бесконечно отодвигать подсказку.
        if (armedAtMs === null) {
          armedAtMs = nowMs;
          nextKind = 'first';
        }
        return;
      }
      disarm();
    },

    onSpeechStarted(): void {
      disarm();
    },

    due(nowMs: number): HintKind | null {
      if (armedAtMs === null) return null;
      if (fired >= cfg.maxPerSession) return null;
      const delayMs =
        (nextKind === 'first' ? cfg.delaySec : cfg.secondHintDelaySec) * 1000;
      if (nowMs - armedAtMs < delayMs) return null;

      const kind = nextKind;
      fired += 1;
      // Перевзвод от момента выдачи: следующая ступень — either-or вопрос.
      armedAtMs = nowMs;
      nextKind = 'second';
      return kind;
    },

    firedCount(): number {
      return fired;
    },
  };
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
