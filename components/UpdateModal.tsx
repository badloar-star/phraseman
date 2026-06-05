// ════════════════════════════════════════════════════════════════════════════
// UpdateModal.tsx — Модальник с уведомлением об обновлении.
// Большая кнопка "Обновить" → App Store / Google Play.
// Кнопка "Закрыть" → скрывает модальник.
// ════════════════════════════════════════════════════════════════════════════

import React from 'react';
import {
  type GestureResponderEvent,
  Image,
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  useWindowDimensions,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { LinearGradient } from './SafeLinearGradient';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { hapticTap } from '../hooks/use-haptics';
import type { ThemeMode } from '../constants/theme';
import { COMPASS_RICH } from '../constants/compassTheme';

const TEXTS = {
  ru: {
    title: 'Доступно обновление',
    body: 'Вышла новая версия Phraseman с улучшениями и новыми функциями.',
    update: 'Обновить приложение',
    close: 'Закрыть',
  },
  uk: {
    title: 'Доступне оновлення',
    body: 'Вийшла нова версія Phraseman з покращеннями та новими функціями.',
    update: 'Оновити застосунок',
    close: 'Закрити',
  },
  es: {
    title: 'Hay una actualización',
    body: 'Salió una versión nueva de Phraseman con mejoras y funciones nuevas.',
    update: 'Actualizar app',
    close: 'Cerrar',
  },
  'pt-BR': {
    title: 'Atualização disponível',
    body: 'Uma nova versão do Phraseman saiu com melhorias e novos recursos.',
    update: 'Atualizar aplicativo',
    close: 'Fechar',
  },
  vi: {
    title: 'Có bản cập nhật',
    body: 'Phiên bản Phraseman mới đã ra mắt với các cải tiến và tính năng mới.',
    update: 'Cập nhật ứng dụng',
    close: 'Đóng',
  },
  'id': {
    title: 'Pembaruan tersedia',
    body: 'Versi baru Phraseman hadir dengan peningkatan dan fitur baru.',
    update: 'Perbarui aplikasi',
    close: 'Tutup',
  },
  tr: {
    title: 'Güncelleme mevcut',
    body: 'Phraseman uygulamasının iyileştirmeler ve yeni özellikler içeren yeni sürümü çıktı.',
    update: 'Uygulamayı güncelle',
    close: 'Kapat',
  },
  pl: {
    title: 'Dostępna aktualizacja',
    body: 'Pojawiła się nowa wersja Phraseman z usprawnieniami i nowymi funkcjami.',
    update: 'Zaktualizuj aplikację',
    close: 'Zamknij',
  },
} as const;

const pickUpdateText = (lang: string) => TEXTS[lang as keyof typeof TEXTS] ?? TEXTS.ru;
const PREMIUM_UPDATE_EMBLEM = require('../assets/images/update_modal/update-modal-premium-emblem.png');

type UpdateModalPalette = {
  frame: [string, string, string];
  panel: [string, string, string];
  wash: [string, string, string];
  topSheen: [string, string];
  stroke: string;
  texture: string;
  orbit: string;
  star: string;
  title: string;
  body: string;
  primary: [string, string, string];
  primaryPressed: [string, string, string];
  primaryText: string;
  primaryShadow: string;
  secondaryBg: string;
  secondaryBorder: string;
  secondaryText: string;
};

const DEFAULT_PALETTE: UpdateModalPalette = {
  frame: ['rgba(246, 248, 255, 0.64)', 'rgba(45, 112, 255, 0.46)', 'rgba(233, 184, 99, 0.42)'],
  panel: ['#111722', '#070A12', '#030408'],
  wash: ['rgba(42, 115, 255, 0.20)', 'rgba(12, 31, 74, 0.12)', 'rgba(0, 0, 0, 0)'],
  topSheen: ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)'],
  stroke: 'rgba(223, 234, 255, 0.28)',
  texture: 'rgba(151, 187, 255, 0.11)',
  orbit: 'rgba(133, 178, 255, 0.28)',
  star: 'rgba(239, 246, 255, 0.82)',
  title: '#FFFFFF',
  body: 'rgba(232, 238, 247, 0.76)',
  primary: ['#045BFF', '#1531B7', '#E7B968'],
  primaryPressed: ['#064FE0', '#102A9A', '#D6A451'],
  primaryText: '#FFFFFF',
  primaryShadow: '#1266FF',
  secondaryBg: 'rgba(255,255,255,0.025)',
  secondaryBorder: 'rgba(238, 244, 255, 0.22)',
  secondaryText: 'rgba(255,255,255,0.78)',
};

const GOLD_PALETTE: UpdateModalPalette = {
  ...DEFAULT_PALETTE,
  frame: ['rgba(248, 224, 166, 0.68)', 'rgba(60, 91, 165, 0.42)', 'rgba(255, 255, 255, 0.20)'],
  panel: ['#14110B', '#090806', '#030302'],
  wash: ['rgba(232, 181, 78, 0.16)', 'rgba(23, 68, 158, 0.10)', 'rgba(0, 0, 0, 0)'],
  stroke: 'rgba(248, 224, 166, 0.24)',
  orbit: 'rgba(245, 204, 126, 0.26)',
  primary: ['#075BFF', '#182B8E', '#F0C66F'],
  primaryPressed: ['#064CDA', '#13257C', '#DCAF5D'],
  primaryShadow: '#E2AD4E',
};

const COMPASS_PALETTE: UpdateModalPalette = {
  ...DEFAULT_PALETTE,
  frame: ['rgba(255,230,181,0.58)', 'rgba(180,119,78,0.34)', 'rgba(0,0,0,0.54)'],
  panel: ['#2C2B2C', '#181819', '#050506'],
  wash: ['rgba(242,196,141,0.14)', 'rgba(180,119,78,0.08)', 'rgba(0,0,0,0)'],
  topSheen: ['rgba(255,230,181,0.38)', 'rgba(255,255,255,0)'],
  stroke: COMPASS_RICH.hairlineStrong,
  texture: 'rgba(242,196,141,0.12)',
  orbit: 'rgba(242,196,141,0.24)',
  star: 'rgba(255,230,181,0.82)',
  title: '#FFF0D0',
  body: 'rgba(216,210,200,0.84)',
  primary: ['#FFE6B5', '#F4B978', '#B4774E'],
  primaryPressed: ['#F7D7A2', '#E3A869', '#8F5434'],
  primaryText: COMPASS_RICH.textDark,
  primaryShadow: '#B4774E',
  secondaryBg: COMPASS_RICH.charcoalRaised,
  secondaryBorder: COMPASS_RICH.hairlineQuiet,
  secondaryText: COMPASS_RICH.textMuted,
};

const getUpdateModalPalette = (themeMode: ThemeMode): UpdateModalPalette =>
  themeMode === 'gold' ? GOLD_PALETTE : themeMode === 'compass' ? COMPASS_PALETTE : DEFAULT_PALETTE;

function UpdateModalBackground({ palette }: { palette: UpdateModalPalette }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={palette.panel}
        locations={[0, 0.52, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg width="100%" height="100%" viewBox="0 0 360 360" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLinearGradient id="updateModalWash" x1="180" y1="0" x2="180" y2="188" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={palette.wash[0]} />
            <Stop offset="0.56" stopColor={palette.wash[1]} />
            <Stop offset="1" stopColor={palette.wash[2]} />
          </SvgLinearGradient>
          <SvgLinearGradient id="updateModalBottomShade" x1="180" y1="150" x2="180" y2="360" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="rgba(0,0,0,0)" />
            <Stop offset="1" stopColor="rgba(0,0,0,0.22)" />
          </SvgLinearGradient>
        </Defs>
        <Rect width="360" height="210" fill="url(#updateModalWash)" />
        <Rect y="130" width="360" height="230" fill="url(#updateModalBottomShade)" />
        <Path
          d="M48 0V360 M112 0V360 M176 0V360 M240 0V360 M304 0V360 M0 66H360 M0 132H360 M0 198H360 M0 264H360"
          stroke={palette.texture}
          strokeWidth="0.7"
          opacity="0.06"
        />
        <Ellipse cx="180" cy="78" rx="106" ry="31" stroke={palette.orbit} strokeWidth="1" opacity="0.34" fill="none" transform="rotate(-17 180 78)" />
        <Ellipse cx="179" cy="78" rx="68" ry="18" stroke={palette.orbit} strokeWidth="0.8" opacity="0.23" fill="none" transform="rotate(18 179 78)" />
        <Path d="M24 132C85 102 154 102 214 122C267 140 311 132 342 105" stroke={palette.orbit} strokeWidth="1.2" opacity="0.10" fill="none" />
        <Circle cx="111" cy="58" r="1.7" fill={palette.star} opacity="0.86" />
        <Circle cx="133" cy="34" r="1.3" fill={palette.star} opacity="0.76" />
        <Circle cx="217" cy="46" r="1.1" fill={palette.star} opacity="0.74" />
        <Circle cx="239" cy="90" r="1.4" fill={palette.star} opacity="0.82" />
        <Circle cx="150" cy="96" r="1.0" fill={palette.star} opacity="0.58" />
        <Circle cx="276" cy="60" r="1.0" fill={palette.star} opacity="0.56" />
      </Svg>
      <LinearGradient
        colors={palette.topSheen}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.topSheen}
      />
    </View>
  );
}

function PremiumUpdateArt({ compact }: { compact: boolean }) {
  return (
    <View style={[styles.artStage, compact && styles.artStageCompact]}>
      <Image source={PREMIUM_UPDATE_EMBLEM} style={styles.artImage} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(4,6,11,0)', 'rgba(4,6,11,0.62)', '#04060B']}
        locations={[0, 0.58, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.artBottomFade}
      />
    </View>
  );
}

interface UpdateModalProps {
  visible: boolean;
  storeUrl: string;
  message?: string;
  onClose?: () => void;
  /** Вызывается до открытия магазина — на Android скрывает Modal до паузы Activity (меньше зависаний при возврате). */
  onWillOpenExternalUrl?: () => void;
  /** Если Linking.openURL не удался — вернуть UI (см. onWillOpenExternalUrl). */
  onExternalOpenFailed?: () => void;
}

export default function UpdateModal({ visible, storeUrl, message, onClose, onWillOpenExternalUrl, onExternalOpenFailed }: UpdateModalProps) {
  const { f, themeMode } = useTheme();
  const { lang } = useLang();
  const { height, width } = useWindowDimensions();
  const tx = pickUpdateText(lang);
  const palette = getUpdateModalPalette(themeMode);
  const compact = height < 680 || width < 360;

  const handleUpdate = (_event?: GestureResponderEvent) => {
    hapticTap();
    onWillOpenExternalUrl?.();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void Linking.openURL(storeUrl).catch(() => {
          onExternalOpenFailed?.();
        });
      });
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => { onClose?.(); }}
    >
      <View
        style={[
          styles.overlay,
          { backgroundColor: 'rgba(3,6,12,0.70)' },
        ]}
      >
        <LinearGradient
          colors={palette.frame}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.frame, { shadowColor: palette.primaryShadow }]}
        >
          <View style={[styles.card, compact && styles.cardCompact]}>
            <UpdateModalBackground palette={palette} />
            <View pointerEvents="none" style={[styles.innerStroke, { borderColor: palette.stroke }]} />

            <PremiumUpdateArt compact={compact} />

            <Text
              style={[
                styles.title,
                { color: palette.title, fontSize: Math.min(34, Math.max(28, f.h1 + 7)) },
              ]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
            >
              {tx.title}
            </Text>

            <Text
              style={[
                styles.body,
                {
                  color: palette.body,
                  fontSize: Math.max(17, f.body + 1),
                  lineHeight: Math.max(25, f.body + 9),
                },
              ]}
            >
              {message ? message : tx.body}
            </Text>

            <View pointerEvents="none" style={styles.ctaDivider} />

            <Pressable
              style={({ pressed }) => [
                styles.updateBtn,
                {
                  opacity: pressed ? 0.96 : 1,
                  shadowColor: palette.primaryShadow,
                  transform: [{ translateY: pressed ? 1 : 0 }],
                },
              ]}
              onPress={handleUpdate}
            >
              {({ pressed }) => (
                <LinearGradient
                  colors={pressed ? palette.primaryPressed : palette.primary}
                  start={{ x: 0.08, y: 0 }}
                  end={{ x: 0.92, y: 1 }}
                  style={styles.updateBtnFill}
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.buttonSheen}
                  />
                  <Text
                    style={[styles.updateBtnText, { color: palette.primaryText, fontSize: Math.max(19, f.bodyLg + 1) }]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                  >
                    {tx.update}
                  </Text>
                </LinearGradient>
              )}
            </Pressable>

            {!!onClose && (
              <Pressable
                style={({ pressed }) => [
                  styles.closeBtn,
                  {
                    borderColor: palette.secondaryBorder,
                    backgroundColor: palette.secondaryBg,
                    opacity: pressed ? 0.82 : 1,
                    transform: [{ translateY: pressed ? 1 : 0 }],
                  },
                ]}
                onPress={onClose}
              >
                <Text
                  style={[styles.closeBtnText, { color: palette.secondaryText, fontSize: Math.max(15, f.body) }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.86}
                >
                  {tx.close}
                </Text>
              </Pressable>
            )}
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  frame: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 30,
    padding: 1,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.24,
    shadowRadius: 30,
    elevation: 18,
  },
  card: {
    borderRadius: 29,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 28,
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardCompact: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
  },
  innerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 29,
    borderWidth: StyleSheet.hairlineWidth,
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    opacity: 0.9,
  },
  artStage: {
    width: '112%',
    height: 246,
    marginTop: -4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  artStageCompact: {
    height: 198,
    marginBottom: 4,
  },
  artImage: {
    width: '100%',
    height: '100%',
  },
  artBottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '38%',
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0,
  },
  body: {
    textAlign: 'center',
    marginBottom: 28,
    maxWidth: 320,
    letterSpacing: 0,
  },
  ctaDivider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.085)',
    marginBottom: 22,
  },
  updateBtn: {
    width: '100%',
    minHeight: 66,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
  },
  updateBtnFill: {
    minHeight: 66,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '52%',
  },
  updateBtnText: {
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0,
  },
  closeBtn: {
    width: '100%',
    minHeight: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 18,
  },
  closeBtnText: {
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0,
  },
});
