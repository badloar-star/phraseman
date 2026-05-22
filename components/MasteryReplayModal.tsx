import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from './SafeLinearGradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from './ThemeContext';
import { PAYWALL_MODAL } from './paywallModalPalette';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticTap, hapticSuccess } from '../hooks/use-haptics';
import {
  executeReplay,
  getMasteryReplayPriceShards,
  MASTERY_REPLAY_BASE_SHARDS,
  MASTERY_REPLAY_PRICE_STEP_SHARDS,
} from '../app/mastery';
import { getShardsBalance } from '../app/shards_system';
import { oskolokImageForPackShards } from '../app/oskolok';
import { emitAppEvent } from '../app/events';
import { navigateAfterModalClose } from '../app/safe_modal_navigation';
import PremiumGoldButton from './PremiumGoldButton';
import type { StudyTargetLang } from '../app/study_target_lang_dev';

export interface MasteryReplayModalProps {
  visible: boolean;
  lessonId: number;
  isPremium: boolean;
  studyTarget?: StudyTargetLang;
  onClose: () => void;
  /** После успешного списания / бесплатного повтора; родитель должен обновить экран урока. */
  onReplayed?: (lessonId: number) => void;
}

/**
 * Confirm-модалка перепрохождения урока.
 * Free: Premium (золото) → перепройти за осколки → отмена.
 * Premium: перепройти бесплатно → отмена.
 */
export default function MasteryReplayModal({
  visible,
  lessonId,
  isPremium,
  studyTarget,
  onClose,
  onReplayed,
}: MasteryReplayModalProps) {
  const router = useRouter();
  const { f, themeMode } = useTheme();
  const { lang } = useLang();
  const [busy, setBusy] = useState(false);
  const [priceShards, setPriceShards] = useState(MASTERY_REPLAY_BASE_SHARDS);

  const isLight = false;

  useEffect(() => {
    if (!visible || !Number.isFinite(lessonId) || lessonId <= 0) return;
    let cancelled = false;
    void getMasteryReplayPriceShards(lessonId, studyTarget).then((p) => {
      if (!cancelled) setPriceShards(p);
    });
    return () => { cancelled = true; };
  }, [visible, lessonId, studyTarget]);

  const onConfirmReplay = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Premium = бесплатно. Free — проверим баланс перед showing шопа.
      if (!isPremium) {
        const needPrice = await getMasteryReplayPriceShards(lessonId, studyTarget);
        const balance = await getShardsBalance();
        if (balance < needPrice) {
          const need = Math.max(0, needPrice - balance);
          navigateAfterModalClose(onClose, () => {
            router.push({
              pathname: '/shards_shop',
              params: { need: String(need), source: 'mastery' },
            } as any);
          });
          return;
        }
      }
      const r = await executeReplay(lessonId, isPremium, studyTarget);
      if (r.ok) {
        hapticSuccess();
        if (!isPremium) {
          emitAppEvent('action_toast', {
            type: 'success',
            messageRu: `Готово · списано ${r.spent} осколков`,
            messageUk: `Готово · списано ${r.spent} осколків`,
            messageEs: `Listo · ${r.spent} fragmentos descontados`,
          });
        } else {
          emitAppEvent('action_toast', {
            type: 'success',
            messageRu: 'Можно проходить снова',
            messageUk: 'Можна проходити знову',
            messageEs: 'Puedes volver a practicar',
          });
        }
        onReplayed?.(lessonId);
        onClose();
        return;
      }
      const replayFailure = r as { ok: false; reason: 'insufficient_shards' | 'not_finished_yet' };
      if (replayFailure.reason === 'insufficient_shards') {
        const priceAtFail = await getMasteryReplayPriceShards(lessonId, studyTarget);
        const balance2 = await getShardsBalance();
        const need = Math.max(0, priceAtFail - balance2);
        navigateAfterModalClose(onClose, () => {
          router.push({
            pathname: '/shards_shop',
            params: { need: String(need), source: 'mastery' },
          } as any);
        });
        return;
      }
      if (replayFailure.reason === 'not_finished_yet') {
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu: 'Сначала пройди урок до конца — потом сможешь повторять.',
          messageUk: 'Спочатку пройди урок до кінця — потім зможеш повторювати.',
          messageEs: 'Primero termina la lección, después podrás repetirla.',
        });
        onClose();
        return;
      }
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Не удалось оформить повтор. Попробуй снова.',
        messageUk: 'Не вдалося оформити повтор. Спробуй знову.',
        messageEs: 'No se pudo confirmar la repetición. Inténtalo de nuevo.',
      });
    } finally {
      setBusy(false);
    }
  }, [busy, isPremium, lessonId, onClose, onReplayed, router, studyTarget]);

  const onTapPremium = useCallback(() => {
    navigateAfterModalClose(onClose, () => {
      router.push({
        pathname: '/premium_modal',
        params: { context: 'mastery', lesson: String(lessonId) },
      } as any);
    });
  }, [lessonId, onClose, router]);

  const GOLD_GRADIENT = ['#5C4818', '#9A7B1A', '#D4AF37', '#F0D060', '#D4AF37', '#8A6B12'] as const;

  const title = triLang(lang, {
    ru: 'Пройти урок снова?',
    uk: 'Пройти урок знову?',
    es: '¿Volver a hacer la lección?',
    'pt-BR': 'Refazer a lição?',
    vi: 'Làm lại bài học?',
    id: 'Ulangi pelajaran?',
    tr: 'Dersi yeniden yap?',
    pl: 'Powtórzyć lekcję?',
  });
  const subtitle = triLang(lang, {
    ru: `Каждое повторное перепрохождение урока делает его на ${MASTERY_REPLAY_PRICE_STEP_SHARDS} осколков дороже.`,
    uk: `Кожне повторне проходження уроку робить його на ${MASTERY_REPLAY_PRICE_STEP_SHARDS} осколків дорожчим.`,
    es: `Cada vez que repites la lección, cuesta ${MASTERY_REPLAY_PRICE_STEP_SHARDS} fragmentos más.`,
    'pt-BR': `Cada repetição da lição fica ${MASTERY_REPLAY_PRICE_STEP_SHARDS} fragmentos mais cara.`,
    vi: `Mỗi lần làm lại bài học sẽ tốn thêm ${MASTERY_REPLAY_PRICE_STEP_SHARDS} mảnh.`,
    id: `Setiap kali kamu mengulang pelajaran, biayanya bertambah ${MASTERY_REPLAY_PRICE_STEP_SHARDS} fragmen.`,
    tr: `Dersi her tekrar ettiğinde maliyeti ${MASTERY_REPLAY_PRICE_STEP_SHARDS} parça artar.`,
    pl: `Każde powtórzenie lekcji kosztuje o ${MASTERY_REPLAY_PRICE_STEP_SHARDS} odłamków więcej.`,
  });
  const replayAgainLabel = triLang(lang, {
    ru: 'Пройти снова',
    uk: 'Пройти знову',
    es: 'Otra vez',
    'pt-BR': 'Refazer',
    vi: 'Làm lại',
    id: 'Ulangi',
    tr: 'Tekrar yap',
    pl: 'Jeszcze raz',
  });
  const premiumLabel = triLang(lang, {
    ru: 'Премиум — безлимит',
    uk: 'Преміум — безліміт',
    es: 'Premium — ilimitado',
    'pt-BR': 'Premium — sem limite',
    vi: 'Premium — không giới hạn',
    id: 'Premium — tanpa batas',
    tr: 'Premium — sınırsız',
    pl: 'Premium — bez limitu',
  });
  const replayPremiumLabel = triLang(lang, {
    ru: 'Пройти снова',
    uk: 'Пройти знову',
    es: 'Otra vez',
    'pt-BR': 'Refazer',
    vi: 'Làm lại',
    id: 'Ulangi',
    tr: 'Tekrar yap',
    pl: 'Jeszcze raz',
  });
  const cancelLabel = triLang(lang, {
    ru: 'Отмена',
    uk: 'Скасувати',
    es: 'Cancelar',
    'pt-BR': 'Cancelar',
    vi: 'Hủy',
    id: 'Batal',
    tr: 'İptal',
    pl: 'Anuluj',
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={false && busy ? undefined : onClose}>
      <View style={styles.root}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.74)' }]}
          onPress={() => {
            if (busy) return;
            hapticTap();
            onClose();
          }}
        />
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={[`${PAYWALL_MODAL.gold}14`, 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.6 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View style={styles.cardWrap} pointerEvents="box-none">
          <View
            style={[
              styles.card,
              {
                backgroundColor: PAYWALL_MODAL.cardBg,
                borderColor: PAYWALL_MODAL.border,
                borderWidth: 1,
                shadowColor: PAYWALL_MODAL.shadow,
                shadowOpacity: isLight ? PAYWALL_MODAL.shadowOpacityLight : PAYWALL_MODAL.shadowOpacityDark,
              },
            ]}
          >
            <LinearGradient
              colors={[`${PAYWALL_MODAL.gold}18`, 'transparent']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.cardGlow}
              pointerEvents="none"
            />
            <View style={styles.iconShell}>
              <Ionicons name="refresh" size={30} color={PAYWALL_MODAL.gold} />
            </View>
            <Text style={[styles.title, { color: PAYWALL_MODAL.title, fontSize: f.h2 }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: PAYWALL_MODAL.subtitle, fontSize: f.body }]}>{subtitle}</Text>

            {!isPremium && (
              <PremiumGoldButton
                f={f}
                paywallContext="mastery"
                customLabel={premiumLabel}
                onPress={onTapPremium}
                cornerRadius={26}
                shellStyle={{ marginTop: 8 }}
              />
            )}

            <TouchableOpacity
              onPress={() => {
                hapticTap();
                void onConfirmReplay();
              }}
              disabled={busy}
              activeOpacity={0.88}
              style={[
                isPremium ? styles.replayPremiumShell : styles.shardReplayShell,
                { opacity: busy ? 0.65 : 1, marginTop: 10 },
              ]}
            >
              {isPremium ? (
                <LinearGradient
                  colors={[...GOLD_GRADIENT]}
                  locations={[0, 0.22, 0.45, 0.55, 0.78, 1]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.replayGrad}
                >
                  {false && busy ? (
                    <View />
                  ) : (
                    <Text style={[styles.replayPremiumText, { color: '#1a1206', fontSize: f.body }]}>
                      {replayPremiumLabel}
                    </Text>
                  )}
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.shardReplayInner,
                    { borderColor: PAYWALL_MODAL.border, backgroundColor: PAYWALL_MODAL.goldSoft },
                  ]}
                >
                  {false && busy ? (
                    <View />
                  ) : (
                    <View style={styles.btnRow}>
                      <Image
                        source={oskolokImageForPackShards(priceShards)}
                        style={{ width: 30, height: 30 }}
                        resizeMode="contain"
                      />
                      <Text
                        style={[
                          styles.shardReplayLabel,
                          { color: PAYWALL_MODAL.title, fontSize: f.body, textAlign: 'center' },
                        ]}
                      >
                        {replayAgainLabel}
                      </Text>
                      <Text style={[styles.shardReplayPrice, { color: PAYWALL_MODAL.title, fontSize: f.body }]}>
                        {priceShards}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (busy) return;
                hapticTap();
                onClose();
              }}
              disabled={busy}
              style={[styles.btnGhost, { borderColor: PAYWALL_MODAL.goldLine, opacity: busy ? 0.55 : 1 }]}
            >
              <Text style={[styles.btnGhostText, { color: PAYWALL_MODAL.subtitle, fontSize: f.body }]}>{cancelLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  backdrop: { ...StyleSheet.absoluteFillObject },
  cardWrap: { width: '100%', maxWidth: 380, zIndex: 1 },
  card: {
    borderRadius: 26,
    padding: 26,
    width: '100%',
    alignItems: 'center',
    gap: 12,
    elevation: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  iconShell: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#12110F',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontWeight: '900', textAlign: 'center' },
  subtitle: { lineHeight: 22, textAlign: 'center', alignSelf: 'stretch', paddingHorizontal: 4 },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    alignSelf: 'stretch',
  },
  /** Повтор за осколки — как «Восстановить энергию» в NoEnergyModal */
  shardReplayShell: { alignSelf: 'stretch', borderRadius: 26, overflow: 'hidden' },
  shardReplayInner: {
    borderRadius: 26,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shardReplayLabel: { fontWeight: '800' },
  shardReplayPrice: { fontWeight: '900', minWidth: 18, textAlign: 'center' },
  /** Premium-пользователь: основное действие — градиент как «Понятно» */
  replayPremiumShell: {
    alignSelf: 'stretch',
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#B8860B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  replayGrad: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  replayPremiumText: { fontWeight: '800', textAlign: 'center' },
  btnGhost: {
    alignSelf: 'stretch',
    borderRadius: 26,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  btnGhostText: { fontWeight: '700' },
});
