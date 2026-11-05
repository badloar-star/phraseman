// ClassicPlainTheoryScreen — экран «Теория» урока в новом формате «как для ребёнка» (Теория 12, 05.11): тонкая обёртка над общим TheoryLessonView.
// зачем: один и тот же экран для английского курса (через /hint) и для fr/es/de/it (через /lesson_help); прогресс разделов и заданий — по языку курса.
import React from 'react';
import { useRouter } from 'expo-router';

import TheoryLessonView from './TheoryLessonView';
import type { ClassicTheoryView } from '../../app/classic_theory_view';
import { safeRouterBack } from '../../app/navigation_back';
import { lessonTheorySectionsSeenKey, storageStudyTarget, type RuntimeStudyTarget } from '../../app/target_storage_keys';

type Props = Readonly<{ lessonId: number; studyTarget: RuntimeStudyTarget | undefined; view: ClassicTheoryView }>;

export default function ClassicPlainTheoryScreen({ lessonId, studyTarget, view }: Props) {
  const router = useRouter();
  const target = storageStudyTarget(studyTarget);
  const progressKey = React.useMemo(() => lessonTheorySectionsSeenKey(lessonId, studyTarget), [lessonId, studyTarget]);
  const goBack = React.useCallback(
    () => safeRouterBack(router, { pathname: '/lesson_menu', params: { id: String(lessonId) } } as never),
    [router, lessonId],
  );
  return (
    <TheoryLessonView
      lessonId={lessonId}
      title={view.title}
      sections={view.sections}
      metrics={view.metrics}
      progressStorageKey={progressKey}
      onBack={goBack}
      level={null}
      reportDataId={`classic_theory_${target}_${lessonId}`}
    />
  );
}
