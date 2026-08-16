import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import React, { memo, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { useStudyTarget } from './StudyTargetContext';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { oskolokImageForPackShards } from '../app/oskolok';
import {
  claimAndDismissGlobalBroadcastModal,
  getGlobalBroadcastRewardBadge,
  getReviewPromoUrl,
  GlobalBroadcastModalPayload,
  recordReviewPromoClick,
} from '../app/global_broadcast_modal';
import { triLang } from '../constants/i18n';
import { monoIcon } from '../constants/monoIcon';
import FullscreenHybridEntrance from './feedback/FullscreenHybridEntrance';
import DuoPressable from './DuoPressable';

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
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const [busy, setBusy] = useState(false);

  const title = useMemo(() => {
    if (!payload) return '';
    return triLang(lang, {
      ru: payload.titleRu,
      uk: payload.titleUk,
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
  const shardsAmount = payload?.rewardType === 'shards'
    ? Math.max(0, Math.floor(Number(payload.rewardAmount ?? 0)))
    : 0;
  const dimColor = 'rgba(0,0,0,0.62)';

  const closeOnce = async () => {
    if (!payload || busy) return;
    hapticTap();
    setBusy(true);
    void (async () => {
      await claimAndDismissGlobalBroadcastModal(payload, studyTarget);
      if (reward) hapticSuccess();
      onClose();
    })().catch(() => {}).finally(() => {
      setBusy(false);
    });
  };

  const openReview = async () => {
    if (!payload || busy) return;
    hapticTap();
    setBusy(true);
    const url = getReviewPromoUrl(payload);
    if (url) void Linking.openURL(url).catch(() => {});
    void (async () => {
      await recordReviewPromoClick(payload);
      await claimAndDismissGlobalBroadcastModal(payload, studyTarget);
      onClose();
    })().catch(() => {}).finally(() => {
      setBusy(false);
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => { void closeOnce(); }}
    >
      <View style={[styles.root, { backgroundColor: dimColor, paddingBottom: bottomInset }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => { void closeOnce(); }}
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, {
            uk: 'Закрити повідомлення',
            ru: 'Закрыть сообщение',
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
            backgroundColor: t.bgCard,
            borderRadius: 20,
            overflow: 'visible',
          },
        ]}>
          <Ionicons name="megaphone-outline" size={44} color={t.accent} style={styles.icon} />
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>{title}</Text>
          <Text style={[styles.body, { color: t.textSecond, fontSize: f.body }]}>{body}</Text>

          {reward && (
            <View style={styles.rewardBlock}>
              {shardsAmount > 0 ? (
                <Image source={oskolokImageForPackShards(shardsAmount)} style={styles.oskolokImg} contentFit="contain" />
              ) : (
                <Text style={styles.rewardEmoji}>{reward.icon}</Text>
              )}
              <Text style={[styles.rewardLine, { color: t.accent, fontSize: f.bodyLg }]}>
                {triLang(lang, {
                  ru: reward.labelRu,
                  uk: reward.labelUk,
                  es: reward.labelEs,
                  'pt-BR': reward.labelPtBr,
                  vi: reward.labelVi,
                  id: reward.labelId,
                  tr: reward.labelTr,
                  pl: reward.labelPl,
                })}
              </Text>
            </View>
          )}

          {isReviewPromo && (
            <View style={styles.reviewNote}>
              <Text style={[styles.reviewNoteText, { color: t.textMuted, fontSize: f.caption }]}>
                {triLang(lang, {
                  ru: 'Откроется страница приложения в магазине.',
                  uk: 'Відкриється сторінка застосунку в магазині.',
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
            edgeColor={t.bgSurface2}
            edgeHeight={4}
            wrapStyle={styles.btnWrap}
            style={[
              styles.btn,
              {
                backgroundColor: t.accent,
                borderRadius: 14,
              },
            ]}
          >
            <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.bodyLg }}>
              {isReviewPromo && payload
                ? triLang(lang, {
                  ru: payload.reviewCtaRu,
                  uk: payload.reviewCtaUk,
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
              onPress={() => { void closeOnce(); }}
              style={styles.secondaryBtn}
            >
              <Text style={{ color: t.textMuted, fontWeight: '600', fontSize: f.body, textAlign: 'center' }}>
                {triLang(lang, {
                  ru: 'Позже',
                  uk: 'Пізніше',
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
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 0,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 6,
  },
  title: {
    textAlign: 'center',
    fontWeight: '800',
    marginBottom: 8,
  },
  body: {
    textAlign: 'center',
    lineHeight: 22,
  },
  rewardBlock: {
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 8,
  },
  oskolokImg: {
    width: 108,
    height: 92,
  },
  rewardLine: {
    marginTop: 6,
    fontWeight: '800',
    textAlign: 'center',
  },
  rewardEmoji: {
    fontSize: 44,
    lineHeight: 50,
  },
  reviewNote: {
    marginTop: 12,
    paddingHorizontal: 10,
  },
  reviewNoteText: {
    textAlign: 'center',
    lineHeight: 18,
  },
  btnWrap: {
    width: '100%',
    marginTop: 12,
  },
  btn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    minHeight: 52,
  },
  secondaryBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 4,
    minHeight: 40,
    justifyContent: 'center',
  },
});
