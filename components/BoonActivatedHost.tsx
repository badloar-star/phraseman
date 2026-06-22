/**
 * BoonActivatedHost — раз в день показывает праздничный модал «бонус дня активирован»
 * для «тихих» бонусов (которые включают режим, а не дают осколки). Mystery-сундук
 * и осколочные бонусы (comeback/perfect_week) имеют свои модалы — их здесь НЕ трогаем.
 *
 * Date-guard по UTC-дню: один показ за день. Монтируется из _layout.tsx внутри
 * OverlayArbiterProvider; видимость — через useOverlayVisible('boonActivated', …).
 */
import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOverlayVisible } from './OverlayArbiter';
import { getTodaysBoons } from '../app/boons/boon_engine';
import { getTodayKey } from '../app/daily_tasks';
import type { BoonId } from '../app/boons/boon_types';
import BoonActivatedModal from './BoonActivatedModal';

/** Бонусы со своим отдельным модалом-наградой — здесь НЕ показываем. */
const HAS_OWN_MODAL: ReadonlySet<BoonId> = new Set<BoonId>(['mystery_monday']);

const SHOWN_KEY = 'boon_activated_shown_v1';

export default function BoonActivatedHost() {
  const [boon, setBoon] = useState<BoonId | null>(null);
  const [wantShow, setWantShow] = useState(false);
  const shownRef = useRef(false);
  const visible = useOverlayVisible('boonActivated', wantShow);

  useEffect(() => {
    let alive = true;
    (async () => {
      const primary = getTodaysBoons().primary;
      if (!primary || HAS_OWN_MODAL.has(primary)) return;
      // Во время онбординга праздничный модал не показываем. Гейт ДО setWantShow →
      // слот арбитра не занимается зря (иначе голодали бы тосты). onboarding_done = '1'.
      const onboardingDone = await AsyncStorage.getItem('onboarding_done').catch(() => null);
      if (onboardingDone !== '1') return;
      const todayKey = getTodayKey();
      try {
        const shown = await AsyncStorage.getItem(SHOWN_KEY);
        if (shown === todayKey) return; // уже показывали сегодня
      } catch {
        return;
      }
      if (alive) {
        setBoon(primary);
        setWantShow(true);
      }
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  /** Пометить показ за сегодня (идемпотентно). */
  const markShown = async () => {
    if (shownRef.current) return;
    shownRef.current = true;
    try {
      await AsyncStorage.setItem(SHOWN_KEY, getTodayKey());
    } catch {
      // best-effort
    }
  };

  const close = () => {
    void markShown();
    setWantShow(false);
  };

  if (!visible) return null;

  return <BoonActivatedModal visible={visible} boon={boon} onClose={close} />;
}
