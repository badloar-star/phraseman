import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { Ionicons } from '@expo/vector-icons';
import { updateMultipleTaskProgress } from '../app/daily_tasks';
import { getTodayPhrase, getTodayPhraseSync, DailyPhrase } from '../app/daily_phrase_system';
import AddToFlashcard from './AddToFlashcard';

const DAILY_PHRASE_IMAGES: Record<string, any> = {
  dark:   require('../assets/images/levels/dayly phrase forest.png'),
  neon:   require('../assets/images/levels/dayly phrase neon.png'),
  gold:   require('../assets/images/levels/dayly phrase coral.png'),
  ocean:  require('../assets/images/levels/dayly phrase ocean.png'),
  sakura: require('../assets/images/levels/dayly phrase sacura.png'),
};

interface Props {
  userLevel?: number;
}

export default function DailyPhraseCard({ userLevel: _userLevel }: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const [phrase, setPhrase] = useState<DailyPhrase>(() => getTodayPhraseSync());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    void getTodayPhrase().then(p => { if (p) setPhrase(p); }).catch(() => {});
  }, []);

  if (!phrase) {
    return <View style={[styles.container, { backgroundColor: t.bgCard }]} />;
  }

  const labelLiteral = triLang(lang, { uk: 'Дослівно', ru: 'Дословно', es: 'Traducción literal' });
  const labelMeaning = triLang(lang, { uk: 'Що означає', ru: 'Что значит', es: 'Significado' });
  // Контент идиом: для es пока подставляем RU-поля (см. idioms_data — без полей *_es).
  const phraseLiteral = lang === 'uk' ? phrase.literal_uk : phrase.literal;
  const phraseMeaning = lang === 'uk' ? phrase.meaning_uk : phrase.meaning;
  const phraseText = lang === 'uk' ? phrase.text_uk : phrase.text;

  return (
    <TouchableOpacity onPress={() => {
      const opening = !expanded;
      setExpanded(opening);
      if (opening) {
        updateMultipleTaskProgress([{ type: 'daily_phrase_read', increment: 1 }]).catch(() => {});
      }
    }} activeOpacity={0.9}>
      <View style={[styles.container, { backgroundColor: t.bgCard, borderColor: t.accent }]}>
        {/* Decorative background dots */}
        <View style={[styles.decorDot, { backgroundColor: t.accent + '15', top: -20, right: -20 }]} />
        <View style={[styles.decorDot, { backgroundColor: t.accent + '08', bottom: -15, left: -15 }]} />

        {/* Header */}
        <View style={styles.header}>
          <View style={{ alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, backgroundColor: 'transparent' }}>
            <Image source={DAILY_PHRASE_IMAGES[themeMode]} style={{ width: 36, height: 36 }} resizeMode="contain" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.title, { color: t.accent, fontSize: f.sub }]}>{triLang(lang, { uk: 'ВИСЛІВ ДНЯ', ru: 'ФРАЗА ДНЯ', es: 'FRASE DEL DÍA' })}</Text>
          </View>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={t.accent} />
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: t.accent + '20', marginVertical: 12 }} />

        {/* English phrase */}
        <Text style={[styles.englishText, { color: t.textPrimary, fontSize: f.body }]}>
          {`"${phrase.english}"`}
        </Text>

        {/* Expanded content */}
        {expanded && (
          <View style={{ marginTop: 14 }}>
            <View style={{ height: 1, backgroundColor: t.accent + '20', marginBottom: 14 }} />

            {/* Literal */}
            <View style={{ marginBottom: 10 }}>
              <Text style={[styles.label, { color: t.accent, fontSize: f.sub }]}>
                {labelLiteral}:
              </Text>
              <Text style={[styles.bodyText, { color: t.textPrimary, opacity: 0.7, fontSize: f.body }]}>
                {phraseLiteral}
              </Text>
            </View>

            {/* Meaning */}
            <View style={{ marginBottom: 14 }}>
              <Text style={[styles.label, { color: t.accent, fontSize: f.sub }]}>
                {labelMeaning}:
              </Text>
              <Text style={[styles.bodyText, { color: t.textPrimary, fontSize: f.body }]}>
                {phraseMeaning}
              </Text>
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: t.accent + '15', marginBottom: 14 }} />

            {/* Story text */}
            <Text style={[styles.storyText, { color: t.textPrimary, opacity: 0.75, fontSize: f.body }]}>
              {phraseText}
            </Text>

            {/* Save button */}
            <View style={{ marginTop: 12, alignItems: 'flex-end' }}>
              <AddToFlashcard
                en={phrase.english}
                ru={phrase.meaning}
                uk={phraseMeaning}
                source="daily_phrase"
                sourceId={phrase.date}
                size={22}
                literalRu={phrase.literal}
                literalUk={phrase.literal_uk}
                explanationRu={phrase.meaning}
                explanationUk={phrase.meaning_uk}
                exampleRu={phrase.text}
                exampleUk={phrase.text_uk}
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
