import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { Ionicons } from '@expo/vector-icons';

const DAILY_PHRASE_IMAGES: Record<string, any> = {
  dark: require('../assets/images/levels/dayly phrase forest.png'),
  neon: require('../assets/images/levels/dayly phrase neon.png'),
  gold: require('../assets/images/levels/dayly phrase coral.png'),
};
import { getTodayPhrase, DailyPhrase } from '../app/daily_phrase_system';
import AddToFlashcard from './AddToFlashcard';

interface Props {
  userLevel?: number;
}

export default function DailyPhraseCard({ userLevel }: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { s, lang } = useLang();
  const [phrase, setPhrase] = useState<DailyPhrase | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    (async () => {
      const phraseOfDay = await getTodayPhrase();
      setPhrase(phraseOfDay);
      setLoading(false);
    })();
  }, []);

  if (loading || !phrase) {
    return (
      <View style={[styles.container, { backgroundColor: t.cardBg }]}>
        <ActivityIndicator color={t.textPrimary} />
      </View>
    );
  }

  const labelLiteral = lang === 'uk' ? 'Дослівно' : 'Дословно';
  const labelMeaning = lang === 'uk' ? 'Що означає' : 'Что значит';

  return (
    <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.9}>
      <View style={[styles.container, { backgroundColor: t.accentLight, borderColor: t.accent }]}>
        {/* Decorative background dots */}
        <View style={[styles.decorDot, { backgroundColor: t.accent + '15', top: -20, right: -20 }]} />
        <View style={[styles.decorDot, { backgroundColor: t.accent + '08', bottom: -15, left: -15 }]} />

        {/* Header */}
        <View style={styles.header}>
          <View style={{ alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, backgroundColor: 'transparent' }}>
            <Image source={DAILY_PHRASE_IMAGES[themeMode]} style={{ width: 36, height: 36 }} resizeMode="contain" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.title, { color: t.accent, fontSize: f.sm }]}>ФРАЗА ДНЯ</Text>
          </View>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={t.accent} />
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: t.accent + '20', marginVertical: 12 }} />

        {/* English phrase */}
        <Text style={[styles.englishText, { color: t.textPrimary, fontSize: f.md }]}>
          "{phrase.english}"
        </Text>

        {/* Expanded content */}
        {expanded && (
          <View style={{ marginTop: 14 }}>
            <View style={{ height: 1, backgroundColor: t.accent + '20', marginBottom: 14 }} />

            {/* Literal */}
            <View style={{ marginBottom: 10 }}>
              <Text style={[styles.label, { color: t.accent, fontSize: f.sm }]}>
                {labelLiteral}:
              </Text>
              <Text style={[styles.bodyText, { color: t.textPrimary, opacity: 0.7, fontSize: f.body }]}>
                {phrase.literal}
              </Text>
            </View>

            {/* Meaning */}
            <View style={{ marginBottom: 14 }}>
              <Text style={[styles.label, { color: t.accent, fontSize: f.sm }]}>
                {labelMeaning}:
              </Text>
              <Text style={[styles.bodyText, { color: t.textPrimary, fontSize: f.body }]}>
                {phrase.meaning}
              </Text>
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: t.accent + '15', marginBottom: 14 }} />

            {/* Story text */}
            <Text style={[styles.storyText, { color: t.textPrimary, opacity: 0.75, fontSize: f.body }]}>
              {phrase.text}
            </Text>

            {/* Save button */}
            <View style={{ marginTop: 12, alignItems: 'flex-end' }}>
              <AddToFlashcard
                en={phrase.english}
                ru={phrase.meaning}
                uk={phrase.meaning}
                source="daily_phrase"
                sourceId={phrase.date}
                size={22}
              />
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  decorDot: {
    position: 'absolute',
    borderRadius: 50,
    width: 80,
    height: 80,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontWeight: '700',
    letterSpacing: 1,
    flex: 1,
  },
  englishText: {
    fontWeight: '600',
    lineHeight: 22,
    marginTop: 8,
  },
  label: {
    fontWeight: '700',
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  bodyText: {
    fontWeight: '500',
    lineHeight: 21,
  },
  storyText: {
    fontWeight: '400',
    lineHeight: 22,
    fontStyle: 'italic',
  },
});
