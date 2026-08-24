import React from 'react';
import { ArenaHubSurface } from '../../components/arena/ArenaHubSurface';
import { useTabNav } from '../TabContext';

export default function ArenaTabRoute() {
  const { runtimeOwnerId } = useTabNav();
  return <ArenaHubSurface ownerVisible={runtimeOwnerId === 'arena'} />;
}
