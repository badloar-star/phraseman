/**
 * OnboardingWelcomeHost — глобальный хост приветствия+подарка.
 *
 * зачем: владелец (2026-07-27) — «модал должен быть не на этом экране, а когда
 * открылся экран главной». Онбординг только ставит флаг
 * (markOnboardingWelcomePending) и сразу отпускает управление, а приветствие
 * поднимает этот хост — уже над главной, через OverlayArbiter
 * (ключ 'onboardingWelcome' стоит ПЕРВЫМ в приоритете).
 *
 * Хост не знает и не должен знать, КТО поднял флаг PENDING: это либо новичок
 * (CleanOnboarding, только что прошедший анкету), либо давний пользователь
 * после обновления, для которого флаг поднял ретроактивный путь в
 * _layout.tsx (владелец, 2026-08-26 — «все старые кто после обновы откроет
 * приложение тоже», см. raiseWelcomeGiftForExistingUserIfEligible в
 * app/onboarding_welcome_state.ts). Оба случая — один и тот же код ниже.
 *
 * 2026-08-26 (владелец): шторка «Спасибо за установку» заменена церемонией
 * WelcomeGiftModal со стартовым подарком +100 жемчужин и +300 рун. Начисление
 * стартует ЗДЕСЬ — в момент решения показать приветствие, ДО первого кадра
 * модалки и независимо от её CTA (beginWelcomeGiftGrant): жемчужины ложатся на
 * баланс мгновенно и офлайн, руны догоняют серверным грантом. Поэтому новичок
 * не видит нулей с самого первого входа, а размонтирование модалки ничего не
 * теряет. Прерванная выдача (крэш/офлайн) дожимается при следующем запуске —
 * resumeWelcomeGiftIfPending, обычным пользователям это стоит одно чтение
 * AsyncStorage и выход.
 *
 * Рубильник onboarding_welcome_sheet_enabled гасит и модалку, и подарок разом:
 * выключен → флаг снимаем, выдачу не начинаем.
 *
 * зачем событие onboarding_welcome_pending_raised (аудит гонки, владелец
 * 2026-08-26 — «модал появился, но ничего не начислилось»): этот хост живёт в
 * дереве ВСЕГДА и читает диск ОДИН раз, сразу на монтировании. Ретроактивный
 * писатель флага для старых пользователей (raiseWelcomeGiftForExistingUserIfEligible)
 * ставит флаг ПОЗДНО — после setReady(true), внутри долгого асинхронного
 * bootstrap в _layout.tsx. Почти всегда хост успевает прочитать «флага ещё
 * нет» и решить «показывать нечего» РАНЬШЕ, чем поздний писатель до него
 * доберётся — а второй раз пустой useEffect ничего не перечитывает. Событие —
 * единственный способ разбудить уже принявший решение хост и заставить его
 * перепроверить диск заново.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';

import WelcomeGiftModal from './WelcomeGiftModal';
import { useOverlayVisible } from './OverlayArbiter';
import { getRemoteBool } from '../app/remote_flags';
import { onAppEvent } from '../app/events';
import {
  clearOnboardingWelcomePending,
  isOnboardingWelcomePending,
} from '../app/onboarding_welcome_state';
import {
  beginWelcomeGiftGrant,
  resumeWelcomeGiftIfPending,
} from '../app/welcome_gift';

export default function OnboardingWelcomeHost() {
  const [wantShow, setWantShow] = useState(false);
  const visible = useOverlayVisible('onboardingWelcome', wantShow);
  // Гейт «уже показали в этом запуске приложения» — не даёт запоздалому
  // событию (или второму его срабатыванию) поднять модалку повторно ПОСЛЕ
  // того, как пользователь её уже закрыл в текущей сессии процесса.
  const shownThisRunRef = useRef(false);

  useEffect(() => {
    let alive = true;

    // Гейт «уже проверяю или уже показал» — синхронный, а не внутри .then().
    // зачем (аудит 2026-08-26): если событие onboarding_welcome_pending_raised
    // прилетает, пока первое чтение диска (на монтировании) ещё не
    // разрешилось, старая версия пропускала ОБА вызова checkPending мимо
    // гейта (он ставился только внутри .then()) — оба читали диск, оба видели
    // pending=true и оба доходили до beginWelcomeGiftGrant. Двойное
    // начисление это не даёт (журнал операций и серверный opId сериализуют
    // сами), но лишний параллельный вызов калечит логи и грузит диск впустую.
    // Гейт ставится ДО await — второй вызов отсекается мгновенно, синхронно.
    const checkInFlightOrDoneRef = { current: false };

    // Одно чтение AsyncStorage за вызов — никакой сети и Firestore. Вызывается
    // и на монтировании, и повторно по событию onboarding_welcome_pending_raised.
    const checkPending = () => {
      if (shownThisRunRef.current || checkInFlightOrDoneRef.current) return;
      checkInFlightOrDoneRef.current = true;
      isOnboardingWelcomePending()
        .then((pending) => {
          if (!alive || shownThisRunRef.current) return;
          if (!pending) {
            // Приветствие уже показано (или не положено): дожимаем только
            // незавершённую выдачу, если она осталась с прошлого запуска.
            // Гейт снимаем — следующее событие имеет право перечитать диск
            // (например, ретро-путь ещё допишет флаг позже в этом же запуске).
            checkInFlightOrDoneRef.current = false;
            void resumeWelcomeGiftIfPending();
            return;
          }
          if (!getRemoteBool('onboarding_welcome_sheet_enabled')) {
            // Рубильник из админки: ни модалки, ни подарка; флаг снимаем, чтобы
            // приветствие не всплыло у старого юзера при будущем включении.
            checkInFlightOrDoneRef.current = false;
            void clearOnboardingWelcomePending();
            return;
          }
          // Начисление — СРАЗУ, не дожидаясь ни арбитра, ни первого кадра модалки.
          shownThisRunRef.current = true;
          void beginWelcomeGiftGrant();
          setWantShow(true);
        })
        .catch(() => {
          // Чтение упало — не блокируем будущие попытки навсегда.
          checkInFlightOrDoneRef.current = false;
        });
    };

    checkPending();
    const sub = onAppEvent('onboarding_welcome_pending_raised', checkPending);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  // зачем: флаг снимаем сразу при закрытии — приветствие одноразовое, а
  // повторный показ после перезапуска читался бы как баг. Локальное состояние
  // гасим мгновенно, запись в сторе догоняет фоном (откатывать нечего —
  // подарок уже начислен независимо от модалки).
  const handleClose = useCallback(() => {
    setWantShow(false);
    void clearOnboardingWelcomePending();
  }, []);

  if (!visible) return null;

  return <WelcomeGiftModal visible={visible} onClose={handleClose} />;
}
