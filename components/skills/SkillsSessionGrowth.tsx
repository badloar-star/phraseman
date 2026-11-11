/**
 * «Навыки растут» для экрана итога: сам берёт у хранилища итоги «до занятия» и показывает прирост по факту.
 *
 * зачем: экран итога не размечает начало занятия и ничего не знает о навыках — достаточно поставить эту деталь.
 * Снимок «до» забирается один раз при появлении итога; итоги «после» читаются из памяти и обновляются,
 * если последнее начисление долетело чуть позже первого кадра.
 */
import React, { memo, useState, useSyncExternalStore } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { peekSkills, subscribeSkills, takeSkillSessionBase } from '../../modules/skills/skill_store';
import SkillsGrowthPanel from './SkillsGrowthPanel';

type Props = Readonly<{ style?: StyleProp<ViewStyle>; testID?: string }>;

function SkillsSessionGrowth({ style, testID }: Props) {
  const [before] = useState(() => takeSkillSessionBase());
  const state = useSyncExternalStore(subscribeSkills, peekSkills, peekSkills);
  if (!before || !state) return null;
  return (
    <View style={style}>
      <SkillsGrowthPanel before={before} after={state.totals} testID={testID} />
    </View>
  );
}

export default memo(SkillsSessionGrowth);
