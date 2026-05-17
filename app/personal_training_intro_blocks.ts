import type { DiagnosisTraining } from './diagnosis_training_types';

export function getVisibleIntroLearningBlocks(diagnosisTraining: DiagnosisTraining): DiagnosisTraining['introBlocks'] {
  return diagnosisTraining.introBlocks.filter(
    (block) => !('type' in block && block.type === 'diagnosis'),
  );
}
