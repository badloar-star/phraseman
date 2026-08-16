/**
 * DialogVictoryCelebration — «дорогой» салют финала ИИ-диалога (кнопка «Сделано!»).
 *
 * зачем: владелец принял гибрид «Световод + Чекан» (DialogVictoryCelebrationHybrid)
 * как ЕДИНСТВЕННУЮ реализацию (2026-08-16, project_motion_program.md). Этот
 * файл остаётся точкой входа (импортируется по этому пути из витрины и
 * контрактных тестов) и стал тонкой обёрткой без собственной анимации.
 *
 * Показывать только при честном терминальном исходе 'success' (Plus-ветка) —
 * решение владельца: при выходе на полпути и в пейвол-ветке салюта нет.
 */
import React from 'react';
import type { Lang } from '../constants/i18n';
import type Ionicons from '@expo/vector-icons/Ionicons';
import DialogVictoryCelebrationHybrid from './DialogVictoryCelebrationHybrid';

export type DialogVictoryCelebrationProps = {
  lang: Lang;
  /** Реально начисленный XP; при 0 (повтор сценария, анти-фарм) строка скрыта. */
  xp: number;
  /** Реплик пользователя в диалоге. */
  replies: number;
  goalsMet: number;
  goalsTotal: number;
  /** Иконка-герой салюта (Ionicons). зачем: эмодзи в UI запрещены владельцем. */
  heroIcon?: keyof typeof Ionicons.glyphMap;
  /** Иконка настроения собеседника в карточке метрики (Ionicons). */
  moodIcon?: keyof typeof Ionicons.glyphMap;
  /** CTA «К диалогам». */
  onDone: () => void;
};

export function DialogVictoryCelebration({
  lang,
  xp,
  replies,
  goalsMet,
  goalsTotal,
  heroIcon = 'ribbon',
  moodIcon = 'happy',
  onDone,
}: DialogVictoryCelebrationProps) {
  return (
    <DialogVictoryCelebrationHybrid
      lang={lang}
      xp={xp}
      replies={replies}
      goalsMet={goalsMet}
      goalsTotal={goalsTotal}
      heroIcon={heroIcon}
      moodIcon={moodIcon}
      onDone={onDone}
    />
  );
}

export default DialogVictoryCelebration;
