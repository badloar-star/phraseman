// use_season_list_bottom_pad.ts — нижний отступ списков Сезона с учётом капсулы таббара.
//
// зачем (Ревизор + снимок владельца 25.10: подпись «Сдашь — откроется глава 2…» видна под капсулой таббара): обложка Сезона уже брала
// max(bottomPadding, useTabContentBottomPad()) на странице вкладки (SeasonCourseView), а списки («Все уроки», подвал «Все главы» /
// «Эпизоды главы») — голый bottomPadding, и последний ряд уходил под таббар. На push-экране таббара нет — отступ как дан.
import { useEffect } from 'react';

import { useTabContentBottomPad } from '../../../hooks/use-tab-content-bottom-pad';
import { useIsTabPage } from '../../tab_top_bleed';

export function useSeasonListBottomPad(given: number, screen: string): number {
  const isTabPage = useIsTabPage();
  const tabBottomPad = useTabContentBottomPad();
  const used = isTabPage ? Math.max(given, tabBottomPad) : given;
  useEffect(() => {
    console.log('[SEASON-BOTTOM] список', JSON.stringify({ screen, isTabPage, given, tab: tabBottomPad, used })); // guard-ok: одна строка на смену отступа
  }, [given, isTabPage, screen, tabBottomPad, used]);
  return used;
}
