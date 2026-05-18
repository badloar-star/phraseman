import React from 'react';
import AppArtBackdrop from './AppArtBackdrop';

type ArenaMatchBackdropVariant = 'ready' | 'match';

export default function ArenaMatchBackdrop({ variant = 'match' }: { variant?: ArenaMatchBackdropVariant }) {
  return <AppArtBackdrop name={variant === 'ready' ? 'arenaReady' : 'arenaMatch'} />;
}
