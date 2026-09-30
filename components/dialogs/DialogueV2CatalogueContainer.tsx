import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import {
  projectAuthorizedDialogueV2Catalogue,
} from '../../app/dialogue_v2_authorized_catalogue_projection';
import { captureAccountGeneration } from '../../app/account_generation';
import { readAiDialogMonthlyQuota } from '../../app/ai_dialog_daily_quota';
import { REVENUE_MONTHLY_LIMITS } from '../../app/revenue_daily_limits';
import {
  fetchReleasedDialogueV2Catalogue,
  type DialogueV2CatalogueReleaseEnvelope,
  type DialogueV2CatalogueStudyTarget,
} from '../../app/dialogue_v2_catalogue_client';
import { V2, V2_TYPE } from '../../constants/v2Style';
import { triLang } from '../../constants/i18n';
import { useMyCoinRank } from '../../hooks/use_my_coin_rank';
import { useLang } from '../LangContext';
import { usePremium } from '../PremiumContext';
import { useStudyTarget } from '../StudyTargetContext';
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
  return Object.freeze([
    Object.freeze({ id: 'social', title: triLang(lang, {
      ru: 'Общение', uk: 'Спілкування', en: 'Social', es: 'Social', fr: 'Social', de: 'Soziales',
    }) }),
    Object.freeze({ id: 'work', title: triLang(lang, {
      ru: 'Дела', uk: 'Справи', en: 'Work', es: 'Trabajo', fr: 'Travail', de: 'Arbeit',
    }) }),
    Object.freeze({ id: 'travel', title: triLang(lang, {
      ru: 'Поездки', uk: 'Подорожі', en: 'Travel', es: 'Viajes', fr: 'Voyages', de: 'Reisen',
    }) }),
    Object.freeze({ id: 'everyday', title: triLang(lang, {
      ru: 'Каждый день', uk: 'Щодня', en: 'Everyday', es: 'Día a día', fr: 'Quotidien', de: 'Alltag',
    }) }),
  ]);
}

function catalogueCopy(lang: ReturnType<typeof useLang>['lang']): Readonly<{
  loading: string;
  unavailable: string;
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
    loading: triLang(lang, {
      ru: 'Загружаем диалоги…', uk: 'Завантажуємо діалоги…', en: 'Loading dialogues…',
      es: 'Cargando diálogos…', fr: 'Chargement des dialogues…', de: 'Dialoge werden geladen…',
    }),
    unavailable: triLang(lang, {
      ru: 'Диалоги недоступны', uk: 'Діалоги недоступні', en: 'Dialogues are unavailable',
      es: 'Los diálogos no están disponibles', fr: 'Les dialogues sont indisponibles', de: 'Dialoge sind nicht verfügbar',
    }),
  });
}

function supportedTarget(value: unknown): value is DialogueV2CatalogueStudyTarget {
  return typeof value === 'string' && V2_TARGETS.has(value);
}

export type DialogueV2CatalogueContainerProps = Readonly<{
  onPressItem: (item: DialogueV2CatalogueLearnerItem) => void;
}>;

/**
 * Owns only the V2 learner catalogue loading boundary. The callable response
 * is revalidated before rendering and no legacy dialog surface is involved.
 */
export function DialogueV2CatalogueContainer({ onPressItem }: DialogueV2CatalogueContainerProps) {
  const router = useRouter();
  const { studyTarget } = useStudyTarget();
  const { lang } = useLang();
  const { accessResolved, hasPremiumAccess } = usePremium();
  const localCoinRank = useMyCoinRank();
  const palette = useV2Palette();
  const [state, setState] = useState<CatalogueState>({ kind: 'loading' });
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

  useEffect(() => {
    if (!supportedTarget(studyTarget)) {
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
  }, [studyTarget]);

  const projection = useMemo(() => {
    if (state.kind !== 'available' || !supportedTarget(studyTarget)) return null;
    return projectAuthorizedDialogueV2Catalogue({
      packets: state.envelope.packets,
      studyTarget,
      localCoinRank,
      worldHeadings: headings,
    });
  }, [headings, localCoinRank, state, studyTarget]);
  const plusTools = (
    <>
      {freeTier && quotaRemaining !== null ? (
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

  if (state.kind === 'loading') {
    return (
      <>
        {plusTools}
        <View testID="dialogue-v2-catalogue-loading" style={{ marginTop: V2.gap }}>
          <Text style={{ color: palette.textSecondary, ...V2_TYPE.body }} maxFontSizeMultiplier={1.2}>
            {copy.loading}
          </Text>
        </View>
      </>
    );
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
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[DIALOGUE-V2] hub:render → catalogue unavailable', { studyTarget });
    return (
      <>
        {plusTools}
        <View testID="dialogue-v2-catalogue-unavailable" style={{ marginTop: V2.gap }}>
          <Text style={{ color: palette.textSecondary, ...V2_TYPE.body }} maxFontSizeMultiplier={1.2}>
            {copy.unavailable}
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      {plusTools}
      <DialogueV2CatalogueSection
        worlds={projection.worlds}
        items={projection.items}
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
