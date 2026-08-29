import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { triLang, type Lang } from '../../constants/i18n';
import { MAX_PRESTART_MISSION_HYBRID } from '../../constants/motionHybrid';
import { glassFill } from '../GlassSurface';
import { useTheme } from '../ThemeContext';

type Props = {
  mission: string;
  lang: Lang;
  reduceMotion: boolean;
};

export default function MaxLessonMissionPlaque({ mission, lang, reduceMotion }: Props) {
  const { theme: t, f } = useTheme();
  const cleanMission = useMemo(() => mission.trim().replace(/\s+/gu, ' '), [mission]);
  const [visibleCharacters, setVisibleCharacters] = useState(
    reduceMotion ? cleanMission.length : 0,
  );
  const label = triLang(lang, {
    ru: 'Сегодня с MAX',
    uk: 'Сьогодні з MAX',
    en: 'Today with MAX',
    es: 'Hoy con MAX',
    'pt-BR': 'Hoje com o MAX',
    vi: 'Hôm nay cùng MAX',
    id: 'Hari ini bersama MAX',
    tr: 'Bugün MAX ile',
    pl: 'Dziś z MAX',
  });

  useEffect(() => {
    setVisibleCharacters(reduceMotion ? cleanMission.length : 0);
    if (reduceMotion || cleanMission.length === 0) return undefined;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let nextCount = 1;
    const revealNext = () => {
      timer = setTimeout(() => {
        setVisibleCharacters(nextCount);
        nextCount += 1;
        if (nextCount <= cleanMission.length) revealNext();
      }, MAX_PRESTART_MISSION_HYBRID.characterMs);
    };
    revealNext();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [cleanMission, reduceMotion]);

  const textStyle = {
    color: t.textPrimary,
    fontSize: f.body,
    fontWeight: '700' as const,
    lineHeight: Math.round(f.body * 1.45),
  };

  return (
    <View
      testID="max-lesson-mission-plaque"
      accessible
      accessibilityLabel={`${label}. ${cleanMission}`}
      style={{
        minHeight: MAX_PRESTART_MISSION_HYBRID.cardMinHeight,
        borderRadius: 20,
        padding: 17,
        flexDirection: 'row',
        gap: 13,
        backgroundColor: glassFill(t.bgSurface, 0.72),
      }}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: MAX_PRESTART_MISSION_HYBRID.badgeSize,
          height: MAX_PRESTART_MISSION_HYBRID.badgeSize,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.accent,
        }}
      >
        <Text style={{ color: t.correctText, fontWeight: '700' }}>M</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          accessible={false}
          style={{ color: t.accent, fontSize: f.label, fontWeight: '700', marginBottom: 8 }}
          maxFontSizeMultiplier={2}
        >
          {label}
        </Text>
        <View style={{ position: 'relative' }}>
          <Text
            testID="max-lesson-mission-layout-text"
            accessible={false}
            style={[textStyle, { opacity: 0 }]}
            maxFontSizeMultiplier={2}
          >
            {cleanMission}
          </Text>
          <Text
            testID="max-lesson-mission-visible-text"
            accessible={false}
            style={[
              textStyle,
              { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
            ]}
            maxFontSizeMultiplier={2}
          >
            {cleanMission.slice(0, visibleCharacters)}
            <Text
              accessible={false}
              style={{ color: t.accent, fontWeight: '700' }}
            >
              |
            </Text>
          </Text>
        </View>
      </View>
    </View>
  );
}
