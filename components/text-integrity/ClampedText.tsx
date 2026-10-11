/**
 * ClampedText — «до N строк + многоточие в конце, БЕЗ ужатия шрифта». Единственное разрешённое место обрезки
 * строк наборов.
 *
 * зачем (журнал владельца п.9, OWNER_REQUESTS_LEDGER: «название до 2 строк, многоточие только если не влезает»;
 * решение координатора 11.10 по сторожу text-integrity/no-unsafe-text-truncation): строки наборов — одной
 * фиксированной высоты. Это осознанная семантическая обрезка: шрифт не ужимается (свойства ужатия запрещены
 * типом), масштаб системного шрифта не выключается (его выключатель тоже запрещён типом), многоточие — в конце.
 * Обрезка живёт ЗДЕСЬ одним явным исключением сторожа: файл стоит в списке разрешённых примитивов правила
 * text-integrity/no-unsafe-text-truncation и сканера (scripts/text-integrity/inventory-core.cjs,
 * SEMANTIC_TRUNCATION_PRIMITIVES) с причиной, а не размазана по экранам.
 *
 * Импорт — только прямым путём и только из components/packs/PackRow.tsx: новый потребитель — по решению владельца
 * или координатора (трещотка tests/pack_row_shared_contract.test.ts). Из components/text-integrity/index.ts
 * примитив намеренно НЕ экспортируется.
 */
import React, { forwardRef } from 'react';
import { Text, type TextProps } from 'react-native';
import type { FlowTextProps } from './FlowText';

// зачем: тот же список «опасных» свойств, что запрещает FlowText (обрезка, ужатие шрифта, выключение масштаба), —
// выводим его из FlowTextProps, а не дублируем: список правится в одном месте.
type UnsafeNativeTextProp = Exclude<keyof TextProps, keyof FlowTextProps>;

export type ClampedTextProps = Omit<TextProps, UnsafeNativeTextProp> & {
  /** Максимум строк (1–3). Многоточие — только если текст не влез (по умолчанию — в конце строки). */
  maxLines: 1 | 2 | 3;
};

export const ClampedText = forwardRef<Text, ClampedTextProps>(function ClampedText({ maxLines, children, ...textProps }, ref) {
  return (
    <Text {...textProps} numberOfLines={maxLines} ref={ref}>
      {children}
    </Text>
  );
});

export default ClampedText;
