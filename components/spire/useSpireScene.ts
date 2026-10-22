// зачем (владелец 13.10, скрин светлой темы с Обсидианом: «окно башни должно соответствовать ТЕМЕ, а не башне»): фон окна башни (небо, звёзды, облака,
// подпись «над облаками», земля, тень у подножия) и подписи на нём (номера этажей, «СТРАЖ», «ВЕРШИНА») берутся из токенов текущей темы и шага ползунка,
// как у остальных карточек приложения. Сама башня (камень, ободки, навершие, окна, свечение) остаётся нарядом лиги (modules/spire/tower_skins.ts).
import { useMemo } from 'react';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { glassTone } from '../dialogs/glass/glassTone';

/** Цвета сцены вокруг башни. Всё — от токенов темы; прозрачность для градиентов задаёт SpireTowerSvg. */
export type SpireScene = Readonly<{
  /** Светлая тема: звёзд нет, облака и земля — мягкие тёмные пятна, тень подножия слабее. */
  light: boolean;
  /** Номер этажа (не свой) и подписи «СТРАЖ»/«ВЕРШИНА»: secondary темы, контраст ≥ 4,5 на плите окна. */
  num: string;
  /** Номер своего этажа: основной текст темы. */
  numMine: string;
  /** Подпись «над облаками». */
  cloudsLabel: string;
  /** Цвет пятен облаков и земли (градиент к прозрачному). */
  tone: string;
  /** Звёзды: на тёмной теме — светлые точки цвета текста; на светлой — null. */
  star: string | null;
  /** Тень у подножия башни: на светлом окне слабая, чтобы башня не «висела» и не пачкала плиту. */
  shadow: string;
}>;

/**
 * зачем (Пик v2, эталон peak-scene-v2.html: башня — герой «Сцены», а сцена всегда тёмная при любой теме): цвета окна башни на «Сцене» —
 * те же, что у единого рендера макетов (docs/design/v2-app/spire-tower-render.js, сцена 'dark').
 */
export const SPIRE_SCENE_TOWER: SpireScene = Object.freeze({ light: false, num: '#B8B9BD', numMine: '#FFFFFF', cloudsLabel: '#B8B9BD', tone: '#FFFFFF', star: '#FFFFFF', shadow: 'rgba(0,0,0,0.55)' }); // theme-exempt: сцена всегда тёмная, цвета эталона

export function useSpireScene(): SpireScene {
  const { liquidGlassThemeId } = useTheme();
  return useMemo(() => {
    const g = liquidGlassTokens(liquidGlassThemeId);
    const light = g.isLight;
    return {
      light,
      num: g.secondary,
      numMine: g.text,
      cloudsLabel: g.secondary,
      tone: g.text,
      star: light ? null : g.text,
      shadow: glassTone('#000000', light ? 0.16 : 0.55), // theme-exempt: тень у подножия — всегда чёрная, меняется только сила
    };
  }, [liquidGlassThemeId]);
}
