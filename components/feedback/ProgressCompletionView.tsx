import React from 'react';

import type { ProgressCompletionModel } from '../../app/completion/progress_completion_model';
import { ResultsSequence } from './ResultsSequence';

type Props = {
  model: ProgressCompletionModel;
  badge?: React.ReactNode;
  stars?: number;
  xp?: number;
  subtitle?: string;
  onAction: (id: string) => void;
};

export default function ProgressCompletionView({ model, badge, stars = 0, xp = 0, subtitle, onAction }: Props) {
  return (
    <ResultsSequence
      stars={stars}
      xp={xp}
      title={model.fact}
      subtitle={subtitle ?? `${model.accumulated}\n${model.nextStep}`}
      badge={badge}
      intensity={model.level}
      ctaPrimaryLabel={model.primaryAction.label}
      onCtaPrimary={() => onAction(model.primaryAction.id)}
      ctaSecondaryLabel={model.secondaryAction?.label}
      onCtaSecondary={model.secondaryAction ? () => onAction(model.secondaryAction!.id) : undefined}
    />
  );
}
