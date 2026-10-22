// ═══════════════════════════════════════════════════════════════════════════
// DialogsSceneCatalogue.tsx — панель «Диалоги» под сценой на строках каталога хаба: фильтр миров и карточки диалогов.
//
// зачем (координатор 22.10: «карточки каталога под сценой по эталону dialogs-scene-concepts.html v2: мир, название, цели, собеседник внутри, фильтр миров; за тем же флагом, без новых чтений»):
// контейнер хаба уже держит проекцию каталога (items со статусом available/done/locked и миры) — сюда она приходит пропсами, ничего не читается и не пишется. Выбирается ДИАЛОГ:
// тап по карточке — тот же onPressItem, что у прежнего списка (замер, прогрев сессии, брифинг; закрытый по рангу открывает свой брифинг). Список постраничный (по 8 + «Показать ещё»),
// чтобы 70+ карточек не рисовались разом; фильтр миров — локальное состояние, мгновенно, с возвратом на первую страницу.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useMemo, useState } from 'react';

import { dialogueV2UiCopy } from '../../../app/dialogue_v2_ui_copy';
import { useLang } from '../../LangContext';
import { dialogueWorldIcon } from '../dialogue_scenario_icons';
import type { DialogueV2CatalogueLearnerItem, DialogueV2CatalogueWorld } from '../DialogueV2CatalogueSection';
import DialogsScenePanel from './DialogsScenePanel';
import { dialogsSceneText } from './dialogs_scene_copy';
import { buildDialogsSceneCards } from './dialogs_scene_hub_model';

/** Сколько карточек показываем за раз. */
export const DIALOGS_SCENE_CATALOGUE_PAGE = 8;
const ALL = 'all';

type Props = Readonly<{
  items: readonly DialogueV2CatalogueLearnerItem[];
  worlds: readonly DialogueV2CatalogueWorld[];
  lockedAtRank: (rank: number) => string;
  onPressItem: (item: DialogueV2CatalogueLearnerItem) => void;
}>;

function DialogsSceneCatalogue({ items, worlds, lockedAtRank, onPressItem }: Props) {
  const { lang } = useLang();
  const [worldId, setWorldId] = useState(ALL);
  const [shown, setShown] = useState(DIALOGS_SCENE_CATALOGUE_PAGE);
  const titles = useMemo(() => new Map(worlds.map((w) => [w.id, w.title])), [worlds]);
  const cards = useMemo(() => buildDialogsSceneCards({
    lang,
    items,
    worldTitle: (id) => titles.get(id) ?? id,
    worldIcon: (id) => dialogueWorldIcon(id),
    uiCopy: (id) => dialogueV2UiCopy(lang, id),
    lockedAtRank,
  }), [items, lang, lockedAtRank, titles]);
  const filtered = useMemo(() => (worldId === ALL ? cards : cards.filter((c) => c.worldId === worldId)), [cards, worldId]);
  const visible = useMemo(() => filtered.slice(0, shown), [filtered, shown]);
  const worldChips = useMemo(() => [{ id: ALL, label: dialogsSceneText(lang, 'allWorlds') }, ...worlds.map((w) => ({ id: w.id, label: w.title }))], [lang, worlds]);
  const left = filtered.length - visible.length;
  const more = useMemo(() => (left > 0 ? { label: `${dialogsSceneText(lang, 'showMore')} · ${left}`, onPress: () => setShown((n) => n + DIALOGS_SCENE_CATALOGUE_PAGE) } : null), [lang, left]);
  const onWorld = useCallback((id: string) => { setWorldId(id); setShown(DIALOGS_SCENE_CATALOGUE_PAGE); }, []);
  const onCard = useCallback((id: string) => {
    const item = items.find((x) => x.id === id);
    if (!item) {
      console.warn('[DIALOGS-SCENE]', 'card:ignored', JSON.stringify({ id, reason: 'item_not_in_catalogue' })); // guard-ok: ранний выход называет причину
      return;
    }
    console.log('[DIALOGS-SCENE]', 'card', JSON.stringify({ id, status: item.status, world: item.worldId })); // guard-ok: одна строка на тап
    onPressItem(item);
  }, [items, onPressItem]);

  return (
    <DialogsScenePanel
      inset
      title={dialogsSceneText(lang, 'dialogs')}
      count={String(cards.length)}
      worlds={worldChips}
      worldId={worldId}
      onWorld={onWorld}
      cards={visible}
      onCard={onCard}
      more={more}
    />
  );
}

export default memo(DialogsSceneCatalogue);
