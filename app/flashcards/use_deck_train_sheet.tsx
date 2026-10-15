// ═══════════════════════════════════════════════════════════════════════════
// use_deck_train_sheet.tsx — окно выбора режима тренировки ПРЯМО на экране (без перехода на хаб-вкладку «Карточки»).
//
// зачем (решение координатора 15.10 по Макетам c1_video3): хаб «Карточки» — маршрут вкладки, любой переход на него сворачивает стек и холодно грузит тяжёлый хаб (+2,9 с до первого рендера),
// «Назад» с него вёл мимо ролика. «Тренировать» на экране ролика теперь открывает тот же компонент окна режимов (FlashcardsTrainingModeSheet) шторкой на самом экране; выбор режима → push на
// экран тренировки (не вкладка) с колодой набора. Ворота те же, что на хабе: квота (исчерпана → пейвол), «ранний тап» до ответа квоты, блиц только при достаточном числе карточек.
// Журнал: [DECK-TRAIN-SHEET].
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { usePremium } from '../../components/PremiumContext';
import type { Lang } from '../../constants/i18n';
import { useFlashcardTrainingQuotaPreview } from '../../hooks/useFlashcardTrainingQuotaPreview';
import { navOnce } from '../nav_once';
import { openPremiumPaywall } from '../paywall_navigation';
import { canStartBlitz } from './blitz_logic';
import { isValidDeckId } from './deck_selection';
import FlashcardsTrainingModeSheet from './FlashcardsTrainingModeSheet';
import { FC_DEFAULT_SESSION_SIZE, setLastPreset } from './mode_prefs';
import { fcTrainOptionPresetMode } from './tabbar_state';
import { buildCardsTrainingRoute, type CardsTrainingMode } from './training_entry';
import type { FcDeckId } from './mode_prefs';

export function useDeckTrainSheet(options: Readonly<{ deckId: string; count: number; lang: Lang; source: string }>): Readonly<{ open: () => void; sheet: React.ReactElement; visible: boolean }> {
  const router = useRouter();
  const quotaPreview = useFlashcardTrainingQuotaPreview();
  const { hasPremiumAccess, accessResolved } = usePremium();
  const [visible, setVisible] = useState(false);
  const pendingModeRef = useRef<CardsTrainingMode | null>(null);
  const paywallOpeningRef = useRef(false);
  // зачем (Ревизор 2.80, координатор 15.10): защита от двойного тапа и от push с ушедшего экрана — шторка открывается поверх экрана ролика, выбор режима стартует тренировку после её закрытия;
  // за это время человек мог нажать «Назад» (экран потерял фокус) или дважды тапнуть режим. Фокус — в ref; сами переходы — через navOnce.
  const focusedRef = useRef(true);
  useFocusEffect(useCallback(() => {
    focusedRef.current = true;
    return () => {
      focusedRef.current = false;
      pendingModeRef.current = null;
    };
  }, []));

  const trainingLocked = quotaPreview.status === 'exhausted';
  // как на хабе: квоту прочитать НЕЛЬЗЯ ('unavailable'/'stale_account') — человека не наказываем за нашу аварию; ждём только 'waiting'
  const trainingEntryReady = quotaPreview.status === 'allowed' || quotaPreview.status === 'unavailable' || quotaPreview.status === 'stale_account';
  const limitLabel = quotaPreview.status === 'waiting' || !accessResolved || hasPremiumAccess
    ? null
    : `${Math.min(quotaPreview.limit, Math.max(0, quotaPreview.used))}/${quotaPreview.limit}`;

  const open = useCallback(() => {
    if (!navOnce(`deck_train_sheet:open:${options.deckId}`, 600)) return; // двойной тап «Тренировать» — одна шторка
    console.log('[DECK-TRAIN-SHEET] open', JSON.stringify({ source: options.source, deckId: options.deckId, quotaStatus: quotaPreview.status, trainingLocked, trainingEntryReady })); // guard-ok: вход
    if (trainingLocked) {
      if (paywallOpeningRef.current) return;
      paywallOpeningRef.current = true;
      openPremiumPaywall(router, { context: 'flashcard_training', source: options.source });
      setTimeout(() => { paywallOpeningRef.current = false; }, 1500);
      return;
    }
    setVisible(true);
  }, [options.deckId, options.source, quotaPreview.status, router, trainingEntryReady, trainingLocked]);

  const close = useCallback(() => {
    pendingModeRef.current = null;
    setVisible(false);
  }, []);

  const choose = useCallback((mode: CardsTrainingMode) => {
    if (trainingLocked) {
      openPremiumPaywall(router, { context: 'flashcard_training', source: options.source });
      return;
    }
    if (!trainingEntryReady) {
      console.log('[DECK-TRAIN-SHEET] choose ignored: квота ещё не ответила', JSON.stringify({ mode })); // guard-ok: ранний выход
      return;
    }
    pendingModeRef.current = mode;
    setVisible(false);
  }, [options.source, router, trainingEntryReady, trainingLocked]);

  const dismissed = useCallback(() => {
    const mode = pendingModeRef.current;
    pendingModeRef.current = null;
    if (!mode) return;
    if (!focusedRef.current) {
      console.log('[DECK-TRAIN-SHEET] start отменён: экран уже потерял фокус', JSON.stringify({ mode, deckId: options.deckId })); // guard-ok: push с ушедшего экрана не делаем
      return;
    }
    if (!navOnce(`deck_train_sheet:start:${options.deckId}`, 1500)) return; // двойной выбор режима — одна тренировка
    if (!isValidDeckId(options.deckId)) {
      console.warn('[DECK-TRAIN-SHEET] deck id не валиден → экран настройки', JSON.stringify({ deckId: options.deckId, mode })); // guard-ok: причина запасного пути
      router.push({ pathname: '/flashcards_training_setup', params: { mode } } as never);
      return;
    }
    const route = mode === 'blitz' && !canStartBlitz(options.count) ? null : buildCardsTrainingRoute(mode, [options.deckId as FcDeckId]);
    console.log('[DECK-TRAIN-SHEET] start', JSON.stringify({ mode, deckId: options.deckId, count: options.count, route: route ? route.pathname : 'setup_fallback' })); // guard-ok: итог выбора
    if (!route) {
      router.push({ pathname: '/flashcards_training_setup', params: { mode } } as never);
      return;
    }
    const presetMode = mode === 'blitz' ? fcTrainOptionPresetMode('blitz') : mode === 'speaking' ? fcTrainOptionPresetMode('speak') : fcTrainOptionPresetMode('train');
    void setLastPreset(presetMode, { deckIds: [options.deckId as FcDeckId], size: FC_DEFAULT_SESSION_SIZE }).catch((error: unknown) => {
      console.warn(`[DECK-TRAIN-SHEET] пресет не сохранился reason=${error instanceof Error ? error.message : String(error)}`); // guard-ok: причина сбоя
    });
    router.push({ pathname: route.pathname, params: route.params } as never);
  }, [options.count, options.deckId, router]);

  const sheet = (
    <FlashcardsTrainingModeSheet
      limitLabel={limitLabel}
      visible={visible}
      lang={options.lang}
      onClose={close}
      onDismissed={dismissed}
      onSelect={choose}
      preparing={visible && !trainingEntryReady ? 'waiting' : null}
    />
  );
  return { open, sheet, visible };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
