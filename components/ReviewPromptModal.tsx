import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { getReviewVariant, markReviewPrompted, markReviewRated, type ReviewContext, type ReviewVariant } from '../app/review_utils';
import { openStoreReviewPage } from '../app/store_review';
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
    streak_milestone: { ru: 'СЕРИЯ', uk: 'СЕРІЯ', en: 'STREAK', es: 'RACHA', 'pt-BR': 'SEQUÊNCIA', vi: 'CHUỖI', id: 'RENTETAN', tr: 'SERİ', pl: 'SERIA' },
  };
  return triLang(lang, labels[context]);
}

function ReviewPromptModal({ visible, context, lang, onClose, streakDays, motionVariant = 'hybrid' }: Props) {
  const { theme: t, f } = useTheme();
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
  const rate = async () => {
    close();
    await openStoreReviewPage();
    await markReviewRated();
  };

  if (!overlayVisible || !variant) return null;
  // Только эти два запроса появляются сразу после завершения учебного действия:
  // нижний sheet сохраняет видимый контекст, а streak остаётся прежней alert-панелью.
  const bottomSheet = context === 'perfect_lesson' || context === 'level_exam_pass';
  const accent = context === 'level_exam_pass' ? t.gold : context === 'streak_milestone' ? '#C3B7FF' : t.correct;
  const accentText = context === 'streak_milestone' ? '#1B1030' : t.correctText;
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
      <CascadeItem delay={isHybrid ? LUM.ladder[1] : 0} reduceMotion={!isHybrid || reduceMotion}>
        <View style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: accent, marginBottom: 12 }}>
          <Ionicons name={iconForContext[context]} size={23} color={accentText} />
        </View>
      </CascadeItem>
      <CascadeItem delay={isHybrid ? LUM.ladder[2] : 0} reduceMotion={!isHybrid || reduceMotion}>
        <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800', letterSpacing: 1.1, textAlign: 'center' }}>
          {labelForContext(context, lang)}
        </Text>
      </CascadeItem>
      <CascadeItem delay={isHybrid ? LUM.ladder[2] : 0} reduceMotion={!isHybrid || reduceMotion}>
        <Text style={{ color: t.textPrimary, fontSize: f.h2, lineHeight: f.h2 * 1.05, fontWeight: '800', letterSpacing: -0.45, textAlign: 'center', marginTop: 10 }}>
          {variant.title}
        </Text>
      </CascadeItem>
      {context === 'streak_milestone' && streakDays ? (
        <View style={{ marginTop: 14, minHeight: 42, paddingHorizontal: 14, borderRadius: 14, backgroundColor: `${accent}33`, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: accent, fontSize: f.bodyLg, fontWeight: '800' }}>{triLang(lang, { ru: `${streakDays} дней подряд`, uk: `${streakDays} днів поспіль`, en: `${streakDays} days in a row`, es: `${streakDays} días seguidos`, 'pt-BR': `${streakDays} dias seguidos`, vi: `${streakDays} ngày liên tiếp`, id: `${streakDays} hari berturut-turut`, tr: `${streakDays} gün üst üste`, pl: `${streakDays} dni z rzędu` })}</Text>
        </View>
      ) : null}
      <Text style={{ color: t.textMuted, fontSize: f.body, lineHeight: f.body * 1.45, textAlign: 'center', marginTop: 9, maxWidth: 330 }}>
        {variant.subtitle}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 19 }} accessibilityLabel={ratingAccessibilityLabel}>
        {isHybrid
          ? [1, 2, 3, 4, 5].map((value, i) => (
              <CascadeItem key={value} delay={LUM.ladder[Math.min(i + 2, LUM.ladder.length - 1)]} reduceMotion={reduceMotion}>
                <Ionicons name="star" size={28} color={t.gold} />
              </CascadeItem>
            ))
          : [1, 2, 3, 4, 5].map((value) => <Ionicons key={value} name="star" size={28} color={t.gold} />)}
      </View>
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
          style={{ minHeight: 52, borderRadius: 16, backgroundColor: accent }}
        >
          <Text style={{ color: accentText, fontSize: f.body, fontWeight: '800' }}>{storeCta}</Text>
        </DuoPressable>
      ) : (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={storeCta}
          activeOpacity={0.85}
          onPress={() => { void rate(); }}
          style={{ width: '100%', minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: accent, marginTop: 20 }}
        >
          <Text style={{ color: accentText, fontSize: f.body, fontWeight: '800' }}>{storeCta}</Text>
        </TouchableOpacity>
      )}
      {isHybrid ? (
        <PressableHybrid
          accessibilityRole="button"
          accessibilityLabel={variant.btnNo}
          variant="secondary"
          onPress={close}
          contentStyle={{ paddingVertical: 13, paddingHorizontal: 24 }}
        >
          <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '700', textAlign: 'center' }}>{variant.btnNo}</Text>
        </PressableHybrid>
      ) : (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={variant.btnNo} activeOpacity={0.7} onPress={close} style={{ paddingVertical: 13, paddingHorizontal: 24 }}>
          <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '700' }}>{variant.btnNo}</Text>
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
    alignItems: 'center' as const,
  };

  const panelContent = (
    <>
      {bottomSheet && !isHybrid ? <View testID="review-prompt-grabber" style={{ width: 36, height: 4, borderRadius: 99, marginBottom: 10, backgroundColor: t.textMuted + '66' }} /> : null}
      {bottomSheet ? (
        <ScrollView
          testID="review-prompt-scroll-content"
          style={{ width: '100%', flexShrink: 1, minHeight: 0 }}
          contentContainerStyle={{ alignItems: 'center', paddingTop: 8, paddingBottom: 8 }}
          bounces={false}
          showsVerticalScrollIndicator
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
          style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingTop: topInset + 12, backgroundColor: 'rgba(0,0,0,0.62)' }}
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
        shadowColor="#000000"
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
        style={{ flex: 1, justifyContent: bottomSheet ? 'flex-end' : 'center', alignItems: 'center', paddingHorizontal: bottomSheet ? 0 : 20, backgroundColor: 'rgba(0,0,0,0.62)' }}
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
