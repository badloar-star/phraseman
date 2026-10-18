/**
 * Лента «Видео» на Главной и язык интерфейса: журнал [HOME-VIDEO-LANG] и ВЫКЛЮЧЕННОЕ по умолчанию условие «лента только для интерфейсов, на языке которых есть ролики».
 *
 * зачем (координатор 18.10, находка Макетов tile_es13/home_es_13_light.png: на Главной с испанским интерфейсом лента «Vídeos» показывает русские обложки): лента выбирается по ЯЗЫКУ ИЗУЧЕНИЯ
 * (канал каталога по тегу языка; английский — RSS русскоязычного канала Professor Lingman), фильтра по языку интерфейса нет нигде. Включать ли условие, решает владелец (утро 18.10) — до его слова
 * флаг HOME_VIDEO_RAIL_LANG_FILTER_ENABLED = false и поведение Главной не меняется. Признак условия — узкий и проверяемый: интерфейс не на кириллице и ≥ 50 % названий загруженных роликов на кириллице.
 * Канал с латинскими названиями, но русской озвучкой он не поймает — для этого нужны метаданные «язык роликов» в каталоге (предложение Ядру).
 */
import { DIAG_ENABLED } from './dev_diag_gate';

/** Решение владельца ожидается: выключено. Меняется ТОЛЬКО по его слову. */
export const HOME_VIDEO_RAIL_LANG_FILTER_ENABLED = false;

/** Доля кириллических названий, с которой ролики считаются «на кириллице». */
export const HOME_VIDEO_RAIL_CYRILLIC_SHARE = 0.5;

const CYRILLIC_UI_LANGS: readonly string[] = ['ru', 'uk'];
const CYRILLIC = /[Ѐ-ӿ]/;
const LETTER = /\p{L}/u;

export type HomeVideoLangDecision = Readonly<{
  hidden: boolean;
  /** Почему: 'filter_disabled' | 'no_videos' | 'cyrillic_interface' | 'titles_not_cyrillic' | 'cyrillic_titles_for_latin_interface'. */
  reason: string;
  total: number;
  cyrillicTitles: number;
  cyrillicShare: number;
}>;

export function interfaceUsesCyrillic(lang: string): boolean {
  return CYRILLIC_UI_LANGS.includes(lang);
}

/** Сколько названий на кириллице (названия без букв не считаются). */
export function countCyrillicTitles(videos: readonly Readonly<{ title: string }>[]): Readonly<{ total: number; cyrillicTitles: number }> {
  let total = 0;
  let cyrillicTitles = 0;
  for (const video of videos) {
    if (!LETTER.test(video.title)) continue;
    total += 1;
    if (CYRILLIC.test(video.title)) cyrillicTitles += 1;
  }
  return { total, cyrillicTitles };
}

/** Чистое решение. При выключенном флаге (по умолчанию) никогда не скрывает; `reason` всегда называет значение, которое решило. */
export function decideHomeVideoRailByInterfaceLang(
  input: Readonly<{ lang: string; videos: readonly Readonly<{ title: string }>[]; enabled?: boolean }>,
): HomeVideoLangDecision {
  const enabled = input.enabled ?? HOME_VIDEO_RAIL_LANG_FILTER_ENABLED;
  const { total, cyrillicTitles } = countCyrillicTitles(input.videos);
  const cyrillicShare = total > 0 ? Math.round((cyrillicTitles / total) * 100) / 100 : 0;
  const base = { total, cyrillicTitles, cyrillicShare };
  if (!enabled) return { hidden: false, reason: 'filter_disabled', ...base };
  if (total === 0) return { hidden: false, reason: 'no_videos', ...base };
  if (interfaceUsesCyrillic(input.lang)) return { hidden: false, reason: 'cyrillic_interface', ...base };
  if (cyrillicShare < HOME_VIDEO_RAIL_CYRILLIC_SHARE) return { hidden: false, reason: 'titles_not_cyrillic', ...base };
  return { hidden: true, reason: 'cyrillic_titles_for_latin_interface', ...base };
}

const logged = new Set<string>();

/** Журнал: язык интерфейса, язык изучения, источник/канал, решение ленты и причина — по строке на смену состояния, только dev. */
export function logHomeVideoLang(entry: Readonly<{
  lang: string;
  studyTarget: string;
  shown: boolean;
  shownReason: string;
  catalogRail: boolean;
  noChannel: boolean;
  videoStatus: string;
  channelNote: string;
  decision: HomeVideoLangDecision;
}>): void {
  if (!DIAG_ENABLED) return;
  const key = JSON.stringify(entry);
  if (logged.has(key)) return;
  logged.add(key);
  console.log('[HOME-VIDEO-LANG]', key); // guard-ok: строка на смену состояния ленты, dev
}

export function resetHomeVideoLangLogForTests(): void {
  logged.clear();
}
