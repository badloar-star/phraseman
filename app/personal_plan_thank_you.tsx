import React from 'react';
import { useRouter } from 'expo-router';

import RegistrationPromptModal from '../components/RegistrationPromptModal';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import { markNextNavigationAsReplace } from './navigation_back';
import { withPersonalPlanSunsetGuard } from '../components/personal_plan_sunset_guard';

function PersonalPlanThankYouScreen() {
  const router = useRouter();
  const { lang } = useLang();

  const goToPlan = () => {
    markNextNavigationAsReplace();
    router.replace('/personal_plan' as any);
  };

  return (
    <RegistrationPromptModal
      visible={true}
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
  );
}

export default withPersonalPlanSunsetGuard(PersonalPlanThankYouScreen);
