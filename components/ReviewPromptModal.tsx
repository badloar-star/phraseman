import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { getReviewVariant, markReviewPrompted, markReviewRated, type ReviewContext, type ReviewVariant } from '../app/review_utils';
import { openStoreReviewPage } from '../app/store_review';
import { pluralWord } from '../constants/plural';
import { triLang, type Lang } from '../constants/i18n';
import { useOverlayVisible } from './OverlayArbiter';
import { useTheme } from './ThemeContext';
import { glassFill } from './GlassSurface';
import HybridAlertShell, { CascadeItem } from './modal_fx/HybridAlertShell';
import HybridSheetShell from './modal_fx/HybridSheetShell';
import PressableHybrid from './PressableHybrid';
import DuoPressable from './DuoPressable';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LUM } from '../constants/motionHybrid';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';

const EXEMPT_COLOR_1 = 'rgba(0,0,0,0.62)'; // theme-exempt: тень и затемнение окна — постоянные
const EXEMPT_COLOR_2 = '#000000'; // theme-exempt: тень и затемнение окна — постоянные
const EXEMPT_COLOR_3 = 'rgba(0,0,0,0.62)'; // theme-exempt: тень и затемнение окна — постоянные

type Props = {
  visible: boolean;
  context: ReviewContext;
  lang: Lang;
  onClose: () => void;
  streakDays?: 7 | 14 | 30;
  /** Production default — hybrid; explicit `classic` is the rollback/QA path. */
  motionVariant?: 'classic' | 'hybrid';
};

const iconForContext: Record<ReviewContext, keyof typeof Ionicons.glyphMap> = {
  perfect_lesson: 'checkmark-circle-outline',
  level_exam_pass: 'star-outline',
  streak_milestone: 'flame-outline',
};

function labelForContext(context: ReviewContext, lang: Lang): string {
  const labels: Record<ReviewContext, Record<Lang, string>> = {
    perfect_lesson: { ru: 'КСТАТИ, ПРО УРОК', uk: 'ДО РЕЧІ, ПРО УРОК', en: 'ABOUT THE LESSON', es: 'SOBRE LA LECCIÓN', 'pt-BR': 'SOBRE A LIÇÃO', vi: 'VỀ BÀI HỌC', id: 'TENTANG PELAJARAN', tr: 'DERS HAKKINDA', pl: 'O LEKCJI' },
    level_exam_pass: { ru: 'МАЛЕНЬКИЙ ВОПРОС', uk: 'МАЛЕНЬКЕ ЗАПИТАННЯ', en: 'A QUICK QUESTION', es: 'UNA PEQUEÑA PREGUNTA', 'pt-BR': 'UMA PEQUENA PERGUNTA', vi: 'MỘT CÂU HỎI NHỎ', id: 'PERTANYAAN SINGKAT', tr: 'KÜÇÜK BİR SORU', pl: 'MAŁE PYTANIE' },
    streak_milestone: { ru: 'СЕРИЯ', uk: 'СЕРІЯ', en: 'STREAK', es: 'RACHA', 'pt-BR': 'SEQUÊNCIA', vi: 'CHUỖI', id: 'RANGKAIAN', tr: 'SERİ', pl: 'SERIA' },
  };
  return triLang(lang, labels[context]);
}

function ReviewPromptModal({ visible, context, lang, onClose, streakDays, motionVariant = 'hybrid' }: Props) {
  const { theme: t, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const { top: topInset, bottom: bottomInset } = useStableSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [variant, setVariant] = useState<ReviewVariant | null>(null);
  const promptedForRequestRef = useRef(false);
  const overlayVisible = useOverlayVisible('reviewPrompt', visible);
  const isHybrid = motionVariant === 'hybrid';
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (!visible) {
      promptedForRequestRef.current = false;
      setVariant(null);
      return;
    }
    setVariant(null);
    void getReviewVariant(context, lang).then(setVariant);
  }, [context, lang, visible]);

  useEffect(() => {
    if (!overlayVisible || !variant || promptedForRequestRef.current) return;
    promptedForRequestRef.current = true;
    void markReviewPrompted();
  }, [overlayVisible, variant]);

  const close = () => onClose();
  // зачем (R58 #55, аудит кнопок 15.10): «оценено» ставилось, даже если стор не открылся — просьба больше не появлялась,
  // а оценки не было. Теперь отметка только при открытом сторе; двойной тап не открывает стор дважды.
  const rateInFlightRef = useRef(false);
  const rate = async () => {
    if (rateInFlightRef.current) return;
    rateInFlightRef.current = true;
    close();
    try {
      const opened = await openStoreReviewPage();
      console.log(`[REVIEW-PROMPT] rate: стор открыт=${String(opened)}`); // guard-ok: итог жеста
      if (opened) await markReviewRated();
    } finally {
      rateInFlightRef.current = false;
    }
  };

  if (!overlayVisible || !variant) return null;
  // Только эти два запроса появляются сразу после завершения учебного действия:
  // нижний sheet сохраняет видимый контекст, а streak остаётся прежней alert-панелью.
  const bottomSheet = context === 'perfect_lesson' || context === 'level_exam_pass';
  // зачем: паритет с макетом system.html system_20 — главная кнопка белая (графит/белый), без золота, зелёного и фиолетового.
  const accent = glass.accent;
  const accentText = glass.accentInk;
  const storeName = Platform.OS === 'ios' ? 'App Store' : 'Google Play';
  const storeCta = triLang(lang, {
    ru: `Оценить в ${storeName}`,
    uk: `Оцінити в ${storeName}`,
    en: `Rate in ${storeName}`,
    es: `Valorar en ${storeName}`,
    'pt-BR': `Avaliar na ${storeName}`,
    vi: `Đánh giá trên ${storeName}`,
    id: `Nilai di ${storeName}`,
    tr: `${storeName}'de değerlendir`,
    pl: `Oceń w ${storeName}`,
  });
  const ratingAccessibilityLabel = triLang(lang, {
    ru: `Оценка в ${storeName}`,
    uk: `Оцінка в ${storeName}`,
    en: `${storeName} rating`,
    es: `Valoración en ${storeName}`,
    'pt-BR': `Avaliação na ${storeName}`,
    vi: `Đánh giá trên ${storeName}`,
    id: `Penilaian di ${storeName}`,
    tr: `${storeName} değerlendirmesi`,
    pl: `Ocena w ${storeName}`,
  });
  const sheetMaxHeight = Math.max(0, screenHeight - topInset - bottomInset - 12);

  // зачем: copy и действия едины в обеих ветках; hybrid добавляет только
  // каскад LUM. Для нижнего sheet используем локальную Modal-оболочку: общий
  // HybridAlertShell намеренно всегда центрирует alert и не меняется глобально.
  const panelBody = (
    <>
      <CascadeItem delay={isHybrid ? LUM.ladder[2] : 0} reduceMotion={!isHybrid || reduceMotion}>
        {/* зачем: кикер `.ov` макета system_20 (12/3px), размер по шкале D145 (01.10, новее макета) — 13. */}
        <Text style={{ color: glass.secondary, fontSize: 13, lineHeight: 17, fontWeight: '700', letterSpacing: 3, alignSelf: 'flex-start' }}>
          {labelForContext(context === 'streak_milestone' ? 'level_exam_pass' : context, lang)}
        </Text>
      </CascadeItem>
      <CascadeItem delay={isHybrid ? LUM.ladder[2] : 0} reduceMotion={!isHybrid || reduceMotion}>
        <Text style={{ color: glass.text, fontSize: 24, lineHeight: 30, fontWeight: '700', marginTop: 8 }}>
          {variant.title}
        </Text>
      </CascadeItem>
      {context === 'streak_milestone' && streakDays ? (
        <View style={{ marginTop: 16, width: '100%', padding: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: glass.opaqueCard, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 41, height: 41, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.opaqueControl }}>
            <Ionicons name={iconForContext.streak_milestone} size={20} color={glass.text} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: glass.secondary, fontSize: 13, lineHeight: 17, fontWeight: '700', letterSpacing: 2 }}>{labelForContext('streak_milestone', lang)}</Text>
            <Text style={{ color: glass.text, fontSize: 16, lineHeight: 22, fontWeight: '700', marginTop: 2 }}>{triLang(lang, { ru: `${streakDays} ${pluralWord('ru', streakDays, { one: 'день', few: 'дня', many: 'дней' })} подряд`, uk: `${streakDays} ${pluralWord('uk', streakDays, { one: 'день', few: 'дні', many: 'днів' })} поспіль`, en: `${streakDays} days in a row`, es: `${streakDays} días seguidos`, 'pt-BR': `${streakDays} dias seguidos`, vi: `${streakDays} ngày liên tiếp`, id: `${streakDays} hari berturut-turut`, tr: `${streakDays} gün üst üste`, pl: `${streakDays} ${pluralWord('pl', streakDays, { one: 'dzień', few: 'dni', many: 'dni' })} z rzędu` })}</Text>
          </View>
        </View>
      ) : null}
      {/* зачем: в кадре 20 подзаголовка нет, но без него контекстный заголовок не просит отзыв — оставлен, 16 по D145; отличие в журнале паритета. */}
      <Text style={{ color: glass.secondary, fontSize: 16, lineHeight: 22, marginTop: 8 }}>
        {variant.subtitle}
      </Text>
    </>
  );

  const panelActions = (
    <>
      {isHybrid ? (
        <DuoPressable
          accessibilityRole="button"
          accessibilityLabel={storeCta}
          withHaptic
          onPress={() => { void rate(); }}
          wrapStyle={{ width: '100%', marginTop: 20 }}
          style={{ minHeight: 48, borderRadius: 24, backgroundColor: accent }}
        >
          <Text style={{ color: accentText, fontSize: 16, fontWeight: '700' }}>{storeCta}</Text>
        </DuoPressable>
      ) : (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={storeCta}
          activeOpacity={0.85}
          onPress={() => { void rate(); }}
          style={{ width: '100%', minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: accent, marginTop: 20 }}
        >
          <Text style={{ color: accentText, fontSize: 16, fontWeight: '700' }}>{storeCta}</Text>
        </TouchableOpacity>
      )}
      {isHybrid ? (
        <PressableHybrid
          accessibilityRole="button"
          accessibilityLabel={variant.btnNo}
          variant="secondary"
          onPress={close}
          style={{ width: '100%', marginTop: 10 }}
          // зачем: `.cta.gh` макета — тёмная капсула с бликом (lg-sheen), а не голый текст.
          contentStyle={{ minHeight: 48, borderRadius: 24, backgroundColor: glass.card, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}
        >
          <Text style={{ color: glass.text, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>{variant.btnNo}</Text>
        </PressableHybrid>
      ) : (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={variant.btnNo} activeOpacity={0.7} onPress={close} style={{ width: '100%', minHeight: 48, borderRadius: 24, marginTop: 10, backgroundColor: glass.card, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Text style={{ color: glass.text, fontSize: 16, fontWeight: '700' }}>{variant.btnNo}</Text>
        </TouchableOpacity>
      )}
    </>
  );

  const panelStyle = {
    width: bottomSheet ? ('100%' as const) : ('100%' as const),
    maxWidth: bottomSheet ? undefined : 420,
    paddingHorizontal: 22,
    paddingTop: bottomSheet ? 12 : 22,
    paddingBottom: Math.max(bottomSheet ? 18 : 22, bottomInset + 12),
    backgroundColor: glassFill(t.bgCard, 0.46),
    maxHeight: bottomSheet ? sheetMaxHeight : undefined,
    borderTopLeftRadius: bottomSheet ? 28 : 24,
    borderTopRightRadius: bottomSheet ? 28 : 24,
    borderBottomLeftRadius: bottomSheet ? 0 : 24,
    borderBottomRightRadius: bottomSheet ? 0 : 24,
    alignItems: 'flex-start' as const,
  };

  const panelContent = (
    <>
      {bottomSheet && !isHybrid ? <View testID="review-prompt-grabber" style={{ width: 36, height: 4, borderRadius: 99, marginBottom: 10, backgroundColor: t.textMuted + '66' }} /> : null}
      {bottomSheet ? (
        <ScrollView
          testID="review-prompt-scroll-content"
          style={{ width: '100%', flexShrink: 1, minHeight: 0 }}
          contentContainerStyle={{ alignItems: 'flex-start', paddingTop: 8, paddingBottom: 8 }}
          bounces={false}
          showsVerticalScrollIndicator decelerationRate="fast"
        >
          {panelBody}
        </ScrollView>
      ) : panelBody}
      {panelActions}
    </>
  );

  if (bottomSheet && isHybrid) {
    return (
      <HybridSheetShell
        visible={overlayVisible}
        onClose={close}
        closeLabel={variant.btnNo}
        testID="review-prompt-modal-hybrid"
        material="liquid-glass"
        backdropAccessible={false}
      >
        {panelContent}
      </HybridSheetShell>
    );
  }

  if (bottomSheet) {
    return (
      <Modal transparent visible={overlayVisible} animationType="slide" onRequestClose={close}>
        {/* guard-ok: скрим закрывает sheet по тапу вне него; смысловые элементы внутри. */}
        <Pressable
          onPress={close}
          accessible={false}
          style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingTop: topInset + 12, backgroundColor: EXEMPT_COLOR_1 }}
        >
          {/* guard-ok: останавливает всплытие тапа из sheet в скрим. */}
          <Pressable onPress={(event) => event.stopPropagation()} accessible={false} style={panelStyle}>
            {panelContent}
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  if (isHybrid) {
    return (
      <HybridAlertShell
        visible={overlayVisible}
        onRequestClose={close}
        shadowColor={EXEMPT_COLOR_2}
        testID="review-prompt-modal-hybrid"
      >
        <View style={panelStyle}>{panelContent}</View>
      </HybridAlertShell>
    );
  }

  return (
    <Modal transparent visible={overlayVisible} animationType={bottomSheet ? 'slide' : 'fade'} onRequestClose={close}>
      {/* guard-ok: скрим-фон закрывает модалку по тапу вовне, декоративный
          (как в HybridAlertShell) — озвучиваемые элементы внутри панели. */}
      <Pressable
        onPress={close}
        accessible={false}
        style={{ flex: 1, justifyContent: bottomSheet ? 'flex-end' : 'center', alignItems: 'center', paddingHorizontal: bottomSheet ? 0 : 20, backgroundColor: EXEMPT_COLOR_3 }}
      >
        {/* guard-ok: чисто структурная обёртка, гасит всплытие тапа до скрима. */}
        <Pressable
          onPress={(event) => event.stopPropagation()}
          accessible={false}
          style={panelStyle}
        >
          {panelContent}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default memo(ReviewPromptModal);
