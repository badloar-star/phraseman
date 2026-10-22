/**
 * Кнопка шторок «Друзей» 2.0 (`.sb2` макета): 52 высоты, радиус 16, значок 19 + подпись 16/700.
 *
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html): шторка друга, меню «⋯» и окно вехи серии
 * говорят одними кнопками — один компонент вместо копий в каждой шторке.
 */
import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import PressableHybrid from '../PressableHybrid';
import { FlowText } from '../text-integrity';
import type { FriendsGlass } from '../friends/FriendsGlassKit';
import { nestedBoxShadow } from '../v2/ShadowSurface';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** primary — главное действие; secondary — обычное; off — сделано / недоступно; danger — «Удалить»; bare — «Заблокировать». */
export type FriendSheetButtonTone = 'primary' | 'secondary' | 'off' | 'danger' | 'bare';

function FriendSheetButton({ glass, textScale, tone, icon, label, onPress, testID, style, pill }: Readonly<{
  glass: FriendsGlass;
  textScale: number;
  tone: FriendSheetButtonTone;
  icon?: IoniconName;
  label: string;
  onPress?: () => void;
  testID: string;
  style?: React.ComponentProps<typeof PressableHybrid>['style'];
  /** Кнопка экрана (`.c1` макета) вместо кнопки шторки: m — 52 / радиус 26, l — 54 / радиус 27 (подвал «Проверить»). */
  pill?: 'm' | 'l';
}>) {
  // зачем (макет `.sb2`): главная — заливка цветом текста и подпись цветом карточки; вторичная — контрол темы + малая тень (без обводки);
  // «опасная» — токены dangerFill/dangerInk (подпись ≥ 4,6 : 1); «Заблокировать» — без подложки, цвет ошибки, обычный вес
  const fill = tone === 'primary' ? glass.text : tone === 'danger' ? glass.dangerFill : tone === 'bare' ? 'transparent' : glass.opaqueControl;
  const ink = tone === 'primary' ? glass.opaqueCard : tone === 'danger' ? glass.dangerInk : tone === 'bare' ? glass.bad : tone === 'off' ? glass.secondary : glass.text;
  const disabled = tone === 'off' || !onPress;
  return (
    <PressableHybrid
      testID={testID}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      variant={tone === 'primary' ? 'primary' : 'secondary'}
      style={style}
      contentStyle={[styles.button, pill === 'm' && styles.pillM, pill === 'l' && styles.pillL, { backgroundColor: fill, boxShadow: tone === 'secondary' || tone === 'off' ? nestedBoxShadow(glass) : undefined }]}
    >
      {icon ? <Ionicons name={icon} size={19} color={ink} accessible={false} /> : null}
      <FlowText testID={`${testID}-label`} provenance="authored" style={{ flexShrink: 1, textAlign: 'center', color: ink, fontSize: 16 * textScale, lineHeight: 21 * textScale, fontWeight: tone === 'bare' ? '400' : '700' }}>
        {label}
      </FlowText>
    </PressableHybrid>
  );
}

export default memo(FriendSheetButton);

const styles = StyleSheet.create({
  button: { minHeight: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  pillM: { borderRadius: 26 },
  pillL: { minHeight: 54, borderRadius: 27 },
});
