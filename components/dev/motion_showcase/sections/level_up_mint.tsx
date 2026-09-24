// ─── Витрина движения · шард «Повышение уровня 2.0» ───
// зачем (владелец 2026-09-24, D49, PM-077): утверждённый вариант B «Монетный двор»
// перенесён в приложение как настоящий компонент, но само повышение ранга (PM-075)
// ещё не написано — показать его на телефоне можно только отсюда. Три пары уровней
// дают три металла (медь, серебро, платина). Ничего не списывается и не
// пишется на диск: onDone только закрывает превью. id содержит "hybrid" — иначе
// реестр витрины (index.ts → isExecutableHybridItem) пункт не покажет.
// PM-073: названия, металлы и картинки монет — из единой таблицы рангов
// (app/coin_rank_table_v1.ts) через coinRankMintSide; нумерация 0–19 (D60).
import React from 'react';
import type { ShowcaseSection } from '../types';
import LevelUpMintCeremony from '../../../level_up/LevelUpMintCeremony';
import { coinRankMintSide } from '../../../level_up/coin_rank_mint_side';
import { cs } from '../showcase_copy';

const PAIRS = [
  { id: 'level_up_mint_hybrid_0_1', title: cs('level_up_mint_0_1'), from: coinRankMintSide(0), to: coinRankMintSide(1) },
  { id: 'level_up_mint_hybrid_7_8', title: cs('level_up_mint_7_8'), from: coinRankMintSide(7), to: coinRankMintSide(8) },
  { id: 'level_up_mint_hybrid_18_19', title: cs('level_up_mint_18_19'), from: coinRankMintSide(18), to: coinRankMintSide(19) },
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
