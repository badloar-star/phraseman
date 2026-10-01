import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  buildDialogueV2BriefingModel,
  type DialogueV2BriefingModel,
} from './dialogue_v2_briefing_model';
import {
  fetchReleasedDialogueV2Catalogue,
  peekDialogueV2Catalogue,
  type DialogueV2CatalogueReleaseEnvelope,
  type DialogueV2CatalogueStudyTarget,
} from './dialogue_v2_catalogue_client';
import { prestartDialogueV2TextSession } from './dialogue_v2_turn_client';
import { markDialogueV2StartTap } from './dialogue_v2_session_prestart';
import { useMyCoinRank } from '../hooks/use_my_coin_rank';
import { triLang } from '../constants/i18n';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { DialogueV2BriefingScreen } from '../components/dialogs/DialogueV2BriefingScreen';
import { DialogueGlassGate, useDialogueGlass } from '../components/dialogs/glass/DialogueGlassKit';
import { useEnergy, useEnergySessionIntent } from '../components/EnergyContext';
import NoEnergyModal from '../components/NoEnergyModal';

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
  // зачем (владелец 30.09: «энергия как урок, 1 за диалог»; макет dialogs.html B5/B6):
  // «Начать» списывает 1 энергию до входа в сессию; нет энергии — окно «Нет энергии».
  // Plus не тратит (confirmSpendOne вернёт 'unlimited'). Латч — от двойного тапа.
  const { confirmSpendOne, acknowledgeSessionStart } = useEnergy();
  const [dialogueAttempt, setDialogueAttempt] = useState(0);
  const energyIntent = useEnergySessionIntent('ai_dialog', `dialogue_v2:${scenarioId ?? 'none'}`, String(dialogueAttempt));
  const startInFlightRef = useRef(false);
  const [noEnergy, setNoEnergy] = useState(false);
  // зачем (владелец 01.10: «диалоги открываются без загрузки»): первый кадр — из каталога в
  // памяти/снимке (peek), сеть только обновляет фоном и не откатывает показанное на «недоступно».
  const [state, setState] = useState<BriefingState>(() => {
    const peeked = scenarioId && supportedTarget(studyTarget) ? peekDialogueV2Catalogue(studyTarget) : null;
    return peeked ? { kind: 'available', envelope: peeked } : { kind: 'loading' };
  });

  useEffect(() => {
    if (!scenarioId || !supportedTarget(studyTarget)) {
      console.warn('[DIALOGUE-V2] briefing: no scenario or unsupported target', { scenarioId, studyTarget });
      setState({ kind: 'unavailable' });
      return undefined;
    }
    // зачем (Ядро 01.10): брифинг открыт не только из хаба (например, из «Сегодня») — фоновый
    // старт сессии, пока человек читает. Ничего не тратит; повтор для той же сцены не шлёт второй запрос.
    prestartDialogueV2TextSession({ studyTarget, scenarioId });
    let active = true;
    void fetchReleasedDialogueV2Catalogue(studyTarget).then((envelope) => {
      if (!active) return;
      if (envelope) setState({ kind: 'available', envelope });
      else setState((prev) => {
        console.warn('[DIALOGUE-V2] briefing: catalogue refresh empty', { scenarioId, kept: prev.kind });
        return prev.kind === 'available' ? prev : { kind: 'unavailable' };
      });
    }).catch((error: unknown) => {
      console.warn('[DIALOGUE-V2] briefing: catalogue refresh failed', { scenarioId, message: error instanceof Error ? error.message : String(error) });
      if (active) setState((prev) => (prev.kind === 'available' ? prev : { kind: 'unavailable' }));
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
      // зачем (владелец 01.10): служебный текст сцены — на языке интерфейса.
      uiLang: lang,
    });
  }, [lang, localCoinRank, scenarioId, state, studyTarget]);

  if (state.kind === 'loading') {
    return <DialogueV2BriefingTransientScreen testID="dialogue-v2-briefing-loading" loading message={labels.loading} backLabel={labels.back} onBack={() => router.back()} />;
  }

  if (!model) {
    return <DialogueV2BriefingTransientScreen testID="dialogue-v2-briefing-unavailable" message={labels.unavailable} backLabel={labels.back} onBack={() => router.back()} />;
  }

  return (
    <>
    <DialogueV2BriefingScreen
      {...model}
      currentRank={localCoinRank}
      labels={labels}
      onBack={() => router.back()}
      onStart={() => {
        if (!model.unlocked) {
          console.warn('[DIALOGUE-V2] start blocked: scenario locked', { scenarioId });
          return;
        }
        if (startInFlightRef.current) return;
        startInFlightRef.current = true;
        // зачем (Ядро 01.10, замер): «тап → готовность первого хода».
        if (supportedTarget(studyTarget) && scenarioId) markDialogueV2StartTap({ studyTarget, scenarioId }, Date.now());
        void (async () => {
          try {
            const result = await confirmSpendOne(energyIntent);
            console.log('[DIALOGUE-V2] start energy', { scenarioId, result }); // guard-ok: ранний выход старта логируется
            if (result === 'cancelled') return;
            if (result === 'insufficient') {
              setNoEnergy(true);
              return;
            }
            void acknowledgeSessionStart(energyIntent.operationId);
            setDialogueAttempt((n) => n + 1);
            router.push({
              pathname: '/dialogue_v2_session',
              params: { scenarioId },
            } as never);
          } catch (error: unknown) {
            console.warn('[DIALOGUE-V2] start energy failed', { scenarioId, message: error instanceof Error ? error.message : String(error) });
          } finally {
            startInFlightRef.current = false;
          }
        })();
      }}
    />
    {/* макет B5: закрытие окна уводит с экрана диалога */}
    <NoEnergyModal visible={noEnergy} onClose={() => { setNoEnergy(false); router.back(); }} />
    </>
  );
}
