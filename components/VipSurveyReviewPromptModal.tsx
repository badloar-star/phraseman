import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import React, { memo, useEffect } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { triLang } from '../constants/i18n';
import { monoIcon } from '../constants/monoIcon';
import { openStoreReviewPage } from '../app/store_review';
import { hasUserRated, markReviewPrompted, markReviewRated } from '../app/review_utils';
import { recordVipSurveyReviewClickFromApp } from '../app/vip_survey';

type Props = {
  visible: boolean;
  onClose: () => void;
};

function VipSurveyReviewPromptModal({ visible, onClose }: Props) {
  const { lang } = useLang();
  const { theme: t, f, isDark, themeMode } = useTheme();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);

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
      await markReviewPrompted().catch(() => {});
    })();
    return () => { cancelled = true; };
  }, [visible, onClose]);

  const close = () => {
    hapticTap();
    onClose();
  };

  const openReview = async () => {
    hapticTap();
    void recordVipSurveyReviewClickFromApp({ storeOpened: false }).catch(() => false);
    const storeOpened = await openStoreReviewPage();
    if (storeOpened) {
      void recordVipSurveyReviewClickFromApp({ storeOpened: true }).catch(() => false);
      // Ушёл писать отзыв → помечаем как оценившего, чтобы другие rate-окна не всплывали.
      void markReviewRated().catch(() => {});
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View testID="vip-survey-review-prompt" style={[styles.card, { paddingBottom: Math.max(22, bottomInset + 14), backgroundColor: t.bgCard, borderColor: t.border, borderRadius: 22, overflow: 'hidden' }]}>
          <TouchableOpacity
            testID="vip-survey-review-close"
            activeOpacity={0.76}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })}
            onPress={close}
            style={[styles.closeButton, { backgroundColor: isDark ? '#17202A' : '#EEF2F7', borderColor: t.border, borderRadius: 17, overflow: 'hidden' }]}
          >
            <Ionicons name="close" size={20} color={t.textPrimary} />
          </TouchableOpacity>

          <View style={[styles.iconWrap, { backgroundColor: 'rgba(34,197,94,0.14)', borderRadius: 29, borderWidth: 0, borderColor: 'transparent', overflow: 'hidden' }]}>
            <Ionicons name="star" size={28} color={monoIcon(themeMode, '#22C55E')} />
          </View>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: Math.max(22, f.h2) }]}>
            {triLang(lang, {
              ru: 'Твой Plus активирован',
              uk: 'Твій Plus активовано',
              es: 'Tu Plus está activo',
              'pt-BR': 'Seu Plus está ativo',
              vi: 'Plus của bạn đã kích hoạt',
              id: 'Plus-mu sudah aktif',
              tr: 'Plus’ın aktif',
              pl: 'Twój Plus jest aktywny',
            })}
          </Text>
          <Text style={[styles.body, { color: t.textMuted, fontSize: f.body }]}>
            {triLang(lang, {
              ru: 'Хочешь поделиться впечатлением о Phraseman? Честный отзыв поможет другим людям понять, чего ждать от приложения.',
              uk: 'Хочеш поділитися враженням про Phraseman? Чесний відгук допоможе іншим людям зрозуміти, чого чекати від застосунку.',
              es: '¿Quieres compartir tu impresión de Phraseman? Una reseña honesta ayuda a otras personas a saber qué esperar de la app.',
              'pt-BR': 'Quer compartilhar sua impressão do Phraseman? Uma avaliação honesta ajuda outras pessoas a saber o que esperar do app.',
              vi: 'Bạn muốn chia sẻ cảm nhận về Phraseman? Một đánh giá chân thật giúp người khác biết nên mong đợi gì từ ứng dụng.',
              id: 'Mau berbagi kesanmu tentang Phraseman? Ulasan yang jujur membantu orang lain tahu apa yang bisa diharapkan dari aplikasi ini.',
              tr: 'Phraseman hakkındaki izlenimini paylaşmak ister misin? Dürüst bir değerlendirme, başkalarının uygulamadan ne bekleyeceğini anlamasına yardımcı olur.',
              pl: 'Chcesz podzielić się wrażeniami o Phraseman? Szczera recenzja pomoże innym zrozumieć, czego oczekiwać od aplikacji.',
            })}
          </Text>
          <TouchableOpacity
            testID="vip-survey-review-write"
            activeOpacity={0.88}
            accessibilityRole="button"
            onPress={openReview}
            style={[styles.primaryButton, { backgroundColor: '#16A34A', borderRadius: 16, borderWidth: 0, borderColor: 'transparent', overflow: 'hidden' }]}
          >
            <Ionicons name="create-outline" size={19} color={t.correctText} />
            <Text style={[styles.primaryText, { fontSize: f.body, color: t.correctText }]}>
              {triLang(lang, { ru: 'Написать отзыв', uk: 'Написати відгук', es: 'Escribir reseña', 'pt-BR': 'Escrever avaliação', vi: 'Viết đánh giá', id: 'Tulis ulasan', tr: 'Değerlendirme yaz', pl: 'Napisz recenzję' })}
            </Text>
          </TouchableOpacity>
          {/* Единый стандарт: текстовая «Позже» под primary (раньше отказ был
              только через крестик/фон). */}
          <TouchableOpacity
            testID="vip-survey-review-later"
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, { ru: 'Позже', uk: 'Пізніше', es: 'Más tarde', 'pt-BR': 'Mais tarde', vi: 'Để sau', id: 'Nanti saja', tr: 'Daha sonra', pl: 'Później' })}
            onPress={close}
            style={styles.laterButton}
          >
            <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '600', textAlign: 'center' }}>
              {triLang(lang, { ru: 'Позже', uk: 'Пізніше', es: 'Más tarde', 'pt-BR': 'Mais tarde', vi: 'Để sau', id: 'Nanti saja', tr: 'Daha sonra', pl: 'Później' })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default memo(VipSurveyReviewPromptModal);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: 'rgba(0,0,0,0.56)',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    borderRadius: 22,
    borderWidth: 0,
    padding: 22,
    paddingTop: 24,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,197,94,0.14)',
    marginBottom: 14,
  },
  title: {
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#16A34A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    width: '100%',
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  laterButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 4,
    minHeight: 40,
    justifyContent: 'center',
  },
});
