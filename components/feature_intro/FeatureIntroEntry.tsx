import React from 'react';
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
  if (!def) return null;
  return <FeatureIntroModal visible={intro.visible && active} icon={def.icon} family={def.family} art={def.art}
    title={def.title(lang)} body={def.body(lang)} ctaLabel={def.ctaLabel(lang)} laterLabel={featureIntroClose(lang)}
    onDone={() => intro.dismiss(true)} onLater={() => intro.dismiss(false)} testIdPrefix={id} />;
}
