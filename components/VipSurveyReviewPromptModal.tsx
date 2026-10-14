import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import React, { memo, useEffect, useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import KitTouchable from './KitTouchable';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette'; // зачем: окно отзыва после VIP-опроса на токенах стекла (макет overlays-specialist)
import { hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { triLang } from '../constants/i18n';
import { openStoreReviewPage } from '../app/store_review';
import { hasUserRated, markReviewPrompted, markReviewRated } from '../app/review_utils';
import { recordVipSurveyReviewClickFromApp } from '../app/vip_survey';
import { CascadeItem } from './modal_fx/HybridAlertShell';
import HybridSheetShell from './modal_fx/HybridSheetShell';
import DuoPressable from './DuoPressable';
import PressableHybrid from './PressableHybrid';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LUM } from '../constants/motionHybrid';
import { noteSwallowedAs, noteSwallowedHandler } from '../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее
import SheetSwipeClose, { SheetSwipeRoot } from './modal_fx/SheetSwipeClose';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** dev-only: витрина движения запускает гибрид «Световод» рядом с боевым видом. Default 'classic'. */
  motionVariant?: 'classic' | 'hybrid';
};

function VipSurveyReviewPromptModal({ visible, onClose, motionVariant = 'classic' }: Props) {
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const isHybrid = motionVariant === 'hybrid';
  const reduceMotion = useReduceMotion();

  // Это окно показывается в обход общего гейта canShowReview (особый момент — оплата VIP),
  // но согласуется с ним по общему состоянию: уже оценившему не докучаем, а сам показ
  // помечаем, чтобы следом не всплыло окно после урока/арены.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void (async () => {
      if (await hasUserRated()) {
        if (!cancelled) onClose();
        return;
      }
      await markReviewPrompted().catch(noteSwallowedHandler('VipSurveyReviewPromptModal:useEffect.markReviewPrompted'));
    })();
    return () => { cancelled = true; };
  }, [visible, onClose]);

  const close = () => {
    hapticTap();
    onClose();
  };

  // зачем (координатор 10.10, Optimistic UI): два тапа по «Оценить» в том же кадре открыли бы страницу магазина дважды и записали клик дважды
  const reviewLockRef = useRef(false);
  const openReview = async () => {
    if (reviewLockRef.current) return;
    reviewLockRef.current = true;
    hapticTap();
    void recordVipSurveyReviewClickFromApp({ storeOpened: false }).catch(noteSwallowedAs('VipSurveyReviewPromptModal:openReview.recordVipSurveyReviewClickFromApp', false));
    let storeOpened = false;
    try {
      storeOpened = await openStoreReviewPage();
    } catch (error: unknown) {
      console.warn('[VIP-REVIEW] страница магазина не открылась', error instanceof Error ? error.message : String(error));
    }
    if (storeOpened) {
      void recordVipSurveyReviewClickFromApp({ storeOpened: true }).catch(noteSwallowedAs('VipSurveyReviewPromptModal:openReview.recordVipSurveyReviewClickFromApp_2', false));
      // Ушёл писать отзыв → помечаем как оценившего, чтобы другие rate-окна не всплывали.
      void markReviewRated().catch(noteSwallowedHandler('VipSurveyReviewPromptModal:openReview.markReviewRated'));
    }
    reviewLockRef.current = false;
    onClose();
  };

  // зачем: подпись второй кнопки как в кадре system_20.
  const laterLabel = triLang(lang, { ru: 'Не сейчас', uk: 'Не зараз', en: 'Not now', es: 'Ahora no', 'pt-BR': 'Agora não', vi: 'Để sau', id: 'Nanti saja', tr: 'Şimdi değil', pl: 'Nie teraz' });

  const kicker = 'PLUS'; // зачем: кикер `.ov` кадра system_20; слово-марка одинаково во всех языках
  const title = triLang(lang, {
    ru: 'Твой Plus активирован',
    uk: 'Твій Plus активовано',
    en: 'Your Plus is active',
    es: 'Tu Plus está activo',
    'pt-BR': 'Seu Plus está ativo',
    vi: 'Plus của bạn đã kích hoạt',
    id: 'Plus-mu sudah aktif',
    tr: 'Plus’ın aktif',
    pl: 'Twój Plus jest aktywny',
  });
  const body = triLang(lang, {
    ru: 'Хочешь поделиться впечатлением о Phraseman? Честный отзыв поможет другим людям понять, чего ждать от приложения.',
    uk: 'Хочеш поділитися враженням про Phraseman? Чесний відгук допоможе іншим людям зрозуміти, чого чекати від застосунку.',
    en: 'Want to share your impressions of Phraseman? An honest review helps other people know what to expect from the app.',
    es: '¿Quieres compartir tu impresión de Phraseman? Una reseña honesta ayuda a otras personas a saber qué esperar de la app.',
    'pt-BR': 'Quer compartilhar sua impressão do Phraseman? Uma avaliação honesta ajuda outras pessoas a saber o que esperar do app.',
    vi: 'Bạn muốn chia sẻ cảm nhận về Phraseman? Một đánh giá chân thật giúp người khác biết nên mong đợi gì từ ứng dụng.',
    id: 'Mau berbagi kesanmu tentang Phraseman? Ulasan yang jujur membantu orang lain tahu apa yang bisa diharapkan dari aplikasi ini.',
    tr: 'Phraseman hakkındaki izlenimini paylaşmak ister misin? Dürüst bir değerlendirme, başkalarının uygulamadan ne bekleyeceğini anlamasına yardımcı olur.',
    pl: 'Chcesz podzielić się wrażeniami o Phraseman? Szczera recenzja pomoże innym zrozumieć, czego oczekiwać od aplikacji.',
  });
  const writeLabel = triLang(lang, { ru: 'Написать отзыв', uk: 'Написати відгук', en: 'Write a review', es: 'Escribir reseña', 'pt-BR': 'Escrever avaliação', vi: 'Viết đánh giá', id: 'Tulis ulasan', tr: 'Değerlendirme yaz', pl: 'Napisz recenzję' });

  // зачем (владелец 04.10): окно после опроса Plus — в виде обычного «Оценить» по кадру system_20:
  // шторка снизу, кикер, заголовок, белая кнопка и тёмная капсула «Не сейчас»; текст свой, про Plus.
  // Крестика в макете нет — закрытие капсулой «Не сейчас» (48dp) и тапом по фону.
  const sheetBody = (
    <View testID="vip-survey-review-prompt" style={styles.content}>
      <CascadeItem delay={isHybrid ? LUM.ladder[1] : 0} reduceMotion={!isHybrid || reduceMotion}>
        <Text style={[styles.kicker, { color: g.secondary }]}>{kicker}</Text>
      </CascadeItem>
      <CascadeItem delay={isHybrid ? LUM.ladder[2] : 0} reduceMotion={!isHybrid || reduceMotion}>
        <Text style={[styles.title, { color: g.text }]}>{title}</Text>
        <Text style={[styles.body, { color: g.secondary }]}>{body}</Text>
      </CascadeItem>
      {isHybrid ? (
        <DuoPressable
          testID="vip-survey-review-write"
          accessibilityRole="button"
          accessibilityLabel={writeLabel}
          onPress={() => { void openReview(); }}
          wrapStyle={{ width: '100%', marginTop: 18 }}
          style={[styles.primaryButton, { backgroundColor: g.accent }]}
        >
          <Text style={[styles.buttonText, { color: g.accentInk }]}>{writeLabel}</Text>
        </DuoPressable>
      ) : (
        <KitTouchable
          testID="vip-survey-review-write"
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={writeLabel}
          onPress={() => { void openReview(); }}
          style={[styles.primaryButton, styles.fullWidth, { backgroundColor: g.accent, marginTop: 18 }]}
        >
          <Text style={[styles.buttonText, { color: g.accentInk }]}>{writeLabel}</Text>
        </KitTouchable>
      )}
      {isHybrid ? (
        <PressableHybrid
          variant="secondary"
          testID="vip-survey-review-later"
          accessibilityRole="button"
          accessibilityLabel={laterLabel}
          onPress={close}
          style={[styles.fullWidth, { marginTop: 10 }]}
          contentStyle={[styles.laterButton, { backgroundColor: g.card }]}
        >
          <Text style={[styles.buttonText, { color: g.text }]}>{laterLabel}</Text>
        </PressableHybrid>
      ) : (
        <KitTouchable
          testID="vip-survey-review-later"
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={laterLabel}
          onPress={close}
          style={[styles.laterButton, styles.fullWidth, { backgroundColor: g.card, marginTop: 10 }]}
        >
          <Text style={[styles.buttonText, { color: g.text }]}>{laterLabel}</Text>
        </KitTouchable>
      )}
    </View>
  );

  if (isHybrid) {
    return (
      <HybridSheetShell
        visible={visible}
        onClose={close}
        closeLabel={laterLabel}
        testID="vip-survey-review-prompt-hybrid"
        material="liquid-glass"
        backdropAccessible={false}
      >
        {sheetBody}
      </HybridSheetShell>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={close}>
      <SheetSwipeRoot>
      {/* guard-ok: скрим закрывает шторку по тапу вовне, своего смысла для VoiceOver/TalkBack не несёт. */}
      <Pressable style={styles.root} onPress={close} accessible={false}>
        {/* зачем (координатор 14.10, «ручка ⇒ свайп»): свайп вниз закрывает шторку тем же close, что тап по фону; лист едет за пальцем */}
        <SheetSwipeClose name="vip-survey-review" onClose={close}>
        {/* guard-ok: гасит всплытие тапа из шторки в скрим. */}
        <Pressable
          onPress={(event) => event.stopPropagation()}
          accessible={false}
          style={[styles.sheet, { backgroundColor: g.opaqueSheet, paddingBottom: Math.max(18, bottomInset + 12) }]}
        >
          <View testID="vip-survey-review-grabber" style={[styles.grabber, { backgroundColor: g.glassEdge }]} />
          {sheetBody}
        </Pressable>
        </SheetSwipeClose>
      </Pressable>
      </SheetSwipeRoot>
    </Modal>
  );
}

export default memo(VipSurveyReviewPromptModal);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.56)', // theme-exempt: затемнение под окном/шторкой и тень — постоянные в любой теме
  },
  sheet: {
    width: '100%',
    paddingHorizontal: 22,
    paddingTop: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 99,
    marginBottom: 18,
  },
  content: {
    width: '100%',
    alignItems: 'flex-start',
  },
  kicker: {
    // зачем: `.ov` макета 12/3px; шкала D145 (решение владельца 04.10: при сверке главнее 16/13) — 13.
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
    letterSpacing: 3,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  fullWidth: {
    width: '100%',
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  laterButton: {
    minHeight: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
