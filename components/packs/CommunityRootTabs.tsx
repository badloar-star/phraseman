import React from 'react';
import { MAIN_TABS } from '../../constants/mainTabs';
import { triLang, type Lang } from '../../constants/i18n';
import { useStudyTarget } from '../StudyTargetContext';
import { isLearnTabVisibleForTarget } from '../../app/learning_language_surface_readiness';
import { isLogicalTabHidden, tabPageLayoutFor } from '../../app/tab_page_model';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import V2TabBar from '../v2/V2TabBar';
import { isSurfaceLocked, useRankAccess } from '../../hooks/use_rank_access';
import { tabPillBottomOffset } from '../v2/tab_bar_geometry';

export function CommunityRootTabs({ lang, bottomInset, onSelectRoute }: Readonly<{
  lang: Lang; bottomInset: number; onSelectRoute: (route: string) => void;
}>): React.JSX.Element {
  const { studyTarget } = useStudyTarget();
  const reduceMotion = useReduceMotion();
  const videoTabVisible = !isSurfaceLocked(useRankAccess('video')); // зачем (владелец 30.10): тот же таббар, что в _layout, — «Видео» скрыта до ранга 1
  const layout = tabPageLayoutFor({ learnTabVisible: isLearnTabVisibleForTarget(studyTarget), videoTabVisible });
  const tabs = MAIN_TABS.filter((_, index) => !isLogicalTabHidden(index, layout));
  const items = tabs.map(tab => ({ key: tab.key, icon: tab.icon, activeIcon: tab.active, label: triLang(lang, tab.label) ?? tab.label.ru }));
  return <V2TabBar items={items} activeIndex={tabs.findIndex(tab => tab.key === 'community')}
    bottomOffset={tabPillBottomOffset(bottomInset)} reduceMotion={reduceMotion}
    onSelect={index => { const tab = tabs[index]; if (tab) onSelectRoute(`/(tabs)/${tab.key}`); }} />;
}
