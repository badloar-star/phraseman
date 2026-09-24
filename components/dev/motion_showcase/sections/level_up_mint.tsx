// ─── Витрина движения · шард «Повышение уровня 2.0» ───
// зачем (владелец 2026-09-24, D49, PM-077): утверждённый вариант B «Монетный двор»
// перенесён в приложение как настоящий компонент, но само повышение ранга (PM-075)
// ещё не написано — показать его на телефоне можно только отсюда. Три пары уровней
// дают три металла (медь, золото, биметалл «Эталона»). Ничего не списывается и не
// пишется на диск: onDone только закрывает превью. id содержит "hybrid" — иначе
// реестр витрины (index.ts → isExecutableHybridItem) пункт не покажет.
// Названия уровней — из COIN_RANKS.md (статус «предложение, ждёт да владельца»).
import React from 'react';
import type { ShowcaseSection } from '../types';
import LevelUpMintCeremony from '../../../level_up/LevelUpMintCeremony';
import { coinMetalForRank } from '../../../level_up/coin_metal_palette';
import { cs } from '../showcase_copy';

type NameKey = 'level_up_name_0' | 'level_up_name_1' | 'level_up_name_8' | 'level_up_name_9' | 'level_up_name_19' | 'level_up_name_20';

const side = (level: number, nameKey: NameKey) => ({ level, name: cs(nameKey), metal: coinMetalForRank(level) });

const PAIRS = [
  { id: 'level_up_mint_hybrid_0_1', title: cs('level_up_mint_0_1'), from: side(0, 'level_up_name_0'), to: side(1, 'level_up_name_1') },
  { id: 'level_up_mint_hybrid_8_9', title: cs('level_up_mint_8_9'), from: side(8, 'level_up_name_8'), to: side(9, 'level_up_name_9') },
  { id: 'level_up_mint_hybrid_19_20', title: cs('level_up_mint_19_20'), from: side(19, 'level_up_name_19'), to: side(20, 'level_up_name_20') },
] as const;

export const SECTION: ShowcaseSection = {
  id: 'level_up_mint',
  order: 9,
  title: cs('level_up_mint_section_title'),
  items: PAIRS.map((p) => ({
    id: p.id,
    title: p.title,
    detail: cs('level_up_mint_detail'),
    approval: 'accepted' as const,
    kind: 'render' as const,
    render: ({ visible, onClose }) => <LevelUpMintCeremony visible={visible} from={p.from} to={p.to} onDone={onClose} />,
  })),
};
