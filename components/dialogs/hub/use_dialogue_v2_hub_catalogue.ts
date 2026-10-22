// ═════════════════════════════════════════════════════════════════════
// use_dialogue_v2_hub_catalogue.ts — каталог Диалогов для экрана темы: ТОЛЬКО локальное (кэш этого запуска или встроенный снимок) + статусы «пройдено / закрыто рангом».
//
// зачем (владелец 22.10: «каждый раздел открывается мгновенно», Firebase-экономия): экран темы открывается из хаба, который уже держит каталог и сам раз в 12 ч перепроверяет его по сети.
// Здесь сети нет вообще: первый кадр сразу из peek / встроенного снимка, статусы — из локального хранилища прохождений и монетного ранга (тот же projectAuthorizedDialogueV2Catalogue, что у хаба).
// Проекция повторяет контейнер хаба (DialogueV2CatalogueContainer): расхождение сторожит tests/dialogs_hub_theme_screen_2026_10_22.test.ts.
// ═════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useSyncExternalStore } from 'react';

import { projectAuthorizedDialogueV2Catalogue } from '../../../app/dialogue_v2_authorized_catalogue_projection';
import { getEmbeddedDialogueV2Catalogue, peekDialogueV2Catalogue, type DialogueV2CatalogueStudyTarget } from '../../../app/dialogue_v2_catalogue_client';
import { getDialogueV2DoneVersion, hydrateDialogueV2DoneIds, peekDialogueV2DoneIds, subscribeDialogueV2Done } from '../../../app/dialogue_v2_done_store';
import { dialogueV2UiCopy } from '../../../app/dialogue_v2_ui_copy';
import { useMyCoinRank } from '../../../hooks/use_my_coin_rank';
import { useLang } from '../../LangContext';
import { useStudyTarget } from '../../StudyTargetContext';
import { catalogueCopy, dialogueV2WorldHeadings } from '../DialogueV2CatalogueContainer';
import type { DialogueV2CatalogueLearnerItem, DialogueV2CatalogueWorld } from '../DialogueV2CatalogueSection';

const V2_TARGETS: ReadonlySet<string> = new Set(['en', 'es', 'fr', 'de']);
const LOG = '[DIALOGS-THEME]';

export type DialogueV2HubCatalogue = Readonly<{
  ready: boolean;
  studyTarget: unknown;
  items: readonly DialogueV2CatalogueLearnerItem[];
  worlds: readonly DialogueV2CatalogueWorld[];
  lockedAtRank: (rank: number) => string;
}>;

export function useDialogueV2HubCatalogue(): DialogueV2HubCatalogue {
  const { studyTarget } = useStudyTarget();
  const { lang } = useLang();
  const localCoinRank = useMyCoinRank();
  const headings = useMemo(() => dialogueV2WorldHeadings(lang), [lang]);
  const copy = useMemo(() => catalogueCopy(lang), [lang]);
  // версия хранилища будит экран в тот же кадр, когда диалог отмечен пройденным
  const doneVersion = useSyncExternalStore(subscribeDialogueV2Done, getDialogueV2DoneVersion, getDialogueV2DoneVersion);
  const supported = typeof studyTarget === 'string' && V2_TARGETS.has(studyTarget);
  useEffect(() => {
    if (!supported) return;
    void hydrateDialogueV2DoneIds(studyTarget as DialogueV2CatalogueStudyTarget);
  }, [studyTarget, supported]);

  const projection = useMemo(() => {
    if (!supported) {
      console.warn(LOG, 'catalogue:unsupported_target', JSON.stringify({ studyTarget: String(studyTarget) })); // guard-ok: ранний выход называет причину
      return null;
    }
    const target = studyTarget as DialogueV2CatalogueStudyTarget;
    const input = { studyTarget: target, localCoinRank, worldHeadings: headings, doneScenarioIds: peekDialogueV2DoneIds(target) };
    const cached = peekDialogueV2Catalogue(target);
    const embedded = getEmbeddedDialogueV2Catalogue(target);
    const envelope = cached ?? embedded;
    const projected = envelope ? projectAuthorizedDialogueV2Catalogue({ ...input, packets: envelope.packets }) : null;
    if (projected) return projected;
    // как в контейнере хаба: ответ кэша не прошёл повторную проверку — встроенный одобренный каталог
    console.warn(LOG, 'catalogue:projection_rejected', JSON.stringify({ studyTarget, hadCache: cached !== null, hadEmbedded: embedded !== null })); // guard-ok: ветка называет причину
    return embedded && embedded !== envelope ? projectAuthorizedDialogueV2Catalogue({ ...input, packets: embedded.packets }) : null;
    // doneVersion — намеренная зависимость: статусы «пройдено» читаются из хранилища при каждом его обновлении
  }, [doneVersion, headings, localCoinRank, studyTarget, supported]);

  const items = useMemo(() => (projection?.items ?? []).map((item) => {
    const ui = dialogueV2UiCopy(lang, item.id);
    return ui?.title ? { ...item, title: ui.title } : item;
  }), [lang, projection]);
  return { ready: projection !== null, studyTarget, items, worlds: projection?.worlds ?? [], lockedAtRank: copy.lockedAtRank };
}
