import { Ionicons } from '@expo/vector-icons';
import React, { memo, useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from './SafeLinearGradient';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import {
  RewardModalBackdrop,
  RewardModalPanelBackdrop,
  rewardModalAccentColor,
  rewardModalPanelBorder,
  rewardModalPanelColors,
  rewardModalPrimaryButtonColors,
  rewardModalPrimaryButtonText,
  rewardModalSoftSurface,
} from './RewardModalBackdrop';

type Props = {
  visible: boolean;
  variant: 'welcome' | 'ended';
  onPrimaryPress: () => void;
  onSecondaryPress?: () => void;
};

const COPY = {
  ru: {
    welcomeEyebrow: 'Подарок на старт',
    welcomeTitle: 'Три дня — всё открыто',
    welcomeBody: 'Мы дарим тебе три дня полного доступа. Никаких лимитов, все уроки разблокированы, энергия бесконечная. Посмотри приложение в полной силе — и сам реши, что тебе нужно.',
    welcomeCta: 'Начать',
    welcomeFooter: 'Это подарок. Подписка не включается автоматически.',
    endedEyebrow: 'Три дня позади',
    endedTitle: 'Продолжай — бесплатно или с Premium',
    endedBody: 'Всё, что ты выучил — остаётся с тобой. Бесплатный режим доступен всегда. Premium нужен, если хочешь вернуть все планы, темы, аналитику и учёбу без ограничений.',
    endedPrimary: 'Открыть полный доступ',
    endedSecondary: 'Продолжить бесплатно',
    chips: ['Все уроки', 'Все планы', 'Без энергии', 'Темы', 'Аналитика'],
  },
  uk: {
    welcomeEyebrow: 'Подарунок на старт',
    welcomeTitle: 'Три дні - весь застосунок без замків',
    welcomeBody: 'Ми відкрили уроки, плани, теми, аналітику помилок і режим без енергії. Можна спокійно натискати все підряд - майже науковий метод.',
    welcomeCta: 'Погнали, все відкрито',
    welcomeFooter: 'Це подарунок. Підписка не вмикається автоматично.',
    endedEyebrow: 'Подарунковий режим завершився',
    endedTitle: 'Безкоштовний режим залишається з тобою',
    endedBody: 'Три дні повного доступу завершилися. Вчитися безкоштовно все ще можна: уроки, фрази й прогрес залишаються. Premium-фішки знову чекають у Premium, якщо захочеться залишити все відкритим.',
    endedPrimary: 'Залишити повний доступ',
    endedSecondary: 'Продовжити безкоштовно',
    chips: ['Усі уроки', 'Усі плани', 'Без енергії', 'Теми', 'Аналітика'],
  },
  es: {
    welcomeEyebrow: 'Regalo inicial',
    welcomeTitle: 'Tres días con toda la app abierta',
    welcomeBody: 'Abrimos lecciones, planes, temas, análisis de errores y modo sin energía. Puedes probarlo todo con calma: método científico, casi.',
    welcomeCta: 'Vamos, todo abierto',
    welcomeFooter: 'Es un regalo. La suscripción no se activa automáticamente.',
    endedEyebrow: 'El regalo terminó',
    endedTitle: 'El modo gratis sigue contigo',
    endedBody: 'Tus tres días de acceso completo terminaron. Aún puedes aprender gratis: lecciones, frases y progreso siguen aquí. Premium vuelve a guardar las funciones avanzadas si quieres dejar todo abierto.',
    endedPrimary: 'Mantener acceso completo',
    endedSecondary: 'Continuar gratis',
    chips: ['Lecciones', 'Planes', 'Sin energía', 'Temas', 'Análisis'],
  },
};

function IntroFullAccessModal({ visible, variant, onPrimaryPress, onSecondaryPress }: Props) {
  const { lang } = useLang();
  const { theme, themeMode } = useTheme();
  const copy = lang === 'uk' ? COPY.uk : lang === 'es' ? COPY.es : COPY.ru;
  const isWelcome = variant === 'welcome';

  // Воронка: показ модалок intro — раньше не трекались. `intro_ended` — главный
  // момент конверсии (конец 72ч полного доступа), важно видеть его отдельно.
  useEffect(() => {
    if (!visible) return;
    void import('../app/analytics').then(({ trackEvent }) =>
      trackEvent(isWelcome ? 'intro_welcome_shown' : 'intro_ended_shown', {}),
    );
  }, [visible, isWelcome]);

  const accent = rewardModalAccentColor(themeMode, theme);
  const border = rewardModalPanelBorder(themeMode, theme);
  const softSurface = rewardModalSoftSurface(themeMode, theme);
  const textPrimary = themeMode === 'minimalLight' ? '#171615' : '#FFFFFF';
  const textSecondary = themeMode === 'minimalLight' ? 'rgba(23,22,21,0.72)' : 'rgba(255,255,255,0.78)';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onSecondaryPress ?? onPrimaryPress}
    >
      <View style={styles.overlay}>
        <RewardModalBackdrop themeMode={themeMode} intensity="strong" />
        <SafeAreaView style={styles.safe}>
          <View style={[styles.panel, { borderColor: border }]}>
            <RewardModalPanelBackdrop themeMode={themeMode} intensity="strong" opacity={0.72} />
            <LinearGradient
              pointerEvents="none"
              colors={rewardModalPanelColors(themeMode, theme)}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.content}>
              <View style={[styles.iconWrap, { backgroundColor: softSurface, borderColor: border }]}>
                <Ionicons name={isWelcome ? 'sparkles' : 'shield-checkmark'} size={28} color={accent} />
              </View>
              <Text style={[styles.eyebrow, { color: accent }]}>{isWelcome ? copy.welcomeEyebrow : copy.endedEyebrow}</Text>
              <Text style={[styles.title, { color: textPrimary }]}>{isWelcome ? copy.welcomeTitle : copy.endedTitle}</Text>
              <Text style={[styles.body, { color: textSecondary }]}>{isWelcome ? copy.welcomeBody : copy.endedBody}</Text>

              {isWelcome ? (
                <View style={styles.chips}>
                  {copy.chips.map((label) => (
                    <View key={label} style={[styles.chip, { backgroundColor: softSurface, borderColor: border }]}>
                      <Ionicons name="lock-open-outline" size={15} color={accent} />
                      <Text style={[styles.chipText, { color: textPrimary }]}>{label}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <Pressable
                testID={isWelcome ? 'intro-full-access-welcome-primary' : 'intro-full-access-ended-primary'}
                accessibilityRole="button"
                onPress={() => {
                  void import('../app/analytics').then(({ trackEvent }) =>
                    trackEvent(isWelcome ? 'intro_welcome_cta' : 'intro_ended_cta', {}),
                  );
                  onPrimaryPress();
                }}
                style={styles.primaryButton}
              >
                <LinearGradient
                  colors={rewardModalPrimaryButtonColors(themeMode)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryGradient}
                >
                  <Text style={[styles.primaryText, { color: rewardModalPrimaryButtonText(themeMode) }]}>
                    {isWelcome ? copy.welcomeCta : copy.endedPrimary}
                  </Text>
                </LinearGradient>
              </Pressable>

              {isWelcome ? (
                <Text style={[styles.footer, { color: textSecondary }]}>{copy.welcomeFooter}</Text>
              ) : (
                <Pressable
                  testID="intro-full-access-ended-secondary"
                  accessibilityRole="button"
                  onPress={() => {
                    void import('../app/analytics').then(({ trackEvent }) => trackEvent('intro_ended_dismiss', {}));
                    onSecondaryPress?.();
                  }}
                  style={styles.secondaryButton}
                >
                  <Text style={[styles.secondaryText, { color: textSecondary }]}>{copy.endedSecondary}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export default memo(IntroFullAccessModal);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  safe: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  panel: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    padding: 22,
    gap: 13,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: 0,
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    letterSpacing: 0,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  chip: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: 0,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 4,
  },
  primaryGradient: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
    letterSpacing: 0,
  },
  footer: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    letterSpacing: 0,
    textAlign: 'center',
  },
});
