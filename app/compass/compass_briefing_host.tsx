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

  // Показываем, когда день готов и сегодня ещё не показывали.
  useEffect(() => {
    if (compassOn() && hasPremiumAccess && checkedSeen && !loading && day) {
      setVisible(true);
    }
  }, [checkedSeen, loading, day, hasPremiumAccess]);

  const markSeen = useCallback(() => {
    void AsyncStorage.setItem(todayKey(now), '1').catch(() => {});
  }, [now]);

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

  if (!compassOn() || !hasPremiumAccess) return null;

  return (
    <CompassBriefingModal
      visible={visible}
      day={day}
      onStart={handleStart}
      onLater={handleLater}
      onTaskPress={handleTaskPress}
    />
  );
}
