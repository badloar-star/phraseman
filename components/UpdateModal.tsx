// ════════════════════════════════════════════════════════════════════════════
// UpdateModal.tsx — Модальник с уведомлением об обновлении.
// Большая кнопка "Обновить" → App Store / Google Play.
// Кнопка "Закрыть" → скрывает модальник.
// ════════════════════════════════════════════════════════════════════════════

import React, { memo, useRef } from 'react';
import {
  type GestureResponderEvent,
  Modal,
  View,
  Text,
  Platform,
  StyleSheet,
  Linking,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from './SafeLinearGradient';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { hapticTap } from '../hooks/use-haptics';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { noAndroidOutline } from '../constants/androidGlow';
import FullscreenHybridEntrance from './feedback/FullscreenHybridEntrance';
import ResponsiveModalScrollView from './ResponsiveModalScrollView';

import DuoPressable from './DuoPressable';
import PressableHybrid from './PressableHybrid';
// Голос Компаса (канон): окно обновления говорит от первого лица, по-человечески —
// не казённое «Доступно обновление», а «это Компас, я подрос, обнови меня».
const TEXTS = {
  ru: {
    title: 'Это Компас. У меня кое-что новое',
    // зачем: паритет с макетом system.html system_09 — короткий текст мягкого окна.
    body: 'Доступна новая версия — быстрее и удобнее.',
    update: 'Обновить',
    close: 'Чуть позже',
  },
  uk: {
    title: 'Це Компас. У мене дещо нове',
    body: 'Я трохи підріс: усередині свіжі штуки й кілька лагоджень. Онови мене — і підемо далі разом.',
    update: 'Оновити',
    close: 'Трохи згодом',
  },
  en: {
    title: 'It’s Compass. I have something new',
    body: 'I’ve grown a little: there are new things inside and a few fixes. Update me and we’ll keep going together.',
    update: 'Update',
    close: 'Later',
  },
  es: {
    title: 'Soy la Brújula. Tengo algo nuevo',
    body: 'Crecí un poco: por dentro hay cosas frescas y unos arreglos. Actualízame y seguimos juntos.',
    update: 'Actualizar',
    close: 'Más tarde',
  },
  'pt-BR': {
    title: 'É a Bússola. Tenho novidade',
    body: 'Cresci um pouco: por dentro tem coisas novas e uns ajustes. Me atualiza e seguimos juntos.',
    update: 'Atualizar',
    close: 'Mais tarde',
  },
  vi: {
    title: 'Mình là La bàn. Có cái mới đây',
    body: 'Mình lớn lên chút: bên trong có thứ mới và vài chỗ được sửa. Cập nhật mình để cùng đi tiếp nhé.',
    update: 'Cập nhật',
    close: 'Để sau',
  },
  'id': {
    title: 'Ini Kompas. Ada yang baru',
    body: 'Aku tumbuh sedikit: ada hal baru di dalam dan beberapa perbaikan. Perbarui aku, lalu lanjut bareng.',
    update: 'Perbarui',
    close: 'Nanti saja',
  },
  tr: {
    title: 'Ben Pusula. Yeni bir şeyim var',
    body: 'Biraz büyüdüm: içeride taze şeyler ve birkaç düzeltme var. Beni güncelle, birlikte devam edelim.',
    update: 'Güncelle',
    close: 'Sonra',
  },
  pl: {
    title: 'Tu Kompas. Mam coś nowego',
    body: 'Trochę urosłem: w środku świeże rzeczy i kilka poprawek. Zaktualizuj mnie i ruszamy dalej razem.',
    update: 'Zaktualizuj',
    close: 'Później',
  },
} as const;

const pickUpdateText = (lang: string) => TEXTS[lang as keyof typeof TEXTS] ?? TEXTS.ru;
const blockAndroidBack = () => undefined;

type GlassTokens = ReturnType<typeof liquidGlassTokens>;

function UpdateModalBackground({ glass }: { glass: GlassTokens }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* зачем (координатор 18.10, список Сайта; прецедент — интро урока, «свечение текста убери»): на Android dimezis-BlurView без blurTarget снимает экран вместе с текстом панели
          и кладёт размытую копию под него — ореол у текста. На Android живой блюр выключен; тон, вуаль и кромка ниже остаются, iOS как было. */}
      {Platform.OS !== 'android' ? (
        <BlurView
        intensity={Platform.OS === 'android' ? 12 : 20}
        blurReductionFactor={3}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : 'none'}
        tint="systemUltraThinMaterialDark"
        style={StyleSheet.absoluteFill}
      />
      ) : null}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: Platform.OS === 'android' ? glass.opaqueSheet : glass.sheet },
        ]}
      />
      <LinearGradient
        colors={[glass.selected, 'transparent']}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

function CompassUpdateArt({ glass }: { glass: GlassTokens }) {
  return (
    <View style={[styles.iconStage, { backgroundColor: glass.opaqueControl }]}>
      <LinearGradient
        pointerEvents="none"
        colors={[glass.selected, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Ionicons name="compass-outline" size={32} color={glass.lightTint} />
    </View>
  );
}

interface UpdateModalProps {
  visible: boolean;
  storeUrl: string;
  message?: string;
  title?: string;
  primaryLabel?: string;
  primaryDisabled?: boolean;
  onPrimaryPress?: () => void;
  onClose?: () => void;
  /** Вызывается до открытия магазина — на Android скрывает Modal до паузы Activity (меньше зависаний при возврате). */
  onWillOpenExternalUrl?: () => void;
  /** Если Linking.openURL не удался — вернуть UI (см. onWillOpenExternalUrl). */
  onExternalOpenFailed?: () => void;
  /**
   * зачем: гибрид «Световод + Чекан» (.motion-mockups/phraseman-hybrid.html,
   * семья «Полноэкранные») — сцена входит из света, контент каскадом, CTA
   * последним. Боевой дефолт — 'classic', ничего не меняется без включения.
   */
  motionVariant?: 'classic' | 'hybrid';
}

function UpdateModal({
  visible,
  storeUrl,
  message,
  title,
  primaryLabel,
  primaryDisabled = false,
  onPrimaryPress,
  onClose,
  onWillOpenExternalUrl,
  onExternalOpenFailed,
  motionVariant = 'classic',
}: UpdateModalProps) {
  const { liquidGlassThemeId } = useTheme();
  const { lang } = useLang();
  const tx = pickUpdateText(lang);
  const glass = liquidGlassTokens(liquidGlassThemeId);

  // зачем (R58 #57, аудит кнопок 15.10): двойной тап «Обновить» дважды открывал стор и дважды отдавал слот окна
  const openingStoreRef = useRef(false);
  const handleUpdate = (_event?: GestureResponderEvent) => {
    if (openingStoreRef.current) {
      console.log('[UPDATE-MODAL] повторный тап — стор уже открывается'); // guard-ok: ранний выход
      return;
    }
    hapticTap();
    if (onPrimaryPress) {
      onPrimaryPress();
      return;
    }
    if (!storeUrl) {
      console.warn('[UPDATE-MODAL] нет ссылки на стор — кнопка ничего не делает'); // guard-ok: ранний выход логируется
      return;
    }
    openingStoreRef.current = true;
    setTimeout(() => { openingStoreRef.current = false; }, 1500);
    onWillOpenExternalUrl?.();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void Linking.openURL(storeUrl).catch((error: unknown) => {
          console.warn('[UPDATE-MODAL] стор не открылся', error instanceof Error ? error.message : String(error)); // guard-ok: причина в журнал
          openingStoreRef.current = false;
          onExternalOpenFailed?.();
        });
      });
    });
  };

  const artSlot = <CompassUpdateArt glass={glass} />;

  const titleSlot = (
    <Text accessibilityRole="header" style={[styles.title, { color: glass.text }]}>
      {title ?? tx.title}
    </Text>
  );

  const bodySlot = (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.body, { color: glass.secondary }]}
    >
      {message ? message : tx.body}
    </Text>
  );

  const ctaSlot = (
    <>
      <DuoPressable
        accessibilityRole="button"
        accessibilityLabel={primaryLabel ?? tx.update}
        onPress={handleUpdate}
        disabled={primaryDisabled}
        edgeColor={glass.bgBottom}
        edgeHeight={2}
        wrapStyle={styles.updateBtnWrap}
        style={styles.updateBtn}
        gradientColors={[glass.lightTint, glass.cta, glass.cta]}
        gradientStart={{ x: 0, y: 0 }}
        gradientEnd={{ x: 0, y: 1 }}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.buttonSheen}
          pointerEvents="none"
        />
        <Text style={[styles.updateBtnText, { color: glass.accentInk }]}>
          {primaryLabel ?? tx.update}
        </Text>
      </DuoPressable>

      {!!onClose && (
        <PressableHybrid
          onPress={onClose}
          variant="secondary"
          // зачем: макет system_09 — «Чуть позже» без заливки и без рамки (прозрачная призрачная кнопка).
          style={[styles.closeBtn, { backgroundColor: 'transparent' }]}
          contentStyle={{ alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={[styles.closeBtnText, { color: glass.text }]}>
            {tx.close}
          </Text>
        </PressableHybrid>
      )}
    </>
  );

  const isHybrid = motionVariant === 'hybrid';

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isHybrid ? 'none' : 'fade'}
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose ? onClose : blockAndroidBack}
    >
      <View accessibilityViewIsModal importantForAccessibility="yes" style={styles.modalRoot}>
        <ResponsiveModalScrollView style={styles.backdrop}>
          <View testID="ordinary-update-glass" style={styles.card}>
            <UpdateModalBackground glass={glass} />

            {isHybrid ? (
              <FullscreenHybridEntrance
                visible={visible}
                bloomColor={glass.selected}
                slots={[artSlot, titleSlot, bodySlot, ctaSlot]}
              />
            ) : (
              <>
                {artSlot}
                {titleSlot}
                {bodySlot}
                {ctaSlot}
              </>
            )}
          </View>
        </ResponsiveModalScrollView>
      </View>
    </Modal>
  );
}

export default memo(UpdateModal);

const styles = StyleSheet.create({
  modalRoot: { flex: 1 },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.68)' },
  card: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 20,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.34,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    ...noAndroidOutline, // системная тень снята (см. androidGlow)
  },
  iconStage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  title: {
    width: '100%',
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    maxWidth: 330,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 8,
  },
  updateBtnWrap: {
    width: '100%',
    marginTop: 20,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    ...noAndroidOutline, // системная тень снята (см. androidGlow)
  },
  updateBtn: {
    minHeight: 48,
    borderRadius: 24,
    paddingHorizontal: 20,
  },
  buttonSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
  },
  updateBtnText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  closeBtn: {
    width: '100%',
    minHeight: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  closeBtnText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
});
