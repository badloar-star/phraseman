// ═══════════════════════════════════════════════════════════════════════════
// use_home_survey_entry.ts — строка опроса в «Сегодня» + шторка опроса (Q90).
//
// зачем (координатор 01.10, §46 Q90): весь код опроса вынесен из app/(tabs)/home.tsx.
// Шторка (SurveySheetModal) монтируется ТОЛЬКО пока опрос открыт, строка — только
// когда опрос есть. Загрузка — один раз при входе в приложение, кэш 6 ч
// (app/home_survey_entry.ts). Логи [SURVEY-HOME] на каждой ветке.
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { triLang, type Lang } from '../constants/i18n';
import {
  captureAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from '../app/account_generation';
import { loadHomeSurvey, markHomeSurveyCompleted, peekHomeSurvey } from '../app/home_survey_entry';
import { getUtcDayKey } from '../app/local_date';
import { animateNextLayoutTransition } from '../app/smooth_layout';
import type { ActiveSurvey } from '../app/survey_client';
import type { SurveyDurableScope, SurveyLaunch } from '../app/survey_flow_controller';
import { getCanonicalUserId } from '../app/user_id_policy';

type Offer = Readonly<{ survey: ActiveSurvey; stableId: string }>;

function log(message: string, payload?: unknown): void {
  console.log(`[SURVEY-HOME] ${message}${payload === undefined ? '' : ` ${JSON.stringify(payload)}`}`); // guard-ok: ветки обязаны логироваться и в проде
}

export type HomeSurveyEntry = Readonly<{
  /** null — опроса нет: строка не рисуется. */
  row: Readonly<{ title: string; subtitle?: string }> | null;
  openSurvey: () => void;
  /** Не null только пока шторка открыта — монтировать <SurveySheetModal/> строго по этому полю. */
  launch: SurveyLaunch | null;
  closeSurvey: () => void;
  onDurablyReconciled: (completed: SurveyDurableScope) => void;
}>;

/**
 * Строка опроса в «Сегодня»: метка «Опрос» и короткая подпись, а не весь вопрос.
 *
 * зачем (владелец 13.10 12:30, скрин Главной uk): вопрос и подпись опроса приходят с сервера длинными и не вмещались в строку; «опросы должны
 * помечаться как ОПРОС, а не показывать сразу весь вопрос». Текст вопроса виден только внутри листа после тапа (offer.survey не меняется).
 */
export function homeSurveyRowCopy(lang: Lang): Readonly<{ title: string; subtitle: string }> {
  return {
    title: triLang(lang, { ru: 'Опрос', uk: 'Опитування', en: 'Survey', es: 'Encuesta', 'pt-BR': 'Pesquisa', vi: 'Khảo sát', id: 'Survei', tr: 'Anket', pl: 'Ankieta' }),
    subtitle: triLang(lang, {
      ru: '1 вопрос · 1 мин', uk: '1 запитання · 1 хв', en: '1 question · 1 min', es: '1 pregunta · 1 min', 'pt-BR': '1 pergunta · 1 min',
      vi: '1 câu hỏi · 1 phút', id: '1 pertanyaan · 1 menit', tr: '1 soru · 1 dk', pl: '1 pytanie · 1 min',
    }),
  };
}

export function useHomeSurveyEntry(lang: Lang, runtimeActive: boolean): HomeSurveyEntry {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [launch, setLaunch] = useState<SurveyLaunch | null>(null);
  const openedAccountRef = useRef<AccountGenerationToken | null>(null);
  const offerRef = useRef<Offer | null>(null);
  offerRef.current = offer;

  const closeSurvey = useCallback(() => {
    openedAccountRef.current = null;
    setLaunch(null);
  }, []);

  // Загрузка: один раз при входе (кэш 6 ч — внутри loadHomeSurvey), не на каждый фокус.
  useEffect(() => {
    if (!runtimeActive) return undefined;
    let cancelled = false;
    void (async () => {
      try {
        const stableId = await getCanonicalUserId();
        if (!stableId || cancelled) {
          log('skip:no_stable_id_or_cancelled', { hasId: Boolean(stableId), cancelled });
          return;
        }
        const peeked = peekHomeSurvey(stableId, lang);
        if (peeked !== undefined) {
          log('peek:memory', { hasSurvey: Boolean(peeked) });
          setOffer(peeked ? { survey: peeked, stableId } : null);
          return;
        }
        const survey = await loadHomeSurvey({ stableId, lang, platform: Platform.OS });
        if (cancelled) { log('drop:cancelled_after_load'); return; }
        // Вставка в поток после первого кадра — только плавно (Performance Bible).
        if (survey) animateNextLayoutTransition();
        setOffer(survey ? { survey, stableId } : null);
        log('row', { shown: Boolean(survey), surveyId: survey?.surveyId ?? null });
      } catch (error) {
        log('load:failed', String(error));
        if (!cancelled) setOffer(null);
      }
    })();
    return () => { cancelled = true; };
  }, [lang, runtimeActive]);

  const openSurvey = useCallback(() => {
    const current = offerRef.current;
    if (!current) { log('open:skip_no_offer'); return; }
    const account = captureAccountGeneration();
    if (account.phase !== 'active' || account.stableId !== current.stableId) {
      log('open:skip_account_mismatch', { phase: account.phase });
      return;
    }
    openedAccountRef.current = account;
    log('open', { surveyId: current.survey.surveyId });
    setLaunch({ survey: current.survey, stableId: current.stableId, dayKey: getUtcDayKey(), lang });
  }, [lang]);

  // Шторка закрывается при смене аккаунта, языка и на границе UTC-дня (ответ привязан к дню).
  useEffect(() => {
    if (!launch) return undefined;
    const openedAccount = openedAccountRef.current;
    if (!openedAccount) {
      log('guard:no_opened_account → закрываем');
      closeSurvey();
      return undefined;
    }
    const closeIfScopeChanged = (account = captureAccountGeneration()) => {
      const accountMismatch = account.phase !== 'active'
        || account.generation !== openedAccount.generation
        || account.stableId !== launch.stableId;
      const dayMismatch = getUtcDayKey() !== launch.dayKey;
      if (accountMismatch || dayMismatch || launch.lang !== lang) {
        log('guard:close', { accountMismatch, dayMismatch, langChanged: launch.lang !== lang });
        closeSurvey();
      }
    };
    closeIfScopeChanged();
    const subscription = subscribeAccountGeneration(closeIfScopeChanged);
    const now = new Date();
    const nextUtcDayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    const utcDayBoundaryTimeout = setTimeout(() => {
      if (getUtcDayKey() !== launch.dayKey) closeSurvey();
    }, Math.max(1, nextUtcDayMs - Date.now() + 25));
    return () => {
      subscription.remove();
      clearTimeout(utcDayBoundaryTimeout);
    };
  }, [closeSurvey, lang, launch]);

  // Ответы сохранены на сервере и в маркере: строка исчезает, шторка с наградой остаётся до закрытия.
  const onDurablyReconciled = useCallback((completed: SurveyDurableScope) => {
    const current = offerRef.current;
    if (!current || current.stableId !== completed.stableId || current.survey.surveyId !== completed.surveyId) {
      log('reconciled:other_scope', { surveyId: completed.surveyId });
      return;
    }
    markHomeSurveyCompleted(completed.stableId, lang);
    animateNextLayoutTransition();
    setOffer(null);
  }, [lang]);

  return {
    row: offer ? homeSurveyRowCopy(lang) : null,
    openSurvey,
    launch,
    closeSurvey,
    onDurablyReconciled,
  };
}
