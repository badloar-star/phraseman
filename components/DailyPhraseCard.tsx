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
import { LinearGradient } from './SafeLinearGradient';
import { triLang } from '../constants/i18n';
import { checkAchievements } from '../app/achievements';
import { updateMultipleTaskProgress } from '../app/daily_tasks';
import type { ThemeMode } from '../constants/theme';
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

type DailyPhraseChrome = {
  colors: [string, string, string];
  border: string;
  glow: string;
  title: string;
  phrase: string;
  sub: string;
  iconBg: string;
  iconBorder: string;
  ornament: string;
  shadow: string;
};

const DAILY_PHRASE_CHROME: Record<ThemeMode, DailyPhraseChrome> = {
  dark: {
    colors: ['#193025', '#13241C', '#09110D'],
    border: 'rgba(116,232,156,0.28)',
    glow: 'rgba(71,200,112,0.22)',
    title: '#D9FFE5',
    phrase: '#FFFFFF',
    sub: '#B8D9C2',
    iconBg: 'rgba(116,232,156,0.13)',
    iconBorder: 'rgba(116,232,156,0.22)',
    ornament: '#58CC89',
    shadow: '#47C870',
  },
  neon: {
    colors: ['#202713', '#151914', '#080909'],
    border: 'rgba(200,255,0,0.34)',
    glow: 'rgba(200,255,0,0.26)',
    title: '#F1FFC2',
    phrase: '#FFFFFF',
    sub: '#CDD7A1',
    iconBg: 'rgba(200,255,0,0.13)',
    iconBorder: 'rgba(200,255,0,0.25)',
    ornament: '#C8FF00',
    shadow: '#C8FF00',
  },
  gold: {
    colors: ['#242424', '#151515', '#070707'],
    border: 'rgba(230,190,103,0.42)',
    glow: 'rgba(214,179,90,0.15)',
    title: '#FFF0BF',
    phrase: '#FFF8E8',
    sub: '#D2BE91',
    iconBg: 'rgba(230,190,103,0.14)',
    iconBorder: 'rgba(230,190,103,0.34)',
    ornament: '#D6B35A',
    shadow: '#D6B35A',
  },
  coral: {
    colors: ['#302026', '#1D171A', '#0D0A0B'],
    border: 'rgba(255,128,128,0.34)',
    glow: 'rgba(255,100,100,0.24)',
    title: '#FFE0E0',
    phrase: '#FFFFFF',
    sub: '#E5B9C2',
    iconBg: 'rgba(255,128,128,0.14)',
    iconBorder: 'rgba(255,128,128,0.25)',
    ornament: '#FF6464',
    shadow: '#FF6464',
  },
  minimalLight: {
    colors: ['#FFFDF7', '#F5EDDE', '#E8DCC7'],
    border: 'rgba(45,39,30,0.28)',
    glow: 'rgba(118,83,31,0.18)',
    title: '#343842',
    phrase: '#171615',
    sub: '#514B42',
    iconBg: 'rgba(52,56,66,0.10)',
    iconBorder: 'rgba(45,39,30,0.18)',
    ornament: '#343842',
    shadow: 'rgba(34,28,18,0.28)',
  },
  minimalDark: {
    colors: ['#26303E', '#20242C', '#121419'],
    border: 'rgba(110,168,255,0.34)',
    glow: 'rgba(110,168,255,0.22)',
    title: '#DCEAFF',
    phrase: '#FFFFFF',
    sub: '#B8C1CF',
    iconBg: 'rgba(110,168,255,0.13)',
    iconBorder: 'rgba(110,168,255,0.24)',
    ornament: '#6EA8FF',
    shadow: '#6EA8FF',
  },
  compass: {
    colors: ['#25221D', '#141311', '#060605'],
    border: 'rgba(242,196,141,0.42)',
    glow: 'rgba(242,196,141,0.15)',
    title: '#FFE7B6',
    phrase: '#FFF8E8',
    sub: '#D8C7AA',
    iconBg: 'rgba(242,196,141,0.15)',
    iconBorder: 'rgba(242,196,141,0.31)',
    ornament: '#F2C48D',
    shadow: '#F2C48D',
  },
};

function dailyPhraseChromeFor(mode: ThemeMode): DailyPhraseChrome {
  return DAILY_PHRASE_CHROME[mode] ?? DAILY_PHRASE_CHROME.minimalDark;
}

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
  const chrome = dailyPhraseChromeFor(themeMode);

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
            backgroundColor: chrome.colors[1] || t.bgCard,
            borderColor: chrome.border,
            shadowColor: chrome.shadow,
          },
          pressed && styles.pressed,
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={chrome.colors}
          locations={[0, 0.56, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View pointerEvents="none" style={[styles.plaqueGlow, { backgroundColor: chrome.glow }]} />
        {homeAdditional && dailyPhraseImage ? (
          <View pointerEvents="none" style={styles.homeAdditionalGhostWrap}>
            <Image
              source={dailyPhraseImage}
              style={styles.homeAdditionalGhostImage}
              resizeMode="contain"
            />
          </View>
        ) : null}
        <View style={homeAdditional ? styles.homeAdditionalContent : styles.plaqueContent}>
          {!homeAdditional && (
            <View style={[styles.plaqueIcon, { backgroundColor: chrome.iconBg, borderColor: chrome.iconBorder }]}>
              {dailyPhraseImage ? (
                <Image source={dailyPhraseImage} style={styles.iconImage} resizeMode="contain" />
              ) : (
                <Ionicons name="chatbubble-ellipses-outline" size={22} color={chrome.title} />
              )}
            </View>
          )}
          <View style={styles.plaqueCopy}>
            <View style={styles.titleRow}>
              <Text style={[homeAdditional ? styles.homeAdditionalTitle : styles.plaqueTitle, { color: chrome.title, fontSize: homeAdditional ? Math.max(20, f.bodyLg) : f.caption }]} numberOfLines={1}>
                {title}
              </Text>
            </View>
            <Text style={[homeAdditional ? styles.homeAdditionalPhrase : styles.plaquePhrase, { color: chrome.phrase, fontSize: homeAdditional ? Math.max(25, f.h2) : f.body }]} numberOfLines={homeAdditional ? 1 : 2} adjustsFontSizeToFit={homeAdditional} minimumFontScale={0.82}>
              {phrase.english}
            </Text>
            {homeAdditional && (
              <Text style={[styles.homeAdditionalSub, { color: chrome.sub, fontSize: Math.max(14, f.label) }]} numberOfLines={2}>
                {homeAdditionalMeaning}
              </Text>
            )}
          </View>
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
    overflow: 'hidden',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
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
    overflow: 'hidden',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 4,
  },
  pressed: {
    opacity: 0.78,
  },
  plaqueIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
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
  plaqueContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 2,
  },
  homeAdditionalContent: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 78,
    zIndex: 2,
  },
  plaqueGlow: {
    position: 'absolute',
    right: -52,
    top: -44,
    width: 132,
    height: 132,
    borderRadius: 66,
    opacity: 0.62,
  },
  homeAdditionalGhostWrap: {
    position: 'absolute',
    right: 16,
    top: 24,
    width: 82,
    height: 82,
    opacity: 0.34,
  },
  homeAdditionalGhostImage: {
    width: 82,
    height: 82,
  },
  titleRow: {
    minHeight: 28,
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  plaqueTitle: {
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  plaquePhrase: {
    fontWeight: '800',
    lineHeight: 22,
  },
  homeAdditionalTitle: {
    fontWeight: '900',
    lineHeight: 26,
    flexShrink: 1,
  },
  homeAdditionalPhrase: {
    fontWeight: '900',
    lineHeight: 34,
  },
  homeAdditionalSub: {
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 5,
    minHeight: 38,
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
