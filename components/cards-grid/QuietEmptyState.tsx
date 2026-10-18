import React, { memo, useEffect, useRef } from 'react';

import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import type { Lang } from '../../constants/i18n';
import { logNoErrorScreen } from '../../app/no_error_screen_log';
import { KitEmpty } from './CardsKit';
import { quietEmptyDetail, quietEmptyTitle } from './quiet_empty_copy';

const NOOP = () => undefined;

/**
 * Спокойное пустое состояние вместо экрана-ошибки (правило владельца 01.10 и 18.10: «экранов-ошибок нигде»).
 * зачем (координатор 18.10 08:00): тот же блок «Пусто» (KitEmpty), но значок не «облако с чертой», слов «ошибка/недоступно/не удалось» нет, кнопки нет — повтор идёт сам (ворота useLoadGate
 * ставят паузы 1/3/8 с и повторяют при возврате в приложение). `screen` и `reason` уходят в журнал [NO-ERROR-SCREEN]: что раньше было бы экраном ошибки и почему.
 */
export const QuietEmptyState = memo(function QuietEmptyState({ g, lang, screen, reason, testID, inline, title, detail }: Readonly<{
  g: GlassTokens;
  lang: Lang;
  /** Имя экрана для журнала, например 'flashcards_my_packs'. */
  screen: string;
  /** Значение, которое раньше давало экран ошибки, например 'load_exhausted'. */
  reason: string;
  testID?: string;
  inline?: boolean;
  /** Свой заголовок, если у места есть собственный существующий «пустой» текст. */
  title?: string;
  detail?: string;
}>) {
  useEffect(() => {
    logNoErrorScreen(screen, reason, 'quiet_empty');
  }, [screen, reason]);
  return (
    <KitEmpty
      g={g}
      testID={testID}
      icon="albums-outline"
      title={title ?? quietEmptyTitle(lang)}
      detail={detail ?? quietEmptyDetail(lang)}
      action=""
      hideAction
      onAction={NOOP}
      inline={inline}
    />
  );
});

/**
 * «Объекта нет» (не найден / закрыт / неверная ссылка) — правило владельца: тихо уйти назад, без экрана ошибки.
 * зачем (координатор 18.10 08:00): уход один раз за показ, не во время рендера (setTimeout 0), причина — в журнал [NO-ERROR-SCREEN] (shown: quiet_back).
 */
export function QuietLeave({ screen, reason, onLeave }: Readonly<{ screen: string; reason: string; onLeave: () => void }>): null {
  const leaveRef = useRef(onLeave);
  leaveRef.current = onLeave;
  useEffect(() => {
    logNoErrorScreen(screen, reason, 'quiet_back');
    const timer = setTimeout(() => leaveRef.current(), 0);
    return () => clearTimeout(timer);
  }, [screen, reason]);
  return null;
}

export default QuietEmptyState;
