import React, { type PropsWithChildren } from 'react';

/** Discard all transient state before a different language can be interactive. */
export default function DialogueTargetBoundary({ target, children }: PropsWithChildren<{ target: string }>) {
  return <React.Fragment key={target}>{children}</React.Fragment>;
}
