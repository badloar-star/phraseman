import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import BounceView from '../components/BounceView';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import RegistrationPromptModal from '../components/RegistrationPromptModal';
import { triLang } from '../constants/i18n';

export default function PersonalPlanThankYouScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const [authVisible, setAuthVisible] = useState(false);

  const goToPlan = () => {
    setAuthVisible(false);
    router.replace('/personal_plan' as any);
  };

  return (
    <ScreenGradient>
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <BounceView style={styles.safe}>
        <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: t.correctBg, borderColor: t.border }]}>
            <Ionicons name="checkmark" size={34} color={t.correctText} />
          </View>

          <Text style={[styles.kicker, { color: t.textGhost }]}>
            {triLang(lang, { ru: 'PREMIUM', uk: 'PREMIUM', es: 'PREMIUM' })}
          </Text>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h1 }]}>
            {triLang(lang, {
              ru: 'План включён',
              uk: 'План увімкнено',
              es: 'Plan activado',
            })}
          </Text>
          <Text style={[styles.subtitle, { color: t.textMuted }]}>
            {triLang(lang, {
              ru: 'Premium активен, личный план сохранён. Осталось привязать аккаунт, чтобы прогресс не потерялся при смене телефона.',
              uk: 'Premium активний, особистий план збережено. Залишилося прив’язати акаунт, щоб прогрес не загубився після зміни телефона.',
              es: 'Premium está activo y tu plan personal está guardado. Vincula una cuenta para no perder el progreso si cambias de teléfono.',
            })}
          </Text>

          <View style={[styles.supportBox, { backgroundColor: t.bgSurface2, borderColor: t.border }]}>
            <Ionicons name="help-buoy-outline" size={20} color={t.textMuted} />
            <Text style={[styles.supportText, { color: t.textMuted }]}>
              {triLang(lang, {
                ru: 'Если покупка не подтянется, поддержка поможет по чеку из магазина.',
                uk: 'Якщо покупка не підтягнеться, підтримка допоможе за чеком із магазину.',
                es: 'Si la compra no aparece, soporte puede ayudarte con el recibo de la tienda.',
              })}
            </Text>
          </View>

          <TouchableOpacity
            testID="personal-plan-thank-you-auth"
            style={[styles.primary, { backgroundColor: t.accent }]}
            activeOpacity={0.88}
            onPress={() => setAuthVisible(true)}
          >
            <Text style={[styles.primaryText, { color: t.correctText }]}>
              {triLang(lang, {
                ru: 'Сохранить прогресс',
                uk: 'Зберегти прогрес',
                es: 'Guardar progreso',
              })}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={t.correctText} />
          </TouchableOpacity>

          <TouchableOpacity
            testID="personal-plan-thank-you-later"
            style={styles.secondary}
            activeOpacity={0.72}
            onPress={goToPlan}
          >
            <Text style={[styles.secondaryText, { color: t.textGhost }]}>
              {triLang(lang, { ru: 'Позже', uk: 'Пізніше', es: 'Más tarde' })}
            </Text>
          </TouchableOpacity>
        </View>
        </BounceView>
      </View>

      <RegistrationPromptModal
        visible={authVisible}
        context="onboarding"
        title={triLang(lang, {
          ru: 'Сохраним твой план',
          uk: 'Збережемо твій план',
          es: 'Guarda tu plan',
        })}
        subtitle={triLang(lang, {
          ru: 'Войди через Google или Apple, чтобы Premium, план и прогресс были привязаны к аккаунту.',
          uk: 'Увійди через Google або Apple, щоб Premium, план і прогрес були прив’язані до акаунта.',
          es: 'Accede con Google o Apple para vincular Premium, el plan y el progreso a tu cuenta.',
        })}
        onClose={goToPlan}
        onSignedIn={goToPlan}
      />
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 22,
    alignItems: 'center',
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  title: {
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 18,
  },
  supportBox: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  supportText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  primary: {
    width: '100%',
    minHeight: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  primaryText: {
    fontSize: 17,
    fontWeight: '900',
  },
  secondary: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
