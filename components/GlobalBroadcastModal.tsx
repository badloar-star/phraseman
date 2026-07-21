import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import React, { memo, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { useStudyTarget } from './StudyTargetContext';
import CompassDepthSurface from './CompassDepthSurface';
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
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';
import { triLang } from '../constants/i18n';

type Props = {
  payload: GlobalBroadcastModalPayload | null;
  visible: boolean;
  onClose: () => void;
  previewOnly?: boolean;
};

function GlobalBroadcastModal({ payload, visible, onClose, previewOnly = false }: Props) {
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
  const isCompassTheme = false;
  const dimColor = 'rgba(0,0,0,0.62)';

  const closeOnce = async () => {
    if (!payload || busy) return;
    hapticTap();
    if (previewOnly) {
      onClose();
      return;
    }
    setBusy(true);
    onClose();
    void claimAndDismissGlobalBroadcastModal(payload, studyTarget).then(() => {
      if (reward) hapticSuccess();
    }).catch(() => {}).finally(() => {
      setBusy(false);
    });
  };

  const openReview = async () => {
    if (!payload || busy) return;
    hapticTap();
    if (previewOnly) {
      onClose();
      return;
    }
    setBusy(true);
    onClose();
    const url = getReviewPromoUrl(payload);
    if (url) void Linking.openURL(url).catch(() => {});
    void (async () => {
      await recordReviewPromoClick(payload);
      await claimAndDismissGlobalBroadcastModal(payload, studyTarget);
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
          isCompassTheme && compassShadow(3),
          {
            backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
            borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : t.accent,
            borderRadius: isCompassTheme ? 14 : 20,
            overflow: isCompassTheme ? 'hidden' : 'visible',
          },
        ]}>
          {isCompassTheme && <CompassDepthSurface radius={14} selected />}
          <Text style={styles.emoji}>{'📣'}</Text>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>{title}</Text>
          <Text style={[styles.body, { color: t.textSecond, fontSize: f.body }]}>{body}</Text>

          {reward && (
            <View style={[
              styles.rewardBlock,
              isCompassTheme && compassShadow(1),
              isCompassTheme && {
                borderRadius: 10,
                borderWidth: 0,
                borderColor: COMPASS_RICH.hairlineQuiet,
                backgroundColor: COMPASS_RICH.charcoal,
                overflow: 'hidden',
                paddingHorizontal: 14,
                paddingVertical: 12,
              },
            ]}>
              {isCompassTheme && <CompassDepthSurface radius={10} quiet />}
              {shardsAmount > 0 ? (
                <Image source={oskolokImageForPackShards(shardsAmount)} style={styles.oskolokImg} contentFit="contain" />
              ) : (
                <Text style={styles.rewardEmoji}>{reward.icon}</Text>
              )}
              <Text style={[styles.rewardLine, { color: isCompassTheme ? COMPASS_RICH.champagne : t.accent, fontSize: f.bodyLg }]}>
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
            <View style={[
              styles.reviewNote,
              isCompassTheme && {
                borderRadius: 9,
                borderWidth: 0,
                borderColor: COMPASS_RICH.hairlineQuiet,
                backgroundColor: COMPASS_RICH.mist,
                paddingVertical: 8,
              },
            ]}>
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

          <Pressable
            disabled={busy}
            onPress={() => { void (isReviewPromo ? openReview() : closeOnce()); }}
            style={({ pressed }) => [
              styles.btn,
              isCompassTheme && compassShadow(2),
              {
                backgroundColor: isCompassTheme ? 'transparent' : t.accent,
                borderRadius: isCompassTheme ? 10 : 14,
                borderWidth: 0,
                borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : 'transparent',
                overflow: isCompassTheme ? 'hidden' : 'visible',
                opacity: pressed || busy ? 0.85 : 1,
              },
            ]}
          >
            {isCompassTheme && <CompassDepthSurface radius={10} cream />}
            {false && busy ? (
              <View />
            ) : (
              <Text style={{ color: isCompassTheme ? COMPASS_RICH.textDark : t.correctText, fontWeight: '800', fontSize: f.bodyLg }}>
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
            )}
          </Pressable>
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
  emoji: {
    fontSize: 44,
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
  btn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 12,
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
