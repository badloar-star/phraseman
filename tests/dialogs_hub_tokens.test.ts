// зачем (координатор 22.10: токены под хаб Диалогов — плитки, карточки тем в оттенках, «таблетка»-переключатель тем): цвета хаба берутся ТОЛЬКО из текущей темы и читаются во всех 23 темах ×
// светлое/тёмное × 3 уровня: белый текст на карточках миров ≥ 4,5, оттенок миров = оттенок темы, соседние миры различаются светлотой, плитки/таблетка/карточки диалогов ≥ 4,5 (значки ≥ 3).
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';
import { flattenOver } from '../constants/liquidGlassSurfaceRoles';
import { homeSceneOklchOf } from '../components/home/v2/scene/home_scene_tokens';
import { hexHue } from '../components/learning-v2/season/season_art';
import { DIALOGS_WORLD_TONES, dialogsHubTokens, dialogsWorldArt } from '../components/dialogs/scene/dialogs_hub_tokens';

const rgbOf = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const hueGap = (a: number, b: number): number => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

describe('Хаб Диалогов: токены в оттенках текущей темы', () => {
  it('миры: белый текст ≥ 4,5, оттенок = оттенку темы, соседние миры различаются светлотой', () => {
    const misses: string[] = [];
    for (const appearance of ['light', 'dark'] as const) {
      for (const id of LIQUID_GLASS_THEME_IDS) {
        for (const level of ['calm', 'accent', 'max'] as const) {
          const g = liquidGlassTokens(id, { level, appearance } as never);
          const hue = hexHue(g.accent);
          const tag = `${appearance}/${id}/${level}`;
          for (let w = 0; w < DIALOGS_WORLD_TONES.length; w += 1) {
            const art = dialogsWorldArt(hue, w, appearance);
            expect(dialogsWorldArt(hue, w, appearance)).toBe(art);
            for (const stop of [art.from, art.to]) {
              if (contrastRatio('#FFFFFF', stop) < 4.5) misses.push(`${tag} мир ${w}: белый на ${stop} ${contrastRatio('#FFFFFF', stop).toFixed(2)}`);
            }
            const [, C, H] = homeSceneOklchOf(rgbOf(art.from));
            if (C > 0.04 && hueGap(H, hue) > 8) misses.push(`${tag} мир ${w}: оттенок ${Math.round(H)}° против ${Math.round(hue)}°`);
            if (w > 0) {
              const dl = Math.abs(homeSceneOklchOf(rgbOf(art.from))[0] - homeSceneOklchOf(rgbOf(dialogsWorldArt(hue, w - 1, appearance).from))[0]);
              if (dl < 0.03) misses.push(`${tag} миры ${w - 1}/${w}: ΔL ${dl.toFixed(3)}`);
            }
          }
        }
      }
    }
    expect(misses.slice(0, 10)).toEqual([]);
  });

  it('плитки, значок Plus, таблетка и карточки диалогов читаются во всех темах', () => {
    const misses: string[] = [];
    for (const appearance of ['light', 'dark'] as const) {
      for (const id of LIQUID_GLASS_THEME_IDS) {
        for (const level of ['calm', 'accent', 'max'] as const) {
          const g = liquidGlassTokens(id, { level, appearance } as never);
          const t = dialogsHubTokens(g);
          const tag = `${appearance}/${id}/${level}`;
          const check = (name: string, fg: string, bg: string, need: number): void => {
            const r = contrastRatio(fg, bg);
            if (r < need) misses.push(`${tag} · ${name}: ${r.toFixed(2)} < ${need}`);
          };
          check('плитка: подпись', t.tile.label, t.tile.bg, 4.5);
          check('плитка: значок', t.tile.icon, t.tile.bg, 3);
          check('плитка: счётчик', t.tile.count, t.tile.bg, 4.5);
          check('Plus: чернила на заливке', t.plus.ink, t.plus.bg, 4.5);
          check('таблетка: неактивный пункт', t.pill.idleInk, t.pill.track, 4.5);
          check('таблетка: выбранный пункт', t.pill.selectedInk, t.pill.selectedBg, 4.5);
          check('таблетка: выбранный на дорожке (форма)', t.pill.selectedBg, t.pill.track, 3);
          for (const [name, fill] of [['обычная', t.card.fill], ['текущая', t.card.fillCurrent]] as const) {
            check(`карточка ${name}: название`, t.card.title, fill, 4.5);
            check(`карточка ${name}: подпись`, t.card.sub, fill, 4.5);
            check(`карточка ${name}: «пройдено»`, t.card.doneInk, fill, 4.5);
            check(`карточка ${name}: значок`, t.card.icon, fill, 3);
          }
          check('чип уровня', t.card.levelInk, t.card.levelBg, 4.5);
        }
      }
    }
    expect(misses.slice(0, 10)).toEqual([]);
  });

  // зачем (v4, координатор 22.10): макет dialogs-hub-v4.html — дорожка миров, рельс переключателя, компактные строки темы (замок / ✓ / ранг), шапка экрана, заметка.
  // Текст ≥ 4,5; значки и формы ≥ 3; дорожка различима: заливка к дорожке ≥ 3, дорожка отличима от плитки/фона (мера записана в таблице токенов).
  it('v4: дорожка, рельс, строки темы, шапка и заметка читаются во всех темах × оформлениях × уровнях', () => {
    const misses: string[] = [];
    let minTrackOnTile = 99;
    let minTrackOnBg = 99;
    for (const appearance of ['light', 'dark'] as const) {
      for (const id of LIQUID_GLASS_THEME_IDS) {
        for (const level of ['calm', 'accent', 'max'] as const) {
          const g = liquidGlassTokens(id, { level, appearance } as never);
          const t = dialogsHubTokens(g);
          const tag = `${appearance}/${id}/${level}`;
          const check = (name: string, fg: string, bg: string, need: number): void => {
            const r = contrastRatio(fg, bg);
            if (r < need) misses.push(`${tag} · ${name}: ${r.toFixed(2)} < ${need}`);
          };
          const trackOnTile = flattenOver(t.worldTile.track, t.tile.bg);
          check('плитка мира: заливка дорожки к дорожке', t.worldTile.fill, trackOnTile, 3);
          check('плитка мира: заливка дорожки к плитке', t.worldTile.fill, t.tile.bg, 3);
          minTrackOnTile = Math.min(minTrackOnTile, contrastRatio(trackOnTile, t.tile.bg));
          const railOnBg = flattenOver(t.rail.track, g.bg);
          check('рельс: метка к рельсу', t.rail.marker, railOnBg, 3);
          minTrackOnBg = Math.min(minTrackOnBg, contrastRatio(railOnBg, g.bg));
          for (const [name, fill, title, sub, icon, iconBg, state, levelInk, levelBg] of [
            ['строка', t.row.fill, t.row.title, t.row.sub, t.row.icon, t.row.iconBg, t.row.stateIdle, t.row.levelInk, t.row.levelBg],
            ['строка закрыта', t.row.lockedFill, t.row.lockedTitle, t.row.lockedSub, t.row.lockedIcon, t.row.iconBg, t.row.lockedState, t.row.lockedLevelInk, t.row.lockedLevelBg],
          ] as const) {
            check(`${name}: название`, title, fill, 4.5);
            check(`${name}: подпись`, sub, fill, 4.5);
            check(`${name}: значок на плашке`, icon, iconBg, 3);
            check(`${name}: состояние (замок / стрелка)`, state, fill, 3);
            check(`${name}: чип ранга`, levelInk, levelBg, 4.5);
          }
          check('строка: «пройдено»', t.row.stateDone, t.row.fill, 3);
          check('шапка: подзаголовок', t.head.kicker, g.bg, 4.5);
          check('шапка: название', t.head.title, g.bg, 4.5);
          check('шапка: счётчик', t.head.count, g.bg, 4.5);
          check('шапка: «из N»', t.head.countOf, g.bg, 4.5);
          check('заметка: заголовок', t.note.title, t.note.fill, 4.5);
          check('заметка: текст', t.note.body, t.note.fill, 4.5);
          check('заметка: значок', t.note.icon, t.note.fill, 3);
          check('заметка: значок призыва', t.note.iconCta, t.note.fill, 3);
          if (t.fade !== g.bg) misses.push(`${tag} · затухание не равно фону темы`);
        }
      }
    }
    console.log(`[DIALOGS-HUB-V4] мин. видимость дорожки: на плитке ${minTrackOnTile.toFixed(3)}, на фоне ${minTrackOnBg.toFixed(3)}`); // guard-ok: мера для таблицы токенов
    expect(misses.slice(0, 12)).toEqual([]);
    // пустая часть дорожки — тонкая «hair» макета (текст 7 %): отличима от плитки/фона не ниже замеренного (1,14 / 1,12); тоньше делать нельзя
    expect(minTrackOnTile).toBeGreaterThanOrEqual(1.1);
    expect(minTrackOnBg).toBeGreaterThanOrEqual(1.1);
  });
});
