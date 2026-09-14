import React, { memo, useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { triLang } from '../../constants/i18n';
import { useEnergy, useEnergyCountdown } from '../EnergyContext';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { isEnergyFreeWindowActive } from '../../app/boons/boon_effects_energy';

type Anchor = Readonly<{ x: number; y: number; w: number; h: number }>;
type Props = Readonly<{ anchor: Anchor | null; visible: boolean; onClose: () => void }>;

const POPOVER_WIDTH = 220;
const EDGE_GUTTER = 8;

function copyForLang(lang: Parameters<typeof triLang>[0], recoveryMinutes: number) {
  return {
    cadence: triLang(lang, {
      ru: `1 энергия каждые ${recoveryMinutes} мин`, uk: `1 енергія кожні ${recoveryMinutes} хв`,
      en: `+1 energy point every ${recoveryMinutes} min`, es: `+1 punto de energía cada ${recoveryMinutes} min`,
      'pt-BR': `+1 ponto de energia a cada ${recoveryMinutes} min`, vi: `+1 điểm năng lượng mỗi ${recoveryMinutes} phút`,
      id: `+1 poin energi setiap ${recoveryMinutes} mnt`, tr: `Her ${recoveryMinutes} dakikada +1 enerji puanı`,
      pl: `+1 punkt energii co ${recoveryMinutes} min`,
    }),
    in: triLang(lang, {
      ru: 'Через', uk: 'Через', en: 'In', es: 'En', 'pt-BR': 'Em', vi: 'Trong', id: 'Dalam', tr: 'İçinde', pl: 'Za',
    }),
    video: triLang(lang, {
      ru: 'При просмотре видео энергия восстанавливается в 10 раз быстрее',
      uk: 'Під час перегляду відео енергія відновлюється у 10 разів швидше',
      en: 'Energy recovers 10× faster while watching video',
      es: 'La energía se recupera 10 veces más rápido al ver vídeos',
      'pt-BR': 'A energia se recupera 10 vezes mais rápido ao assistir a vídeos',
      vi: 'Năng lượng hồi phục nhanh gấp 10 lần khi xem video',
      id: 'Energi pulih 10× lebih cepat saat menonton video',
      tr: 'Video izlerken enerji 10 kat daha hızlı yenilenir',
      pl: 'Podczas oglądania wideo energia odnawia się 10 razy szybciej',
    }),
    unlimited: triLang(lang, {
      ru: 'Энергия безлимитная', uk: 'Енергія безлімітна', en: 'Unlimited energy', es: 'Energía ilimitada',
      'pt-BR': 'Energia ilimitada', vi: 'Năng lượng không giới hạn', id: 'Energi tak terbatas',
      tr: 'Sınırsız enerji', pl: 'Nieograniczona energia',
    }),
    freeWindow: triLang(lang, {
      ru: 'Сейчас занятия не тратят энергию', uk: 'Зараз заняття не витрачають енергію',
      en: 'Activities do not use energy right now', es: 'Las actividades no gastan energía ahora',
      'pt-BR': 'As atividades não gastam energia agora', vi: 'Hoạt động không tốn năng lượng lúc này',
      id: 'Aktivitas tidak memakai energi saat ini', tr: 'Şu anda etkinlikler enerji harcamıyor', pl: 'Aktywności nie zużywają teraz energii',
    }),
    gift: (amount: number) => triLang(lang, {
      ru: `Подарок +${amount} до полуночи`, uk: `Подарунок +${amount} до півночі`, en: `Gift +${amount} until midnight`,
      es: `Regalo +${amount} hasta medianoche`, 'pt-BR': `Presente +${amount} até meia-noite`,
      vi: `Quà tặng +${amount} đến nửa đêm`, id: `Hadiah +${amount} sampai tengah malam`,
      tr: `Gece yarısına kadar +${amount} hediye`, pl: `Prezent +${amount} do północy`,
    }),
    close: triLang(lang, {
      ru: 'Закрыть информацию об энергии', uk: 'Закрити інформацію про енергію', en: 'Close energy information',
      es: 'Cerrar información de energía', 'pt-BR': 'Fechar informações de energia', vi: 'Đóng thông tin năng lượng',
      id: 'Tutup informasi energi', tr: 'Enerji bilgisini kapat', pl: 'Zamknij informacje o energii',
    }),
  };
}

export const EnergyInfoPopover = memo(function EnergyInfoPopover({ anchor, visible, onClose }: Props) {
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const { width } = useWindowDimensions();
  const { energy, bonusEnergy, bonusEnergyCapacity, bonusExpiresAt, maxEnergy, isUnlimited, recoveryIntervalMs } = useEnergy();
  const { formattedTime } = useEnergyCountdown({ visible });
  const animation = useRef(new Animated.Value(0)).current;
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = energy + bonusEnergy;
  const activeCap = maxEnergy + bonusEnergyCapacity;
  const recoveryMinutes = Math.max(1, Math.round(recoveryIntervalMs / 60_000));
  const copy = copyForLang(lang, recoveryMinutes);
  const weeklyFreeWindow = isEnergyFreeWindowActive();
  const activeGift = bonusEnergyCapacity > 0 && bonusExpiresAt > Date.now();

  useEffect(() => {
    if (!visible) return undefined;
    animation.setValue(0);
    Animated.spring(animation, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }).start();
    closeTimer.current = setTimeout(() => {
      Animated.timing(animation, { toValue: 0, duration: 220, useNativeDriver: true }).start(onClose);
    }, 5000);
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = null;
    };
  }, [animation, onClose, visible]);

  const energyTooltipTop = anchor ? anchor.y + Math.max(anchor.h, 24) + 8 : 76;
  const energyTooltipLeft = Math.min(width - POPOVER_WIDTH - EDGE_GUTTER, Math.max(EDGE_GUTTER, anchor?.x ?? 16));
  const energyIconCenterX = anchor ? anchor.x + anchor.w / 2 : energyTooltipLeft + 28;
  const energyArrowLeft = Math.min(POPOVER_WIDTH - 26, Math.max(12, Math.round(energyIconCenterX - energyTooltipLeft - 7)));

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.viewport} onPress={onClose} accessibilityRole="button" accessibilityLabel={copy.close}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.positioner,
            {
              top: energyTooltipTop,
              left: energyTooltipLeft,
              opacity: animation,
              transform: [
                { translateY: animation.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
                { scale: animation.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) },
              ],
            },
          ]}
        >
          <View style={styles.card} accessibilityViewIsModal>
            <View style={[styles.arrowOuter, { left: energyArrowLeft, borderBottomColor: `${t.gold}66` }]} />
            <View style={[styles.arrowInner, { left: energyArrowLeft + 1 }]} />

            {isUnlimited ? (
              <View style={styles.primaryRow}>
                <Text style={styles.primaryIcon}>♾️</Text>
                <Text style={styles.primaryText}>{weeklyFreeWindow ? copy.freeWindow : copy.unlimited}</Text>
              </View>
            ) : (
              <>
                <View style={[styles.primaryRow, { marginBottom: current < activeCap ? 10 : 0 }]}>
                  <Text style={styles.primaryIcon}>⚡</Text>
                  <Text style={styles.primaryText}>{`${current}/${activeCap} · ${copy.cadence}`}</Text>
                </View>
                {current < activeCap && formattedTime ? (
                  <View style={styles.countdownRow}>
                    <Text style={styles.countdownLabel}>{copy.in}</Text>
                    <Text style={[styles.countdownValue, { color: t.gold }]}>{formattedTime}</Text>
                  </View>
                ) : null}
                <Text style={[styles.video, { marginTop: current >= activeCap ? 4 : 0 }]}>{copy.video}</Text>
                {activeGift ? <Text style={styles.gift}>{copy.gift(bonusEnergyCapacity)}</Text> : null}
              </>
            )}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  viewport: { flex: 1 },
  positioner: { position: 'absolute' },
  card: { width: POPOVER_WIDTH, backgroundColor: '#1C1C1E', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 20 },
  arrowOuter: { position: 'absolute', top: -7, width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderBottomWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  arrowInner: { position: 'absolute', top: -5.5, width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#1C1C1E' },
  primaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryIcon: { fontSize: 16 },
  primaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', flex: 1 },
  countdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#2C2C2E', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 8 },
  countdownLabel: { color: '#8E8E93', fontSize: 12 },
  countdownValue: { fontSize: 16, fontWeight: '800' },
  video: { color: '#8E8E93', fontSize: 11, textAlign: 'center' },
  gift: { color: '#F5C451', fontSize: 11, textAlign: 'center', marginTop: 6 },
});

export default EnergyInfoPopover;
