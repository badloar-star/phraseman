// ═══════════════════════════════════════════════════════════════════════════
// dialogs_scene_art.ts — картинка героя «Сцены» «Диалогов» для состояния.
//
// зачем (владелец 21.10; координатор: «Герой — предмет (рекомендация, вопрос 15 на утро). Смена на собеседника — одной правкой»): у каждого из восьми
// состояний свой файл assets/images/v2art/{light,dark}/dialogs_scene_<состояние>.webp — предмет (как у Главной: книга, кубок, календарь), поэтому одна
// картинка живёт с любым собеседником и в любой из 23 тем. Если владелец выберет героем собеседника — меняется ОДНА константа DIALOGS_SCENE_HERO_KIND:
// тогда ищется файл dialogs_scene_person_<id собеседника>, а если его ещё нет — картинка-предмет состояния, а если и её нет — заглушка.
// Все восемь имён dialogs_scene_<состояние> зарегистрированы в реестре картинок (themed_art_registry.ts, 4 · ТЕМЫ, 317f64e71; светлая и тёмная версии), поэтому в выпуске показывается свой файл героя.
// Заглушка из нынешних картинок («dialogs», «intro_ai_dialog») остаётся запасным путём — для состояния без файла и для собеседника-героя, у которого нет своей картинки. Источник (свой файл или заглушка)
// пишется в журнал [DIALOGS-SCENE] (поле origin): по нему Сверка видит, что на кадре не заглушка.
// ═══════════════════════════════════════════════════════════════════════════
import type { ImageSourcePropType } from 'react-native';

import { resolveThemedArt, THEMED_ART_ALL_NAMES, type ThemedArtBrightness, type ThemedArtName } from '../../theme/themed_art_registry';
import type { DialogsSceneState } from './dialogs_scene_state';

/** Кто герой сцены: 'item' — предмет состояния (рекомендация), 'interlocutor' — собеседник текущего диалога. Единственное место смены. */
export type DialogsSceneHeroKind = 'item' | 'interlocutor';
export const DIALOGS_SCENE_HERO_KIND: DialogsSceneHeroKind = 'item';

export type DialogsSceneArt = Readonly<{
  base: ImageSourcePropType | null;
  accent: ImageSourcePropType | null;
  name: string;
  /** Откуда взято: свой файл героя или заглушка (с источником реестра). */
  origin: string;
  kind: DialogsSceneHeroKind;
}>;

/** Заглушка, пока файла состояния нет в реестре: у входа согласия — картинка вступления «AI-диалог», у остальных — плитка «Диалоги» Главной. */
const PLACEHOLDER: Readonly<Record<DialogsSceneState, 'dialogs' | 'intro_ai_dialog'>> = Object.freeze({
  consent: 'intro_ai_dialog',
  offline: 'dialogs',
  limit: 'dialogs',
  first: 'dialogs',
  low: 'dialogs',
  all_done: 'dialogs',
  day_done: 'dialogs',
  next: 'dialogs',
});

const REGISTERED: ReadonlySet<string> = new Set(THEMED_ART_ALL_NAMES as readonly string[]);

/** Имя файла героя-предмета: dialogs_scene_<состояние>. */
export function dialogsSceneItemFile(state: DialogsSceneState): string {
  return `dialogs_scene_${state}`;
}

/** Имя файла героя-собеседника: dialogs_scene_person_<id>; id — латиница, цифры и «_» (иначе null — собеседника нет). */
export function dialogsScenePersonFile(personaId: string | null | undefined): string | null {
  return personaId && /^[a-z0-9_]+$/i.test(personaId) ? `dialogs_scene_person_${personaId.toLowerCase()}` : null;
}

export function resolveDialogsSceneArt(
  state: DialogsSceneState,
  brightness: ThemedArtBrightness,
  personaId: string | null = null,
  kind: DialogsSceneHeroKind = DIALOGS_SCENE_HERO_KIND,
): DialogsSceneArt {
  const person = kind === 'interlocutor' ? dialogsScenePersonFile(personaId) : null;
  const item = dialogsSceneItemFile(state);
  const own = person !== null && REGISTERED.has(person) ? person : REGISTERED.has(item) ? item : null;
  const name = (own ?? PLACEHOLDER[state]) as ThemedArtName;
  const resolved = resolveThemedArt(name, brightness);
  return Object.freeze({
    base: resolved.base,
    accent: resolved.accent,
    name,
    origin: own ? resolved.origin : `placeholder:${resolved.origin}`,
    kind: own !== null && own === person ? 'interlocutor' : 'item',
  });
}
