import React, { useMemo, useState } from 'react';
import { Image, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { oskolokImageForPackShards } from '../app/oskolok';
import {
  claimAndDismissGlobalBroadcastModal,
  getGlobalBroadcastRewardBadge,
  getReviewPromoUrl,
  GlobalBroadcastModalPayload,
  recordReviewPromoClick,
} from '../app/global_broadcast_modal';
import { triLang } from '../constants/i18n';

type Props = {
  payload: GlobalBroadcastModalPayload | null;
  visible: boolean;
  onClose: () => void;
  previewOnly?: boolean;
};

export default function GlobalBroadcastModal({ payload, visible, onClose, previewOnly = false }: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  const title = useMemo(() => {
    if (!payload) return '';
    return triLang(lang, { ru: payload.titleRu, uk: payload.titleUk, es: payload.titleEs });
  }, [lang, payload]);

  const body = useMemo(() => {
    if (!payload) return '';
    return triLang(lang, { ru: payload.messageRu, uk: payload.messageUk, es: payload.messageEs });
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
    if (previewOnly) {
      onClose();
      return;
    }
    setBusy(true);
    try {
      await claimAndDismissGlobalBroadcastModal(payload);
      if (reward) hapticSuccess();
    } finally {
      setBusy(false);
      onClose();
    }
  };

  const openReview = async () => {
    if (!payload || busy) return;
    hapticTap();
    if (previewOnly) {
      onClose();
      return;
    }
    setBusy(true);
    try {
      await recordReviewPromoClick(payload);
      await claimAndDismissGlobalBroadcastModal(payload);
      const url = getReviewPromoUrl(payload);
      if (url) await Linking.openURL(url);
    } finally {
      setBusy(false);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => { void closeOnce(); }}
    >
      <View style={[styles.root, { backgroundColor: dimColor, paddingBottom: insets.bottom }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => { void closeOnce(); }}
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, {
            uk: 'Закрити повідомлення',
            ru: 'Закрыть сообщение',
            es: 'Cerrar mensaje',
          })}
        />
        <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.accent }]}>
          <Text style={styles.emoji}>{'📣'}</Text>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>{title}</Text>
          <Text style={[styles.body, { color: t.textSecond, fontSize: f.body }]}>{body}</Text>

          {reward && (
            <View style={styles.rewardBlock}>
              {shardsAmount > 0 ? (
                <Image source={oskolokImageForPackShards(shardsAmount)} style={styles.oskolokImg} resizeMode="contain" />
              ) : (
                <Text style={styles.rewardEmoji}>{reward.icon}</Text>
              )}
              <Text style={[styles.rewardLine, { color: t.accent, fontSize: f.bodyLg }]}>
                {triLang(lang, { ru: reward.labelRu, uk: reward.labelUk, es: reward.labelEs })}
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
                })}
              </Text>
            </View>
          )}

          <Pressable
            disabled={busy}
            onPress={() => { void (isReviewPromo ? openReview() : closeOnce()); }}
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: t.accent, opacity: pressed || busy ? 0.85 : 1 },
            ]}
          >
            {false && busy ? (
              <View />
            ) : (
              <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.bodyLg }}>
                {isReviewPromo && payload
                  ? triLang(lang, { ru: payload.reviewCtaRu, uk: payload.reviewCtaUk, es: payload.reviewCtaEs })
                  : triLang(lang, { ru: 'Понятно', uk: 'Зрозуміло', es: 'Entendido' })}
              </Text>
            )}
          </Pressable>
          {isReviewPromo && (
            <Pressable disabled={busy} onPress={() => { void closeOnce(); }} style={styles.secondaryBtn}>
              <Text style={{ color: t.textMuted, fontWeight: '700', fontSize: f.body }}>
                {triLang(lang, { ru: 'Позже', uk: 'Пізніше', es: 'Más tarde' })}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

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
    borderWidth: 1.5,
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
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginTop: 4,
  },
});
