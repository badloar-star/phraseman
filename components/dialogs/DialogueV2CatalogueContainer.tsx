import { useFocusEffect, useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useState, useRef, useSyncExternalStore } from 'react';
import { InteractionManager, Text, View } from 'react-native';

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
import { dialogueWorldSubtitle } from './dialogue_world_subtitle';
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
import { HubHeaderCollapsible } from './hub_header_collapse';
import { DialogueV2CatalogueSkeleton } from './DialogueV2CatalogueSkeleton';
import DialogsSceneCatalogue from './scene/DialogsSceneCatalogue';
import { isDevDialogLanguageGateHeld } from '../../app/dev_dialog_state';
import { getDialogueV2DoneVersion, hydrateDialogueV2DoneIds, peekDialogueV2DoneIds, subscribeDialogueV2Done } from '../../app/dialogue_v2_done_store';
import {
  DialogueV2HubExhaustedCard,
  DialogueV2HubLockedNote,
  DialogueV2HubLanguageGate,
  DialogueV2HubQuotaRow,
  dialogueV2HubCopy,
} from './DialogueV2HubNotices';

const V2_TARGETS = new Set(['en', 'es', 'fr', 'de']);

type CatalogueState =
  | Readonly<{ kind: 'loading' }>
  | Readonly<{ kind: 'unavailable' }>
  | Readonly<{ kind: 'available'; envelope: DialogueV2CatalogueReleaseEnvelope }>;

// зачем (координатор 22.10, «Сцена» Диалогов): названия миров — одним источником для каталога и сцены
export function dialogueV2WorldHeadings(lang: ReturnType<typeof useLang>['lang']): readonly DialogueV2CatalogueWorld[] {
  // зачем (владелец 01.10, данные Ядра): названия миров — на языке интерфейса для всех 9 языков;
  // нет в снимке — прежние подписи ниже.
  const fromUi = (id: string, fallback: string): string => dialogueV2UiWorldTitle(lang, id) ?? fallback;
  return Object.freeze([
    Object.freeze({ id: 'social', title: fromUi('social', triLang(lang, {
      ru: 'Общение', uk: 'Спілкування', en: 'Social', es: 'Social', fr: 'Social', de: 'Soziales',
      'pt-BR': 'Social', vi: 'Giao tiếp', id: 'Sosial', tr: 'Sosyal', pl: 'Towarzyskie',
    })) }),
    Object.freeze({ id: 'work', title: fromUi('work', triLang(lang, {
      ru: 'Дела', uk: 'Справи', en: 'Work', es: 'Trabajo', fr: 'Travail', de: 'Arbeit',
      'pt-BR': 'Trabalho', vi: 'Công việc', id: 'Kerja', tr: 'İş', pl: 'Praca',
    })) }),
    Object.freeze({ id: 'travel', title: fromUi('travel', triLang(lang, {
      ru: 'Поездки', uk: 'Подорожі', en: 'Travel', es: 'Viajes', fr: 'Voyages', de: 'Reisen',
      'pt-BR': 'Viagens', vi: 'Du lịch', id: 'Perjalanan', tr: 'Seyahat', pl: 'Podróże',
    })) }),
    Object.freeze({ id: 'everyday', title: fromUi('everyday', triLang(lang, {
      ru: 'Каждый день', uk: 'Щодня', en: 'Everyday', es: 'Día a día', fr: 'Quotidien', de: 'Alltag',
      'pt-BR': 'Dia a dia', vi: 'Hằng ngày', id: 'Sehari-hari', tr: 'Günlük', pl: 'Na co dzień',
    })) }),
  ]);
}

function catalogueCopy(lang: ReturnType<typeof useLang>['lang']): Readonly<{
  lockedAtRank: (rank: number) => string;
  worldSubtitle: (worldId: string) => string | null;
}> {
  return Object.freeze({
    // зачем (макет dialogs.html A4): строка ранга под названием закрытого диалога, 9 языков.
    lockedAtRank: (rank: number) => triLang(lang, {
      ru: `Откроется на ранге\u00A0${rank}`, uk: `Відкриється на ранзі\u00A0${rank}`, en: `Unlocks at rank\u00A0${rank}`,
      es: `Se desbloquea en el rango\u00A0${rank}`, 'pt-BR': `Desbloqueia no nível\u00A0${rank}`, vi: `Mở ở hạng\u00A0${rank}`,
      id: `Terbuka di peringkat\u00A0${rank}`, tr: `${rank}.\u00A0rütbede açılır`, pl: `Odblokuje się na randze\u00A0${rank}`,
      fr: `Se débloque au rang\u00A0${rank}`, de: `Wird ab Rang\u00A0${rank} freigeschaltet`,
    }),
    worldSubtitle: (worldId: string) => dialogueWorldSubtitle(lang, worldId),
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
  /** зачем (координатор 22.10, «Сцена» Диалогов за флагом): вместо секций-категорий — карточки диалогов с фильтром миров из той же проекции. */
  sceneCatalogue?: boolean;
}>;

/**
 * Owns only the V2 learner catalogue loading boundary. The callable response
 * is revalidated before rendering and no legacy dialog surface is involved.
 */
function DialogueV2CatalogueContainerImpl({ onPressItem, showQuotaRow = true, sceneCatalogue = false }: DialogueV2CatalogueContainerProps) {
  // ВРЕМЕННО (координатор 13.10, RUN hub_collapse после R12; убрать после проверки Сверкой): счётчик рендеров — при раскрытии/закрытии категории Container не должен перерисовываться (n не растёт). Только dev.
  const hubRenderCountRef = useRef(0);
  hubRenderCountRef.current += 1;
  if ((globalThis as { __DEV__?: boolean }).__DEV__ === true) console.log(`[HUB-COLLAPSE] render Container n=${hubRenderCountRef.current}`); // guard-ok: временный счётчик рендеров, dev
  const router = useRouter();
  const { studyTarget } = useStudyTarget();
  const { lang } = useLang();
  const { accessResolved, hasPremiumAccess } = usePremium();
  const localCoinRank = useMyCoinRank();
  const palette = useV2Palette();
  // зачем (владелец 01.10: «Диалоги не загрузились» не должно быть нигде): первый кадр —
  // сразу из кэша этого запуска или встроенного снимка, без «Загрузка…» и без сети.
  const [state, setState] = useState<CatalogueState>(() => initialCatalogueState(studyTarget));
  // зачем (E2, координатор 12.10, «сперва логи»): время от монтирования хаба до первого содержательного кадра — что именно было в первом кадре (данные / скелет) и когда пришли данные
  const firstFrameAtRef = useRef(Date.now());
  const firstFrameLoggedRef = useRef<string | null>(null);
  useEffect(() => {
    if (typeof __DEV__ === 'undefined' || !__DEV__) return;
    if (firstFrameLoggedRef.current === state.kind) return;
    const first = firstFrameLoggedRef.current === null;
    firstFrameLoggedRef.current = state.kind;
    console.log(`[DIALOGS-FIRST-FRAME] hub ${first ? 'first' : 'update'} kind=${state.kind} content=${String(state.kind === 'available')} skeleton=${String(state.kind === 'loading')} ms=${Date.now() - firstFrameAtRef.current}`); // guard-ok: под __DEV__, число решает ветку
  }, [state.kind]);
  const headings = useMemo(() => dialogueV2WorldHeadings(lang), [lang]);
  const copy = useMemo(() => catalogueCopy(lang), [lang]);
  const hubCopy = useMemo(() => dialogueV2HubCopy(lang), [lang]);
  // зачем (координатор 12.10, dialogs-003): «пройдено ✓» и «N / всего» — из локального хранилища прохождений (память мгновенно, диск читается один раз за процесс); Firestore не участвует.
  // Версия хранилища будит хаб в тот же кадр, когда диалог отмечен пройденным: после возврата из итога галочка уже на месте.
  const doneVersion = useSyncExternalStore(subscribeDialogueV2Done, getDialogueV2DoneVersion, getDialogueV2DoneVersion);
  useEffect(() => {
    if (!supportedTarget(studyTarget)) return;
    void hydrateDialogueV2DoneIds(studyTarget);
  }, [studyTarget]);
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
    // зачем (Сверка cold5a/b 23:30): пауза кадров при входе (580 / 2605 мс) оба раза кончалась ровно к ответу функции
    // каталога (586 / 2607 мс). Каталог уже на экране из кэша/встроенного снимка, перепроверка нужна раз в 12 ч —
    // поэтому она стартует ПОСЛЕ анимации входа (как прогрев), а уход с экрана до этого её отменяет.
    // Сужение «поддержанный язык» из проверки выше внутрь объявленной функции не переходит — фиксируем его здесь.
    const revalidationTarget = studyTarget;
    const interaction = InteractionManager.runAfterInteractions(() => {
      if (!active) return;
      startRevalidation();
    });
    function startRevalidation(): void {
    void fetchReleasedDialogueV2Catalogue(revalidationTarget, { awaitRefresh: true }).then((envelope) => {
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
      setState((previous) => {
        const same = previous.kind === 'available' && previous.envelope === envelope;
        return same ? previous : { kind: 'available', envelope };
      });
    }).catch((error: unknown) => {
      // Клиент каталога не бросает; сюда попадём только при поломке самого кода.
      console.warn('[DIALOGUE-V2] hub:catalogue → unexpected rejection', { studyTarget, active, error: error instanceof Error ? error.name : String(error) });
    });
    }
    return () => {
      active = false;
      interaction.cancel();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [reloadNonce, studyTarget]);

  const projection = useMemo(() => {
    if (state.kind !== 'available' || !supportedTarget(studyTarget)) return null;
    const input = { studyTarget, localCoinRank, worldHeadings: headings, doneScenarioIds: peekDialogueV2DoneIds(studyTarget) };
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
  }, [doneVersion, headings, localCoinRank, state, studyTarget]);
  // зачем (владелец 01.10: «диалоги в русском интерфейсе все на английском»): название сценария —
  // на языке интерфейса (данные Ядра); нет перевода — как в пакете.
  const localizedItems = useMemo(() => (projection?.items ?? []).map((item) => {
    const ui = dialogueV2UiCopy(lang, item.id);
    return ui?.title ? { ...item, title: ui.title } : item;
  }), [lang, projection]);
  const quotaRow = showQuotaRow && freeTier && quotaRemaining !== null ? (
    <DialogueV2HubQuotaRow
      text={`${quotaRemaining}/${quotaTotal}`}
      accessibilityLabel={hubCopy.quotaA11y(quotaRemaining, quotaTotal)}
    />
  ) : null;
  const plusTools = (
    <>
      {quotaRow}
      {/* зачем (dialogs-003, координатор 13.10; образец dialogs.html №4): плашка «Свободный разговор PLUS» уходит, пока открыта категория; обёртка читает контекст сама — каталог не перерисовывается */}
      <HubHeaderCollapsible>
        <DialogueV2PlusTools
          accessResolved={accessResolved}
          hasPremiumAccess={hasPremiumAccess}
          onOpenFreeform={openFreeform}
        />
      </HubHeaderCollapsible>
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
  // зачем (владелец/координатор 12.10, dialogs-005; образец dialogs.html «Хаб — язык ещё проверяется»): пока для языка нет проверенных диалогов, «Свободный разговор» скрыт —
  // вход в разговор мимо гейта нелогичен. Остаётся только строка остатка (если она нужна) и карточка гейта. Причина скрытия — в журнал.
  const gateHub = (reason: 'dev_hold' | 'unsupported_target' | 'zero_items') => {
    console.log(`[NO-ERROR-SCREEN] [DIALOGUE-V2] hub:freeform_hidden reason=language_gate source=${reason} shown=calm_language_card studyTarget=${String(studyTarget)} supported=${supportedTarget(studyTarget)} items=${projection?.items.length ?? 'null'}`); // guard-ok: ветвление называет причину скрытия
    return (
      <>
        {quotaRow}
        {languageGate}
      </>
    );
  };

  // зачем (владелец 01.10: «не должно быть состояния "диалоги загружаются"»): встроенный снимок
  // есть всегда, сюда попадаем только при поломке сборки — без строки «загрузка», лог причины.
  // зачем (координатор 12.10, dialogs-005): dev-удержание показывает карточку «язык ещё проверяется» для поддержанного языка (память процесса; в стор-сборке геттер всегда false).
  if (isDevDialogLanguageGateHeld()) {
    console.warn('[DIALOGUE-V2] hub:render → language gate (dev hold=dialog_language_gate)', { studyTarget }); // guard-ok: ветвление называет причину
    return gateHub('dev_hold');
  }
  if (state.kind === 'loading') {
    console.warn('[DIALOGUE-V2] hub:render → no local catalogue (embedded missing)', { studyTarget });
    // зачем (E2): раньше хаб оставался пустым под шапкой и «прыгал» при приходе данных; скелет той же геометрии занимает места карточек
    return (
      <>
        {plusTools}
        <DialogueV2CatalogueSkeleton />
      </>
    );
  }

  if (!supportedTarget(studyTarget) || (projection && projection.items.length === 0)) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[DIALOGUE-V2] hub:render → language gate', { studyTarget, items: projection?.items.length ?? null });
    return gateHub(supportedTarget(studyTarget) ? 'zero_items' : 'unsupported_target');
  }

  if (!projection) {
    // зачем (владелец 01.10): никакой карточки ошибки. Проекция не прошла и встроенного нет —
    // показываем остальное, сеть повторяется фоном (эффект выше). Лог причины остаётся.
    console.warn('[DIALOGUE-V2] hub:render → no projection, background retry', { studyTarget });
    return (
      <>
        {plusTools}
        <DialogueV2CatalogueSkeleton />
      </>
    );
  }

  return (
    <>
      {plusTools}
      {sceneCatalogue ? (
        <DialogsSceneCatalogue worlds={projection.worlds} items={localizedItems} lockedAtRank={copy.lockedAtRank} onPressItem={onPressItem} />
      ) : (
        <DialogueV2CatalogueSection
          worlds={projection.worlds}
          items={localizedItems}
          labels={copy}
          onPressItem={onPressItem}
        />
      )}
      {freeTier && quotaRemaining !== 0 && localizedItems.some((item) => item.status === 'locked') ? (
        <DialogueV2HubLockedNote title={hubCopy.lockedNoteTitle} text={hubCopy.lockedNoteText} />
      ) : null}
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

// зачем (Сверка cold5a/b 23:30): экран «Диалоги» перерисовывается после открытия (home:rerender changed=[] и
// changed=["quota"]), а шапка — новый JSX в каждом рендере. Без memo каждая такая перерисовка тянула весь каталог
// (render_cost 19–53 мс). Пропсы контейнера — стабильный onPressItem и булево showQuotaRow.
export const DialogueV2CatalogueContainer = memo(DialogueV2CatalogueContainerImpl);

export default DialogueV2CatalogueContainer;
