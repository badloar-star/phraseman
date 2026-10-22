// ═══════════════════════════════════════════════════════════════════════════
// use_dialogs_scene_hub.ts — данные «Сцены» в боевом хабе «Диалоги».
//
// зачем (координатор 22.10: «без второго чтения каталога: один источник, общий кэш»): каталог в сеть ходит контейнер хаба (после анимации входа, окно 12 ч, клиент каталога).
// Здесь — тот же путь чтения: peekDialogueV2Catalogue (кэш этого запуска или встроенный снимок, без сети) и та же проекция projectAuthorizedDialogueV2Catalogue; после анимации
// входа один раз зовём fetchReleasedDialogueV2Catalogue — клиент отдаёт ТОТ ЖЕ запрос (общий in-flight) или кэш в окне 12 ч, второго обращения к серверу нет.
// Остальное сцена берёт из того, что телефон уже знает: согласие (память процесса, читается с диска один раз), сеть, остаток ответов (зеркало), Plus, пройденные диалоги (локальное хранилище).
// «Диалог засчитан сегодня» (dayDone): источника на телефоне нет — вход null, состояние day_done не включается вслепую; причина пишется в журнал [DIALOGS-SCENE].
// ready=false — каталога для сцены нет (язык без проверенных диалогов, пусто): хаб оставляет прежнюю шапку и карточку языка, сцену не рисует.
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { InteractionManager } from 'react-native';

import { getAiDialogConsentState, hydrateAiDialogConsentFromStorage, isAiDialogConsentHydrated, subscribeAiDialogConsent } from '../../../app/ai_dialog_consent';
import {
  fetchReleasedDialogueV2Catalogue, getEmbeddedDialogueV2Catalogue, peekDialogueV2Catalogue,
  type DialogueV2CatalogueReleaseEnvelope, type DialogueV2CatalogueStudyTarget,
} from '../../../app/dialogue_v2_catalogue_client';
import { projectAuthorizedDialogueV2Catalogue } from '../../../app/dialogue_v2_authorized_catalogue_projection';
import { getDialogueV2DoneVersion, hydrateDialogueV2DoneIds, peekDialogueV2DoneIds, subscribeDialogueV2Done } from '../../../app/dialogue_v2_done_store';
import { dialogueV2UiCopy } from '../../../app/dialogue_v2_ui_copy';
import { getDialogueV2DoneTodayVersion, hydrateDialogueV2DoneToday, peekDialogueV2DoneToday, subscribeDialogueV2DoneToday } from '../../../app/dialogue_v2_day_mark';
import { FREE_DIALOG_VOICE_DAILY_LIMIT } from '../../../app/dialogue_v2_voice_daily_limit';
import { useVoiceDailyAllowance } from '../../../app/voice_daily_allowance';
import { REVENUE_MONTHLY_LIMITS } from '../../../app/revenue_daily_limits';
import { useDialogueHubQuota } from '../../../hooks/use_dialogue_hub_quota';
import { useMyCoinRank } from '../../../hooks/use_my_coin_rank';
import { useLang } from '../../LangContext';
import { usePremium } from '../../PremiumContext';
import { useStudyTarget } from '../../StudyTargetContext';
import { useDialogsSceneOffline } from './use_dialogs_scene_offline';
import { dialogueV2WorldHeadings } from '../DialogueV2CatalogueContainer';
import { buildDialogsSceneHubModel, type DialogsSceneHubModel } from './dialogs_scene_hub_model';
import type { DialogsSceneInput } from './dialogs_scene_state';

const LOG = '[DIALOGS-SCENE]';
const V2_TARGETS = new Set(['en', 'es', 'fr', 'de']);

function supportedTarget(value: unknown): value is DialogueV2CatalogueStudyTarget {
  return typeof value === 'string' && V2_TARGETS.has(value);
}

export type DialogsSceneHubData = Readonly<{
  /** Есть каталог для сцены. false — прежняя шапка. */
  ready: boolean;
  input: DialogsSceneInput;
  model: DialogsSceneHubModel;
  quotaTotal: number;
  /** Первое число следующего месяца по часам телефона — когда обновятся ответы Free. */
  resetDate: Date;
  /** Сколько раз в день Free отвечает голосом; null — доступ ещё не известен (число не рисуем) или у Plus. */
  voicePerDay: number | null;
  /** «Повторить» в состоянии «нет сети»: перепроверить сеть и перечитать каталог (кэш окна 12 ч, тот же in-flight запрос). */
  retry: () => Promise<void>;
}>;

const EMPTY_MODEL: DialogsSceneHubModel = Object.freeze({ doneCount: 0, totalCount: 0, next: null });

export function useDialogsSceneHub(): DialogsSceneHubData {
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { accessResolved, hasPremiumAccess } = usePremium();
  const localCoinRank = useMyCoinRank();
  const quota = useDialogueHubQuota();
  // зачем (аудит кнопок 22.10, F2): свой хук сети с журналом [DIALOGS-NET] и «Повторить»; «нет сети» — только isConnected === false
  const { offline, retry: retryNet } = useDialogsSceneOffline(true);
  const voice = useVoiceDailyAllowance();
  const dayVersion = useSyncExternalStore(subscribeDialogueV2DoneToday, getDialogueV2DoneTodayVersion, getDialogueV2DoneTodayVersion);
  const consentState = useSyncExternalStore(subscribeAiDialogConsent, getAiDialogConsentState, getAiDialogConsentState);
  const doneVersion = useSyncExternalStore(subscribeDialogueV2Done, getDialogueV2DoneVersion, getDialogueV2DoneVersion);
  const supported = supportedTarget(studyTarget);
  const [envelope, setEnvelope] = useState<DialogueV2CatalogueReleaseEnvelope | null>(() => (supportedTarget(studyTarget) ? peekDialogueV2Catalogue(studyTarget) : null));

  useEffect(() => {
    // согласие читается с диска один раз за процесс; до этого consent=null (не решаем «нет согласия» вслепую)
    void hydrateAiDialogConsentFromStorage();
  }, []);
  useEffect(() => {
    if (!supportedTarget(studyTarget)) return;
    void hydrateDialogueV2DoneIds(studyTarget);
  }, [studyTarget]);
  useEffect(() => {
    // отметка «сегодня диалог засчитан» читается с диска один раз за процесс; до этого dayDone=null
    void hydrateDialogueV2DoneToday();
  }, []);
  useEffect(() => {
    if (!supportedTarget(studyTarget)) {
      setEnvelope(null);
      return undefined;
    }
    let alive = true;
    const local = peekDialogueV2Catalogue(studyTarget);
    setEnvelope((prev) => (prev === local ? prev : local));
    // после анимации входа, как у контейнера: тот же in-flight запрос или кэш окна 12 ч — сервер второй раз не зовём
    const task = InteractionManager.runAfterInteractions(() => {
      void fetchReleasedDialogueV2Catalogue(studyTarget, { awaitRefresh: true }).then((fresh) => {
        if (!alive) return;
        console.log(LOG, 'catalogue:peek', JSON.stringify({ studyTarget, gotEnvelope: fresh !== null })); // guard-ok: итог общего чтения каталога
        if (fresh) setEnvelope((prev) => (prev === fresh ? prev : fresh));
      }).catch((error: unknown) => {
        console.warn(LOG, 'catalogue:fetch_failed', JSON.stringify({ studyTarget, reason: error instanceof Error ? error.name : String(error) })); // guard-ok: причина отказа
      });
    });
    return () => { alive = false; task.cancel(); };
  }, [studyTarget]);

  const retry = useCallback(async (): Promise<void> => {
    const offlineAfter = await retryNet();
    if (!supportedTarget(studyTarget)) {
      console.warn(LOG, 'retry:catalogue_skip', JSON.stringify({ reason: 'unsupported_target', studyTarget: String(studyTarget), offlineAfter })); // guard-ok: ранний выход называет причину
      return;
    }
    try {
      const fresh = await fetchReleasedDialogueV2Catalogue(studyTarget, { awaitRefresh: true });
      console.log(LOG, 'retry:catalogue', JSON.stringify({ studyTarget, offlineAfter, gotEnvelope: fresh !== null })); // guard-ok: итог перечитывания по тапу «Повторить»
      if (fresh) setEnvelope((prev) => (prev === fresh ? prev : fresh));
    } catch (error: unknown) {
      console.warn(LOG, 'retry:catalogue_failed', JSON.stringify({ studyTarget, offlineAfter, reason: error instanceof Error ? error.name : String(error) })); // guard-ok: причина отказа
    }
  }, [retryNet, studyTarget]);

  const model = useMemo<DialogsSceneHubModel | null>(() => {
    if (!supported || !envelope) return null;
    const headings = dialogueV2WorldHeadings(lang);
    const base = { studyTarget, localCoinRank, worldHeadings: headings, doneScenarioIds: peekDialogueV2DoneIds(studyTarget) };
    const projected = projectAuthorizedDialogueV2Catalogue({ ...base, packets: envelope.packets })
      ?? (() => {
        const embedded = getEmbeddedDialogueV2Catalogue(studyTarget as DialogueV2CatalogueStudyTarget);
        return embedded && embedded !== envelope ? projectAuthorizedDialogueV2Catalogue({ ...base, packets: embedded.packets }) : null;
      })();
    if (!projected || projected.items.length === 0) return null;
    const titles = new Map(headings.map((h) => [h.id, h.title]));
    const items = projected.items.map((item) => {
      const ui = dialogueV2UiCopy(lang, item.id);
      return { id: item.id, worldId: item.worldId, title: ui?.title ?? item.title, status: item.status };
    });
    return buildDialogsSceneHubModel({
      lang, items, worldTitle: (worldId) => titles.get(worldId) ?? worldId,
      uiCopy: (id) => dialogueV2UiCopy(lang, id),
    });
    // doneVersion — будит пересчёт, когда диалог отмечен пройденным (peekDialogueV2DoneIds читается внутри)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported, envelope, lang, studyTarget, localCoinRank, doneVersion]);

  const plus = accessResolved && hasPremiumAccess;
  const consent = isAiDialogConsentHydrated() ? consentState === 'granted' : null;
  const input = useMemo<DialogsSceneInput>(() => ({
    consent,
    offline,
    plus,
    quotaRemaining: quota ? quota.remaining : null,
    doneCount: model ? model.doneCount : null,
    totalCount: model ? model.totalCount : null,
    // локальная отметка (app/dialogue_v2_day_mark.ts); null — диск ещё не читали, состояние вслепую не включаем
    dayDone: peekDialogueV2DoneToday(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: dayVersion будит пересчёт, когда отметка поменялась
  }), [consent, offline, plus, quota, model, dayVersion]);
  const month = new Date().getFullYear() * 12 + new Date().getMonth();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: дата считается раз за месяц, а не на каждый рендер
  const resetDate = useMemo(() => new Date(Math.floor(month / 12), month % 12 + 1, 1), [month]);

  // голосовой лимит Free (3 в день): число только когда доступ известен и это не Plus; unknown/plus — без числа
  const voicePerDay = voice.kind === 'limited' ? FREE_DIALOG_VOICE_DAILY_LIMIT : null;
  return { ready: model !== null, input, model: model ?? EMPTY_MODEL, quotaTotal: quota ? quota.total : REVENUE_MONTHLY_LIMITS.ai_dialog_replies, resetDate, voicePerDay, retry };
}
