// ═══════════════════════════════════════════════════════════════════════════
// SpireTowerRivals.tsx — соперники слева от этажей башни Пика: монеты ранга внахлёст и «+N».
//
// зачем (координатор 22.10: сторож «каждый файл Пика ≤ 400 строк» — SpireTower был 447): слой соперников перенесён из SpireTower
// дословно, поведение то же — на «Сцене» монеты нажимаются (карточка игрока), «+N» открывает «Все участники», ряды считает сетка
// spire_scene_layout; в прежнем окне — значок без касаний.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import V2Pressable from '../v2/V2Pressable';
import SpireRankCoin from './SpireRankCoin';
import { spireSceneRivalsFit, spireSceneRowHalf } from './scene/spire_scene_layout';
import { SPIRE_TOWER_GEOM, type SpireRival } from './spire_tower_model';
import { useSpirePalette } from './useSpirePalette';

const RIVAL = 22;
const RIVAL_STEP = 13;
const RIVAL_SHOWN = 2;
const RIVAL_GAP = 10;
/** Шрифт от этого множителя: у башни одна монета и «+N» — слева от этажа помещаются подпись этажа, монеты и счётчик (Макеты 15.10: «+20» заходил на кладку). */
export const RIVAL_BIG_FONT = 1.15;

/**
 * Соперники слева от этажа (floorSvg макета): до двух кружков внахлёст и «+N».
 * зачем: монета ранга участника (владелец 13.10), неизвестный ранг — базовая монета, не буква. Слой RN поверх SVG, без касаний (тап по этажу проходит насквозь).
 */
/** Наименьшая зона касания монеты соперника и «+N» на «Сцене» (монета ~12 dp), dp. */
const RIVAL_TAP = 44;

// зачем (владелец 22.10: «аватарки нажимались»): на «Сцене» монета соперника — кнопка с зоной касания не меньше 44, без «Сцены» — прежний значок
const RivalCoin = memo(function RivalCoin({ m, size, marginLeft, onPress }: Readonly<{ m: SpireRival; size: number; marginLeft: number; onPress?: (uid: string) => void }>) {
  // зачем (ЗАМОК ВЛАДЕЛЬЦА 25.10: «убери обводки фиолетовые вокруг монеток на башне! Пик»): монеты соперников на башне — без кольца Plus
  // во всех темах (как своя метка, SpireTowerMarker). Plus по-прежнему виден в списках и на пьедестале. Сторож — tests/owner_locks_tower_coins_2026_10_25.test.ts
  const coin = <SpireRankCoin rank={m.coinRank} size={size} plus={false} />;
  if (!onPress) return <View style={{ marginLeft }}>{coin}</View>;
  return (
    <V2Pressable outerStyle={{ marginLeft }} hitSlop={Math.max(0, Math.ceil((RIVAL_TAP - size) / 2))} scaleTo={0.9} onPress={() => onPress(m.uid)} accessibilityRole="button" accessibilityLabel={m.name}>
      {coin}
    </V2Pressable>
  );
});

const RivalsLayer = memo(function RivalsLayer({ rivals, scale, dim, renderWidth, singleCoin, extraColor, sceneFit, hiddenBelow = 0, onPressRival, onPressMore }: Readonly<{ onPressRival?: (uid: string) => void; onPressMore?: () => void; extraColor?: string; rivals: ReadonlyMap<number, readonly SpireRival[]>; scale: number; dim: boolean; renderWidth: number; singleCoin: boolean; sceneFit?: Readonly<{ fontScale: number; guardChars: number }>; hiddenBelow?: number }>) {
  const p = useSpirePalette();
  const rowHalf = sceneFit ? spireSceneRowHalf(scale, sceneFit.fontScale) : 0;
  const items: React.ReactNode[] = [];
  for (const fl of SPIRE_TOWER_GEOM.floors) {
    const list = rivals.get(fl.f);
    if (!list || list.length === 0) continue;
    if (fl.f <= hiddenBelow) continue; // зачем (Пик v2, координатор 22.10: «сетка без пересечений»): ряды ниже монет пьедестала не рисуются
    const shown = Math.min(list.length, singleCoin ? 1 : RIVAL_SHOWN);
    // зачем (координатор 22.10: «нижние этажи перекрыты монетами жителей»): на «Сцене» монет столько, сколько влезает между подписью и башней
    const fit = sceneFit ? spireSceneRivalsFit({ floor: fl.f, count: list.length, scale, fontScale: sceneFit.fontScale, guardChars: sceneFit.guardChars }) : null;
    const coins = fit ? fit.coins : shown;
    const extra = fit ? fit.extra : list.length - shown;
    const top = (fl.y + fl.h / 2 - RIVAL / 2) * scale;
    // зачем (Макеты 15.10, кадры v3_p8_fs10/v2_p8_fs13: «+20» заходил на тело башни): ряд (монеты + «+N») привязан ПРАВЫМ краем в 10 единицах левее тела этажа, а не левым с запасом 22 на текст, —
    // ширина «+N» берётся настоящая (и растёт со шрифтом), налезть на кладку она не может.
    items.push(
      <View key={`rivals-${fl.f}`} pointerEvents={onPressRival ? 'box-none' : undefined} style={[s.rivals, { right: renderWidth - (fl.x0 - RIVAL_GAP) * scale, top, opacity: dim ? 0.55 : 1 }, fit ? { right: renderWidth - fit.rightX, top: (fl.y + fl.h / 2) * scale - rowHalf, height: rowHalf * 2 } : null]}>
        {list.slice(0, coins).map((m, k) => (
          <RivalCoin key={m.uid} m={m} size={RIVAL * scale} marginLeft={k === 0 ? 0 : (RIVAL_STEP - RIVAL) * scale} onPress={onPressRival} />
        ))}
        {extra > 0 ? (onPressMore ? (
          <V2Pressable hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }} scaleTo={0.92} onPress={onPressMore} accessibilityRole="button" accessibilityLabel={`+${extra}`}>
            <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[s.rivalExtra, { color: extraColor ?? p.textSecondary }, fit ? (coins > 0 ? s.rivalExtraScene : s.rivalExtraSceneSolo) : null]}>{`+${extra}`}</Text>
          </V2Pressable>
        ) : <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[s.rivalExtra, { color: extraColor ?? p.textSecondary }, fit ? (coins > 0 ? s.rivalExtraScene : s.rivalExtraSceneSolo) : null]}>{`+${extra}`}</Text>) : null}
      </View>,
    );
  }
  return <>{items}</>;
});

export default RivalsLayer;

const s = StyleSheet.create({
  rivals: { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
  rivalExtra: { marginLeft: 5, fontSize: 13, fontWeight: '700' },
  // «Сцена»: строка 17 — по ней считается сетка (spire_scene_layout); без монет «+N» стоит без отступа слева
  rivalExtraScene: { lineHeight: 17 },
  rivalExtraSceneSolo: { marginLeft: 0, lineHeight: 17 },
});
