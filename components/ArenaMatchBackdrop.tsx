import React, { memo } from 'react';
import AppArtBackdrop from './AppArtBackdrop';

type ArenaMatchBackdropVariant = 'ready' | 'match';

function ArenaMatchBackdrop({ variant = 'match' }: { variant?: ArenaMatchBackdropVariant }) {
  return <AppArtBackdrop name={variant === 'ready' ? 'arenaReady' : 'arenaMatch'} />;
}

export default memo(ArenaMatchBackdrop);
