import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AiDialogBriefingScreen from '../components/AiDialogBriefingScreen';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import PressableScale from '../components/feedback/PressableScale';
import { triLang } from '../constants/i18n';
import { markAiDialogIntroSeen } from './ai_dialog_intro_seen';
import { getScenarioById } from './ai_dialog_scenarios';
import {
  aiDialogContentAvailableForTarget,
  frenchAiDialogGateCopy,
} from './ai_dialog_target_gate';
import { safeRouterBack } from './navigation_back';

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
  const params = useLocalSearchParams<{ scenarioId?: string | string[] }>();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const aiDialogGateOpen = aiDialogContentAvailableForTarget(studyTarget);
  const goBack = () => safeRouterBack(router, '/(tabs)/lessons' as never);

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

  const rawScenarioId = params.scenarioId;
  const scenarioId = (Array.isArray(rawScenarioId) ? rawScenarioId[0] : rawScenarioId)?.trim() ?? '';
  const scenario = getScenarioById(scenarioId);

  if (!scenario) {
    return (
      <RecoveryScreen
        icon="alert-circle-outline"
        title={triLang(lang, {
          ru: 'Диалог не найден',
          uk: 'Діалог не знайдено',
          es: 'No se encontró el diálogo',
        })}
        body={triLang(lang, {
          ru: 'Ссылка на этот диалог недоступна. Вернитесь к урокам и выберите ситуацию снова.',
          uk: 'Посилання на цей діалог недоступне. Поверніться до уроків і виберіть ситуацію знову.',
          es: 'El enlace a este diálogo no está disponible. Vuelve a las lecciones y elige otra situación.',
        })}
        action={triLang(lang, { ru: 'Назад', uk: 'Назад', es: 'Volver' })}
        onBack={goBack}
      />
    );
  }

  return (
    <AiDialogBriefingScreen
      scenario={scenario}
      onBack={goBack}
      onStart={() => {
        void markAiDialogIntroSeen(studyTarget, scenario.id);
        router.replace({
          pathname: '/ai_dialog_session',
          params: { scenarioId: scenario.id },
        } as never);
      }}
    />
  );
}
