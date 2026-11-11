import { Redirect } from 'expo-router';
import React, { type ReactNode } from 'react';
import { useVideoSectionPreference } from '../../app/video_section_preference';

export default function VideoSectionGate({ children, inTab = false }: {
  children: ReactNode;
  inTab?: boolean;
}) {
  const enabled = useVideoSectionPreference();
  if (enabled === null) return null;
  if (enabled) return children;
  return inTab ? null : <Redirect href="/(tabs)/home" />;
}
