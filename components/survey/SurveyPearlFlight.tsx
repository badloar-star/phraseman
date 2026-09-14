import { Image } from 'expo-image';
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Reanimated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { oskolokImageForPackShards } from '../../app/oskolok';
import { SHARD_REWARDS } from '../../app/shards_system';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { soundDirector } from '../../modules/audio/sound_director';
import { useTheme } from '../ThemeContext';

/**
 * Перелёт жемчужины из строки ответа в чип баланса (макет A «Прилив»).
 *
 * зачем (владелец, 2026-09-13): «+1 жемчуг за ответ показать прямо тут». Точки
 * заданы относительно корня шторки; жемчужина летит дугой (квадратичная кривая
 * с подъёмом над обеими точками), в начале проявляется и растёт, в конце
 * сжимается в чип. Двигаются только transform/opacity — UI-поток Reanimated.
 *
 * Анимация КОНЕЧНАЯ (без withRepeat): реестр вечных циклов не затрагивается.
 * Под Reduce Motion полёта нет: onArrive вызывается сразу, чип докручивается.
 */
export interface SurveyFlightPoint {
  x: number;
  y: number;
}

export interface SurveyPearlFlightProps {
  from: SurveyFlightPoint;
  to: SurveyFlightPoint;
  onArrive: () => void;
  testID?: string;
}

export const SURVEY_FLIGHT_MS = 640;
export const SURVEY_FLIGHT_SIZE = 28;
const ARC_LIFT_PX = 70;
const APPEAR_PORTION = 0.16;
const FLIGHT_EASE = Easing.bezier(0.45, 0, 0.2, 1);
const FLIGHT_SOUND_OPTIONS = { scope: 'survey-reward-flight' } as const;

function playLandSound(): void {
  soundDirector.request('pm.reward.rune_flight_land', FLIGHT_SOUND_OPTIONS);
}

export default function SurveyPearlFlight({ from, to, onArrive, testID }: SurveyPearlFlightProps) {
  const { themeMode } = useTheme();
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      onArrive();
      return undefined;
    }
    soundDirector.request('pm.reward.rune_flight_start', FLIGHT_SOUND_OPTIONS);
    progress.value = 0;
    progress.value = withTiming(1, { duration: SURVEY_FLIGHT_MS, easing: FLIGHT_EASE }, (finished) => {
      if (!finished) return;
      scheduleOnRN(playLandSound);
      scheduleOnRN(onArrive);
    });
    return () => cancelAnimation(progress);
    // onArrive намеренно не в зависимостях: перелёт играется один раз за монтирование.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, reduceMotion]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const u = 1 - p;
    const controlY = Math.min(from.y, to.y) - ARC_LIFT_PX;
    const x = u * from.x + p * to.x;
    const y = u * u * from.y + 2 * u * p * controlY + p * p * to.y;
    const appear = Math.min(1, p / APPEAR_PORTION);
    const travel = Math.max(0, (p - APPEAR_PORTION) / (1 - APPEAR_PORTION));
    const scale = p < APPEAR_PORTION ? 0.5 + appear * 0.55 : 1.05 - travel * 0.5;
    const opacity = p < APPEAR_PORTION ? appear : 1 - travel * 0.15;
    return {
      opacity,
      transform: [
        { translateX: x - SURVEY_FLIGHT_SIZE / 2 },
        { translateY: y - SURVEY_FLIGHT_SIZE / 2 },
        { scale },
      ],
    };
  });

  if (reduceMotion) return null;

  return (
    <Reanimated.View pointerEvents="none" testID={testID} style={[styles.pearl, style]}>
      <Image
        source={oskolokImageForPackShards(SHARD_REWARDS.survey_completed, themeMode)}
        style={styles.art}
        contentFit="contain"
        accessible={false}
        importantForAccessibility="no"
      />
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  pearl: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SURVEY_FLIGHT_SIZE,
    height: SURVEY_FLIGHT_SIZE,
    zIndex: 10,
    elevation: 10,
  },
  art: { width: SURVEY_FLIGHT_SIZE, height: SURVEY_FLIGHT_SIZE },
});
