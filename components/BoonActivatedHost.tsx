/**
 * BoonActivatedHost — раз в день показывает праздничный модал «бонус дня активирован»
 * для «тихих» бонусов (которые включают режим, а не дают осколки). Mystery-сундук
 * и осколочные бонусы (comeback/perfect_week) имеют свои модалы — их здесь НЕ трогаем.
 *
 * Date-guard по UTC-дню: один показ за день. Монтируется из _layout.tsx внутри
 * OverlayArbiterProvider; видимость — через useOverlayVisible('boonActivated', …).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOverlayVisible } from './OverlayArbiter';
import { getTodaysBoons } from '../app/boons/boon_engine';
import { getUtcDayKey } from '../app/local_date';
import { onAppEvent } from '../app/events';
import { isEnergyFreeWindowActive, ENERGY_FREE_WINDOW_START_HOUR } from '../app/boons/boon_effects_energy';
import type { BoonId } from '../app/boons/boon_types';
import BoonActivatedModal from './BoonActivatedModal';
import { usePremium } from './PremiumContext';

/** Бонусы со своим отдельным модалом-наградой — здесь НЕ показываем. */
const HAS_OWN_MODAL: ReadonlySet<BoonId> = new Set<BoonId>(['mystery_monday']);
const FREE_ONLY_VISUAL_BOONS: ReadonlySet<BoonId> = new Set<BoonId>([
  'streak_saver',
  'energy_free_window',
  'flashcard_friday',
  'speaking_saturday',
  'turbo_regen',
]);

const SHOWN_KEY = 'boon_activated_shown_v1';

function msUntilLocalHour(hour: number): number | null {
  const now = new Date();
  if (now.getHours() >= hour) return null;
  const target = new Date(now);
  target.setHours(hour, 0, 0, 0);
  const delay = target.getTime() - now.getTime();
  return delay > 0 ? delay : null;
}

export default function BoonActivatedHost() {
  const [boon, setBoon] = useState<BoonId | null>(null);
  const [wantShow, setWantShow] = useState(false);
  const shownRef = useRef(false);
  const { hasPremiumAccess } = usePremium();
  const visible = useOverlayVisible('boonActivated', wantShow);

  const clearPending = useCallback(() => {
    setWantShow(false);
    setBoon(null);
  }, []);

  const markShown = useCallback(async (): Promise<boolean> => {
    if (shownRef.current) return true;
    try {
      await AsyncStorage.setItem(SHOWN_KEY, getUtcDayKey());
      shownRef.current = true;
      return true;
    } catch {
      return false;
    }
  }, []);

  const evaluate = useCallback(async (alive: () => boolean) => {
    const primary = getTodaysBoons().primary;
    const isStillEligible = () => (
      getTodaysBoons().primary === primary
      && primary != null
      && !HAS_OWN_MODAL.has(primary)
      && !(hasPremiumAccess && FREE_ONLY_VISUAL_BOONS.has(primary))
      && (primary !== 'energy_free_window' || isEnergyFreeWindowActive())
    );
    if (!isStillEligible()) {
      if (alive()) clearPending();
      return;
    }
    // Во время онбординга праздничный модал не показываем. Гейт ДО setWantShow →
    // слот арбитра не занимается зря (иначе голодали бы тосты). onboarding_done = '1'.
    const onboardingDone = await AsyncStorage.getItem('onboarding_done').catch(() => null);
    if (onboardingDone !== '1' || !isStillEligible()) {
      if (alive()) clearPending();
      return;
    }
    const todayKey = getUtcDayKey();
    try {
      const shown = await AsyncStorage.getItem(SHOWN_KEY);
      if (shown === todayKey) return; // уже показывали сегодня
    } catch {
      return;
    }
    if (!isStillEligible()) {
      if (alive()) clearPending();
      return;
    }
    // Persist before asking the arbiter to display the modal. If the process is
    // suspended or killed as the overlay appears, this keeps the same bonus
    // from being shown again on the next app launch.
    if (!await markShown()) return;
    if (alive() && isStillEligible()) {
      setBoon(primary);
      setWantShow(true);
    } else if (alive()) {
      clearPending();
    }
  }, [clearPending, hasPremiumAccess, markShown]);

  useEffect(() => {
    let alive = true;
    let generation = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      const currentGeneration = ++generation;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      void evaluate(() => alive && currentGeneration === generation).catch(() => {});
      if (getTodaysBoons().primary === 'energy_free_window' && !isEnergyFreeWindowActive()) {
        const delay = msUntilLocalHour(ENERGY_FREE_WINDOW_START_HOUR);
        if (delay != null) {
          timer = setTimeout(refresh, delay);
        }
      }
    };

    refresh();
    const remoteConfigSub = onAppEvent('remote_config_changed', refresh);
    return () => {
      alive = false;
      generation += 1;
      remoteConfigSub.remove();
      if (timer) clearTimeout(timer);
    };
  }, [evaluate]);

  useEffect(() => {
    if (visible) {
      void markShown();
    }
  }, [markShown, visible]);

  const close = () => {
    void markShown();
    setWantShow(false);
  };

  if (!visible) return null;

  return <BoonActivatedModal visible={visible} boon={boon} onClose={close} />;
}
