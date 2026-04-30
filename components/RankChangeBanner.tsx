import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { triLang, type Lang } from '../constants/i18n';
import { useTheme } from './ThemeContext';

interface Props {
  /** prev_rank - new_rank. >0 = поднялся, <0 = опустился. */
  delta: number;
  passedName?: string | null;
  lostToName?: string | null;
  lang: Lang;
  /** auto-dismiss через ms (default 5000). 0 — не скрывать сам. */
  duration?: number;
  onClose: () => void;
}

export default function RankChangeBanner({
  delta,
  passedName,
  lostToName,
  lang,
  duration = 5000,
  onClose,
}: Props) {
  const { theme: t, f } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    const seq: Animated.CompositeAnimation[] = [
      Animated.timing(anim, { toValue: 1, duration: 280, useNativeDriver: true }),
    ];
    if (duration > 0) {
      seq.push(Animated.delay(duration));
      seq.push(Animated.timing(anim, { toValue: 0, duration: 240, useNativeDriver: true }));
    }
    const a = Animated.sequence(seq);
    a.start(({ finished }) => {
      if (finished && duration > 0) onClose();
    });
    return () => a.stop();
  }, [anim, duration, onClose]);

  const isUp = delta > 0;
  const absN = Math.abs(delta);
  const positions = triLang(lang, {
    ru: absN === 1 ? 'позицию' : 'позиций',
    uk: absN === 1 ? 'позицію' : 'позиції',
    es: absN === 1 ? 'puesto' : 'puestos',
  });
  const upDir = triLang(lang, { ru: 'вверх', uk: 'вгору', es: 'arriba' });
  const downDir = triLang(lang, { ru: 'вниз', uk: 'вниз', es: 'abajo' });

  let title: string;
  if (isUp) {
    title = `🚀 +${absN} ${positions} ${upDir}`;
  } else {
    title = `📉 −${absN} ${positions} ${downDir}`;
  }

  let subtitle: string;
  if (isUp) {
    if (passedName && passedName.trim()) {
      subtitle = triLang(lang, {
        ru: `Обогнал ${passedName.trim()}`,
        uk: `Обігнав ${passedName.trim()}`,
        es: `Has adelantado a ${passedName.trim()}`,
      });
    } else {
      subtitle = triLang(lang, {
        ru: 'Ты молодец — стал выше в списке!',
        uk: 'Молодець — став вище у списку!',
        es: '¡Muy bien: has subido en la lista!',
      });
    }
  } else {
    if (lostToName && lostToName.trim()) {
      subtitle = triLang(lang, {
        ru: `Уступил ${lostToName.trim()}. Не сдавайся!`,
        uk: `Поступився ${lostToName.trim()}. Не здавайся!`,
        es: `${lostToName.trim()} te adelantó. ¡No te rindas!`,
      });
    } else {
      subtitle = triLang(lang, {
        ru: 'Ничего страшного — соберись и наверстаешь.',
        uk: 'Нічого страшного — зберись та наздоженеш.',
        es: 'No pasa nada — puedes recuperarlo.',
      });
    }
  }

  const bg = isUp ? '#10381e' : '#3a2a14';
  const border = isUp ? '#34d399' : '#f59e0b';
  const titleColor = isUp ? '#34d399' : '#fbbf24';

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
        marginBottom: 12,
      }}
    >
      <Pressable
        onPress={() => {
          Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onClose());
        }}
        style={{
          backgroundColor: bg,
          borderColor: border,
          borderWidth: 1,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Text style={{ color: titleColor, fontSize: f.bodyLg, fontWeight: '800', flexShrink: 1 }}>
            {title}
          </Text>
          <Text style={{ color: t.textGhost, fontSize: f.caption }}>×</Text>
        </View>
        <Text style={{ color: t.textPrimary, fontSize: f.sub, marginTop: 4, fontWeight: '500' }}>
          {subtitle}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
