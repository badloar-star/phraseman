// Governance-ID: TG-BF6A8ECE6C57
import { useEffect, useMemo } from 'react';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useSubscriptionTier } from '../components/plus/use_subscription_tier';
import { isSurfaceLocked, useRankAccess } from '../hooks/use_rank_access';
import { isLearnTabVisibleForTarget } from './learning_language_surface_readiness';
import { decidePlusTab, logPlusTabDecision, type PlusTabDecision } from './plus_tab_visibility';
import { tabPageLayoutFor, type TabPageLayout } from './tab_page_model';
import { useVideoSectionPreference } from './video_section_preference';

/**
 * ОДНА раскладка нижней панели для оболочки вкладок и её копии на экранах поверх вкладок (CommunityRootTabs).
 *
 * зачем (слово владельца 05.11, макет plus_tab_approved): вкладка Plus видна ТОЛЬКО пока в панели 4 иконки и у человека нет подписки;
 * открылась пятая вкладка по рангу или куплен Plus/Ultra — она исчезает сразу, без перезапуска. «Обучение» зависит от готового курса языка,
 * «Видео» — от ранга (use_rank_access); подписка — useSubscriptionTier (тот же источник, что кольцо и метки Plus).
 */
export function useTabPageLayout(): Readonly<{ layout: TabPageLayout; plus: PlusTabDecision; videoSectionEnabled: boolean | null }> {
  const { studyTarget } = useStudyTarget();
  const learnTabVisible = isLearnTabVisibleForTarget(studyTarget);
  const videoSectionEnabled = useVideoSectionPreference();
  const videoAccess = useRankAccess('video');
  const videoTabVisible = videoSectionEnabled === true && !isSurfaceLocked(videoAccess);
  const tier = useSubscriptionTier();
  // зачем: сколько иконок в панели БЕЗ Plus — Главная, Сообщество и Настройки всегда, «Обучение» и «Видео» по условиям
  const baseTabs = 3 + (learnTabVisible ? 1 : 0) + (videoTabVisible ? 1 : 0);
  const plus = useMemo(() => decidePlusTab({ baseTabs, tier }), [baseTabs, tier]);
  useEffect(() => { logPlusTabDecision(plus); }, [plus]);
  const layout = useMemo(
    () => tabPageLayoutFor({ learnTabVisible, videoTabVisible, plusTabVisible: plus.visible }),
    [learnTabVisible, plus.visible, videoTabVisible],
  );
  return { layout, plus, videoSectionEnabled };
}
