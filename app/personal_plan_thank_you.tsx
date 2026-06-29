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
import { markNextNavigationAsReplace } from './navigation_back';

export default function PersonalPlanThankYouScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const [authVisible, setAuthVisible] = useState(false);

  const goToPlan = () => {
    setAuthVisible(false);
    // markNextNavigationAsReplace: убираем САМ экран «План включён» из стека «назад».
    // Это терминальный экран-поздравление: вернуться на него нельзя. Без пометки он
    // оставался в стеке, и «назад» из плана возвращало на «План включён», а оттуда
    // единственный путь — снова в план → бесконечная петля thank-you↔plan.
    markNextNavigationAsReplace();
    router.replace('/personal_plan' as any);
  };

  return (
    <ScreenGradient>
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <BounceView style={styles.safe}>
        <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          {/* Галочку красим в ЯРКИЙ t.correct, а не t.correctText: correctText —
              это тёмный текст для ЗАЛИТЫХ CTA, на полупрозрачной correctBg-плашке он
              сливается с фоном и иконка пропадает (была «пустая» зелёная плашка). */}
          <View style={[styles.iconWrap, { backgroundColor: t.correctBg, borderColor: t.correct + '55' }]}>
            <Ionicons name="checkmark" size={40} color={t.correct} />
          </View>

          <Text style={[styles.kicker, { color: t.textGhost }]}>
            {triLang(lang, { ru: 'PREMIUM', uk: 'PREMIUM', es: 'PREMIUM', 'pt-BR': 'PREMIUM', vi: 'PREMIUM', id: 'PREMIUM', tr: 'PREMIUM', pl: 'PREMIUM' })}
          </Text>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h1 }]}>
            {triLang(lang, {
              ru: 'План включён',
              uk: 'План увімкнено',
              es: 'Plan activado',
              'pt-BR': 'Plano ativado',
              vi: 'Kế hoạch đã bật',
              id: 'Rencana aktif',
              tr: 'Plan açıldı',
              pl: 'Plan włączony',
            })}
          </Text>
          <Text style={[styles.subtitle, { color: t.textMuted }]}>
            {triLang(lang, {
              ru: 'Plus активен, личный план сохранён. Осталось привязать аккаунт, чтобы прогресс не потерялся при смене телефона.',
              uk: 'Plus активний, особистий план збережено. Залишилося прив’язати акаунт, щоб прогрес не загубився після зміни телефона.',
              es: 'Plus está activo y tu plan personal está guardado. Vincula una cuenta para no perder el progreso si cambias de teléfono.',
              'pt-BR': 'Plus está ativo e seu plano pessoal foi salvo. Falta vincular uma conta para não perder o progresso ao trocar de telefone.',
              vi: 'Plus đã hoạt động và kế hoạch cá nhân đã được lưu. Hãy liên kết tài khoản để không mất tiến độ khi đổi điện thoại.',
              id: 'Plus aktif dan rencana pribadimu tersimpan. Tautkan akun agar progres tidak hilang saat ganti ponsel.',
              tr: 'Plus aktif, kişisel planın kaydedildi. Telefon değiştirince ilerlemen kaybolmasın diye hesabını bağla.',
              pl: 'Plus jest aktywny, a plan osobisty zapisany. Połącz konto, aby nie stracić postępów po zmianie telefonu.',
            })}
          </Text>

          <TouchableOpacity
            testID="personal-plan-thank-you-auth"
            style={[styles.primary, { backgroundColor: t.accent }]}
            activeOpacity={0.88}
            onPress={() => setAuthVisible(true)}
          >
            <Text style={[styles.primaryText, { color: t.correctText }]}>
              {triLang(lang, {
                ru: 'Сохранить свой путь',
                uk: 'Зберегти свій шлях',
                es: 'Guardar progreso',
                'pt-BR': 'Salvar progresso',
                vi: 'Lưu tiến độ',
                id: 'Simpan progres',
                tr: 'İlerlemeyi kaydet',
                pl: 'Zapisz postępy',
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
              {triLang(lang, { ru: 'Позже', uk: 'Пізніше', es: 'Más tarde', 'pt-BR': 'Depois', vi: 'Để sau', id: 'Nanti', tr: 'Daha sonra', pl: 'Później' })}
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
          'pt-BR': 'Vamos salvar seu plano',
          vi: 'Lưu kế hoạch của bạn',
          id: 'Simpan rencanamu',
          tr: 'Planını kaydedelim',
          pl: 'Zapiszemy twój plan',
        })}
        subtitle={triLang(lang, {
          ru: 'Войди через Google или Apple, чтобы Plus, план и прогресс были привязаны к аккаунту.',
          uk: 'Увійди через Google або Apple, щоб Plus, план і прогрес були прив’язані до акаунта.',
          es: 'Accede con Google o Apple para vincular Plus, el plan y el progreso a tu cuenta.',
          'pt-BR': 'Entre com Google ou Apple para vincular Plus, o plano e o progresso à sua conta.',
          vi: 'Đăng nhập bằng Google hoặc Apple để gắn Plus, kế hoạch và tiến độ với tài khoản của bạn.',
          id: 'Masuk dengan Google atau Apple agar Plus, rencana, dan progres tertaut ke akunmu.',
          tr: 'Plus, plan ve ilerlemenin hesabına bağlanması için Google veya Apple ile giriş yap.',
          pl: 'Zaloguj się przez Google albo Apple, aby Plus, plan i postępy były przypisane do konta.',
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
