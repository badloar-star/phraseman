// ═══════════════════════════════════════════════════════════════════════════
// LegacyBonusWelcomeHost.tsx — точка монтирования окна «Встречайте PhraseMan 2.0» на Главной.
//
// зачем (Ядро 15.10, D195): «Показ — на Главной, своим экраном, поверх ничего не всплывает. Вызов начисления — лениво, после первого кадра Главной».
// Хост ничего не делает до первого кадра Главной; потом лениво подключает рабочую часть (клиент Ядра + слот очереди окон + шторка).
// Монеты уже на балансе (зачисляет сервер), поздравление не durable (правило 01.09): ничего не копим «на показ». Ожидания нет, ошибки окна нет:
// не `show` — окно просто не появляется, повтор при следующем запуске.
// ═══════════════════════════════════════════════════════════════════════════
import React, { lazy, memo, Suspense, useEffect, useState } from 'react';
import { runAfterHomeFirstFrame } from '../../app/first_frame_deferred_warmups';
import type { Lang } from '../../constants/i18n';

const LegacyBonusWelcomeInner = lazy(() => import('./LegacyBonusWelcomeInner'));

type HostProps = Readonly<{
  lang: Lang;
  coinRank: number | null;
  /** Главная на экране и приложение активно (как у остальных окон Главной). */
  active: boolean;
}>;

function LegacyBonusWelcomeHost({ lang, coinRank, active }: HostProps) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!active || ready) return undefined;
    const cancel = runAfterHomeFirstFrame('legacy_bonus_welcome', () => { setReady(true); }, { holdDuringOnboarding: true });
    return () => cancel();
  }, [active, ready]);
  if (!ready) return null;
  return <Suspense fallback={null}><LegacyBonusWelcomeInner lang={lang} coinRank={coinRank} /></Suspense>;
}

export default memo(LegacyBonusWelcomeHost);
