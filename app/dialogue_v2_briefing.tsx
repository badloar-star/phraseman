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
import DialogueIncomingCall from '../components/dialogs/DialogueIncomingCall';
import { useEnergy, useEnergySessionIntent } from '../components/EnergyContext';
import NoEnergyModal from '../components/NoEnergyModal';
import AiDialogConsentModal from '../components/AiDialogConsentModal';
import { usePremium } from '../components/PremiumContext';
import { readAiDialogMonthlyQuota } from './ai_dialog_daily_quota';
import { captureAccountGeneration } from './account_generation';
import { actionToastTri, emitAppEvent } from './events';
import { safeRouterBack } from './navigation_back';
import {
  hasAiDialogConsentDecision,
  hydrateAiDialogConsentFromStorage,
  isAiDialogConsentGranted,
  isAiDialogConsentHydrated,
  recordAiDialogConsentToCloud,
  setAiDialogConsent,
} from './ai_dialog_consent';

const V2_TARGETS = new Set(['en', 'es', 'fr', 'de']);

type BriefingState =
  | Readonly<{ kind: 'loading' }>
  | Readonly<{ kind: 'unavailable' }>
  | Readonly<{ kind: 'available'; envelope: DialogueV2CatalogueReleaseEnvelope }>;

function supportedTarget(value: unknown): value is DialogueV2CatalogueStudyTarget {
  return typeof value === 'string' && V2_TARGETS.has(value);
}

type StartConsent = 'granted' | 'denied' | 'undecided';

/** зачем (ревью 12.10, iOS): следующий родной Modal («Нет энергии») не показывается, пока закрывается шторка согласия;
 *  тот же зазор, что у окон после модалки в проекте (delayMs: 360). */
const AFTER_CONSENT_SHEET_MS = 360;

/**
 * Согласие на ИИ перед стартом — из памяти; не прочитано с диска — читаем (0 сети).
 * зачем (находка Макетов d8b078e8e, координатор 12.10): «Начать диалог» списывал энергию ДО шторки согласия,
 * а шторка жила внутри сессии; при отказе сессия не монтировалась и возврат энергии не срабатывал.
 */
async function readStartConsent(): Promise<StartConsent> {
  if (!isAiDialogConsentHydrated()) {
    try {
      await hydrateAiDialogConsentFromStorage();
    } catch (error: unknown) {
      console.warn('[AI-CONSENT-ENERGY] briefing:consent hydrate failed', error instanceof Error ? error.message : String(error));
    }
  }
  if (isAiDialogConsentGranted()) return 'granted';
  return hasAiDialogConsentDecision() ? 'denied' : 'undecided';
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

// зачем (владелец: ни одной мёртвой кнопки): отказ старта диалога — понятное сообщение.
function dialogueStartFailedToast() {
  return actionToastTri('error', {
    ru: 'Не получилось начать диалог. Попробуй ещё раз',
    uk: 'Не вдалося почати діалог. Спробуй ще раз',
    en: 'Could not start the dialogue. Please try again',
    es: 'No se pudo iniciar el diálogo. Inténtalo de nuevo',
    'pt-BR': 'Não foi possível iniciar o diálogo. Tente de novo',
    vi: 'Không thể bắt đầu hội thoại. Hãy thử lại',
    id: 'Gagal memulai dialog. Coba lagi',
    tr: 'Diyalog başlatılamadı. Tekrar dene',
    pl: 'Nie udało się rozpocząć dialogu. Spróbuj ponownie',
  });
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
  const { confirmSpendOne, isUnlimited: energyUnlimited, energy: energyNow } = useEnergy();
  const [dialogueAttempt, setDialogueAttempt] = useState(0);
  // зачем (баг 01.10, «Дизайн»: «Начать диалог» — мёртвая кнопка, operation_id_conflict):
  // номер операции энергии = тип + попытка, БЕЗ сценария; попытка с 0 на каждом открытии
  // брифинга давала один и тот же номер «energy:ai_dialog:0» для всех диалогов — второй
  // диалог упирался в запись первого, а повтор того же диалога проходил бесплатно.
  // Номер попытки = случайная метка открытия экрана + счётчик (новый после каждой попытки).
  const [briefingNonce] = useState(() => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`);
  const energyIntent = useEnergySessionIntent('ai_dialog', `dialogue_v2:${scenarioId ?? 'none'}`, `${briefingNonce}_${dialogueAttempt}`);
  const startInFlightRef = useRef(false);
  // зачем (повторное ревью 12.10): отложенный после шторки старт отменяется, если человек ушёл с брифинга за эти 360 мс —
  // иначе списание и переход случились бы уже с другого экрана.
  const consentStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (consentStartTimerRef.current === null) return;
    clearTimeout(consentStartTimerRef.current);
    consentStartTimerRef.current = null;
    startInFlightRef.current = false;
    console.warn('[AI-CONSENT-ENERGY] briefing:unmounted before delayed start → cancelled, energy not spent');
  }, []);
  // зачем (Сверка 05.10 🟡: диалог стартовал при 0 оставшихся ответах — энергия списана, а первая реплика упиралась
  // в лимит): месячный остаток Free читаем из зеркала на телефоне заранее (0 сети, 0 чтений Firestore). При нуле
  // «Начать» не списывает энергию и сразу открывает экран лимита — тот же, что у хаба (premium_modal dialog_limit).
  const { accessResolved, hasPremiumAccess } = usePremium();
  const freeTier = accessResolved && !hasPremiumAccess;
  const [monthlyQuotaExhausted, setMonthlyQuotaExhausted] = useState(false);
  useEffect(() => {
    if (!freeTier || !supportedTarget(studyTarget)) {
      setMonthlyQuotaExhausted(false);
      return undefined;
    }
    let alive = true;
    void readAiDialogMonthlyQuota(studyTarget, captureAccountGeneration().stableId).then((quota) => {
      if (!alive) return;
      console.log('[DIALOGUE-V2] briefing:quota', JSON.stringify({ status: quota.status, scenarioId }));
      setMonthlyQuotaExhausted(quota.status === 'exhausted');
    }).catch((error: unknown) => {
      console.warn('[DIALOGUE-V2] briefing:quota → mirror read failed', error instanceof Error ? error.message : String(error));
    });
    return () => { alive = false; };
  }, [freeTier, scenarioId, studyTarget]);
  const [noEnergy, setNoEnergy] = useState(false);
  // зачем (макет dialogs.html B3: шторка согласия поверх брифинга): спрашиваем ДО списания энергии.
  const [consentAsk, setConsentAsk] = useState(false);
  // зачем (владелец 15.10, m16: «сразу делаем и сразу включаем»): «Входящий звонок» перед брифингом — один раз на открытие сцены, без флага;
  // «Ответить» открывает брифинг (задания всплывают по очереди), «Потом» — назад. У закрытой по рангу сцены звонка нет.
  const [callOpen, setCallOpen] = useState(true);
  const [revealRows, setRevealRows] = useState(false);
  const glass = useDialogueGlass();
  // зачем (владелец 01.10: «диалоги открываются без загрузки»): первый кадр — из каталога в
  // памяти/снимке (peek), сеть только обновляет фоном и не откатывает показанное на «недоступно».
  const [state, setState] = useState<BriefingState>(() => {
    const peeked = scenarioId && supportedTarget(studyTarget) ? peekDialogueV2Catalogue(studyTarget) : null;
    return peeked ? { kind: 'available', envelope: peeked } : { kind: 'loading' };
  });
  // зачем (E2, координатор 12.10, «сперва логи»): время от монтирования до первого содержательного кадра — что было в первом кадре (данные / скелет) и когда пришли данные
  const firstFrameAtRef = useRef(Date.now());
  const firstFrameKindRef = useRef<string | null>(null);
  useEffect(() => {
    if (typeof __DEV__ === 'undefined' || !__DEV__) return;
    if (firstFrameKindRef.current === state.kind) return;
    const first = firstFrameKindRef.current === null;
    firstFrameKindRef.current = state.kind;
    console.log(`[DIALOGS-FIRST-FRAME] briefing ${first ? 'first' : 'update'} kind=${state.kind} content=${String(state.kind === 'available')} skeleton=${String(state.kind === 'loading')} ms=${Date.now() - firstFrameAtRef.current}`); // guard-ok: под __DEV__, число решает ветку
  }, [state.kind]);

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
    return <DialogueV2BriefingTransientScreen testID="dialogue-v2-briefing-loading" loading message={labels.loading} backLabel={labels.back} onBack={() => safeRouterBack(router, '/ai_dialog_home' as never)} />;
  }

  if (!model) {
    return <DialogueV2BriefingTransientScreen testID="dialogue-v2-briefing-unavailable" message={labels.unavailable} backLabel={labels.back} onBack={() => safeRouterBack(router, '/ai_dialog_home' as never)} />;
  }

  // зачем (находка d8b078e8e): списание энергии и переход в сессию — только после согласия на ИИ.
  const spendAndOpenSession = async (): Promise<void> => {
    // зачем (Ядро 01.10, замер): «тап → готовность первого хода» — от момента, когда старт реально пошёл.
    if (supportedTarget(studyTarget) && scenarioId) markDialogueV2StartTap({ studyTarget, scenarioId }, Date.now());
    try {
      const result = await confirmSpendOne(energyIntent);
      console.log('[DIALOGUE-V2] start energy', { scenarioId, result, energyNow, operationId: energyIntent.operationId, attempt: dialogueAttempt, branch: result === 'cancelled' ? 'toast_start_failed' : result === 'insufficient' ? 'no_energy_modal' : 'open_session' }); // guard-ok: ранний выход старта логируется
      if (result === 'cancelled') {
        // зачем (владелец: ни одной мёртвой кнопки): отказ старта — понятная реакция и
        // новый номер попытки, чтобы следующий тап не упёрся в ту же запись.
        setDialogueAttempt((n) => n + 1);
        emitAppEvent('action_toast', dialogueStartFailedToast());
        return;
      }
      if (result === 'insufficient') {
        setNoEnergy(true);
        return;
      }
      // зачем (баг 01.10, «Дизайн»: ход упал на сервере, а энергия списана; D87): старт
      // подтверждает сессия после первого ответа собеседника, а при отказе сервиса на
      // первом ходе возвращает энергию — сюда передаём номер операции (у Plus его нет).
      setDialogueAttempt((n) => n + 1);
      router.push({
        pathname: '/dialogue_v2_session',
        params: result === 'spent'
          ? { scenarioId, energyOp: energyIntent.operationId }
          : { scenarioId },
      } as never);
    } catch (error: unknown) {
      console.warn('[DIALOGUE-V2] start energy failed', { scenarioId, message: error instanceof Error ? error.message : String(error) });
      setDialogueAttempt((n) => n + 1);
      emitAppEvent('action_toast', dialogueStartFailedToast());
    } finally {
      startInFlightRef.current = false;
    }
  };
  const onConsentAccept = () => {
    setConsentAsk(false);
    console.log('[AI-CONSENT-ENERGY] briefing:consent accepted → spend', JSON.stringify({ scenarioId, inFlight: startInFlightRef.current }));
    // Optimistic: память согласия обновляется сразу (сессия откроется без повторной шторки), диск и облако догоняют.
    void setAiDialogConsent('granted').then(() => recordAiDialogConsentToCloud()).catch((error: unknown) => {
      console.warn('[AI-CONSENT-ENERGY] briefing:consent save failed', error instanceof Error ? error.message : String(error));
    });
    if (startInFlightRef.current) {
      console.warn('[AI-CONSENT-ENERGY] briefing:consent accepted but start already in flight → ignored', JSON.stringify({ scenarioId }));
      return;
    }
    startInFlightRef.current = true;
    // зачем (ревью 12.10, iOS): списание и возможное окно «Нет энергии» — после того, как шторка закрылась.
    consentStartTimerRef.current = setTimeout(() => {
      consentStartTimerRef.current = null;
      void spendAndOpenSession();
    }, AFTER_CONSENT_SHEET_MS);
  };
  const onConsentDecline = () => {
    setConsentAsk(false);
    const alreadyDenied = hasAiDialogConsentDecision() && !isAiDialogConsentGranted();
    console.log('[AI-CONSENT-ENERGY] briefing:consent declined → energy not spent', JSON.stringify({ scenarioId, alreadyDenied }));
    // зачем (ревью 12.10, экономия): повторный отказ (смахнул шторку) не пишет диск и не зовёт облачную функцию ещё раз.
    if (alreadyDenied) return;
    void setAiDialogConsent('denied').then(() => recordAiDialogConsentToCloud()).catch((error: unknown) => {
      console.warn('[AI-CONSENT-ENERGY] briefing:consent save failed', error instanceof Error ? error.message : String(error));
    });
  };

  const showCall = callOpen && model.unlocked;
  return (
    <>
    <DialogueV2BriefingScreen
      {...model}
      revealRows={revealRows}
      showEnergy={!energyUnlimited}
      currentRank={localCoinRank}
      labels={labels}
      onBack={() => safeRouterBack(router, '/ai_dialog_home' as never)}
      onStart={() => {
        if (!model.unlocked) {
          console.warn('[DIALOGUE-V2] start blocked: scenario locked', { scenarioId });
          return;
        }
        if (startInFlightRef.current) return;
        if (freeTier && monthlyQuotaExhausted) {
          console.warn('[DIALOGUE-V2] start blocked: monthly replies exhausted → limit screen, energy not spent', { scenarioId });
          router.push({
            pathname: '/premium_modal',
            // зачем (сторож paywall_entry_callsite_registry): source — только из PAYWALL_SOURCE_VALUES; неизвестный терял атрибуцию покупки.
            params: { context: 'dialog_limit', source: 'ai_dialog_briefing_direct' },
          } as never);
          return;
        }
        startInFlightRef.current = true;
        void (async () => {
          const consent = await readStartConsent();
          console.log('[AI-CONSENT-ENERGY] briefing:start', JSON.stringify({ scenarioId, consent, energySpent: false })); // guard-ok: ветка старта
          if (consent !== 'granted') {
            // Согласия нет — шторка поверх брифинга, энергию НЕ трогаем.
            startInFlightRef.current = false;
            setConsentAsk(true);
            return;
          }
          await spendAndOpenSession();
        })();
      }}
    />
    {/* макет B5: закрытие окна уводит с экрана диалога */}
    {showCall ? (
      <DialogueIncomingCall
        lang={lang}
        glass={glass}
        partnerName={model.participants[0]?.displayName?.trim() || null}
        cefr={model.cefr}
        sceneTitle={model.title}
        onAnswer={() => { setRevealRows(true); setCallOpen(false); }}
        onLater={() => { setCallOpen(false); safeRouterBack(router, '/ai_dialog_home' as never); }}
      />
    ) : null}
    <AiDialogConsentModal visible={consentAsk} lang={lang} onAccept={onConsentAccept} onDecline={onConsentDecline} />
    {/* зачем (Макеты 2bac25805, dialogs-011; правило владельца 15.09 «тексты модалов по разделу»): без activity окно падало на «classic_lesson» и в Диалогах говорило «Для урока нужно 1 ⚡». */}
    {/* зачем (координатор 14.10, 🔴): «Получить Plus» уводил назад вместе с окном — пейвол терялся. Plus закрывает только окно: человек
        остаётся на брифинге, пейвол открывается поверх, после покупки можно сразу начать диалог. «Позже» по-прежнему уводит назад. */}
    <NoEnergyModal variant="dialogs" visible={noEnergy} activity="ai_dialog" onBeforeOpenPremium={() => setNoEnergy(false)} onClose={() => { setNoEnergy(false); safeRouterBack(router, '/ai_dialog_home' as never); }} />
    </>
  );
}
