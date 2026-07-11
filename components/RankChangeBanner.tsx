import React, { memo, useEffect, useRef } from 'react';
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

function RankChangeBanner({
  delta,
  passedName,
  lostToName,
  lang,
  duration = 5000,
  onClose,
}: Props) {
  const { f } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const animationKey = `${delta}:${passedName?.trim() ?? ''}:${lostToName?.trim() ?? ''}`;

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
      if (finished && duration > 0) onCloseRef.current();
    });
    return () => a.stop();
  }, [anim, duration, animationKey]);

  const isUp = delta > 0;
  const absN = Math.abs(delta);
  const positions = triLang(lang, {
    ru: absN === 1 ? 'позицию' : 'позиций',
    uk: absN === 1 ? 'позицію' : 'позиції',
    es: absN === 1 ? 'puesto' : 'puestos',
    'pt-BR': absN === 1 ? 'posição' : 'posições',
    vi: 'hạng',
    id: 'posisi',
    tr: 'sıra',
    pl: absN === 1 ? 'pozycję' : 'pozycji',
  });
  const upDir = triLang(lang, {
    ru: 'вверх',
    uk: 'вгору',
    es: 'arriba',
    'pt-BR': 'para cima',
    vi: 'lên',
    id: 'naik',
    tr: 'yukarı',
    pl: 'w górę',
  });
  const downDir = triLang(lang, {
    ru: 'вниз',
    uk: 'вниз',
    es: 'abajo',
    'pt-BR': 'para baixo',
    vi: 'xuống',
    id: 'turun',
    tr: 'aşağı',
    pl: 'w dół',
  });

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
        'pt-BR': `Você passou ${passedName.trim()}`,
        vi: `Bạn đã vượt qua ${passedName.trim()}`,
        id: `Kamu melewati ${passedName.trim()}`,
        tr: `${passedName.trim()} kişisini geçtin`,
        pl: `Wyprzedzasz ${passedName.trim()}`,
      });
    } else {
      subtitle = triLang(lang, {
        ru: 'Ты молодец — стал выше в списке!',
        uk: 'Молодець — став вище у списку!',
        es: '¡Muy bien: has subido en la lista!',
        'pt-BR': 'Muito bem: você subiu na lista!',
        vi: 'Tốt lắm: bạn đã lên hạng trong danh sách!',
        id: 'Bagus: kamu naik di daftar!',
        tr: 'Harika: listede yükseldin!',
        pl: 'Brawo: jesteś wyżej na liście!',
      });
    }
  } else {
    if (lostToName && lostToName.trim()) {
      subtitle = triLang(lang, {
        ru: `Уступил ${lostToName.trim()}. Не сдавайся!`,
        uk: `Поступився ${lostToName.trim()}. Не здавайся!`,
        es: `${lostToName.trim()} te adelantó. ¡No te rindas!`,
        'pt-BR': `${lostToName.trim()} passou você. Não desista!`,
        vi: `${lostToName.trim()} đã vượt qua bạn. Đừng bỏ cuộc!`,
        id: `${lostToName.trim()} melewatimu. Jangan menyerah!`,
        tr: `${lostToName.trim()} seni geçti. Pes etme!`,
        pl: `${lostToName.trim()} Cię wyprzedza. Nie poddawaj się!`,
      });
    } else {
      subtitle = triLang(lang, {
        ru: 'Ничего страшного — соберись и наверстаешь.',
        uk: 'Нічого страшного — зберись та наздоженеш.',
        es: 'No pasa nada — puedes recuperarlo.',
        'pt-BR': 'Tudo bem — você pode recuperar.',
        vi: 'Không sao — bạn có thể lấy lại.',
        id: 'Tidak apa-apa — kamu bisa mengejarnya.',
        tr: 'Sorun değil — toparlayıp geri alabilirsin.',
        pl: 'Nic się nie stało — możesz to odrobić.',
      });
    }
  }

  const bg = isUp ? '#10381e' : '#3a2a14';
  const border = isUp ? '#34d399' : '#f59e0b';
  const titleColor = isUp ? '#34d399' : '#fbbf24';
  const bodyColor = isUp ? '#D8FBE8' : '#FFE9B5';
  const closeColor = 'rgba(255,255,255,0.68)';

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
          Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onCloseRef.current());
        }}
        style={{
          backgroundColor: bg,
          borderColor: border,
          borderWidth: 0,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Text style={{ color: titleColor, fontSize: f.bodyLg, fontWeight: '800', flexShrink: 1 }}>
            {title}
          </Text>
          <Text style={{ color: closeColor, fontSize: f.caption }}>×</Text>
        </View>
        <Text style={{ color: bodyColor, fontSize: f.sub, marginTop: 4, fontWeight: '600' }}>
          {subtitle}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default memo(RankChangeBanner);
