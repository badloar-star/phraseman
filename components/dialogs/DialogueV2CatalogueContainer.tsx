import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Text, View } from 'react-native';

import {
  projectAuthorizedDialogueV2Catalogue,
} from '../../app/dialogue_v2_authorized_catalogue_projection';
import { captureAccountGeneration } from '../../app/account_generation';
import { readAiDialogMonthlyQuota } from '../../app/ai_dialog_daily_quota';
import { REVENUE_MONTHLY_LIMITS } from '../../app/revenue_daily_limits';
import {
  fetchReleasedDialogueV2Catalogue,
  getEmbeddedDialogueV2Catalogue,
  peekDialogueV2Catalogue,
  type DialogueV2CatalogueReleaseEnvelope,
  type DialogueV2CatalogueStudyTarget,
} from '../../app/dialogue_v2_catalogue_client';
import { V2, V2_TYPE } from '../../constants/v2Style';
import { triLang } from '../../constants/i18n';
import { useMyCoinRank } from '../../hooks/use_my_coin_rank';
import { useLang } from '../LangContext';
import { usePremium } from '../PremiumContext';
import { useStudyTarget } from '../StudyTargetContext';
import { dialogueV2UiCopy, dialogueV2UiWorldTitle } from '../../app/dialogue_v2_ui_copy';
import { useV2Palette } from '../v2/useV2Palette';
import {
  DialogueV2CatalogueSection,
  type DialogueV2CatalogueLearnerItem,
  type DialogueV2CatalogueWorld,
} from './DialogueV2CatalogueSection';
import { DialogueV2PlusTools } from './DialogueV2PlusTools';
import {
  DialogueV2HubExhaustedCard,
  DialogueV2HubLanguageGate,
  DialogueV2HubQuotaRow,
  dialogueV2HubCopy,
} from './DialogueV2HubNotices';

const V2_TARGETS = new Set(['en', 'es', 'fr', 'de']);

type CatalogueState =
  | Readonly<{ kind: 'loading' }>
  | Readonly<{ kind: 'unavailable' }>
  | Readonly<{ kind: 'available'; envelope: DialogueV2CatalogueReleaseEnvelope }>;

function dialogueV2WorldHeadings(lang: ReturnType<typeof useLang>['lang']): readonly DialogueV2CatalogueWorld[] {
  // зачем (владелец 01.10, данные Ядра): названия миров — на языке интерфейса для всех 9 языков;
  // нет в снимке — прежние подписи ниже.
  const fromUi = (id: string, fallback: string): string => dialogueV2UiWorldTitle(lang, id) ?? fallback;
  return Object.freeze([
    Object.freeze({ id: 'social', title: fromUi('social', triLang(lang, {
      ru: 'Общение', uk: 'Спілкування', en: 'Social', es: 'Social', fr: 'Social', de: 'Soziales',
    })) }),
    Object.freeze({ id: 'work', title: fromUi('work', triLang(lang, {
      ru: 'Дела', uk: 'Справи', en: 'Work', es: 'Trabajo', fr: 'Travail', de: 'Arbeit',
    })) }),
    Object.freeze({ id: 'travel', title: fromUi('travel', triLang(lang, {
      ru: 'Поездки', uk: 'Подорожі', en: 'Travel', es: 'Viajes', fr: 'Voyages', de: 'Reisen',
    })) }),
    Object.freeze({ id: 'everyday', title: fromUi('everyday', triLang(lang, {
      ru: 'Каждый день', uk: 'Щодня', en: 'Everyday', es: 'Día a día', fr: 'Quotidien', de: 'Alltag',
    })) }),
  ]);
}

function catalogueCopy(lang: ReturnType<typeof useLang>['lang']): Readonly<{
  lockedAtRank: (rank: number) => string;
}> {
  return Object.freeze({
    // зачем (макет dialogs.html A4): строка ранга под названием закрытого диалога, 9 языков.
    lockedAtRank: (rank: number) => triLang(lang, {
      ru: `Откроется на ранге ${rank}`, uk: `Відкриється на ранзі ${rank}`, en: `Unlocks at rank ${rank}`,
      es: `Se desbloquea en el rango ${rank}`, 'pt-BR': `Desbloqueia no nível ${rank}`, vi: `Mở ở hạng ${rank}`,
      id: `Terbuka di peringkat ${rank}`, tr: `${rank}. rütbede açılır`, pl: `Odblokuje się na randze ${rank}`,
      fr: `Se débloque au rang ${rank}`, de: `Wird ab Rang ${rank} freigeschaltet`,
    }),
  });
}

function supportedTarget(value: unknown): value is DialogueV2CatalogueStudyTarget {
  return typeof value === 'string' && V2_TARGETS.has(value);
}

function initialCatalogueState(studyTarget: unknown): CatalogueState {
  if (!supportedTarget(studyTarget)) return { kind: 'unavailable' };
  const envelope = peekDialogueV2Catalogue(studyTarget);
  return envelope ? { kind: 'available', envelope } : { kind: 'loading' };
}

export type DialogueV2CatalogueContainerProps = Readonly<{
  onPressItem: (item: DialogueV2CatalogueLearnerItem) => void;
  /** Макет hubHead: на экране диалогов пилюля «N/30» в шапке — строку над каталогом не дублируем. */
  showQuotaRow?: boolean;
}>;

/**
 * Owns only the V2 learner catalogue loading boundary. The callable response
 * is revalidated before rendering and no legacy dialog surface is involved.
 */
export function DialogueV2CatalogueContainer({ onPressItem, showQuotaRow = true }: DialogueV2CatalogueContainerProps) {
  const router = useRouter();
  const { studyTarget } = useStudyTarget();
  const { lang } = useLang();
  const { accessResolved, hasPremiumAccess } = usePremium();
  const localCoinRank = useMyCoinRank();
  const palette = useV2Palette();
  // зачем (владелец 01.10: «Диалоги не загрузились» не должно быть нигде): первый кадр —
  // сразу из кэша этого запуска или встроенного снимка, без «Загрузка…» и без сети.
  const [state, setState] = useState<CatalogueState>(() => initialCatalogueState(studyTarget));
  const headings = useMemo(() => dialogueV2WorldHeadings(lang), [lang]);
  const copy = useMemo(() => catalogueCopy(lang), [lang]);
  const hubCopy = useMemo(() => dialogueV2HubCopy(lang), [lang]);
  // зачем (D111, макет A1/A5): месячный остаток ответов Free — из зеркала на телефоне
  // (0 чтений Firestore). Перечитываем при возврате на вкладку: после сессии цифра свежая.
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null);
  const freeTier = accessResolved && !hasPremiumAccess;
  useFocusEffect(useCallback(() => {
    if (!freeTier || !supportedTarget(studyTarget)) {
      setQuotaRemaining(null);
      return undefined;
    }
    let alive = true;
    void readAiDialogMonthlyQuota(studyTarget, captureAccountGeneration().stableId).then((quota) => {
      if (!alive) return;
      setQuotaRemaining(quota.status === 'allowed' ? quota.remaining : quota.status === 'exhausted' ? 0 : null);
    }).catch((error: unknown) => {
      console.warn('[DIALOGUE-V2] hub:quota → mirror read failed', error instanceof Error ? error.message : String(error));
    });
    return () => { alive = false; };
  }, [freeTier, studyTarget]));
  const quotaTotal = REVENUE_MONTHLY_LIMITS.ai_dialog_replies;
  const openPlus = useCallback(() => {
    router.push({
      pathname: '/premium_modal',
      params: { context: 'dialog_limit', source: 'dialogue_v2_hub' },
    } as never);
  }, [router]);
  const openLessons = useCallback(() => {
    router.push('/(tabs)/lessons' as never);
  }, [router]);
  const openFreeform = useCallback(() => {
    if (!accessResolved) return;
    if (!hasPremiumAccess) {
      router.push({
        pathname: '/premium_modal',
        params: { context: 'dialog_limit', source: 'dialogue_v2_freeform' },
      } as never);
      return;
    }
    router.push({ pathname: '/dialogue_v2_freeform' } as never);
  }, [accessResolved, hasPremiumAccess, router]);
  const openMemory = useCallback(() => {
    if (!accessResolved) return;
    router.push({ pathname: '/dialogue_v2_memory' } as never);
  }, [accessResolved, router]);

  // зачем (владелец 01.10: «ТАКОГО НИГДЕ НЕ ДОЛЖНО БЫТЬ» про «Диалоги не загрузились»): кнопки
  // «Повторить» нет — если сеть ничего не дала, показываем то, что уже на телефоне, и сами
  // тихо повторяем в фоне (до 3 раз, через 30 с). Пользователь ошибок не видит.
  const [reloadNonce, setReloadNonce] = useState(0);
  const silentRetriesRef = useRef(0);

  useEffect(() => {
    if (!supportedTarget(studyTarget)) {
      setState({ kind: 'unavailable' });
      return undefined;
    }
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    // Смена языка: сразу лучшее локальное (кэш/встроенное), без промежуточного «Загрузка…».
    setState((previous) => {
      const local = initialCatalogueState(studyTarget);
      return previous.kind === 'available' && local.kind === 'available'
        && previous.envelope === local.envelope ? previous : local;
    });
    // Вход в хаб: сеть только если кэш старше 12 ч (окно — в клиенте каталога).
    void fetchReleasedDialogueV2Catalogue(studyTarget, { awaitRefresh: true }).then((envelope) => {
      if (!active) return;
      if (!envelope) {
        // Остаёмся на локальном каталоге; повтор — тихо в фоне.
        console.warn('[DIALOGUE-V2] hub:catalogue → no envelope, keep local + silent retry', { studyTarget, retry: silentRetriesRef.current });
        if (silentRetriesRef.current < 3) {
          silentRetriesRef.current += 1;
          retryTimer = setTimeout(() => setReloadNonce((value) => value + 1), 30_000);
        }
        return;
      }
      silentRetriesRef.current = 0;
      // Тот же объект — не трогаем состояние (без лишнего ре-рендера и «прыжка»).
      setState((previous) => (previous.kind === 'available' && previous.envelope === envelope
        ? previous
        : { kind: 'available', envelope }));
    }).catch((error: unknown) => {
      // Клиент каталога не бросает; сюда попадём только при поломке самого кода.
      console.warn('[DIALOGUE-V2] hub:catalogue → unexpected rejection', { studyTarget, active, error: error instanceof Error ? error.name : String(error) });
    });
    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [reloadNonce, studyTarget]);

  const projection = useMemo(() => {
    if (state.kind !== 'available' || !supportedTarget(studyTarget)) return null;
    const input = { studyTarget, localCoinRank, worldHeadings: headings };
    const projected = projectAuthorizedDialogueV2Catalogue({ ...input, packets: state.envelope.packets });
    if (projected) return projected;
    // зачем: ответ сети/кэша не прошёл повторную проверку — показываем встроенный
    // одобренный каталог, а не карточку ошибки.
    const embedded = getEmbeddedDialogueV2Catalogue(studyTarget);
    console.warn('[DIALOGUE-V2] hub:catalogue → projection rejected, falling back to embedded', {
      studyTarget, sameAsEmbedded: embedded === state.envelope,
    });
    return embedded && embedded !== state.envelope
      ? projectAuthorizedDialogueV2Catalogue({ ...input, packets: embedded.packets })
      : null;
  }, [headings, localCoinRank, state, studyTarget]);
  // зачем (владелец 01.10: «диалоги в русском интерфейсе все на английском»): название сценария —
  // на языке интерфейса (данные Ядра); нет перевода — как в пакете.
  const localizedItems = useMemo(() => (projection?.items ?? []).map((item) => {
    const ui = dialogueV2UiCopy(lang, item.id);
    return ui?.title ? { ...item, title: ui.title } : item;
  }), [lang, projection]);
  const plusTools = (
    <>
      {showQuotaRow && freeTier && quotaRemaining !== null ? (
        <DialogueV2HubQuotaRow
          text={`${quotaRemaining}/${quotaTotal}`}
          accessibilityLabel={hubCopy.quotaA11y(quotaRemaining, quotaTotal)}
        />
      ) : null}
      <DialogueV2PlusTools
        accessResolved={accessResolved}
        hasPremiumAccess={hasPremiumAccess}
        onOpenFreeform={openFreeform}
        onOpenMemory={openMemory}
      />
    </>
  );
  // A6: язык без проверенных сценариев — карточка с замком вместо миров.
  const languageGate = (
    <DialogueV2HubLanguageGate
      title={hubCopy.gateTitle}
      text={hubCopy.gateText}
      ctaLabel={hubCopy.gateCta}
      onPress={openLessons}
    />
  );

  // зачем (владелец 01.10: «не должно быть состояния "диалоги загружаются"»): встроенный снимок
  // есть всегда, сюда попадаем только при поломке сборки — без строки «загрузка», лог причины.
  if (state.kind === 'loading') {
    console.warn('[DIALOGUE-V2] hub:render → no local catalogue (embedded missing)', { studyTarget });
    return plusTools;
  }

  if (!supportedTarget(studyTarget) || (projection && projection.items.length === 0)) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[DIALOGUE-V2] hub:render → language gate', { studyTarget, items: projection?.items.length ?? null });
    return (
      <>
        {plusTools}
        {languageGate}
      </>
    );
  }

  if (!projection) {
    // зачем (владелец 01.10): никакой карточки ошибки. Проекция не прошла и встроенного нет —
    // показываем остальное, сеть повторяется фоном (эффект выше). Лог причины остаётся.
    console.warn('[DIALOGUE-V2] hub:render → no projection, background retry', { studyTarget });
    return plusTools;
  }

  return (
    <>
      {plusTools}
      <DialogueV2CatalogueSection
        worlds={projection.worlds}
        items={localizedItems}
        labels={copy}
        onPressItem={onPressItem}
      />
      {freeTier && quotaRemaining === 0 ? (
        <DialogueV2HubExhaustedCard
          title={hubCopy.exhaustedTitle}
          text={hubCopy.exhaustedText(quotaTotal)}
          onPress={openPlus}
        />
      ) : null}
    </>
  );
}

export default DialogueV2CatalogueContainer;
