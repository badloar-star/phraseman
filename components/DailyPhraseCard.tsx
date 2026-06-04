import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { triLang } from '../constants/i18n';
import { checkAchievements } from '../app/achievements';
import { updateMultipleTaskProgress } from '../app/daily_tasks';
import {
  dailyPhraseCopyForLang,
  getTodayPhraseForTarget,
  getTodayPhraseSyncForTarget,
  subscribeTodayPhraseForTarget,
  DailyPhrase,
  type DailyPhraseInterfaceLang,
} from '../app/daily_phrase_system';
import AddToFlashcard from './AddToFlashcard';
import { useLang } from './LangContext';
import { useStudyTarget } from './StudyTargetContext';
import { useTheme } from './ThemeContext';

const DAILY_PHRASE_IMAGES: Record<string, any> = {
  dark: require('../assets/images/home_menu/home-forest-daily-phrase.webp'),
  minimalDark: require('../assets/images/home_menu/home-minimal-dark-daily-phrase.webp'),
  compass: require('../assets/images/home_menu/compass-premium/home-compass-premium-daily-phrase.webp'),
  minimalLight: require('../assets/images/home_menu/home-minimal-light-daily-phrase.webp'),
  neon: require('../assets/images/home_menu/home-neon-daily-phrase.webp'),
  gold: require('../assets/images/home_menu/home-gold-daily-phrase.webp'),
  coral: require('../assets/images/home_menu/home-coral-daily-phrase.webp'),
  ocean: require('../assets/images/home_menu/home-forest-daily-phrase.webp'),
  sakura: require('../assets/images/home_menu/home-coral-daily-phrase.webp'),
};

const DAILY_PHRASE_FALLBACK_IMAGE = DAILY_PHRASE_IMAGES.dark;

interface Props {
  userLevel?: number;
  variant?: 'default' | 'homeAdditional';
}

export default function DailyPhraseCard({ userLevel: _userLevel, variant = 'default' }: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const [phrase, setPhrase] = useState<DailyPhrase | null>(() => (
    getTodayPhraseSyncForTarget(studyTarget)
  ));
  const [detailsVisible, setDetailsVisible] = useState(false);

  useEffect(() => {
    if (studyTarget === 'fr') {
      setPhrase(null);
      setDetailsVisible(false);
      return;
    }
    setPhrase(getTodayPhraseSyncForTarget(studyTarget));
    void getTodayPhraseForTarget(studyTarget).then(p => { if (p) setPhrase(p); }).catch(() => {});
    const unsubscribe = subscribeTodayPhraseForTarget(p => { if (p) setPhrase(p); }, studyTarget);
    return unsubscribe;
  }, [studyTarget]);

  if (studyTarget === 'fr') {
    return null;
  }

  if (!phrase) {
    return <View style={[styles.placeholder, { backgroundColor: t.bgCard }]} />;
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
  const title = triLang(lang, {
    uk: 'Вислів дня',
    ru: 'Фраза дня',
    es: 'Frase del día',
    'pt-BR': 'Frase do dia',
    vi: 'Cụm từ hôm nay',
    id: 'Frasa hari ini',
    tr: 'Günün ifadesi',
    pl: 'Fraza dnia',
  });
  const phraseLang: DailyPhraseInterfaceLang = lang;
  const phraseCopy = dailyPhraseCopyForLang(phrase, phraseLang);
  const flashcardSourceLocales = {
    'pt-BR': phrase.sourceLocales?.['pt-BR']?.meaning,
    vi: phrase.sourceLocales?.vi?.meaning,
    id: phrase.sourceLocales?.id?.meaning,
    tr: phrase.sourceLocales?.tr?.meaning,
    pl: phrase.sourceLocales?.pl?.meaning,
  };
  const dailyPhraseImage = DAILY_PHRASE_IMAGES[themeMode] ?? DAILY_PHRASE_FALLBACK_IMAGE;
  const homeAdditional = variant === 'homeAdditional';
  const homeAdditionalMeaning = phraseCopy.meaning || phrase.meaning;

  const openDetails = () => {
    setDetailsVisible(true);
    updateMultipleTaskProgress([{ type: 'daily_phrase_read', increment: 1 }], { studyTarget }).catch(() => {});
    checkAchievements({ type: 'daily_phrase', action: 'read', studyTarget }).catch(() => {});
  };

  const closeDetails = () => setDetailsVisible(false);

  return (
    <>
      <Pressable
        onPress={openDetails}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={({ pressed }) => [
          homeAdditional ? styles.homeAdditionalPlaque : styles.plaque,
          {
            backgroundColor: t.bgCard,
            borderColor: t.border,
            shadowColor: t.accent,
          },
          pressed && styles.pressed,
        ]}
      >
        {!homeAdditional && (
          <View style={[styles.plaqueIcon, { backgroundColor: t.bgSurface2 }]}>
            {dailyPhraseImage ? (
              <Image source={dailyPhraseImage} style={styles.iconImage} resizeMode="contain" />
            ) : (
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={t.textMuted} />
            )}
          </View>
        )}
        <View style={styles.plaqueCopy}>
          <Text style={[homeAdditional ? styles.homeAdditionalTitle : styles.plaqueTitle, { color: homeAdditional ? t.textPrimary : t.textMuted, fontSize: homeAdditional ? Math.max(20, f.bodyLg) : f.caption }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[homeAdditional ? styles.homeAdditionalPhrase : styles.plaquePhrase, { color: t.textPrimary, fontSize: homeAdditional ? Math.max(25, f.h2) : f.body }]} numberOfLines={homeAdditional ? 1 : 2} adjustsFontSizeToFit={homeAdditional} minimumFontScale={0.82}>
            {phrase.english}
          </Text>
          {homeAdditional && (
            <Text style={[styles.homeAdditionalSub, { color: t.textMuted, fontSize: Math.max(14, f.label) }]} numberOfLines={1}>
              {homeAdditionalMeaning}
            </Text>
          )}
        </View>
      </Pressable>

      <Modal
        visible={detailsVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeDetails}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={closeDetails} />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: t.bgCard,
                borderColor: t.border,
                shadowColor: t.accent,
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetIcon, { backgroundColor: t.bgSurface2 }]}>
                {dailyPhraseImage ? (
                  <Image source={dailyPhraseImage} style={styles.sheetIconImage} resizeMode="contain" />
                ) : (
                  <Ionicons name="chatbubble-ellipses-outline" size={24} color={t.textMuted} />
                )}
              </View>
              <View style={styles.sheetTitleWrap}>
                <Text style={[styles.sheetKicker, { color: t.textMuted, fontSize: f.caption }]} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={[styles.sheetPhrase, { color: t.textPrimary, fontSize: f.bodyLg || f.body }]}>
                  {phrase.english}
                </Text>
              </View>
              <Pressable
                onPress={closeDetails}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={({ pressed }) => [
                  styles.closeButton,
                  { backgroundColor: t.bgSurface2 },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="close" size={20} color={t.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.detailBlock, { borderColor: t.border, backgroundColor: t.bgSurface2 }]}>
                <Text style={[styles.detailLabel, { color: t.textMuted, fontSize: f.caption }]}>
                  {labelLiteral}
                </Text>
                <Text style={[styles.detailText, { color: t.textPrimary, fontSize: f.body }]}>
                  {phraseCopy.literal}
                </Text>
              </View>

              <View style={[styles.detailBlock, { borderColor: t.border, backgroundColor: t.bgSurface2 }]}>
                <Text style={[styles.detailLabel, { color: t.textMuted, fontSize: f.caption }]}>
                  {labelMeaning}
                </Text>
                <Text style={[styles.detailText, { color: t.textPrimary, fontSize: f.body }]}>
                  {phraseCopy.meaning}
                </Text>
              </View>

              <Text style={[styles.storyText, { color: t.textSecond, fontSize: f.body }]}>
                {phraseCopy.text}
              </Text>
            </ScrollView>

            {phrase.allowSave !== false && (
              <View style={[styles.saveRow, { borderTopColor: t.border }]}>
                <AddToFlashcard
                  en={phrase.english}
                  ru={phrase.meaning}
                  uk={phrase.meaning_uk}
                  es={phrase.meaning_es}
                  sourceLocales={flashcardSourceLocales}
                  source="daily_phrase"
                  sourceId={phrase.id || phrase.date}
                  studyTarget={studyTarget}
                  size={24}
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
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    minHeight: 88,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 18,
  },
  plaque: {
    minHeight: 86,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  homeAdditionalPlaque: {
    minHeight: 134,
    marginHorizontal: 8,
    marginTop: 10,
    marginBottom: 16,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 17,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  pressed: {
    opacity: 0.78,
  },
  plaqueIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    width: 48,
    height: 48,
  },
  plaqueCopy: {
    flex: 1,
    minWidth: 0,
  },
  plaqueTitle: {
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  plaquePhrase: {
    fontWeight: '800',
    lineHeight: 22,
  },
  homeAdditionalTitle: {
    fontWeight: '900',
    lineHeight: 26,
    marginBottom: 8,
  },
  homeAdditionalPhrase: {
    fontWeight: '900',
    lineHeight: 34,
  },
  homeAdditionalSub: {
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 5,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    padding: 18,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  sheet: {
    width: '100%',
    maxHeight: '84%',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    paddingBottom: 12,
  },
  sheetIcon: {
    width: 56,
    height: 56,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetIconImage: {
    width: 50,
    height: 50,
  },
  sheetTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  sheetKicker: {
    fontWeight: '900',
    letterSpacing: 0.7,
    marginBottom: 7,
    textTransform: 'uppercase',
  },
  sheetPhrase: {
    fontWeight: '900',
    lineHeight: 28,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    maxHeight: 390,
  },
  sheetScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  detailBlock: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
  },
  detailLabel: {
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  detailText: {
    fontWeight: '600',
    lineHeight: 22,
  },
  storyText: {
    fontWeight: '500',
    lineHeight: 23,
  },
  saveRow: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'flex-end',
  },
});
