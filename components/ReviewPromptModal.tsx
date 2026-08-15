import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { getReviewVariant, markReviewPrompted, markReviewRated, type ReviewContext, type ReviewVariant } from '../app/review_utils';
import { openStoreReviewPage } from '../app/store_review';
import { triLang, type Lang } from '../constants/i18n';
import { useOverlayVisible } from './OverlayArbiter';
import { useTheme } from './ThemeContext';

type Props = {
  visible: boolean;
  context: ReviewContext;
  lang: Lang;
  onClose: () => void;
  streakDays?: 7 | 14 | 30;
};

const iconForContext: Record<ReviewContext, keyof typeof Ionicons.glyphMap> = {
  perfect_lesson: 'checkmark-circle-outline',
  level_exam_pass: 'star-outline',
  streak_milestone: 'flame-outline',
};

function labelForContext(context: ReviewContext, lang: Lang): string {
  const labels: Record<ReviewContext, Record<Lang, string>> = {
    perfect_lesson: { ru: 'КСТАТИ, ПРО УРОК', uk: 'ДО РЕЧІ, ПРО УРОК', es: 'SOBRE LA LECCIÓN', 'pt-BR': 'SOBRE A LIÇÃO', vi: 'VỀ BÀI HỌC', id: 'TENTANG PELAJARAN', tr: 'DERS HAKKINDA', pl: 'O LEKCJI' },
    level_exam_pass: { ru: 'МАЛЕНЬКИЙ ВОПРОС', uk: 'МАЛЕНЬКЕ ЗАПИТАННЯ', es: 'UNA PEQUEÑA PREGUNTA', 'pt-BR': 'UMA PEQUENA PERGUNTA', vi: 'MỘT CÂU HỎI NHỎ', id: 'PERTANYAAN SINGKAT', tr: 'KÜÇÜK BİR SORU', pl: 'MAŁE PYTANIE' },
    streak_milestone: { ru: 'СЕРИЯ', uk: 'СЕРІЯ', es: 'RACHA', 'pt-BR': 'SEQUÊNCIA', vi: 'CHUỖI', id: 'RENTETAN', tr: 'SERİ', pl: 'SERIA' },
  };
  return triLang(lang, labels[context]);
}

function ReviewPromptModal({ visible, context, lang, onClose, streakDays }: Props) {
  const { theme: t, f } = useTheme();
  const { bottom: bottomInset } = useStableSafeAreaInsets();
  const [variant, setVariant] = useState<ReviewVariant | null>(null);
  const promptedForRequestRef = useRef(false);
  const overlayVisible = useOverlayVisible('reviewPrompt', visible);

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
  const bottomSheet = false;
  const accent = context === 'level_exam_pass' ? t.gold : context === 'streak_milestone' ? '#C3B7FF' : t.correct;
  const accentText = context === 'streak_milestone' ? '#1B1030' : t.correctText;
  const storeCta = `Открыть ${Platform.OS === 'ios' ? 'App Store' : 'Google Play'} и оценить`;

  return (
    <Modal transparent visible={overlayVisible} animationType={bottomSheet ? 'slide' : 'fade'} onRequestClose={close}>
      <Pressable
        onPress={close}
        style={{ flex: 1, justifyContent: bottomSheet ? 'flex-end' : 'center', alignItems: 'center', paddingHorizontal: bottomSheet ? 0 : 20, backgroundColor: 'rgba(0,0,0,0.62)' }}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            width: bottomSheet ? '100%' : '100%',
            maxWidth: bottomSheet ? undefined : 420,
            paddingHorizontal: 22,
            paddingTop: bottomSheet ? 12 : 22,
            paddingBottom: Math.max(bottomSheet ? 18 : 22, bottomInset + 12),
            backgroundColor: t.bgCard,
            borderWidth: 1,
            borderColor: t.border,
            borderTopLeftRadius: bottomSheet ? 28 : 24,
            borderTopRightRadius: bottomSheet ? 28 : 24,
            borderBottomLeftRadius: bottomSheet ? 0 : 24,
            borderBottomRightRadius: bottomSheet ? 0 : 24,
            alignItems: 'center',
          }}
        >
          {bottomSheet ? <View style={{ width: 36, height: 4, borderRadius: 99, marginBottom: 18, backgroundColor: t.textMuted + '66' }} /> : null}
          <View style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: accent, marginBottom: 12 }}>
            <Ionicons name={iconForContext[context]} size={23} color={accentText} />
          </View>
          <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800', letterSpacing: 1.1, textAlign: 'center' }}>
            {labelForContext(context, lang)}
          </Text>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, lineHeight: f.h2 * 1.05, fontWeight: '800', letterSpacing: -0.45, textAlign: 'center', marginTop: 10 }}>
            {variant.title}
          </Text>
          {context === 'streak_milestone' && streakDays ? (
            <View style={{ marginTop: 14, minHeight: 42, paddingHorizontal: 14, borderRadius: 14, backgroundColor: `${accent}33`, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: accent, fontSize: f.bodyLg, fontWeight: '800' }}>{triLang(lang, { ru: `${streakDays} дней подряд`, uk: `${streakDays} днів поспіль`, es: `${streakDays} días seguidos`, 'pt-BR': `${streakDays} dias seguidos`, vi: `${streakDays} ngày liên tiếp`, id: `${streakDays} hari berturut-turut`, tr: `${streakDays} gün üst üste`, pl: `${streakDays} dni z rzędu` })}</Text>
            </View>
          ) : null}
          <Text style={{ color: t.textMuted, fontSize: f.body, lineHeight: f.body * 1.45, textAlign: 'center', marginTop: 9, maxWidth: 330 }}>
            {variant.subtitle}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 19 }} accessibilityLabel={triLang(lang, { ru: 'Оценка в App Store', uk: 'Оцінка в App Store', es: 'Valoración en App Store', 'pt-BR': 'Avaliação na App Store', vi: 'Đánh giá trên App Store', id: 'Penilaian di App Store', tr: 'App Store değerlendirmesi', pl: 'Ocena w App Store' })}>
            {[1, 2, 3, 4, 5].map((value) => <Ionicons key={value} name="star" size={28} color={t.gold} />)}
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={storeCta}
            activeOpacity={0.85}
            onPress={() => { void rate(); }}
            style={{ width: '100%', minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: accent, marginTop: 20 }}
          >
            <Text style={{ color: accentText, fontSize: f.body, fontWeight: '800' }}>{storeCta}</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={variant.btnNo} activeOpacity={0.7} onPress={close} style={{ paddingVertical: 13, paddingHorizontal: 24 }}>
            <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '700' }}>{variant.btnNo}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default memo(ReviewPromptModal);
