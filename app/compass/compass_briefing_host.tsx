/**
 * Компас — хост брифинга. ОБОЛОЧКА, Волна 2.3.
 *
 * Самодостаточный компонент: сам грузит «День» (хук) и сам управляет показом
 * модала один раз за день. Сделан так, чтобы подключение на главный экран было
 * ОДНОЙ строкой `<CompassBriefingHost />` за флагом — без правки логики home.
 *
 * ИЗОЛЯЦИЯ: при выключенном Компасе рендерит null и ничего не грузит. Премиум —
 * брифинг только для тех, у кого есть доступ (план — Premium-фича).
 *
 * Показ «раз в день» хранится локально (AsyncStorage), чтобы не всплывать при
 * каждом возврате на главную.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePremium } from '../../components/PremiumContext';
import { useOverlayVisible } from '../../components/OverlayArbiter';
import { compassOn } from './compass_flags';
import { useCompassDay } from './use_compass_day';
import { compassTaskRoute } from './compass_task_route';
import { resolvePronunciationRoute } from './compass_pronunciation_route';
import CompassBriefingModal from './compass_briefing_modal';
import type { CompassTask } from './compass_brain';

const SEEN_KEY_PREFIX = 'compass_briefing_seen_';

function todayKey(nowMs: number): string {
  const d = new Date(nowMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${SEEN_KEY_PREFIX}${y}-${m}-${day}`;
}

// МОДУЛЬНЫЙ latch (живёт всю сессию JS-бандла, переживает ПЕРЕМОНТИРОВАНИЕ хоста).
// Прошлый фикс держал «показано» в useRef — но ref сбрасывается при remount хоста
// (мигание hasPremiumAccess при фоновом cloud-refresh, ремаунт поддерева home,
// навигация), поэтому модал «всплывал, пропадал и снова всплывал бесконечно».
// AsyncStorage-маркер асинхронный → при быстром remount checkedSeen успевал
// прочитаться как «ещё не видели» до записи. Модульный latch снимает оба случая
// синхронно: один раз показали/закрыли за день — больше не открываем до смены дня.
let _compassBriefingShownForDay: string | null = null;

interface CompassBriefingHostProps {
  /** Колбэк «начать день» — навигация решается вызывающим экраном (home). */
  onStartDay?: () => void;
  /** Текущее время (мс). Передаётся для тестируемости; по умолчанию — now. */
  nowMs?: number;
}

export default function CompassBriefingHost({ onStartDay, nowMs }: CompassBriefingHostProps) {
  // ВАЖНО: фиксируем `now`, иначе при отсутствии nowMs `Date.now()` даёт новое
  // значение на каждом рендере → эффекты с `now` в deps (здесь и в useCompassDay)
  // зацикливаются на setState → "Maximum update depth exceeded".
  const now = useMemo(() => nowMs ?? Date.now(), [nowMs]);
  const router = useRouter();
  const { hasPremiumAccess } = usePremium();
  const { day, loading } = useCompassDay(now);
  const [visible, setVisible] = useState(false);
  const [checkedSeen, setCheckedSeen] = useState(false);
  const dayKey = todayKey(now);
  // Онбординг должен быть завершён: иначе брифинг всплывает поверх онбординга
  // (экран home смонтирован под оверлеем). null = ещё не проверили.
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  // Один показ в день: проверяем локальный маркер.
  useEffect(() => {
    if (!compassOn() || !hasPremiumAccess) return;
    let cancelled = false;
    void (async () => {
      const seen = await AsyncStorage.getItem(todayKey(now)).catch(() => null);
      // checkedSeen === true означает «сегодня ещё НЕ показывали» (можно показать).
      if (!cancelled) setCheckedSeen(seen == null);
    })();
    return () => {
      cancelled = true;
    };
  }, [now, hasPremiumAccess]);

  // Завершён ли онбординг (читаем один раз).
  useEffect(() => {
    if (!compassOn() || !hasPremiumAccess) return;
    let cancelled = false;
    void (async () => {
      const done = await AsyncStorage.getItem('onboarding_done').catch(() => null);
      if (!cancelled) setOnboardingDone(done === '1');
    })();
    return () => {
      cancelled = true;
    };
  }, [hasPremiumAccess]);

  const markSeen = useCallback(() => {
    // Латчим СИНХРОННО в модульной переменной (переживает remount), потом пишем в
    // AsyncStorage (переживает перезапуск приложения). Синхронный латч — главное:
    // он гасит повторный показ до того, как асинхронная запись успеет завершиться.
    _compassBriefingShownForDay = dayKey;
    void AsyncStorage.setItem(dayKey, '1').catch(() => {});
  }, [dayKey]);

  // Показываем, только когда: онбординг завершён, день готов, есть реальная история
  // (тип ≠ first_day) и сегодня ещё не показывали. Чистый лист брифингом не дёргаем.
  // ВАЖНО: латч `_compassBriefingShownForDay` — МОДУЛЬНЫЙ (не ref): он переживает
  // перемонтирование хоста (мигание hasPremiumAccess / ремаунт home / навигация),
  // поэтому модал больше не «всплывает, пропадает и снова всплывает бесконечно».
  // Латч ставим СИНХРОННО в том же кадре, что и setVisible(true), до любого await.
  useEffect(() => {
    if (_compassBriefingShownForDay === dayKey) return;
    if (
      compassOn() &&
      hasPremiumAccess &&
      onboardingDone === true &&
      checkedSeen &&
      !loading &&
      day &&
      day.type !== 'first_day'
    ) {
      markSeen();
      setVisible(true);
    }
  }, [checkedSeen, loading, day, hasPremiumAccess, onboardingDone, markSeen, dayKey]);

  const handleStart = useCallback(() => {
    markSeen();
    setVisible(false);
    onStartDay?.();
  }, [markSeen, onStartDay]);

  const handleLater = useCallback(() => {
    markSeen();
    setVisible(false);
  }, [markSeen]);

  // Тап по конкретной задаче дня: помечаем показ, закрываем и открываем её экран.
  // Для «повтори вслух» пытаемся открыть задачу произношения текущего дня плана
  // напрямую (она есть в каждом дне плана); если активного плана нет — fallback.
  const handleTaskPress = useCallback((task: CompassTask) => {
    markSeen();
    setVisible(false);
    void (async () => {
      let route = compassTaskRoute(task, day);
      if (task.kind === 'pronunciation') {
        const direct = await resolvePronunciationRoute();
        if (direct) route = direct;
      }
      router.push(route.params ? { pathname: route.pathname, params: route.params } as never : route.pathname as never);
    })();
  }, [markSeen, router, day]);

  // Пропускаем показ через OverlayArbiter: на главной несколько `Modal` со
  // statusBarTranslucent (празднование премиума/VIP и т.п.) одновременно подвешивают
  // System UI на Android (см. OverlayArbiter.tsx) — это и был фриз каскада после
  // онбординга (Компас всплывал ПОВЕРХ празднования). Арбитр держит ровно одну
  // модалку: брифинг ждёт своей очереди и не стекается с другими.
  const arbitratedVisible = useOverlayVisible('compassBriefing', visible);

  if (!compassOn() || !hasPremiumAccess) return null;

  return (
    <CompassBriefingModal
      visible={arbitratedVisible}
      day={day}
      onStart={handleStart}
      onLater={handleLater}
      onTaskPress={handleTaskPress}
    />
  );
}
