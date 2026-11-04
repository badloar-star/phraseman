// PeakScreenSlot — тонкая обёртка: экран Пика B подгружается ТОЛЬКО когда флаг включён и слот отрисован.
// зачем (Ревизор 04.11): статический import тянул PeakScreenV2 и тур в начальную загрузку Пика при выключенном флаге. Теперь require стоит внутри рендера —
// модуль не выполняется, пока флаг выключен; заодно ветка вынесена из SpireHomeScreen (лимит 400 строк).
import React from 'react';

type SlotProps = React.ComponentProps<typeof import('./PeakScreenV2').default>;

export default function PeakScreenSlot(props: SlotProps): React.JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: PeakScreenV2 } = require('./PeakScreenV2') as typeof import('./PeakScreenV2');
  return <PeakScreenV2 {...props} />;
}
