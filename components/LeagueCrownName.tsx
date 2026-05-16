import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LEAGUE_CROWN_NICK_COLOR } from '../app/services/league_chest_rewards';

type Props = {
  text: string;
  fontSize: number;
  active?: boolean;
  fontWeight?: '700' | '800' | '900';
};

export default function LeagueCrownName({
  text,
  fontSize,
  active = true,
  fontWeight = '900',
}: Props) {
  if (!active) {
    return (
      <Text numberOfLines={1} style={{ fontSize, fontWeight, flexShrink: 1 }}>
        {text}
      </Text>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 }}>
      <Ionicons name="trophy" size={Math.max(13, Math.round(fontSize * 0.95))} color={LEAGUE_CROWN_NICK_COLOR} />
      <Text
        numberOfLines={1}
        style={{
          fontSize,
          color: LEAGUE_CROWN_NICK_COLOR,
          fontWeight,
          flex: 1,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

