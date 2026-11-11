// ═══════════════════════════════════════════════════════════════════════════
// LegacyBonusWelcomeInner.tsx — рабочая часть хоста окна «Встречайте PhraseMan 2.0»: клиент Ядра, слот в очереди окон, шторка.
//
// зачем: грузится лениво ПОСЛЕ первого кадра Главной (см. LegacyBonusWelcomeHost) — клиент начисления и шторка в первый кадр не попадают.
// Закрытие ведём плавно: сначала шторка уезжает (слот держится), и только когда нативное окно ушло — слот освобождается и клиент помечает окно закрытым.
// ═══════════════════════════════════════════════════════════════════════════
import React, { lazy, memo, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useMemMomentsTrack } from '../moments/mem_moments_probe';
import { dismissLegacyBonusWelcome, markLegacyBonusWelcomeShown, useLegacyBonusWelcome } from '../../app/legacy_bonus_client';
import type { Lang } from '../../constants/i18n';
import type { LegacyBonusViewInput } from '../../modules/legacy_bonus/legacy_bonus_view';
import { useOverlayVisible } from '../OverlayArbiter';
import { useActiveAccountOwner } from '../../hooks/use_active_account_owner';
import { insteadStoryLanded, recordLegacyCoinsStory, storiesReplaceWindows } from '../../modules/story_events/story_instead_sources';

const LegacyBonusWelcomeSheet = lazy(() => import('./LegacyBonusWelcomeSheet'));

function LegacyBonusWelcomeInner({ lang, coinRank }: Readonly<{ lang: Lang; coinRank: number | null }>) {
  const welcome = useLegacyBonusWelcome();
  // зачем (владелец 15.10): `show` от клиента Ядра — сервер начислил; начислено 0 по всем строкам → окно всё равно показываем, но только с заголовком (плашка пересчёта сама скрывается)
  const incoming: LegacyBonusViewInput | null = welcome.kind === 'show' && welcome.result ? welcome.result : null;
  // замороженный результат: после `dismiss` клиент вернёт 'none', а шторка ещё уезжает — рисуем то, что показали
  const [frozen, setFrozen] = useState<LegacyBonusViewInput | null>(null);
  const [closing, setClosing] = useState(false);
  // зачем (владелец 11.11: «никаких модальных окон совсем, всё отображается только в историях»): при включённых историях результат пересчёта
  // пишется кадром — шторка не открывается и слот очереди окон не просится. Истории выключены (флаг stories_v1) — шторка как раньше.
  const storyRecordedRef = useRef(false);
  // зачем (F17, аудит, владелец 11.11): замороженная копия результата (начисленные монеты) жила до закрытия шторки — после смены
  // аккаунта новому игроку показались бы цифры прошлого. Клиент Ядра сам привязан к владельцу; сбрасываем только копию хоста.
  const hostOwner = useActiveAccountOwner(); const hostOwnerRef = useRef(hostOwner);
  useEffect(() => {
    if (hostOwnerRef.current === hostOwner) return; // guard-ok: владелец тот же
    hostOwnerRef.current = hostOwner;
    console.log('[LEGACY-BONUS] хост: владелец сменился — копия результата прошлого игрока снята'); // guard-ok: одна строка на смену владельца
    storyRecordedRef.current = false;
    setFrozen(null);
    setClosing(false);
  }, [hostOwner]);
  useEffect(() => {
    if (!incoming || frozen || storyRecordedRef.current || !storiesReplaceWindows()) return;
    storyRecordedRef.current = true;
    void recordLegacyCoinsStory({ coins: incoming.coins.total, xpBefore: incoming.from.xp, pearlsBefore: incoming.from.pearls, spinsBefore: incoming.from.spins })
      .then((record) => {
        // Метку ожидания снимаем только после записи: если история не легла, окно/история вернётся при следующем запуске
        if (!insteadStoryLanded(record)) { storyRecordedRef.current = false; console.warn(`[LEGACY-BONUS] хост: история не записана (${record.recorded ? 'ok' : record.reason}) — метку ожидания не снимаем`); return; } // guard-ok: ранний выход с причиной
        console.log(`[LEGACY-BONUS] хост: история вместо шторки — итог=${incoming.coins.total}`); // guard-ok: одна строка на запись
        dismissLegacyBonusWelcome();
      })
      .catch((error: unknown) => {
        storyRecordedRef.current = false;
        console.warn('[LEGACY-BONUS] хост: запись истории упала — метку ожидания не снимаем', String(error)); // guard-ok: catch пишет причину
      });
  }, [frozen, incoming]);
  useEffect(() => {
    // при включённых историях шторку не готовим — факт уйдёт кадром (эффект выше)
    if (storiesReplaceWindows()) return;
    if (incoming && !frozen) {
      console.log(`[LEGACY-BONUS] хост: получили результат — итог=${incoming.coins.total} опыт=${incoming.coins.xp} жемчуг=${incoming.coins.pearls} вращения=${incoming.coins.spins}`); // guard-ok: одна строка на показ
      setFrozen(incoming);
    }
  }, [frozen, incoming]);
  const slot = useOverlayVisible('legacyBonusWelcome', frozen !== null);
  // зачем (R129): шторка держится смонтированной, пока не придёт «окно ушло» (onDismissed) — журнал покажет, если она застряла невидимой
  useMemMomentsTrack('host:legacy-bonus-sheet', frozen !== null, closing ? 'closing' : '');
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
