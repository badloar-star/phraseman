import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import React, { memo, useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { useStudyTarget } from './StudyTargetContext';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import RuneGlyph from './RuneGlyph';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  closeGlobalBroadcastModalAndClaimInBackground,
  getGlobalBroadcastRewardBadge,
  getReviewPromoUrl,
  GlobalBroadcastModalPayload,
  recordReviewPromoClick,
} from '../app/global_broadcast_modal';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import FullscreenHybridEntrance from './feedback/FullscreenHybridEntrance';
import DuoPressable from './DuoPressable';
import { nestedBoxShadow, plateBoxShadow } from './v2/ShadowSurface';

type Props = {
  payload: GlobalBroadcastModalPayload | null;
  visible: boolean;
  onClose: () => void;
  /**
   * зачем: гибрид «Световод + Чекан» (.motion-mockups/phraseman-hybrid.html,
   * семья «Полноэкранные») — сцена входит из света, контент каскадом. Боевой
   * дефолт — 'classic', ничего не меняется без явного включения.
   */
  motionVariant?: 'classic' | 'hybrid';
};

function GlobalBroadcastModal({ payload, visible, onClose, motionVariant = 'classic' }: Props) {
  // зачем: окно «Сообщение команды» (макет system.html SYS-07) — Liquid Glass 13 тем;
  // цвет берём из токенов активной темы, а не из зелёного бренд-акцента.
  const { f, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const [busy, setBusy] = useState(false);
  // окно закрывается сразу, без ожидания сети — блокировка от двойного тапа снимается на следующей рассылке
  useEffect(() => { setBusy(false); }, [payload?.id]);

  const title = useMemo(() => {
    if (!payload) return '';
    return triLang(lang, {
      ru: payload.titleRu,
      uk: payload.titleUk,
      en: payload.titleEn,
      es: payload.titleEs,
      'pt-BR': payload.titlePtBr,
      vi: payload.titleVi,
      id: payload.titleId,
      tr: payload.titleTr,
      pl: payload.titlePl,
    });
  }, [lang, payload]);

  const body = useMemo(() => {
    if (!payload) return '';
    return triLang(lang, {
      ru: payload.messageRu,
      uk: payload.messageUk,
      en: payload.messageEn,
      es: payload.messageEs,
      'pt-BR': payload.messagePtBr,
      vi: payload.messageVi,
      id: payload.messageId,
      tr: payload.messageTr,
      pl: payload.messagePl,
    });
  }, [lang, payload]);

  const reward = payload ? getGlobalBroadcastRewardBadge(payload) : null;
  const isReviewPromo = payload?.kind === 'review_promo';
  // зачем: D104 — награда рассылки теперь монетами; жемчужную картинку убрали.
  const isCoinReward = payload?.rewardType === 'coins';
  const dimColor = 'rgba(0,0,0,0.62)';

  // зачем (R58 #5, аудит кнопок 15.10): закрытие ждало сеть — без сети окно было не закрыть. Теперь окно закрывается сразу,
  // получение награды идёт фоном с повторами (global_broadcast_modal), вибрация успеха — когда начисление подтвердилось.
  const closeOnce = async () => {
    if (!payload || busy) return;
    hapticTap();
    setBusy(true);
    closeGlobalBroadcastModalAndClaimInBackground(payload, studyTarget, reward ? hapticSuccess : undefined);
    onClose();
  };

  const openReview = async () => {
    if (!payload || busy) return;
    hapticTap();
    setBusy(true);
    const url = getReviewPromoUrl(payload);
    if (url) void Linking.openURL(url).catch((e) => { console.warn('[GLOBAL-BROADCAST] openURL failed', e); });
    void recordReviewPromoClick(payload).catch((e) => { console.warn('[GLOBAL-BROADCAST] review click record failed', e); });
    closeGlobalBroadcastModalAndClaimInBackground(payload, studyTarget);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => { void closeOnce(); }}
    >
      <View style={[styles.root, { backgroundColor: dimColor, paddingTop: Math.max(24, insets.top), paddingBottom: Math.max(24, bottomInset) }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => { void closeOnce(); }}
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, {
            uk: 'Закрити повідомлення',
            ru: 'Закрыть сообщение',
            en: 'Close message',
            es: 'Cerrar mensaje',
            'pt-BR': 'Fechar mensagem',
            vi: 'Đóng thông báo',
            id: 'Tutup pesan',
            tr: 'Mesajı kapat',
            pl: 'Zamknij wiadomość',
          })}
        />
        <View style={[
          styles.card,
          {
            backgroundColor: glass.opaqueSheet,
            boxShadow: plateBoxShadow(glass),
          },
        ]}>
          <ScrollView style={{ flexShrink: 1, minHeight: 0, width: '100%' }} contentContainerStyle={{ alignItems: 'center' }} keyboardShouldPersistTaps="handled" decelerationRate="fast">
          <Text style={[styles.eyebrow, { color: glass.secondary }]}>
            {triLang(lang, { ru: 'Сообщение команды', uk: 'Повідомлення команди', en: 'Message from the team', es: 'Mensaje del equipo', 'pt-BR': 'Mensagem da equipe', vi: 'Tin nhắn từ đội ngũ', id: 'Pesan dari tim', tr: 'Ekipten mesaj', pl: 'Wiadomość od zespołu' })}
          </Text>
          <Text accessibilityRole="header" style={[styles.title, { color: glass.text }]}>{title}</Text>
          <Text style={[styles.body, { color: glass.secondary }]}>{body}</Text>

          {reward && (
            <View style={styles.rewardBlock}>
              {isCoinReward ? (
                // зачем: паритет с макетом system.html system_16 — награда монетами это пилюля «монета + число».
                <View style={[styles.coinPill, { backgroundColor: glass.opaqueControl, boxShadow: nestedBoxShadow(glass) }]}>
                  <RuneGlyph size={20} color={glass.text} />
                  <Text style={[styles.coinPillNum, { color: glass.text }]}>{String(payload?.rewardAmount ?? '')}</Text>
                </View>
              ) : (
                // зачем (координатор 13.10): имя значка ('cube') выводилось ТЕКСТОМ; тип GlobalBroadcastRewardIconName — имена Ionicons,
                // 'rune' — собственный RuneGlyph (как в пилюле монет выше).
                reward.icon === 'rune'
                  ? <RuneGlyph size={44} color={glass.text} />
                  : <Ionicons testID="global-broadcast-reward-icon" name={reward.icon} size={44} color={glass.text} />
              )}
              {!isCoinReward ? (
              <Text style={[styles.rewardLine, { color: glass.text, fontSize: f.bodyLg }]}>
                {triLang(lang, {
                  ru: reward.labelRu,
                  uk: reward.labelUk,
                  en: reward.labelEn,
                  es: reward.labelEs,
                  'pt-BR': reward.labelPtBr,
                  vi: reward.labelVi,
                  id: reward.labelId,
                  tr: reward.labelTr,
                  pl: reward.labelPl,
                })}
              </Text>
              ) : null}
            </View>
          )}

          {isReviewPromo && (
            <View style={styles.reviewNote}>
              <Text style={[styles.reviewNoteText, { color: glass.secondary }]}>
                {triLang(lang, {
                  ru: 'Откроется страница приложения в магазине.',
                  uk: 'Відкриється сторінка застосунку в магазині.',
                  en: "The app's store page will open.",
                  es: 'Se abrirá la página de la app en la tienda.',
                  'pt-BR': 'A página do app na loja será aberta.',
                  vi: 'Trang ứng dụng trong cửa hàng sẽ được mở.',
                  id: 'Halaman aplikasi di toko akan dibuka.',
                  tr: 'Uygulamanın mağaza sayfası açılacak.',
                  pl: 'Otworzy się strona aplikacji w sklepie.',
                })}
              </Text>
            </View>
          )}

          <DuoPressable
            disabled={busy}
            onPress={() => { void (isReviewPromo ? openReview() : closeOnce()); }}
            edgeColor={glass.opaqueControl}
            edgeHeight={0}
            wrapStyle={styles.btnWrap}
            style={[styles.btn, { backgroundColor: glass.accent }]}
          >
            <Text style={{ color: glass.accentInk, fontWeight: '700', fontSize: 16 }}>
              {isReviewPromo && payload
                ? triLang(lang, {
                  ru: payload.reviewCtaRu,
                  uk: payload.reviewCtaUk,
                  en: payload.reviewCtaEn,
                  es: payload.reviewCtaEs,
                  'pt-BR': payload.reviewCtaPtBr,
                  vi: payload.reviewCtaVi,
                  id: payload.reviewCtaId,
                  tr: payload.reviewCtaTr,
                  pl: payload.reviewCtaPl,
                })
                : triLang(lang, {
                  ru: 'Закрыть',
                  uk: 'Закрити',
                  en: 'Got it',
                  es: 'Entendido',
                  'pt-BR': 'Entendi',
                  vi: 'Đã hiểu',
                  id: 'Mengerti',
                  tr: 'Anladım',
                  pl: 'Rozumiem',
                })}
            </Text>
          </DuoPressable>
          {isReviewPromo && (
            <Pressable
              disabled={busy}
              accessibilityRole="button"
              onPress={() => { void closeOnce(); }}
              style={styles.secondaryBtn}
            >
              <Text style={{ color: glass.text, fontWeight: '700', fontSize: 16, textAlign: 'center' }}>
                {triLang(lang, {
                  ru: 'Позже',
                  uk: 'Пізніше',
                  en: 'Later',
                  es: 'Más tarde',
                  'pt-BR': 'Mais tarde',
                  vi: 'Để sau',
                  id: 'Nanti',
                  tr: 'Daha sonra',
                  pl: 'Później',
                })}
              </Text>
            </Pressable>
          )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default memo(GlobalBroadcastModal);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  card: {
    width: '100%',
    maxHeight: '100%',
    maxWidth: 420,
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: 'center',
  },
  // зачем: паритет с макетом system.html system_15 — оверлайн 12/700 (разрядка 3), заголовок 21/700, текст 15.
  eyebrow: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    textAlign: 'center',
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '700',
    marginBottom: 8,
  },
  body: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 21,
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  coinPillNum: { fontSize: 16, fontWeight: '700' },
  rewardBlock: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 0,
  },
  rewardLine: {
    marginTop: 6,
    fontWeight: '700',
    textAlign: 'center',
  },
  reviewNote: {
    marginTop: 12,
    paddingHorizontal: 10,
  },
  reviewNoteText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
  btnWrap: {
    width: '100%',
    marginTop: 20,
  },
  btn: {
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryBtn: {
    width: '100%',
    marginTop: 10,
    minHeight: 48,
    borderRadius: 24,
    justifyContent: 'center',
  },
});
