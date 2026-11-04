import React from 'react';
import LingmanVideosScreen from '../lingman_videos';
import RankLockedSection from '../../components/home/v2/RankLockedSection';
import { isSurfaceLocked, useRankAccess } from '../../hooks/use_rank_access';

/** Центральная вкладка «Видео» (2.0, D39): видео канала + вход в наборы из видео. */
export default function VideoTabRoute() {
  // зачем (владелец 30.10, «Главная Free по рангам»): новичку до ранга 1 вместо видео — краткое «откроется с ранга 1» + «К занятиям»;
  // старым и неопределённым всё открыто (use_rank_access)
  const access = useRankAccess('video');
  if (isSurfaceLocked(access) && access.status === 'locked') return <RankLockedSection surface="video" minimumRank={access.minimumRank} />;
  return <LingmanVideosScreen presentation="tab" />;
}
