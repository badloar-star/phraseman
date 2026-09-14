import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AiDialogBriefingScreen from '../components/AiDialogBriefingScreen';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import PressableScale from '../components/feedback/PressableScale';
import { triLang } from '../constants/i18n';
import {
  hasSeenAiDialogIntro,
  markAiDialogIntroSeen,
  peekAiDialogIntroSeen,
} from './ai_dialog_intro_seen';
import { trackEvent as trackAiDialogEvent } from './analytics';
import { resolveDialogScenarioAccess } from './ai_dialog_level_lock';
import { getScenarioById } from './ai_dialog_scenarios';
import {
  aiDialogContentAvailableForTarget,
  frenchAiDialogGateCopy,
} from './ai_dialog_target_gate';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';

// Голый __DEV__ падает в тестах (память project_dev_guard_bare_dev_global_jest):
// читаем через globalThis, как в соседних экранах диалогов.
const IS_DEV_RUNTIME: boolean = (globalThis as { __DEV__?: boolean }).__DEV__ === true;

type RecoveryScreenProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  action: string;
  onBack: () => void;
};

function RecoveryScreen({ icon, title, body, action, onBack }: RecoveryScreenProps) {
  const { theme: t, f, ds } = useTheme();

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: ds.spacing.xl }}>
        <View style={{ alignItems: 'center', maxWidth: 520 }}>
          <Ionicons name={icon} size={40} color={t.textMuted} />
          <Text
            accessibilityRole="header"
            style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', textAlign: 'center', marginTop: ds.spacing.md }}
          >
            {title}
          </Text>
          <Text
            style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', lineHeight: f.body + 8, marginTop: ds.spacing.sm }}
          >
            {body}
          </Text>
          <PressableScale
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={action}
            style={{
              minHeight: ds.buttonHeight,
              minWidth: 180,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.accent,
              borderRadius: ds.radius.lg,
              paddingHorizontal: ds.spacing.xl,
              marginTop: ds.spacing.xl,
            }}
          >
            <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '700' }}>{action}</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    </ScreenGradient>
  );
}

export default function AiDialogBriefingRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    scenarioId?: string | string[];
    forceBriefing?: string | string[];
  }>();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const aiDialogGateOpen = aiDialogContentAvailableForTarget(studyTarget);
  const goBack = () => safeRouterBack(router, '/(tabs)/lessons' as never);

  const rawScenarioId = params.scenarioId;
  const scenarioId = (Array.isArray(rawScenarioId) ? rawScenarioId[0] : rawScenarioId)?.trim() ?? '';
  const scenario = getScenarioById(scenarioId);
  const rawForceBriefing = params.forceBriefing;
  const forceBriefing = (Array.isArray(rawForceBriefing) ? rawForceBriefing[0] : rawForceBriefing) === '1';
  const [introResolved, setIntroResolved] = useState(
    () => forceBriefing || !scenario || peekAiDialogIntroSeen(studyTarget, scenario.id) === false,
  );

  /**
   * Замок платного сценария — на САМОМ ЭКРАНЕ, а не только в каталоге.
   *
   * зачем (аудит 2026-09-14): правило «фри видит ровно три сценария» стояло
   * лишь в плитках каталога (DialogsTabContent). Экран брифинга доступа не
   * проверял вовсе, поэтому прямой роут
   * `/ai_dialog_briefing?scenarioId=pharmacy` открывал любой платный сценарий
   * целиком и бесплатно — id лежат в клиентском бандле. Брифинг обязателен
   * перед сессией (он же резолвер холодного старта), поэтому правило живёт
   * здесь: это горло, через которое проходят все входы в диалог.
   *
   * Проверка стоит ПЕРЕД эффектом автоперехода в сессию: иначе повторный вход
   * (интро уже просмотрено) уводил бы в сессию мимо замка.
   */
  const [accessGate, setAccessGate] = useState<'checking' | 'ok' | 'denied'>('checking');
  useEffect(() => {
    if (!scenario) { setAccessGate('ok'); return; } // нет сценария — свой экран ошибки ниже
    let cancelled = false;
    void resolveDialogScenarioAccess(scenario.id).then((allowed) => {
      if (cancelled) return;
      if (allowed) {
        // Разрешение — рутина, в релизе шуметь незачем.
        if (IS_DEV_RUNTIME) console.log('[DIALOG-GATE] briefing:access allowed', scenario.id);
        setAccessGate('ok');
        return;
      }
      // ОТКАЗ логируем всегда: это ранний выход, уводящий человека с экрана.
      console.log(`[DIALOG-GATE] briefing:access denied scenario=${scenario.id} cefr=${scenario.cefr} → пейвол`); // guard-ok: ранний выход обязан логироваться и в релизе (правило «сперва логи»)
      setAccessGate('denied');
      void trackAiDialogEvent('ai_dialog_locked_scenario_tapped', {
        scenarioId: scenario.id, cefr: scenario.cefr, reason: 'direct_route_blocked',
      });
      void trackAiDialogEvent('paywall_shown', { context: 'dialog_locked_level', source: 'ai_dialog_briefing_direct' });
      markNextNavigationAsReplace();
      router.replace({ pathname: '/premium_modal', params: { context: 'dialog_locked_level', source: 'ai_dialog_briefing_direct' } } as never);
    }).catch((error: unknown) => {
      if (cancelled) return;
      // Немой catch запрещён. Пускаем: наша ошибка чтения премиума не повод
      // отнимать доступ у того, кто, возможно, за него заплатил.
      console.warn('[DIALOG-GATE] briefing:access failed → пускаем:', // guard-ok: немой catch запрещён правилом владельца
        error instanceof Error ? `${error.name}: ${error.message}` : String(error));
      setAccessGate('ok');
    });
    return () => { cancelled = true; };
  }, [router, scenario]);

  useEffect(() => {
    if (!aiDialogGateOpen || !scenario || forceBriefing) {
      setIntroResolved(true);
      return;
    }
    // Автопереход в сессию ждёт вердикта замка: иначе повторный вход
    // (интро просмотрено) уводил бы в платный сценарий мимо проверки.
    if (accessGate !== 'ok') return;

    let cancelled = false;
    const openSession = () => {
      if (cancelled) return;
      markNextNavigationAsReplace();
      router.replace({
        pathname: '/ai_dialog_session',
        params: { scenarioId: scenario.id },
      } as never);
    };
    const cached = peekAiDialogIntroSeen(studyTarget, scenario.id);
    if (cached === true) {
      openSession();
      return () => {
        cancelled = true;
      };
    }
    if (cached === false) {
      setIntroResolved(true);
      return () => {
        cancelled = true;
      };
    }

    void hasSeenAiDialogIntro(studyTarget, scenario.id).then((seen) => {
      if (seen) openSession();
      else if (!cancelled) setIntroResolved(true);
    });
    return () => {
      cancelled = true;
    };
  }, [aiDialogGateOpen, forceBriefing, router, scenario, studyTarget]);

  if (!aiDialogGateOpen) {
    const gateCopy = frenchAiDialogGateCopy(lang);
    return (
      <RecoveryScreen
        icon="lock-closed-outline"
        title={gateCopy.title}
        body={gateCopy.body}
        action={gateCopy.action}
        onBack={goBack}
      />
    );
  }

  if (!scenario) {
    return (
      <RecoveryScreen
        icon="alert-circle-outline"
        title={triLang(lang, {
          ru: 'Диалог не найден',
          uk: 'Діалог не знайдено',
          en: 'Dialogue not found',
          es: 'No se encontró el diálogo',
          'pt-BR': 'Diálogo não encontrado',
          vi: 'Không tìm thấy hội thoại',
          id: 'Dialog tidak ditemukan',
          tr: 'Diyalog bulunamadı',
          pl: 'Nie znaleziono dialogu',
        })}
        body={triLang(lang, {
          ru: 'Ссылка на этот диалог недоступна. Вернитесь к урокам и выберите ситуацию снова.',
          uk: 'Посилання на цей діалог недоступне. Поверніться до уроків і виберіть ситуацію знову.',
          en: 'This dialogue’s link is unavailable. Go back to lessons and pick a situation again.',
          es: 'El enlace a este diálogo no está disponible. Vuelve a las lecciones y elige otra situación.',
          'pt-BR': 'O link para este diálogo está indisponível. Volte às lições e escolha a situação novamente.',
          vi: 'Liên kết đến hội thoại này không khả dụng. Hãy quay lại bài học và chọn tình huống khác.',
          id: 'Tautan ke dialog ini tidak tersedia. Kembali ke pelajaran dan pilih situasi lagi.',
          tr: 'Bu diyaloğun bağlantısı kullanılamıyor. Derslere dönüp durumu tekrar seç.',
          pl: 'Link do tego dialogu jest niedostępny. Wróć do lekcji i wybierz sytuację ponownie.',
        })}
        action={triLang(lang, {
          ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Volver',
          'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
        })}
        onBack={goBack}
      />
    );
  }

  if (!introResolved) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }} />
      </ScreenGradient>
    );
  }

  return (
    <>
      <AiDialogBriefingScreen
        scenario={scenario}
        onBack={goBack}
        onStart={() => {
          // зачем: здесь энергия НЕ списывается. Оплата живёт в самой сессии
          // (ai_dialog_session), потому что брифинг показывается только при
          // ПЕРВОМ прохождении сценария — повторные входы идут мимо него, и
          // до аудита 2026-08-23 были бесплатными. Одна точка оплаты вместо
          // двух: иначе первый диалог стоил бы 2 ⚡ вместо одной.
          void markAiDialogIntroSeen(studyTarget, scenario.id);
          markNextNavigationAsReplace();
          router.replace({
            pathname: '/ai_dialog_session',
            params: { scenarioId: scenario.id },
          } as never);
        }}
      />
    </>
  );
}
