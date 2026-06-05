import { useEffect } from 'react';
import type { StudyTargetLang } from '../app/study_target_lang_dev';

export interface MasteryReplayModalProps {
  visible: boolean;
  lessonId: number;
  isPremium?: boolean;
  studyTarget?: StudyTargetLang;
  onClose: () => void;
  onReplayed?: (lessonId: number) => void;
}

export default function MasteryReplayModal({
  visible,
  lessonId,
  onClose,
  onReplayed,
}: MasteryReplayModalProps) {
  useEffect(() => {
    if (!visible) return;
    onReplayed?.(lessonId);
    onClose();
  }, [lessonId, onClose, onReplayed, visible]);

  return null;
}
