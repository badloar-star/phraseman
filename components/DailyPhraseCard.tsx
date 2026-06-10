import React, { memo, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useGlobalSearchParams } from 'expo-router';
import { useAudio } from '../hooks/use-audio';
import { syncWidgetData } from '../app/widget_bridge';
import { dailyPhraseChromeFor } from '../app/daily_phrase_chrome';
import { LinearGradient } from './SafeLinearGradient';
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
import ExplainButton from './ExplainButton';
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

// Chrome (per-theme palette) now lives in app/daily_phrase_chrome.ts so the
// home/lock-screen widget can render the identical look. See that file.

interface Props {
  userLevel?: number;
  variant?: 'default' | 'homeAdditional';
}

function DailyPhraseCard({ userLevel: _userLevel, variant = 'default' }: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { speak } = useAudio();
  const params = useGlobalSearchParams<{ openPhrase?: string; play?: string }>();
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

  // React to "phrase of the day" widget deep links:
  //   phraseman://phrase/<id>        -> openPhrase=<id>        (open details)
  //   phraseman://phrase/<id>?play=1 -> openPhrase=<id>&play=1 (open + speak)
  // handledDeepLinkRef ensures we act once per distinct link, not every render.
  const handledDeepLinkRef = useRef<string | null>(null);
  useEffect(() => {
    if (studyTarget === 'fr') return;
    const openPhrase = typeof params.openPhrase === 'string' ? params.openPhrase : '';
    if (!openPhrase) return;

    const wantsPlay = typeof params.play === 'string' && params.play === '1';
    const linkKey = `${openPhrase}:${wantsPlay ? '1' : '0'}`;
    if (handledDeepLinkRef.current === linkKey) return;

    // Always open details immediately.
    setDetailsVisible(true);

    if (!wantsPlay) {
      handledDeepLinkRef.current = linkKey;
      return;
    }

    // For play: only mark handled once we actually have text to speak, so a cold
    // launch (phrase not yet loaded) retries on the next render instead of
    // silently swallowing the play intent.
    const english = (phrase?.english ?? getTodayPhraseSyncForTarget(studyTarget)?.english ?? '').trim();
    if (english) {
      speak(english);
      handledDeepLinkRef.current = linkKey;
    }
  }, [params.openPhrase, params.play, studyTarget, phrase, speak]);

  // Keep the home/lock-screen widget in lockstep with whatever this card shows.
  // Best-effort and a native no-op off-device, so it never affects rendering.
  useEffect(() => {
    if (studyTarget === 'fr') return;
    void syncWidgetData({ studyTarget, lang, themeMode });
  }, [studyTarget, lang, themeMode, phrase?.id]);

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
              contentFit="contain"
            />
          </View>
        ) : null}
        <View style={homeAdditional ? styles.homeAdditionalContent : styles.plaqueContent}>
          {!homeAdditional && (
            <View style={[styles.plaqueIcon, { backgroundColor: chrome.iconBg, borderColor: chrome.iconBorder }]}>
              {dailyPhraseImage ? (
                <Image source={dailyPhraseImage} style={styles.iconImage} contentFit="contain" />
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
                  <Image source={dailyPhraseImage} style={styles.sheetIconImage} contentFit="contain" />
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
                onPress={() => { const en = phrase.english?.trim(); if (en) speak(en); }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={triLang(lang, {
                  uk: 'Озвучити', ru: 'Озвучить', es: 'Reproducir',
                  'pt-BR': 'Reproduzir', vi: 'Phát', id: 'Putar', tr: 'Seslendir', pl: 'Odtwórz',
                })}
                style={({ pressed }) => [
                  styles.closeButton,
                  { backgroundColor: t.bgSurface2 },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="volume-high" size={20} color={t.accent} />
              </Pressable>
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

              {/* «Объясни как для 5-летнего» — self-hides когда флаг OFF (Фаза 5). */}
              <ExplainButton
                phraseEn={phrase.english}
                phraseMeaning={phraseCopy.meaning || phrase.meaning}
                lang={lang}
                style={styles.explainButton}
              />

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

export default memo(DailyPhraseCard);

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
  explainButton: {
    marginTop: 2,
  },
  saveRow: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'flex-end',
  },
});
