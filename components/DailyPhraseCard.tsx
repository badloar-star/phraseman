import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { Ionicons } from '@expo/vector-icons';
import { getTodayPhrase, DailyPhrase } from '../app/daily_phrase_system';
import AddToFlashcard from './AddToFlashcard';

interface Props {
  userLevel?: number;
}

export default function DailyPhraseCard({ userLevel }: Props) {
  const { theme: t, f } = useTheme();
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

  const handleToggleExpand = () => {
    setExpanded(!expanded);
  };

  if (loading || !phrase) {
    return (
      <View style={[styles.container, { backgroundColor: t.cardBg }]}>
        <ActivityIndicator color={t.textPrimary} />
      </View>
    );
  }

  return (
    <TouchableOpacity onPress={handleToggleExpand} activeOpacity={0.9}>
      <View style={[styles.container, { backgroundColor: t.accentLight, borderColor: t.accent }]}>
        {/* Decorative background dots */}
        <View style={[styles.decorDot, { backgroundColor: t.accent + '15', top: -20, right: -20 }]} />
        <View style={[styles.decorDot, { backgroundColor: t.accent + '08', bottom: -15, left: -15 }]} />

        {/* Header with icon */}
        <View style={styles.header}>
          <View style={{ alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, backgroundColor: t.accent + '20' }}>
            <Ionicons name="sparkles" size={20} color={t.accent} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.title, { color: t.accent, fontSize: f.sm }]}>
              {lang === 'uk' ? 'ФРАЗА ДНЯ' : 'ФРАЗА ДНЯ'}
            </Text>
          </View>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={t.accent} />
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: t.accent + '20', marginVertical: 12 }} />

        {/* English text */}
        <Text style={[styles.englishText, { color: t.textPrimary, fontSize: f.md }]}>
          "{phrase.english}"
        </Text>

        {/* Expanded content */}
        {expanded && (
          <View style={{ marginTop: 12 }}>
            <View style={{ height: 1, backgroundColor: t.accent + '20', marginBottom: 12 }} />

            {/* Russian translation */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <Text style={[styles.translationText, { color: t.textPrimary, fontSize: f.body, flex: 1 }]}>
                {phrase.russian}
              </Text>

              {/* Save to flashcards button */}
              <AddToFlashcard
                en={phrase.english}
                ru={phrase.russian}
                uk={phrase.russian}
                source="daily_phrase"
                sourceId={phrase.date}
                size={20}
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
    fontWeight: '600',
    marginBottom: 4,
  },
  translationText: {
    fontWeight: '500',
    lineHeight: 22,
  },
});
