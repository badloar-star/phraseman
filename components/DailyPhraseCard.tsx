import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { Ionicons } from '@expo/vector-icons';
import { updateMultipleTaskProgress } from '../app/daily_tasks';
import { checkAchievements } from '../app/achievements';
import { dailyPhraseCopyForLang, getTodayPhrase, getTodayPhraseSync, subscribeTodayPhrase, DailyPhrase } from '../app/daily_phrase_system';
import AddToFlashcard from './AddToFlashcard';

const DAILY_PHRASE_IMAGES: Record<string, any> = {
  dark: require('../assets/images/home_menu/home-forest-daily-phrase.webp'),
  minimalDark: require('../assets/images/home_menu/home-minimal-dark-daily-phrase.webp'),
  minimalLight: require('../assets/images/home_menu/home-minimal-light-daily-phrase.webp'),
  neon: require('../assets/images/home_menu/home-neon-daily-phrase.webp'),
  gold: require('../assets/images/home_menu/home-gold-daily-phrase.webp'),
  coral: require('../assets/images/home_menu/home-coral-daily-phrase.webp'),
  ocean: require('../assets/images/home_menu/home-forest-daily-phrase.webp'),
  sakura: require('../assets/images/home_menu/home-coral-daily-phrase.webp'),
};

const DAILY_PHRASE_FALLBACK_IMAGE = DAILY_PHRASE_IMAGES.dark;

const USE_EDITORIAL_DAILY_PHRASE = true;

interface Props {
  userLevel?: number;
}

export default function DailyPhraseCard({ userLevel: _userLevel }: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const [phrase, setPhrase] = useState<DailyPhrase>(() => getTodayPhraseSync());
  const [expanded, setExpanded] = useState(false);
  const revealAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void getTodayPhrase().then(p => { if (p) setPhrase(p); }).catch(() => {});
    const unsubscribe = subscribeTodayPhrase(p => { if (p) setPhrase(p); });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!USE_EDITORIAL_DAILY_PHRASE) return;
    revealAnim.setValue(0);
    Animated.timing(revealAnim, {
      toValue: 1,
      duration: 360,
      useNativeDriver: true,
    }).start();
  }, [expanded, phrase?.date, revealAnim]);

  if (!phrase) {
    return <View style={[styles.container, { backgroundColor: t.bgCard }]} />;
  }

  const labelLiteral = triLang(lang, {
    uk: 'Дослівно',
    ru: 'Дословно',
    es: 'Traducción literal',
    'pt-BR': 'Tradução literal',
    vi: 'Dịch sát nghĩa',
    id: 'Terjemahan literal',
    tr: 'Kelime kelime çeviri',
    pl: 'Dosłownie',
  });
  const labelMeaning = triLang(lang, {
    uk: 'Що означає',
    ru: 'Что значит',
    es: 'Significado',
    'pt-BR': 'Significado',
    vi: 'Nghĩa là gì',
    id: 'Artinya',
    tr: 'Anlamı',
    pl: 'Znaczenie',
  });
  // Контент идиом: для es пока подставляем RU-поля (см. idioms_data — без полей *_es).
  const phraseLang = lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru';
  const phraseCopy = dailyPhraseCopyForLang(phrase, phraseLang);
  const phraseLiteral = phraseCopy.literal;
  const phraseMeaning = phraseCopy.meaning;
  const phraseText = phraseCopy.text;
  const dailyPhraseImage = DAILY_PHRASE_IMAGES[themeMode] ?? DAILY_PHRASE_FALLBACK_IMAGE;
  const revealStyle = {
    opacity: revealAnim,
    transform: [{ translateY: revealAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  };

  if (USE_EDITORIAL_DAILY_PHRASE) {
    return (
      <TouchableOpacity onPress={() => {
        const opening = !expanded;
        setExpanded(opening);
        if (opening) {
          updateMultipleTaskProgress([{ type: 'daily_phrase_read', increment: 1 }]).catch(() => {});
          checkAchievements({ type: 'daily_phrase', action: 'read' }).catch(() => {});
        }
      }} activeOpacity={0.9}>
        <View style={[
          styles.editorialContainer,
          {
            backgroundColor: t.bgCard,
            borderColor: t.border,
          },
        ]}>
          <View style={styles.editorialHeader}>
            <View style={[styles.editorialIconBox, { backgroundColor: t.bgSurface2 }]}>
              {dailyPhraseImage ? (
                <Image source={dailyPhraseImage} style={{ width: 52, height: 52 }} resizeMode="contain" />
              ) : (
                <Ionicons name="chatbubble-ellipses" size={24} color={t.textMuted} />
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.editorialKicker, { color: t.textMuted, fontSize: f.caption }]}>
                {triLang(lang, {
                  uk: 'Вислів дня',
                  ru: 'Фраза дня',
                  es: 'Frase del día',
                  'pt-BR': 'Frase do dia',
                  vi: 'Cụm từ hôm nay',
                  id: 'Frasa hari ini',
                  tr: 'Günün ifadesi',
                  pl: 'Fraza dnia',
                })}
              </Text>
            </View>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={19} color={t.textMuted} />
          </View>

          <Animated.View style={[styles.editorialPhraseWrap, revealStyle]}>
            <Text style={[styles.editorialPhrase, { color: t.textPrimary, fontSize: f.bodyLg || f.body }]}>
              {phrase.english}
            </Text>
          </Animated.View>

          {expanded && (
            <Animated.View style={[styles.editorialExpanded, revealStyle]}>
              <View style={[styles.editorialDivider, { backgroundColor: t.border }]} />

              <View style={styles.editorialSection}>
                <Text style={[styles.editorialLabel, { color: t.textMuted, fontSize: f.caption }]}>
                  {labelLiteral}
                </Text>
                <Text style={[styles.editorialBody, { color: t.textPrimary, fontSize: f.body }]}>
                  {phraseLiteral}
                </Text>
              </View>

              <View style={styles.editorialSection}>
                <Text style={[styles.editorialLabel, { color: t.textMuted, fontSize: f.caption }]}>
                  {labelMeaning}
                </Text>
                <Text style={[styles.editorialBody, { color: t.textPrimary, fontSize: f.body }]}>
                  {phraseMeaning}
                </Text>
              </View>

              <View style={[styles.editorialDivider, { backgroundColor: t.border, marginTop: 2 }]} />
              <Text style={[styles.editorialStory, { color: t.textSecond, fontSize: f.body }]}>
                {phraseText}
              </Text>

              {phrase.allowSave !== false && (
              <View style={{ marginTop: 14, alignItems: 'flex-end' }}>
                <AddToFlashcard
                  en={phrase.english}
                  ru={phrase.meaning}
                  uk={phrase.meaning_uk}
                  es={phrase.meaning_es}
                  source="daily_phrase"
                  sourceId={phrase.id || phrase.date}
                  size={22}
                  literalRu={phrase.literal}
                  literalUk={phrase.literal_uk}
                  literalEs={phrase.literal_es}
                  explanationRu={phrase.meaning}
                  explanationUk={phrase.meaning_uk}
                  explanationEs={phrase.meaning_es}
                  exampleRu={phrase.text}
                  exampleUk={phrase.text_uk}
                  exampleEs={phrase.text_es}
                />
              </View>
              )}
            </Animated.View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={() => {
      const opening = !expanded;
      setExpanded(opening);
      if (opening) {
        updateMultipleTaskProgress([{ type: 'daily_phrase_read', increment: 1 }]).catch(() => {});
        checkAchievements({ type: 'daily_phrase', action: 'read' }).catch(() => {});
      }
    }} activeOpacity={0.9}>
      <View style={[styles.container, { backgroundColor: t.bgCard, borderColor: t.accent }]}>
        {/* Decorative background dots */}
        <View style={[styles.decorDot, { backgroundColor: t.accent + '15', top: -20, right: -20 }]} />
        <View style={[styles.decorDot, { backgroundColor: t.accent + '08', bottom: -15, left: -15 }]} />

        {/* Header */}
        <View style={styles.header}>
          <View style={{ alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 14, backgroundColor: 'transparent' }}>
            {dailyPhraseImage ? (
              <Image source={dailyPhraseImage} style={{ width: 52, height: 52 }} resizeMode="contain" />
            ) : (
              <Ionicons name="chatbubble-ellipses" size={24} color={t.accent} />
            )}
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.title, { color: t.accent, fontSize: f.sub }]}>{triLang(lang, {
              uk: 'ВИСЛІВ ДНЯ',
              ru: 'ФРАЗА ДНЯ',
              es: 'FRASE DEL DÍA',
              'pt-BR': 'FRASE DO DIA',
              vi: 'CỤM TỪ HÔM NAY',
              id: 'FRASA HARI INI',
              tr: 'GÜNÜN İFADESİ',
              pl: 'FRAZA DNIA',
            })}</Text>
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
            {phrase.allowSave !== false && (
            <View style={{ marginTop: 12, alignItems: 'flex-end' }}>
              <AddToFlashcard
                en={phrase.english}
                ru={phrase.meaning}
                uk={phrase.meaning_uk}
                es={phrase.meaning_es}
                source="daily_phrase"
                sourceId={phrase.id || phrase.date}
                size={22}
                literalRu={phrase.literal}
                literalUk={phrase.literal_uk}
                literalEs={phrase.literal_es}
                explanationRu={phrase.meaning}
                explanationUk={phrase.meaning_uk}
                explanationEs={phrase.meaning_es}
                exampleRu={phrase.text}
                exampleUk={phrase.text_uk}
                exampleEs={phrase.text_es}
              />
            </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  editorialContainer: {
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  editorialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editorialIconBox: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorialKicker: {
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  editorialPhraseWrap: {
    paddingTop: 16,
  },
  editorialPhrase: {
    fontWeight: '800',
    lineHeight: 27,
  },
  editorialExpanded: {
    marginTop: 14,
  },
  editorialDivider: {
    height: 1,
    opacity: 0.7,
    marginBottom: 14,
  },
  editorialSection: {
    marginBottom: 13,
  },
  editorialLabel: {
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  editorialBody: {
    fontWeight: '500',
    lineHeight: 22,
  },
  editorialStory: {
    fontWeight: '400',
    lineHeight: 22,
    marginTop: 13,
  },
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
