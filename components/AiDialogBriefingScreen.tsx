import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Reanimated, { FadeInDown } from 'react-native-reanimated';

import {
  dialogScenarioGoal,
  dialogScenarioNextStepHint,
  dialogScenarioTitle,
  type DialogScenario,
} from '../app/ai_dialog_scenarios';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import ScreenGradient from './ScreenGradient';
import PressableScale from './feedback/PressableScale';
import { triLang } from '../constants/i18n';
import { useReduceMotion } from '../hooks/use_reduce_motion';

type AiDialogBriefingScreenProps = {
  scenario: DialogScenario;
  onBack: () => void;
  onStart: () => void;
};

const briefingCopy = (lang: ReturnType<typeof useLang>['lang']) => ({
  goalLabel: triLang(lang, {
    ru: 'Цель диалога', uk: 'Мета діалогу', es: 'Objetivo del diálogo', 'pt-BR': 'Objetivo do diálogo',
    vi: 'Mục tiêu hội thoại', id: 'Tujuan dialog', tr: 'Diyalog hedefi', pl: 'Cel dialogu',
  }),
  firstPromptLabel: triLang(lang, {
    ru: 'Начните с этого', uk: 'Почніть із цього', es: 'Empieza con esto', 'pt-BR': 'Comece por aqui',
    vi: 'Bắt đầu từ đây', id: 'Mulai dari sini', tr: 'Buradan başlayın', pl: 'Zacznij od tego',
  }),
  start: triLang(lang, {
    ru: 'Начать диалог', uk: 'Почати діалог', es: 'Iniciar diálogo', 'pt-BR': 'Iniciar diálogo',
    vi: 'Bắt đầu hội thoại', id: 'Mulai dialog', tr: 'Diyaloğu başlat', pl: 'Rozpocznij dialog',
  }),
  back: triLang(lang, {
    ru: 'Назад', uk: 'Назад', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wróć',
  }),
});

export default function AiDialogBriefingScreen({
  scenario,
  onBack,
  onStart,
}: AiDialogBriefingScreenProps) {
  const { theme: t, f, ds } = useTheme();
  const { lang } = useLang();
  const reduceMotion = useReduceMotion();
  const copy = briefingCopy(lang);
  const entering = reduceMotion ? undefined : FadeInDown.duration(280);

  return (
    <ScreenGradient>
      <SafeAreaView testID="screen-ai-dialog-briefing" style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: ds.spacing.lg, paddingVertical: ds.spacing.md }}>
          <PressableScale
            onPress={onBack}
            variant="flat"
            accessibilityRole="button"
            accessibilityLabel={copy.back}
            hitSlop={12}
            style={{ padding: ds.spacing.sm }}
          >
            <Ionicons name="chevron-back" size={26} color={t.textPrimary} />
          </PressableScale>
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: ds.spacing.xl, paddingBottom: ds.spacing.xxl }}>
          <Reanimated.View entering={entering} style={{ flex: 1, justifyContent: 'center', gap: ds.spacing.xl }}>
            <View style={{ alignItems: 'center', gap: ds.spacing.md }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: t.accentBg }}>
                <Ionicons name={scenario.icon as keyof typeof Ionicons.glyphMap} size={34} color={t.accent} />
              </View>
              <Text style={{ color: t.accent, fontSize: f.label, fontWeight: '700', letterSpacing: 1.2 }}>
                {scenario.cefr}
              </Text>
              <Text accessibilityRole="header" style={{ color: t.textPrimary, fontSize: f.h1 + 6, fontWeight: '700', textAlign: 'center' }}>
                {dialogScenarioTitle(scenario, lang)}
              </Text>
            </View>

            <View style={{ gap: ds.spacing.sm, padding: ds.spacing.lg, borderRadius: ds.radius.xl, backgroundColor: t.bgCard }}>
              <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '700', letterSpacing: 0.8 }}>
                {copy.goalLabel}
              </Text>
              <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '400', lineHeight: f.bodyLg + 8 }}>
                {dialogScenarioGoal(scenario, lang)}
              </Text>
            </View>

            <View style={{ gap: ds.spacing.sm, padding: ds.spacing.lg, borderRadius: ds.radius.xl, backgroundColor: t.bgSurface }}>
              <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '700', letterSpacing: 0.8 }}>
                {copy.firstPromptLabel}
              </Text>
              <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '400', lineHeight: f.bodyLg + 8 }}>
                {dialogScenarioNextStepHint(scenario, lang)}
              </Text>
            </View>

            <PressableScale
              onPress={onStart}
              accessibilityRole="button"
              accessibilityLabel={copy.start}
              style={{ minHeight: ds.buttonHeight, borderRadius: ds.radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: t.accent }}
            >
              <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '700' }}>{copy.start}</Text>
            </PressableScale>
          </Reanimated.View>
        </ScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
