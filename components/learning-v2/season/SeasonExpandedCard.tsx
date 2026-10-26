/** Exam and episode actions use the owner's shared compact modal. */
import React, { memo } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import LearningV2SessionOutcomeSheet from '../../LearningV2SessionOutcomeSheet';
import type { SeasonArt } from './season_art';
type IonName = React.ComponentProps<typeof Ionicons>['name'];

export type SeasonExamPanel = Readonly<{ facts: readonly string[]; energyBadge: boolean; plusLine: string | null }>;

// зачем (эталон chapter-exam-season.html, zoomX): «Позже» — стеклянная кнопка без значка, поэтому значок необязателен
export type SeasonExpandedAction = Readonly<{ label: string; icon?: IonName; onPress: () => void }>;

export type SeasonExpandedCardProps = Readonly<{
  kind: 'episode' | 'exam';
  dark: boolean;
  art: SeasonArt;
  glyph: IonName;
  /** Значок в плитке слева сверху у окна экзамена: трофей (можно сдать), галочка (сдан), часы (пауза). Нет — трофей. */
  sealIcon?: IonName;
  /** Метка в левом верхнем углу: «Эпизод 14» или «Экзамен главы». */
  chipLabel: string;
  /** Справа сверху: «20 заданий». */
  rightLabel: string | null;
  /** Крупная фраза (эпизод) или название экзамена. */
  phrase: string;
  translation: string | null;
  title: string | null;
  words: readonly string[];
  primary: SeasonExpandedAction | null;
  secondary: SeasonExpandedAction | null;
  /** Только у карты экзамена. */
  exam?: SeasonExamPanel | null;
  closeLabel: string;
  onClose: () => void;
  reducedMotion: boolean;
  /** Для журнала [SEASON-LAYOUT]: урок и занятие/глава окна (в вёрстку не влияет). */
  logMeta?: Readonly<{ lesson: number; session: number }>;
}>;


function SeasonExpandedCard(p: SeasonExpandedCardProps) {
  const primary = p.primary ?? p.secondary;
  const message = [p.translation, ...(p.exam?.facts ?? []), p.exam?.plusLine, p.title].filter(Boolean).join('\n');
  return (
    <LearningV2SessionOutcomeSheet
      visible
      lessonOrdinal={p.logMeta?.lesson}
      sessionOrdinal={p.logMeta?.session}
      kicker={p.chipLabel.toUpperCase()}
      icon={p.sealIcon ?? (p.kind === 'exam' ? 'trophy' : 'play')}
      title={p.phrase}
      message={message}
      primaryLabel={primary ? primary.label + (p.primary && p.exam?.energyBadge ? ' ⚡1' : '') : p.closeLabel}
      onPrimaryPress={primary?.onPress ?? p.onClose}
      secondaryLabel={p.primary ? p.secondary?.label ?? null : null}
      onSecondaryPress={p.secondary?.onPress ?? p.onClose}
      onClose={p.onClose}
      closeLabel={p.closeLabel}
    />
  );
}
export default memo(SeasonExpandedCard);
