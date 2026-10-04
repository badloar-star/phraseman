import React, { useEffect } from 'react';
import { featureIntroById } from '../../app/feature_intro_registry';
import { featureIntroClose } from '../../app/feature_intro_copy';
import { useFeatureIntro } from '../../hooks/use_feature_intro';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import { useLang } from '../LangContext';
import FeatureIntroModal from '../FeatureIntroModal';

/** Mount keyed by id: each mode has independent ownership and once-only state. */
export default function FeatureIntroEntry({ id, enabled }: { id: string; enabled: boolean }) {
  const active = useRuntimeActive(enabled);
  const def = featureIntroById(id);
  const intro = useFeatureIntro(id, active && def !== null);
  const { lang } = useLang();
  // зачем (координатор 04.10, «первый тап по «Начать» молчит»): вводное окно режима перекрывает экран и съедает тап — это место
  // раньше молчало. Печатаем, когда окно реально показано / скрыто и почему не показано.
  const shown = intro.visible && active;
  useEffect(() => {
    console.log('[FEATURE-INTRO] entry', JSON.stringify({ id, enabled, active, hasDef: def !== null, introVisible: intro.visible, shown }));
  }, [id, enabled, active, def, intro.visible, shown]);
  if (!def) return null;
  return <FeatureIntroModal visible={intro.visible && active} icon={def.icon} family={def.family} art={def.art}
    title={def.title(lang)} body={def.body(lang)} ctaLabel={def.ctaLabel(lang)} laterLabel={featureIntroClose(lang)}
    onDone={() => intro.dismiss(true)} onLater={() => intro.dismiss(false)} testIdPrefix={id} introId={def.id} />;
}
