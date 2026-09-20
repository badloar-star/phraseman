import React from 'react';
import { ArenaHubSurface } from '../../components/arena/ArenaHubSurface';
import { useTabNav } from '../TabContext';
import { useStudyTarget } from '../../components/StudyTargetContext';

export default function ArenaTabRoute() {
  const { runtimeOwnerId } = useTabNav();
  const { studyTarget } = useStudyTarget();
  return <ArenaHubSurface key={studyTarget} studyTarget={studyTarget} ownerVisible={runtimeOwnerId === 'arena'} />;
}
