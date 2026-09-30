import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  clearDialogueV2Memory,
  type DialogueV2MemoryStudyTarget,
  type DialogueV2MemoryView,
  viewDialogueV2Memory,
} from './dialogue_v2_memory_client';
import {
  fetchReleasedDialogueV2Catalogue,
  type DialogueV2CatalogueReleaseEnvelope,
} from './dialogue_v2_catalogue_client';
import { triLang } from '../constants/i18n';
import { V2, V2_TYPE } from '../constants/v2Style';
import { useLang } from '../components/LangContext';
import { usePremium } from '../components/PremiumContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { PressableScale } from '../components/feedback/PressableScale';
import { useV2Palette } from '../components/v2/useV2Palette';

const V2_TARGETS = new Set(['en', 'es', 'fr', 'de']);

type MemoryState =
  | Readonly<{ kind: 'loading' }>
  | Readonly<{ kind: 'unavailable' }>
  | Readonly<{ kind: 'available'; memory: DialogueV2MemoryView }>;

type CatalogueLabels = Readonly<{
  scenarioTitles: ReadonlyMap<string, string>;
  objectiveLabels: ReadonlyMap<string, string>;
}>;

function supportedTarget(value: unknown): value is DialogueV2MemoryStudyTarget {
  return typeof value === 'string' && V2_TARGETS.has(value);
}

function record(value: unknown): Record<string, unknown> | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(descriptors).some((key) => typeof key !== 'string')) return null;
    const result: Record<string, unknown> = {};
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (!descriptor.enumerable || !('value' in descriptor)) return null;
      result[key] = descriptor.value;
    }
    return result;
  } catch {
    return null;
  }
}

function visibleText(value: unknown, maxLength: number): string | null {
  return typeof value === 'string'
    && value === value.trim()
    && value.length > 0
    && value.length <= maxLength
    && !/[\u0000-\u001f\u007f]/.test(value)
    ? value
    : null;
}

/** Builds display labels only; malformed catalogue fragments are ignored and never rendered. */
function catalogueLabels(
  envelope: DialogueV2CatalogueReleaseEnvelope | null,
  expectedTarget: DialogueV2MemoryStudyTarget,
): CatalogueLabels {
  const scenarioTitles = new Map<string, string>();
  const objectiveLabels = new Map<string, string>();
  for (const rawPacket of envelope?.packets ?? []) {
    const packet = record(rawPacket);
    const scenario = record(packet?.scenario);
    const content = record(packet?.content);
    const scenarioId = visibleText(scenario?.id, 64);
    const title = visibleText(content?.title, 120);
    if (packet?.studyTarget !== expectedTarget || !scenarioId || !title) continue;
    scenarioTitles.set(scenarioId, title);
    if (!Array.isArray(scenario?.objectives)) continue;
    for (const rawObjective of scenario.objectives.slice(0, 12)) {
      const objective = record(rawObjective);
      const objectiveId = visibleText(objective?.id, 64);
      const label = visibleText(objective?.label, 240);
      if (objectiveId && label) objectiveLabels.set(objectiveId, label);
    }
  }
  return Object.freeze({ scenarioTitles, objectiveLabels });
}

function memoryCopy(lang: ReturnType<typeof useLang>['lang']) {
  return Object.freeze({
    title: triLang(lang, { ru: 'Память диалогов', uk: 'Пам’ять діалогів', en: 'Dialogue memory', es: 'Memoria de diálogos', fr: 'Mémoire des dialogues', de: 'Dialoggedächtnis' }),
    back: triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Volver', fr: 'Retour', de: 'Zurück' }),
    intro: triLang(lang, {
      ru: 'Здесь хранится только краткая учебная сводка и место продолжения для выбранного языка. Сообщения и голосовые записи здесь не сохраняются.',
      uk: 'Тут зберігається лише короткий навчальний підсумок і місце продовження для вибраної мови. Повідомлення та голосові записи тут не зберігаються.',
      en: 'Only a short learning summary and resume points for this language are kept here. Messages and voice recordings are not stored here.',
      es: 'Aquí solo se guardan un resumen breve y los puntos de continuación de este idioma. No se guardan mensajes ni grabaciones de voz.',
      fr: 'Seuls un bref résumé pédagogique et les points de reprise de cette langue sont conservés ici. Les messages et enregistrements vocaux ne le sont pas.',
      de: 'Hier werden nur eine kurze Lernzusammenfassung und Fortsetzungspunkte für diese Sprache gespeichert. Nachrichten und Sprachaufnahmen werden hier nicht gespeichert.',
    }),
    plusRequired: triLang(lang, { ru: 'Память диалогов доступна в Plus', uk: 'Пам’ять діалогів доступна в Plus', en: 'Dialogue memory is available with Plus', es: 'La memoria de diálogos está disponible con Plus', fr: 'La mémoire des dialogues est disponible avec Plus', de: 'Dialoggedächtnis ist mit Plus verfügbar' }),
    openPlus: triLang(lang, { ru: 'Посмотреть Plus', uk: 'Переглянути Plus', en: 'View Plus', es: 'Ver Plus', fr: 'Voir Plus', de: 'Plus ansehen' }),
    loading: triLang(lang, { ru: 'Загружаем память…', uk: 'Завантажуємо пам’ять…', en: 'Loading memory…', es: 'Cargando memoria…', fr: 'Chargement de la mémoire…', de: 'Speicher wird geladen…' }),
    unavailable: triLang(lang, { ru: 'Не удалось загрузить память', uk: 'Не вдалося завантажити пам’ять', en: 'Memory could not be loaded', es: 'No se pudo cargar la memoria', fr: 'Impossible de charger la mémoire', de: 'Speicher konnte nicht geladen werden' }),
    empty: triLang(lang, { ru: 'Для этого языка пока ничего не сохранено.', uk: 'Для цієї мови ще нічого не збережено.', en: 'Nothing has been saved for this language yet.', es: 'Todavía no hay nada guardado para este idioma.', fr: 'Rien n’est encore mémorisé pour cette langue.', de: 'Für diese Sprache wurde noch nichts gespeichert.' }),
    summary: triLang(lang, { ru: 'Учебная сводка', uk: 'Навчальний підсумок', en: 'Learning summary', es: 'Resumen de aprendizaje', fr: 'Résumé pédagogique', de: 'Lernzusammenfassung' }),
    strengths: triLang(lang, { ru: 'Получается хорошо', uk: 'Добре виходить', en: 'Going well', es: 'Va bien', fr: 'Points forts', de: 'Läuft gut' }),
    focus: triLang(lang, { ru: 'На чём сосредоточиться', uk: 'На чому зосередитися', en: 'Focus next', es: 'Próximo enfoque', fr: 'À travailler', de: 'Nächster Fokus' }),
    completed: triLang(lang, { ru: 'Выполнено задач', uk: 'Виконано завдань', en: 'Tasks completed', es: 'Tareas completadas', fr: 'Objectifs terminés', de: 'Erledigte Aufgaben' }),
    progress: triLang(lang, { ru: 'Продолжение диалогов', uk: 'Продовження діалогів', en: 'Dialogue progress', es: 'Progreso de diálogos', fr: 'Progression des dialogues', de: 'Dialogfortschritt' }),
    nextTask: triLang(lang, { ru: 'Следующая задача', uk: 'Наступне завдання', en: 'Next task', es: 'Siguiente tarea', fr: 'Prochain objectif', de: 'Nächste Aufgabe' }),
    savedTask: triLang(lang, { ru: 'Сохранённая задача', uk: 'Збережене завдання', en: 'Saved task', es: 'Tarea guardada', fr: 'Objectif mémorisé', de: 'Gespeicherte Aufgabe' }),
    dialogue: triLang(lang, { ru: 'Диалог', uk: 'Діалог', en: 'Dialogue', es: 'Diálogo', fr: 'Dialogue', de: 'Dialog' }),
    clear: triLang(lang, { ru: 'Очистить память этого языка', uk: 'Очистити пам’ять цієї мови', en: 'Clear memory for this language', es: 'Borrar la memoria de este idioma', fr: 'Effacer la mémoire de cette langue', de: 'Speicher für diese Sprache löschen' }),
    deleteOnly: triLang(lang, {
      ru: 'Даже без Plus вы можете удалить всю сохранённую память выбранного языка. Просмотр сводки и точек продолжения останется недоступен.',
      uk: 'Навіть без Plus ви можете видалити всю збережену пам’ять вибраної мови. Перегляд підсумку й точок продовження залишиться недоступним.',
      en: 'Even without Plus, you can delete all saved memory for this language. Learning summaries and resume points remain unavailable to view.',
      es: 'Incluso sin Plus, puedes borrar toda la memoria guardada de este idioma. Los resúmenes y puntos de continuación no se pueden consultar.',
      fr: 'Même sans Plus, vous pouvez effacer toute la mémoire enregistrée pour cette langue. Les résumés et points de reprise restent indisponibles.',
      de: 'Auch ohne Plus können Sie alle gespeicherten Erinnerungen für diese Sprache löschen. Zusammenfassungen und Fortsetzungspunkte bleiben verborgen.',
    }),
    clearing: triLang(lang, { ru: 'Очищаем…', uk: 'Очищаємо…', en: 'Clearing…', es: 'Borrando…', fr: 'Effacement…', de: 'Wird gelöscht…' }),
    clearFailed: triLang(lang, { ru: 'Не удалось очистить память. Попробуйте ещё раз.', uk: 'Не вдалося очистити пам’ять. Спробуйте ще раз.', en: 'Memory could not be cleared. Please try again.', es: 'No se pudo borrar la memoria. Inténtalo de nuevo.', fr: 'Impossible d’effacer la mémoire. Réessayez.', de: 'Der Speicher konnte nicht gelöscht werden. Bitte erneut versuchen.' }),
    confirmTitle: triLang(lang, { ru: 'Очистить память?', uk: 'Очистити пам’ять?', en: 'Clear memory?', es: '¿Borrar la memoria?', fr: 'Effacer la mémoire ?', de: 'Speicher löschen?' }),
    confirmBody: triLang(lang, { ru: 'Удалятся учебная сводка и прогресс всех диалогов только для выбранного языка. Это действие нельзя отменить.', uk: 'Буде видалено навчальний підсумок і прогрес усіх діалогів лише для вибраної мови. Цю дію не можна скасувати.', en: 'The learning summary and all dialogue progress for this language will be deleted. This cannot be undone.', es: 'Se eliminarán el resumen y todo el progreso de diálogos de este idioma. Esta acción no se puede deshacer.', fr: 'Le résumé et toute la progression des dialogues de cette langue seront supprimés. Cette action est irréversible.', de: 'Die Lernzusammenfassung und der gesamte Dialogfortschritt dieser Sprache werden gelöscht. Dies kann nicht rückgängig gemacht werden.' }),
    cancel: triLang(lang, { ru: 'Отмена', uk: 'Скасувати', en: 'Cancel', es: 'Cancelar', fr: 'Annuler', de: 'Abbrechen' }),
  });
}

export default function DialogueV2MemoryRoute() {
  const router = useRouter();
  const { studyTarget } = useStudyTarget();
  const { lang } = useLang();
  const { accessResolved, hasPremiumAccess } = usePremium();
  const p = useV2Palette();
  const copy = useMemo(() => memoryCopy(lang), [lang]);
  const [state, setState] = useState<MemoryState>({ kind: 'loading' });
  const [labels, setLabels] = useState<CatalogueLabels>(() => catalogueLabels(null, 'en'));
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!accessResolved || !hasPremiumAccess) return undefined;
    if (!supportedTarget(studyTarget)) {
      setState({ kind: 'unavailable' });
      return undefined;
    }
    let active = true;
    setState({ kind: 'loading' });
    void Promise.all([
      viewDialogueV2Memory({ studyTarget }),
      fetchReleasedDialogueV2Catalogue(studyTarget),
    ]).then(([memory, envelope]) => {
      if (!active) return;
      setLabels(catalogueLabels(envelope, studyTarget));
      setState(memory ? { kind: 'available', memory } : { kind: 'unavailable' });
    }).catch(() => {
      if (active) setState({ kind: 'unavailable' });
    });
    return () => {
      active = false;
    };
  }, [accessResolved, hasPremiumAccess, studyTarget]);

  const clearMemory = useCallback(async () => {
    if (clearing || !supportedTarget(studyTarget)) return;
    setClearing(true);
    try {
      const receipt = await clearDialogueV2Memory({ studyTarget });
      if (receipt) {
        setState({
          kind: 'available',
          memory: { ok: true, studyTarget, sharedSummary: null, scenarioCheckpoints: [] },
        });
      }
    } catch {
      Alert.alert(copy.clearFailed);
    } finally {
      setClearing(false);
    }
  }, [clearing, copy.clearFailed, studyTarget]);

  const confirmClear = useCallback(() => {
    Alert.alert(copy.confirmTitle, copy.confirmBody, [
      { text: copy.cancel, style: 'cancel' },
      { text: copy.clear, style: 'destructive', onPress: () => { void clearMemory(); } },
    ]);
  }, [clearMemory, copy]);

  const renderHeader = () => (
    <View style={{ height: 60, paddingHorizontal: V2.screenPad, flexDirection: 'row', alignItems: 'center', gap: V2.gap }}>
      <PressableScale
        onPress={() => router.back()}
        variant="flat"
        accessibilityRole="button"
        accessibilityLabel={copy.back}
        style={{ width: V2.iconButton, height: V2.iconButton, borderRadius: V2.iconButton / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: p.control }}
      >
        <Ionicons name="chevron-back" size={23} color={p.text} />
      </PressableScale>
      <Text accessibilityRole="header" style={{ flex: 1, color: p.text, ...V2_TYPE.title }}>{copy.title}</Text>
    </View>
  );

  const renderClearControl = () => (
    <PressableScale
      testID="dialogue-v2-memory-clear-confirm"
      onPress={confirmClear}
      disabled={clearing || !supportedTarget(studyTarget)}
      accessibilityRole="button"
      accessibilityState={{ disabled: clearing || !supportedTarget(studyTarget) }}
      style={{ minHeight: V2.cta.height, borderRadius: V2.cta.radius, backgroundColor: p.control, borderColor: p.stroke, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, opacity: clearing ? 0.65 : 1 }}
    >
      <Text style={{ color: p.wrong, ...V2_TYPE.headline, textAlign: 'center' }}>{clearing ? copy.clearing : copy.clear}</Text>
    </PressableScale>
  );

  if (!accessResolved) {
    return <SafeAreaView testID="dialogue-v2-memory-access-checking" style={{ flex: 1, backgroundColor: p.bg }} />;
  }

  if (!hasPremiumAccess) {
    return (
      <View style={{ flex: 1, backgroundColor: p.bg }}>
        <SafeAreaView style={{ flex: 1 }}>
          {renderHeader()}
          <View style={{ flex: 1, padding: V2.screenPad, justifyContent: 'center', gap: V2.gap }}>
            <Text style={{ color: p.text, ...V2_TYPE.section, textAlign: 'center' }}>{copy.plusRequired}</Text>
            <PressableScale
              onPress={() => router.push({ pathname: '/premium_modal', params: { context: 'dialog_limit', source: 'dialogue_v2_memory' } } as never)}
              accessibilityRole="button"
              style={{ minHeight: V2.cta.height, borderRadius: V2.cta.radius, backgroundColor: p.cta, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: p.ctaText, ...V2_TYPE.headline }}>{copy.openPlus}</Text>
            </PressableScale>
            <View testID="dialogue-v2-memory-delete-only" style={{ gap: V2.gapTight }}>
              <Text style={{ color: p.textSecondary, ...V2_TYPE.body, textAlign: 'center' }}>{copy.deleteOnly}</Text>
              {renderClearControl()}
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const memory = state.kind === 'available' ? state.memory : null;
  const hasMemory = Boolean(memory?.sharedSummary || memory?.scenarioCheckpoints.length);

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }} testID="dialogue-v2-memory-screen">
      <SafeAreaView style={{ flex: 1 }}>
        {renderHeader()}
        <ScrollView contentContainerStyle={{ paddingHorizontal: V2.screenPad, paddingBottom: 32, gap: V2.gap }}>
          <Text style={{ color: p.textSecondary, ...V2_TYPE.body }}>{copy.intro}</Text>

          {state.kind === 'loading' ? <Text style={{ color: p.textSecondary, ...V2_TYPE.body }}>{copy.loading}</Text> : null}
          {state.kind === 'unavailable' ? <Text style={{ color: p.textSecondary, ...V2_TYPE.body }}>{copy.unavailable}</Text> : null}
          {memory && !hasMemory ? <Text style={{ color: p.textSecondary, ...V2_TYPE.body }}>{copy.empty}</Text> : null}

          {memory?.sharedSummary ? (
            <View style={{ borderRadius: V2.radius.card, backgroundColor: p.glass, borderColor: p.stroke, borderWidth: 1, padding: 14, gap: V2.gapTight }}>
              <Text style={{ color: p.text, ...V2_TYPE.section }}>{copy.summary}</Text>
              <Text style={{ color: p.textSecondary, ...V2_TYPE.body }}>{copy.completed}: {memory.sharedSummary.completedObjectives}</Text>
              {memory.sharedSummary.strengths.length ? (
                <View style={{ gap: 4 }}>
                  <Text style={{ color: p.text, ...V2_TYPE.headline }}>{copy.strengths}</Text>
                  {memory.sharedSummary.strengths.map((id, index) => (
                    <Text key={`${id}-${index}`} style={{ color: p.textSecondary, ...V2_TYPE.body }}>• {labels.objectiveLabels.get(id) ?? copy.savedTask}</Text>
                  ))}
                </View>
              ) : null}
              {memory.sharedSummary.focusAreas.length ? (
                <View style={{ gap: 4 }}>
                  <Text style={{ color: p.text, ...V2_TYPE.headline }}>{copy.focus}</Text>
                  {memory.sharedSummary.focusAreas.map((id, index) => (
                    <Text key={`${id}-${index}`} style={{ color: p.textSecondary, ...V2_TYPE.body }}>• {labels.objectiveLabels.get(id) ?? copy.savedTask}</Text>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {memory?.scenarioCheckpoints.length ? (
            <View style={{ gap: V2.gapTight }}>
              <Text style={{ color: p.text, ...V2_TYPE.section }}>{copy.progress}</Text>
              {memory.scenarioCheckpoints.map((checkpoint) => (
                <View key={checkpoint.scenarioId} style={{ borderRadius: V2.radius.card, backgroundColor: p.glassRaised, borderColor: p.stroke, borderWidth: 1, padding: 14, gap: 4 }}>
                  <Text style={{ color: p.text, ...V2_TYPE.headline }}>{labels.scenarioTitles.get(checkpoint.scenarioId) ?? copy.dialogue}</Text>
                  <Text style={{ color: p.textSecondary, ...V2_TYPE.body }}>{copy.completed}: {checkpoint.completedObjectiveIds.length}</Text>
                  <Text style={{ color: p.textMuted, ...V2_TYPE.caption }}>{copy.nextTask}: {checkpoint.nextObjectiveIndex + 1}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {renderClearControl()}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
