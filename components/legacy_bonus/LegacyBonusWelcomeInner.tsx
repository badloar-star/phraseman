// ═══════════════════════════════════════════════════════════════════════════
// LegacyBonusWelcomeInner.tsx — рабочая часть хоста окна «Встречайте PhraseMan 2.0»: клиент Ядра, слот в очереди окон, шторка.
//
// зачем: грузится лениво ПОСЛЕ первого кадра Главной (см. LegacyBonusWelcomeHost) — клиент начисления и шторка в первый кадр не попадают.
// Закрытие ведём плавно: сначала шторка уезжает (слот держится), и только когда нативное окно ушло — слот освобождается и клиент помечает окно закрытым.
// ═══════════════════════════════════════════════════════════════════════════
import React, { lazy, memo, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { dismissLegacyBonusWelcome, markLegacyBonusWelcomeShown, useLegacyBonusWelcome } from '../../app/legacy_bonus_client';
import type { Lang } from '../../constants/i18n';
import type { LegacyBonusViewInput } from '../../modules/legacy_bonus/legacy_bonus_view';
import { useOverlayVisible } from '../OverlayArbiter';

const LegacyBonusWelcomeSheet = lazy(() => import('./LegacyBonusWelcomeSheet'));

function LegacyBonusWelcomeInner({ lang, coinRank }: Readonly<{ lang: Lang; coinRank: number | null }>) {
  const welcome = useLegacyBonusWelcome();
  // зачем (владелец 15.10): `show` от клиента Ядра — сервер начислил; начислено 0 по всем строкам → окно всё равно показываем, но только с заголовком (плашка пересчёта сама скрывается)
  const incoming: LegacyBonusViewInput | null = welcome.kind === 'show' && welcome.result ? welcome.result : null;
  // замороженный результат: после `dismiss` клиент вернёт 'none', а шторка ещё уезжает — рисуем то, что показали
  const [frozen, setFrozen] = useState<LegacyBonusViewInput | null>(null);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (incoming && !frozen) {
      console.log(`[LEGACY-BONUS] хост: получили результат — итог=${incoming.coins.total} опыт=${incoming.coins.xp} жемчуг=${incoming.coins.pearls} вращения=${incoming.coins.spins}`); // guard-ok: одна строка на показ
      setFrozen(incoming);
    }
  }, [frozen, incoming]);
  const slot = useOverlayVisible('legacyBonusWelcome', frozen !== null);
  const loggedSlotRef = useRef(false);
  useEffect(() => {
    if (slot && !loggedSlotRef.current) {
      loggedSlotRef.current = true;
      console.log('[LEGACY-BONUS] хост: слот получен — шторка на экране'); // guard-ok: одна строка на показ
      markLegacyBonusWelcomeShown('shown'); // зачем (владелец 15.10): метка welcomePending снимается только когда окно реально на экране — закрыли приложение раньше, окно вернётся
    }
  }, [slot]);

  const onClose = useCallback(() => {
    console.log('[LEGACY-BONUS] хост: «Понятно» — шторка закрывается'); // guard-ok: одна строка на закрытие
    setClosing(true);
    dismissLegacyBonusWelcome();
  }, []);
  // нативное окно ушло — отдаём слот
  const onDismissed = useCallback(() => {
    console.log('[LEGACY-BONUS] хост: шторка ушла — слот свободен'); // guard-ok: одна строка на закрытие
    setFrozen(null);
    setClosing(false);
  }, []);

  if (!frozen) return null;
  return (
    <Suspense fallback={null}>
      <LegacyBonusWelcomeSheet visible={slot && !closing} lang={lang} coinRank={coinRank} result={frozen} onClose={onClose} onDismissed={onDismissed} />
    </Suspense>
  );
}

export default memo(LegacyBonusWelcomeInner);
