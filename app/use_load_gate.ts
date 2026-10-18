/**
 * useLoadGate — одна реализация правила D158 (владелец 03.10, §117): «тихо» = без паники, НЕ «бесконечно».
 *
 * зачем: «тихий повтор 5×20 с, затем вечный скелетон» был скопирован в 8+ экранов с разным поведением
 * на исчерпании (PM-214). Хук держит ровно один цикл: потолок одной загрузки, паузы бэкоффа, затем
 * `exhausted` — экран показывает «Сейчас недоступно» + тихую «Попробовать снова». При возврате в
 * приложение повтор идёт сам. Значения — в app/load_gate_config.ts.
 *
 * Контракт: `retry()` обязан перевести `status` в 'loading' (иначе следующий таймер обгонит запрос).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { LOAD_GATE_TOTAL_MS, loadGateBackoffMs } from './load_gate_config';

export type LoadGateStatus = 'loading' | 'ready' | 'error';

export type LoadGateInput = Readonly<{
  /** Префикс лога: [LOAD-GATE:<id>]; ключ счётчика при persistAcrossMounts. */
  id: string;
  status: LoadGateStatus;
  retry: () => void;
  /** false — хук молчит (экран в фоне, данные не нужны). */
  enabled?: boolean;
  /**
   * true — счётчик и «исчерпано» живут между монтированиями (по id). Для компонентов, которые
   * размонтируются на время самой перезагрузки (иначе счётчик обнулялся бы каждый круг → бесконечно).
   * Сбрасывается при успехе или после PERSIST_IDLE_RESET_MS тишины.
   */
  persistAcrossMounts?: boolean;
}>;

export type LoadGateHandle = Readonly<{
  /** Повторы исчерпаны — показывать «Сейчас недоступно» + «Попробовать снова». */
  exhausted: boolean;
  /** Ручной повтор (тап) или повтор при возврате в приложение: сбрасывает счётчик. */
  retryNow: (source: 'tap' | 'foreground') => void;
}>;

const PERSIST_IDLE_RESET_MS = 5 * 60_000;
// зачем (Ревизор 18.10 08:30, 🔴 бесконечный автоповтор в 49630f40e): потребитель, у которого status на время повтора мигает 'ready' (флаг ошибки сбрасывается на старте перезагрузки), раньше обнулял счётчик
// мгновенно — и повторы шли по кругу раз в ~1 с (платные чтения каталога). Теперь 'ready' сбрасывает счётчик только если держится LOAD_GATE_READY_RESET_MS; мигание короче паузы счётчик не трогает.
export const LOAD_GATE_READY_RESET_MS = 2500;
type PersistedGate = { attempts: number; exhausted: boolean; at: number };
const persistedGates = new Map<string, PersistedGate>();

function readPersisted(id: string): PersistedGate {
  const saved = persistedGates.get(id);
  if (!saved || Date.now() - saved.at > PERSIST_IDLE_RESET_MS) return { attempts: 0, exhausted: false, at: Date.now() };
  return saved;
}

/** Только для тестов. */
export function __resetLoadGatePersistenceForTests(): void {
  persistedGates.clear();
}

export function useLoadGate(input: LoadGateInput): LoadGateHandle {
  const { id, status, enabled = true, persistAcrossMounts = false } = input;
  const retryRef = useRef(input.retry);
  retryRef.current = input.retry;
  const initial = persistAcrossMounts ? readPersisted(id) : { attempts: 0, exhausted: false, at: 0 };
  const attemptsRef = useRef(initial.attempts);
  const [exhausted, setExhaustedState] = useState(initial.exhausted);
  const [epoch, setEpoch] = useState(0);
  const tag = `[LOAD-GATE:${id}]`;

  const remember = useCallback((attempts: number, nextExhausted: boolean) => {
    attemptsRef.current = attempts;
    if (persistAcrossMounts) persistedGates.set(id, { attempts, exhausted: nextExhausted, at: Date.now() });
  }, [id, persistAcrossMounts]);
  const setExhausted = useCallback((value: boolean) => {
    remember(attemptsRef.current, value);
    setExhaustedState(value);
  }, [remember]);

  useEffect(() => {
    if (status === 'ready') {
      if (attemptsRef.current === 0 && !exhausted) return undefined; // сбрасывать нечего
      const resetTimer = setTimeout(() => {
        console.warn(tag, 'ready держится → счётчик сброшен', { attempts: attemptsRef.current, readyMs: LOAD_GATE_READY_RESET_MS });
        remember(0, false);
        setExhaustedState(false);
        if (persistAcrossMounts) persistedGates.delete(id);
      }, LOAD_GATE_READY_RESET_MS);
      return () => clearTimeout(resetTimer);
    }
    if (!enabled || exhausted) return undefined;
    const nextAttempt = attemptsRef.current + 1;
    const backoffMs = loadGateBackoffMs(nextAttempt);
    if (status === 'error' && backoffMs === null) {
      console.warn(tag, 'повторы исчерпаны → «Сейчас недоступно»', { attempts: attemptsRef.current });
      setExhausted(true);
      return undefined;
    }
    // Идёт загрузка — ждём потолок; сбой — паузу бэкоффа.
    const delayMs = status === 'loading' ? LOAD_GATE_TOTAL_MS : (backoffMs as number);
    const timer = setTimeout(() => {
      if (backoffMs === null) {
        console.warn(tag, 'загрузка не ответила за потолок, повторов не осталось → «Сейчас недоступно»', { ceilingMs: LOAD_GATE_TOTAL_MS });
        setExhausted(true);
        return;
      }
      remember(nextAttempt, false);
      console.warn(tag, 'тихий повтор', { attempt: nextAttempt, status, waitedMs: delayMs });
      try {
        retryRef.current();
      } catch (error) {
        console.warn(tag, 'повтор упал', error instanceof Error ? error.message : String(error));
      }
      // зачем (cards-039, Сверка 81d2dfe38, координатор 18.10 05:58): раньше эффект перезапускался ТОЛЬКО по смене status, а потребитель обязан был перевести status в 'loading' на время повтора.
      // Потребитель, который отдавал воротам лишь 'error'|'ready' (SavedCollectionState), после первого повтора оставался в 'error' → следующая пауза не ставилась → вечный скелетон при повторяющемся сбое.
      // Теперь после КАЖДОГО повтора эффект перезапускается по счётчику (epoch), независимо от status: следующая пауза ставится либо ворота исчерпываются. Контракт 'loading' остаётся рекомендацией (ставит потолок вместо паузы).
      setEpoch((value) => value + 1);
    }, delayMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: epoch — только триггер перезапуска эффекта после повтора, в теле не читается
  }, [enabled, epoch, exhausted, id, persistAcrossMounts, remember, setExhausted, status, tag]);

  const retryNow = useCallback((source: 'tap' | 'foreground') => {
    console.warn(tag, 'повтор после «Сейчас недоступно»', { source });
    remember(0, false);
    setExhaustedState(false);
    try {
      retryRef.current();
    } catch (error) {
      console.warn(tag, 'ручной повтор упал', error instanceof Error ? error.message : String(error));
    }
  }, [remember, tag]);

  // D158: автоповтор при возврате в приложение, если повторы исчерпаны.
  useEffect(() => {
    if (!exhausted || !enabled) return undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') retryNow('foreground');
    });
    return () => sub.remove();
  }, [enabled, exhausted, retryNow]);

  return { exhausted, retryNow };
}

/* expo-router: app/ files are treated as routes and need a default export. */
export default function __UseLoadGateRouteShim() {
  return null;
}
