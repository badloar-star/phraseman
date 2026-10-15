// ═══════════════════════════════════════════════════════════════════════════
// SpireLockedState.tsx — «Шпиль откроется чуть позже» (второй замок, пакет A).
//
// зачем: пока config/spire_v1.enabled выключен, экран не показывает ничего живого и
// не зовёт сервер. Состояние из брифа (spire_migration_paused): одна честная фраза.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Lang } from '../../constants/i18n';
import { V2, V2_TYPE } from '../../constants/v2Style';
import { useSpirePalette } from './useSpirePalette';
import { spireText } from './spire_strings';
import { offlineBannerText } from '../OfflineBanner';

// зачем (решение координатора 15.10, бета-тест А4): конфиг не прочитался из-за сети — «откроется чуть позже» было неверной причиной; `offline` показывает уже переведённое «Нет интернета» (строка баннера, новых строк нет)
function SpireLockedState({ lang, offline = false }: Readonly<{ lang: Lang; offline?: boolean }>) {
  const p = useSpirePalette();
  const text = offline ? offlineBannerText(lang) : spireText(lang, 'lockedTitle');
  return (
    <View style={s.root} testID={offline ? 'spire-offline-locked' : 'spire-locked'} accessible accessibilityRole="text" accessibilityLabel={text}>
      <Text style={[s.title, { color: p.text }]}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  // зачем (реестр spire-gap-011, разбор размеров 13.10): у макета `.in` с нижним отступом 60 — блок по центру на 49,5 % высоты; без него центр был на 52,7 % (≈29 dp ниже)
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: V2.screenPad * 2, paddingBottom: 60 },
  // зачем (Сверка spire-gap-011, spire-gaps-states.html `.sg-lock`): 24/30, начертание 800, межбуквенный −0,3
  title: { ...V2_TYPE.title, fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center' },
});

export default memo(SpireLockedState);
