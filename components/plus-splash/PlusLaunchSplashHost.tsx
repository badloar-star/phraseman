// ════════════════════════════════════════════════════════════════════════════
// PlusLaunchSplashHost.tsx — решает, показывать ли заставку Plus при запуске (№35), и показывает её через арбитр окон.
//
// зачем (владелец 21.10): раз в 14 дней, только при запуске, не Plus-пользователям. Решение принимает чистая политика
// (app/plus_splash_policy.ts) по локальным фактам: доступ, install_date, последний показ, отказы подряд, окончание Plus, состояние магазина.
// Состояние — на устройстве (app/plus_splash_state.ts), цена и пробный — из магазина (app/plus_splash_offer.ts); новых чтений Firebase нет.
// Каждое решение «показать / не показать» пишется в журнал [PLUS-SPLASH] с причиной.
// Оценка идёт ОДИН раз за процесс (запуск), после первого кадра и после первой проверки доступа — Plus-пользователь не увидит заставку «на секунду».
// Окно — нативный <Modal> в очереди арбитра (ключ plusSplash, хвост очереди): любое другое окно запуска идёт раньше.
// ════════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { InteractionManager, Modal } from 'react-native';
import { router } from 'expo-router';

import { navigateAfterModalClose } from '../../app/safe_modal_navigation';
import { devPlusSplashOffer, getDevPlusSplash, setDevPlusSplash, subscribeDevPlusSplash } from '../../app/dev_plus_splash';
import { loadPlusSplashOffer, type PlusSplashOffer } from '../../app/plus_splash_offer';
import { decidePlusSplash } from '../../app/plus_splash_policy';
import {
  PLUS_SPLASH_INSTALL_DATE_KEY, PLUS_SPLASH_PLUS_EXPIRY_KEY,
  readPlusSplashState, readStoredMs, recordPlusSplashAccepted, recordPlusSplashRefusal, recordPlusSplashShown,
  type PlusSplashState,
} from '../../app/plus_splash_state';
import { useLang } from '../LangContext';
import { useOverlayVisible } from '../OverlayArbiter';
import { usePremium } from '../PremiumContext';
import PlusLaunchSplashView from './PlusLaunchSplashView';

const LOG = '[PLUS-SPLASH]';
/** Один запуск процесса = одна оценка: возврат из фона и перемонтирование хоста заставку не повторяют. */
let evaluatedThisProcess = false;

/** Только для тестов. */
export function __resetPlusSplashHostForTests(): void {
  evaluatedThisProcess = false;
}

function PlusLaunchSplashHost() {
  const { lang } = useLang();
  const { hasPremiumAccess, accessResolved } = usePremium();
  const [realOffer, setOffer] = useState<PlusSplashOffer | null>(null);
  const [wanted, setWanted] = useState(false);
  // зачем (координатор 21.10, «Сверка»): dev-ссылка plusSplash=… показывает заставку сразу в нужном состоянии цены, мимо политики и без записи счётчика (в стор-сборке всегда null)
  const devForced = useSyncExternalStore(subscribeDevPlusSplash, getDevPlusSplash, () => null);
  const offer = devForced ? devPlusSplashOffer(devForced) : realOffer;
  const visible = useOverlayVisible('plusSplash', wanted || devForced !== null);
  const stateRef = useRef<PlusSplashState | null>(null);
  const premiumRef = useRef(hasPremiumAccess);
  premiumRef.current = hasPremiumAccess;
  const shownRecordedRef = useRef(false);

  useEffect(() => {
    if (evaluatedThisProcess) return undefined;
    if (!accessResolved) {
      console.warn(`${LOG} host: решение отложено — доступ ещё не проверен`); // guard-ok: причина
      return undefined;
    }
    evaluatedThisProcess = true;
    let alive = true;
    const task = InteractionManager.runAfterInteractions(() => {
      void (async () => {
        const nowMs = Date.now();
        const [state, installedAtMs, lastPlusExpiryMs] = await Promise.all([
          readPlusSplashState(),
          readStoredMs(PLUS_SPLASH_INSTALL_DATE_KEY),
          readStoredMs(PLUS_SPLASH_PLUS_EXPIRY_KEY),
        ]);
        if (!alive) { console.warn(`${LOG} host: хост снят до решения — выходим`); return; } // guard-ok: причина
        stateRef.current = state;
        const facts = {
          nowMs, accessResolved: true, hasPremiumAccess: premiumRef.current, installedAtMs,
          lastShownAtMs: state.lastShownAtMs, refusalsInRow: state.refusalsInRow, lastPlusExpiryMs, storeUnavailable: null,
        } as const;
        const first = decidePlusSplash(facts);
        console.warn(`${LOG} решение (до магазина): ${first.show ? 'ПОКАЗАТЬ' : 'НЕ показывать'} — ${first.reason}: ${first.detail}`, JSON.stringify({ installedAtMs, lastPlusExpiryMs, ...state })); // guard-ok: значение, решившее ветку
        if (!first.show) return;

        const loaded = await loadPlusSplashOffer();
        if (!alive) { console.warn(`${LOG} host: хост снят во время загрузки цены — не показываем`); return; } // guard-ok: причина
        if (premiumRef.current) {
          console.warn(`${LOG} решение (после магазина): НЕ показывать — has_plus: Plus появился, пока грузилась цена`); // guard-ok: причина
          return;
        }
        const final = decidePlusSplash({ ...facts, hasPremiumAccess: false, storeUnavailable: loaded.kind === 'store_unavailable' });
        console.warn(`${LOG} решение (после магазина): ${final.show ? 'ПОКАЗАТЬ' : 'НЕ показывать'} — ${final.reason}: ${final.detail}`, JSON.stringify({ offer: loaded.kind })); // guard-ok: итог решения
        if (!final.show) return;
        setOffer(loaded);
        setWanted(true);
      })().catch((error: unknown) => {
        console.warn(`${LOG} host: решение упало — заставку не показываем`, error instanceof Error ? error.message : String(error)); // guard-ok: причина
      });
    });
    return () => { alive = false; task.cancel(); };
  }, [accessResolved]);

  // Метка показа — сразу, когда окно реально получило слот арбитра: повторный запуск не покажет его снова.
  useEffect(() => {
    if (!visible || shownRecordedRef.current) return;
    if (devForced) {
      console.warn(`${LOG} показываем (dev-состояние ${devForced}) — счётчик показа не пишем`); // guard-ok: что увидел человек
      return;
    }
    shownRecordedRef.current = true;
    const prev = stateRef.current ?? { v: 1 as const, lastShownAtMs: null, refusalsInRow: 0 };
    console.warn(`${LOG} показываем`, JSON.stringify({ offer: offer?.kind ?? null, lang })); // guard-ok: что увидел человек
    void recordPlusSplashShown(Date.now(), prev).then((next) => { stateRef.current = next; });
  }, [devForced, lang, offer, visible]);

  // зачем (Optimistic UI): закрытие мгновенное — слот отдаём сразу, счётчик пишем фоном.
  const dismiss = useCallback(() => {
    console.warn(`${LOG} закрыто без покупки («Не сейчас» / крестик)`); // guard-ok: действие человека
    setWanted(false);
    if (devForced) { setDevPlusSplash(null); return; } // dev-просмотр: счётчик отказов не трогаем
    const prev = stateRef.current ?? { v: 1 as const, lastShownAtMs: null, refusalsInRow: 0 };
    void recordPlusSplashRefusal(prev).then((next) => { stateRef.current = next; });
  }, [devForced]);

  const accept = useCallback(() => {
    console.warn(`${LOG} кнопка нажата → пейвол`, JSON.stringify({ offer: offer?.kind ?? null })); // guard-ok: действие человека
    const prev = stateRef.current ?? { v: 1 as const, lastShownAtMs: null, refusalsInRow: 0 };
    if (!devForced) void recordPlusSplashAccepted(prev).then((next) => { stateRef.current = next; });
    // зачем: нативное окно закрываем первым, пейвол открываем после — иначе на iOS present идёт во время dismiss (см. safe_modal_navigation)
    navigateAfterModalClose(() => { setWanted(false); if (devForced) setDevPlusSplash(null); }, () => {
      router.push({ pathname: '/premium_modal', params: { context: 'generic', source: 'plus_launch_splash' } } as never);
    });
  }, [devForced, offer]);

  if (!visible) return null;
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <PlusLaunchSplashView lang={lang} offer={offer} onPrimary={accept} onDismiss={dismiss} />
    </Modal>
  );
}

export default memo(PlusLaunchSplashHost);
