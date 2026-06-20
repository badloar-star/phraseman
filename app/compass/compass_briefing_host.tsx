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
import React, { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePremium } from '../../components/PremiumContext';
import { compassOn } from './compass_flags';
import { useCompassDay } from './use_compass_day';
import CompassBriefingModal from './compass_briefing_modal';

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
  const now = nowMs ?? Date.now();
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

  if (!compassOn() || !hasPremiumAccess) return null;

  return <CompassBriefingModal visible={visible} day={day} onStart={handleStart} onLater={handleLater} />;
}
