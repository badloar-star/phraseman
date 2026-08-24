import React from 'react';
import { Redirect } from 'expo-router';

/** Compatibility path for old notifications and saved deep links. */
export default function ArenaSeasonPassCompatibilityRoute() {
  return <Redirect href="/season_pass" />;
}
