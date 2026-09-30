import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';

import {
  buildDialogueV2BriefingModel,
  type DialogueV2BriefingModel,
} from './dialogue_v2_briefing_model';
import {
  fetchReleasedDialogueV2Catalogue,
  type DialogueV2CatalogueReleaseEnvelope,
  type DialogueV2CatalogueStudyTarget,
} from './dialogue_v2_catalogue_client';
import { useMyCoinRank } from '../hooks/use_my_coin_rank';
import { triLang } from '../constants/i18n';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { DialogueV2BriefingScreen } from '../components/dialogs/DialogueV2BriefingScreen';
import { DialogueGlassGate, useDialogueGlass } from '../components/dialogs/glass/DialogueGlassKit';

const V2_TARGETS = new Set(['en', 'es', 'fr', 'de']);

type BriefingState =
  | Readonly<{ kind: 'loading' }>
  | Readonly<{ kind: 'unavailable' }>
  | Readonly<{ kind: 'available'; envelope: DialogueV2CatalogueReleaseEnvelope }>;

function supportedTarget(value: unknown): value is DialogueV2CatalogueStudyTarget {
  return typeof value === 'string' && V2_TARGETS.has(value);
}

function validScenarioId(value: unknown): value is string {
  return typeof value === 'string' && /^(?=.{1,64}$)[a-z0-9]+(?:_[a-z0-9]+)*$/.test(value);
}

function labelsFor(lang: ReturnType<typeof useLang>['lang']) {
  // зачем (владелец 2026-09-30, макет dialogs.html B1/B2): «Задания», «Начать диалог»,
  // замок по рангу и строка «Сейчас ранг N» — на 9 языках интерфейса.
  return Object.freeze({
    back: triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz', fr: 'Retour', de: 'Zurück' }),
    tasks: triLang(lang, { ru: 'Задания', uk: 'Завдання', en: 'Goals', es: 'Objetivos', 'pt-BR': 'Objetivos', vi: 'Nhiệm vụ', id: 'Tugas', tr: 'Görevler', pl: 'Zadania', fr: 'Objectifs', de: 'Aufgaben' }),
    participants: triLang(lang, { ru: 'Участники', uk: 'Учасники', en: 'Participants', es: 'Participantes', 'pt-BR': 'Participantes', vi: 'Người tham gia', id: 'Peserta', tr: 'Katılımcılar', pl: 'Uczestnicy', fr: 'Participants', de: 'Teilnehmende' }),
    start: triLang(lang, { ru: 'Начать диалог', uk: 'Почати діалог', en: 'Start dialogue', es: 'Empezar el diálogo', 'pt-BR': 'Começar diálogo', vi: 'Bắt đầu hội thoại', id: 'Mulai dialog', tr: 'Diyaloğu başlat', pl: 'Zacznij dialog', fr: 'Commencer le dialogue', de: 'Dialog starten' }),
    locked: (rankRequired: number) => triLang(lang, {
      ru: `Откроется на ранге ${rankRequired}`,
      uk: `Відкриється на ранзі ${rankRequired}`,
      en: `Unlocks at rank ${rankRequired}`,
      es: `Se desbloquea en el rango ${rankRequired}`,
      'pt-BR': `Desbloqueia no nível ${rankRequired}`,
      vi: `Mở ở hạng ${rankRequired}`,
      id: `Terbuka di peringkat ${rankRequired}`,
      tr: `${rankRequired}. rütbede açılır`,
      pl: `Odblokuje się na randze ${rankRequired}`,
      fr: `Se débloque au rang ${rankRequired}`,
      de: `Wird ab Rang ${rankRequired} freigeschaltet`,
    }),
    currentRank: (rank: number) => triLang(lang, {
      ru: `Сейчас ранг ${rank}`,
      uk: `Зараз ранг ${rank}`,
      en: `Your rank: ${rank}`,
      es: `Tu rango: ${rank}`,
      'pt-BR': `Seu nível: ${rank}`,
      vi: `Hạng hiện tại: ${rank}`,
      id: `Peringkat sekarang: ${rank}`,
      tr: `Şu anki rütbe: ${rank}`,
      pl: `Obecna ranga: ${rank}`,
      fr: `Ton rang : ${rank}`,
      de: `Aktueller Rang: ${rank}`,
    }),
    loading: triLang(lang, { ru: 'Загружаем диалоги…', uk: 'Завантажуємо діалоги…', en: 'Loading dialogues…', es: 'Cargando diálogos…', 'pt-BR': 'Carregando diálogos…', vi: 'Đang tải hội thoại…', id: 'Memuat dialog…', tr: 'Diyaloglar yükleniyor…', pl: 'Ładujemy dialogi…', fr: 'Chargement des dialogues…', de: 'Dialoge werden geladen…' }),
    unavailable: triLang(lang, { ru: 'Диалоги недоступны', uk: 'Діалоги недоступні', en: 'Dialogues are unavailable', es: 'Los diálogos no están disponibles', 'pt-BR': 'Diálogos indisponíveis', vi: 'Hội thoại không khả dụng', id: 'Dialog tidak tersedia', tr: 'Diyaloglar kullanılamıyor', pl: 'Dialogi są niedostępne', fr: 'Les dialogues sont indisponibles', de: 'Dialoge sind nicht verfügbar' }),
  });
}

/** Keeps route-bound loading/failure states within the same device-safe frame. */
function DialogueV2BriefingTransientScreen({
  testID,
  message,
  backLabel,
  onBack,
  loading,
}: Readonly<{
  testID: string;
  message: string;
  backLabel: string;
  onBack: () => void;
  loading?: boolean;
}>) {
  const glass = useDialogueGlass();
  // Экран-гейт макета (.gate) сам держит безопасные зоны сверху и снизу.
  return (
    <DialogueGlassGate
      glass={glass}
      testID={testID}
      backLabel={backLabel}
      onBack={onBack}
      loading={loading}
      icon="cloud-offline-outline"
      title={message}
      {...(loading ? {} : { action: { label: backLabel, onPress: onBack } })}
    />
  );
}

/**
 * ID-only V2 briefing route. It never serializes packet content through Expo
 * navigation and never redirects to a legacy session while a V2 session is absent.
 */
export default function DialogueV2BriefingRoute() {
  const params = useLocalSearchParams<{ scenarioId?: string | string[] }>();
  const router = useRouter();
  const { studyTarget } = useStudyTarget();
  const localCoinRank = useMyCoinRank();
  const { lang } = useLang();
  const labels = useMemo(() => labelsFor(lang), [lang]);
  const scenarioId = validScenarioId(params.scenarioId) ? params.scenarioId : null;
  const [state, setState] = useState<BriefingState>({ kind: 'loading' });

  useEffect(() => {
    if (!scenarioId || !supportedTarget(studyTarget)) {
      setState({ kind: 'unavailable' });
      return undefined;
    }
    let active = true;
    setState({ kind: 'loading' });
    void fetchReleasedDialogueV2Catalogue(studyTarget).then((envelope) => {
      if (!active) return;
      setState(envelope ? { kind: 'available', envelope } : { kind: 'unavailable' });
    }).catch(() => {
      if (active) setState({ kind: 'unavailable' });
    });
    return () => {
      active = false;
    };
  }, [scenarioId, studyTarget]);

  const model: DialogueV2BriefingModel | null = useMemo(() => {
    if (state.kind !== 'available' || !scenarioId || !supportedTarget(studyTarget)) return null;
    return buildDialogueV2BriefingModel({
      packets: state.envelope.packets,
      studyTarget,
      scenarioId,
      localCoinRank,
    });
  }, [localCoinRank, scenarioId, state, studyTarget]);

  if (state.kind === 'loading') {
    return <DialogueV2BriefingTransientScreen testID="dialogue-v2-briefing-loading" loading message={labels.loading} backLabel={labels.back} onBack={() => router.back()} />;
  }

  if (!model) {
    return <DialogueV2BriefingTransientScreen testID="dialogue-v2-briefing-unavailable" message={labels.unavailable} backLabel={labels.back} onBack={() => router.back()} />;
  }

  return (
    <DialogueV2BriefingScreen
      {...model}
      currentRank={localCoinRank}
      labels={labels}
      onBack={() => router.back()}
      onStart={() => {
        if (!model.unlocked) return;
        router.push({
          pathname: '/dialogue_v2_session',
          params: { scenarioId },
        } as never);
      }}
    />
  );
}
