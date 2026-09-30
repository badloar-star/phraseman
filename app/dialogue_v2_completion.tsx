import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  completeDialogueV2Session,
  type DialogueV2CompletionResult,
} from './dialogue_v2_completion_client';
import { useLang } from '../components/LangContext';
import { PressableScale } from '../components/feedback/PressableScale';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { triLang } from '../constants/i18n';
import { V2, V2_TYPE } from '../constants/v2Style';

const SESSION_RE = /^d2s_[A-Za-z0-9_-]{32,96}$/;
const SCENARIO_RE = /^(?=.{1,64}$)[a-z0-9]+(?:_[a-z0-9]+)*$/;
const TARGETS = new Set(['en', 'es', 'fr', 'de']);
const INTERFACE_LANGUAGES = new Set(['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl', 'fr', 'de']);

type State =
  | Readonly<{ kind: 'loading' }>
  | Readonly<{ kind: 'unavailable' }>
  | Readonly<{ kind: 'ready'; result: DialogueV2CompletionResult }>;

export default function DialogueV2CompletionRoute() {
  const params = useLocalSearchParams<{ sessionId?: string | string[]; scenarioId?: string | string[] }>();
  const router = useRouter();
  const { studyTarget } = useStudyTarget();
  const { lang } = useLang();
  // зачем (practice.html «Завершение → Диалог»): итог диалога на токенах Liquid Glass активной темы,
  // а не на V2-палитре. Имена полей сохранены, чтобы разметка ниже не менялась; только цвета.
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const palette = useMemo(() => ({
    bg: glass.bg, glassRaised: glass.opaqueCard, stroke: glass.glassEdge, text: glass.text,
    textSecondary: glass.secondary, textMuted: glass.mutedText, cta: glass.cta, ctaText: glass.ctaInk,
    control: glass.opaqueControl, divider: glass.line,
  }), [glass]);
  const [state, setState] = useState<State>({ kind: 'loading' });
  const sessionId = typeof params.sessionId === 'string' && SESSION_RE.test(params.sessionId)
    ? params.sessionId
    : null;
  const scenarioId = typeof params.scenarioId === 'string' && SCENARIO_RE.test(params.scenarioId)
    ? params.scenarioId
    : null;
  const interfaceLang = INTERFACE_LANGUAGES.has(lang) ? lang : 'en';
  const selectionRef = useRef<Readonly<{
    sessionId: string;
    studyTarget: 'en' | 'es' | 'fr' | 'de';
    scenarioId: string;
    interfaceLang: string;
  }> | null>(null);
  if (!selectionRef.current && sessionId && scenarioId && TARGETS.has(studyTarget)) {
    selectionRef.current = Object.freeze({
      sessionId,
      studyTarget: studyTarget as 'en' | 'es' | 'fr' | 'de',
      scenarioId,
      interfaceLang,
    });
  }
  const requestGenerationRef = useRef(0);
  const labels = useMemo(() => ({
    title: triLang(lang, { ru: 'Итог диалога', uk: 'Підсумок діалогу', en: 'Conversation result', es: 'Resultado del diálogo', fr: 'Bilan du dialogue', de: 'Dialogauswertung' }),
    loading: triLang(lang, { ru: 'Собеседник готовит подробный итог…', uk: 'Співрозмовник готує докладний підсумок…', en: 'Your partner is preparing a detailed review…', es: 'Tu interlocutor prepara una evaluación detallada…', fr: 'Ton interlocuteur prépare un bilan détaillé…', de: 'Dein Gesprächspartner erstellt eine ausführliche Auswertung…' }),
    unavailable: triLang(lang, { ru: 'Итог пока недоступен', uk: 'Підсумок поки недоступний', en: 'The review is unavailable', es: 'La evaluación no está disponible', fr: 'Le bilan est indisponible', de: 'Die Auswertung ist nicht verfügbar' }),
    retry: triLang(lang, { ru: 'Попробовать снова', uk: 'Спробувати ще раз', en: 'Try again', es: 'Intentar de nuevo', fr: 'Réessayer', de: 'Erneut versuchen' }),
    tasks: triLang(lang, { ru: 'Задачи сценария', uk: 'Завдання сценарію', en: 'Scenario tasks', es: 'Tareas del escenario', fr: 'Objectifs du scénario', de: 'Szenario-Aufgaben' }),
    correction: triLang(lang, { ru: 'Как звучать естественнее', uk: 'Як звучати природніше', en: 'How to sound more natural', es: 'Cómo sonar más natural', fr: 'Pour parler plus naturellement', de: 'Natürlicher klingen' }),
    next: triLang(lang, { ru: 'Следующий шаг', uk: 'Наступний крок', en: 'Next step', es: 'Siguiente paso', fr: 'Étape suivante', de: 'Nächster Schritt' }),
    done: triLang(lang, { ru: 'Готово', uk: 'Готово', en: 'Done', es: 'Listo', fr: 'Terminé', de: 'Fertig' }),
  }), [lang]);

  const runCompletion = useCallback(() => {
    const selection = selectionRef.current;
    if (!selection) {
      setState({ kind: 'unavailable' });
      return;
    }
    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    setState({ kind: 'loading' });
    void completeDialogueV2Session(selection).then((result) => {
      if (requestGenerationRef.current === generation) {
        setState(result ? { kind: 'ready', result } : { kind: 'unavailable' });
      }
    }).catch(() => {
      if (requestGenerationRef.current === generation) setState({ kind: 'unavailable' });
    });
  }, []);

  useEffect(() => {
    runCompletion();
    return () => { requestGenerationRef.current += 1; };
  }, [runCompletion]);

  const content = state.kind === 'ready' ? state.result : null;
  const review = content?.review;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} testID="dialogue-v2-completion-screen">
      <View
        testID="dialogue-v2-completion-header"
        style={{
          minHeight: V2.iconButton + V2.gap,
          paddingHorizontal: V2.screenPad,
          paddingBottom: V2.gapTight,
          flexDirection: 'row',
          alignItems: 'center',
          gap: V2.gap,
        }}
      >
        <PressableScale
          onPress={() => router.back()}
          variant="flat"
          accessibilityRole="button"
          accessibilityLabel={labels.done}
          style={{
            width: V2.iconButton,
            height: V2.iconButton,
            borderRadius: V2.iconButton / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: palette.glassRaised,
            borderWidth: 1,
            borderColor: palette.stroke,
          }}
        >
          <Ionicons name="arrow-back" size={22} color={palette.text} />
        </PressableScale>
        <Text style={{ flex: 1, color: palette.text, ...V2_TYPE.title }}>{labels.title}</Text>
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: V2.screenPad,
          paddingBottom: V2.cta.height + V2.screenPad * 3,
          gap: V2.gap,
        }}
      >
        {state.kind === 'loading' ? (
          <View style={{ borderRadius: V2.radius.card, padding: V2.gap, backgroundColor: palette.glassRaised, borderWidth: 1, borderColor: palette.stroke }}>
            <Text style={{ color: palette.textSecondary, ...V2_TYPE.body }}>{labels.loading}</Text>
          </View>
        ) : null}
        {state.kind === 'unavailable' ? (
          <View style={{ borderRadius: V2.radius.card, padding: V2.gap, gap: V2.gap, backgroundColor: palette.glassRaised, borderWidth: 1, borderColor: palette.stroke }}>
            <Text style={{ color: palette.textSecondary, ...V2_TYPE.body }}>{labels.unavailable}</Text>
            <PressableScale
              onPress={runCompletion}
              variant="flat"
              testID="dialogue-v2-completion-retry"
              accessibilityRole="button"
              accessibilityLabel={labels.retry}
              style={{ minHeight: V2.cta.height, borderRadius: V2.cta.radius, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.control }}
            >
              <Text style={{ color: palette.text, ...V2_TYPE.headline }}>{labels.retry}</Text>
            </PressableScale>
          </View>
        ) : null}
        {review ? (
          <>
            <View style={{ borderRadius: V2.radius.card, padding: V2.gap, gap: V2.gapTight, backgroundColor: palette.glassRaised, borderWidth: 1, borderColor: palette.stroke }}>
              <Text style={{ color: palette.textMuted, ...V2_TYPE.overline }}>{review.speakerName}</Text>
              <Text style={{ color: palette.text, ...V2_TYPE.body }}>{review.assessment}</Text>
              {review.evidence.length > 0 ? review.evidence.map((item, index) => (
                <View key={`${item.learnerTurn}-${index}`} style={{ borderLeftWidth: 1, borderLeftColor: palette.stroke, paddingLeft: V2.gapTight, gap: 2 }}>
                  <Text style={{ color: palette.textSecondary, ...V2_TYPE.body }}>“{item.learnerTurn}”</Text>
                  <Text style={{ color: palette.textMuted, ...V2_TYPE.caption }}>{item.note}</Text>
                </View>
              )) : null}
            </View>

                <View style={{ gap: V2.gapTight }}>
                  <Text style={{ color: palette.text, ...V2_TYPE.section }}>{labels.tasks}</Text>
              {review.objectiveResults.map((objective) => (
                    <View key={objective.objectiveId} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: V2.gapTight, borderRadius: V2.radius.row, padding: 13, backgroundColor: palette.glassRaised, borderWidth: 1, borderColor: palette.stroke }}>
                  <Ionicons name={objective.status === 'met' ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={objective.status === 'met' ? palette.cta : palette.textMuted} />
                  <Text style={{ flex: 1, color: palette.text, ...V2_TYPE.body }}>{objective.label}</Text>
                </View>
              ))}
            </View>

            {review.corrections.map((correction, index) => (
              <View key={`${correction.original}-${index}`} style={{ borderRadius: V2.radius.card, padding: V2.gap, gap: V2.gapTight, backgroundColor: palette.glassRaised, borderWidth: 1, borderColor: palette.stroke }}>
                <Text style={{ color: palette.text, ...V2_TYPE.headline }}>{labels.correction}</Text>
                <Text style={{ color: palette.textMuted, ...V2_TYPE.body }}>{correction.original}</Text>
                <Text style={{ color: palette.text, ...V2_TYPE.body }}>{correction.corrected}</Text>
                <Text style={{ color: palette.textSecondary, ...V2_TYPE.caption }}>{correction.note}</Text>
              </View>
            ))}

                <View style={{ borderRadius: V2.radius.card, padding: V2.gap, gap: V2.gapTight, backgroundColor: palette.glassRaised, borderWidth: 1, borderColor: palette.stroke }}>
              <Text style={{ color: palette.text, ...V2_TYPE.headline }}>{labels.next}</Text>
              <Text style={{ color: palette.textSecondary, ...V2_TYPE.body }}>{review.tip}</Text>
            </View>
          </>
        ) : null}
      </ScrollView>
      <View style={{ paddingHorizontal: V2.screenPad, paddingTop: V2.gapTight, paddingBottom: V2.gapTight, backgroundColor: palette.bg, borderTopWidth: 1, borderTopColor: palette.divider }}>
        <PressableScale
          onPress={() => router.back()}
          variant="flat"
          testID="dialogue-v2-completion-done"
          accessibilityRole="button"
          accessibilityLabel={labels.done}
          style={{ minHeight: V2.cta.height, borderRadius: V2.cta.radius, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.cta }}
        >
          <Text style={{ color: palette.ctaText, ...V2_TYPE.headline }}>{labels.done}</Text>
        </PressableScale>
      </View>
    </SafeAreaView>
  );
}
