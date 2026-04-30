import type { RefObject } from 'react';
import Svg from 'react-native-svg';
import { shareCardFromSvgRef } from './shareCardPng';

/** @deprecated use shareCardFromSvgRef; kept for call-site clarity */
export async function shareStreakCardPng(
  svgRef: RefObject<InstanceType<typeof Svg> | null>,
  textFallback: string
): Promise<void> {
  return shareCardFromSvgRef(svgRef, { fileNamePrefix: 'phraseman-streak', textFallback });
}
