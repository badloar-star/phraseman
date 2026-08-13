import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { PersonalPlanId } from './personal_plan_catalog';

export type PlanArtIconName = ComponentProps<typeof Ionicons>['name'];

export type PersonalPlanArt = {
  planId: PersonalPlanId;
  heroIcon: PlanArtIconName;
  taskIcon: PlanArtIconName;
  ambient: string;
  ambientSoft: string;
  line: string;
  panel: string;
  panelStrong: string;
  heroGradient: [string, string, string];
};

const PLAN_ART: Record<PersonalPlanId, PersonalPlanArt> = {
  voyazh: {
    planId: 'voyazh',
    heroIcon: 'airplane-outline',
    taskIcon: 'map-outline',
    ambient: '#39D7F2',
    ambientSoft: 'rgba(57,215,242,0.18)',
    line: 'rgba(57,215,242,0.46)',
    panel: 'rgba(11,44,54,0.76)',
    panelStrong: 'rgba(17,83,96,0.72)',
    heroGradient: ['#071116', '#0A2430', '#071116'],
  },
  mitap: {
    planId: 'mitap',
    heroIcon: 'videocam-outline',
    taskIcon: 'calendar-outline',
    ambient: '#66A8FF',
    ambientSoft: 'rgba(102,168,255,0.18)',
    line: 'rgba(102,168,255,0.48)',
    panel: 'rgba(12,30,58,0.78)',
    panelStrong: 'rgba(23,70,126,0.70)',
    heroGradient: ['#080F1A', '#102A50', '#070D16'],
  },
  gavan: {
    planId: 'gavan',
    heroIcon: 'key-outline',
    taskIcon: 'home-outline',
    ambient: '#72E6A9',
    ambientSoft: 'rgba(114,230,169,0.18)',
    line: 'rgba(114,230,169,0.46)',
    panel: 'rgba(12,42,28,0.76)',
    panelStrong: 'rgba(28,86,55,0.70)',
    heroGradient: ['#07110C', '#123522', '#080F0B'],
  },
  impuls: {
    planId: 'impuls',
    heroIcon: 'mic-outline',
    taskIcon: 'flash-outline',
    ambient: '#FF735F',
    ambientSoft: 'rgba(255,115,95,0.18)',
    line: 'rgba(255,115,95,0.48)',
    panel: 'rgba(55,18,16,0.78)',
    panelStrong: 'rgba(119,43,33,0.70)',
    heroGradient: ['#150908', '#3A1512', '#0F0707'],
  },
  echo: {
    planId: 'echo',
    heroIcon: 'ear-outline',
    taskIcon: 'pulse-outline',
    ambient: '#9A73FF',
    ambientSoft: 'rgba(154,115,255,0.18)',
    line: 'rgba(154,115,255,0.50)',
    panel: 'rgba(31,18,62,0.78)',
    panelStrong: 'rgba(72,47,138,0.72)',
    heroGradient: ['#0D0818', '#24124C', '#080611'],
  },
};

export function getPersonalPlanArt(planId: PersonalPlanId): PersonalPlanArt {
  return PLAN_ART[planId] ?? PLAN_ART.gavan;
}
