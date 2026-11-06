// VideoRewardProgress.tsx — строка под плеером: «+500 (монета ранга) · 42 %» и тонкая полоска до награды; на 100 % — «Засчитано».
// зачем (владелец 06.11 через координатора, TestFlight 150): человек видит, сколько осталось до +500 за просмотр. Цвета только из темы (передаёт экран), без обводок;
// проценты приходят уже не чаще раза в секунду (детектор), сама строка перерисовывается только при смене процента (memo) — плеер не трогаем.
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MyRankCoin from '../rank/MyRankCoin';
import { VIDEO_FULL_REWARD_COINS } from '../../app/video_full_reward';

export type VideoRewardProgressColors = Readonly<{ text: string; secondary: string; track: string; fill: string }>;

type Props = Readonly<{ percent: number; doneLabel: string; progressLabel: string; colors: VideoRewardProgressColors }>;

function VideoRewardProgressImpl({ percent, doneLabel, progressLabel, colors }: Props): React.JSX.Element {
  const done = percent >= 100;
  return (
    <View testID="video-reward-progress" accessibilityRole="progressbar" accessibilityLabel={`${progressLabel}: ${done ? doneLabel : `${percent} %`}`} accessibilityValue={{ min: 0, max: 100, now: percent }} style={styles.wrap}>
      <View style={styles.row}>
        <Text style={[styles.amount, { color: colors.text }]}>{`+${VIDEO_FULL_REWARD_COINS}`}</Text>
        <MyRankCoin size={18} style={styles.coin} />
        <Text style={[styles.value, { color: done ? colors.text : colors.secondary }]}>{done ? `· ${doneLabel}` : `· ${percent} %`}</Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.track }]} pointerEvents="none">
        <View style={[styles.fill, { width: `${percent}%`, backgroundColor: colors.fill }]} />
      </View>
    </View>
  );
}

export const VideoRewardProgress = memo(VideoRewardProgressImpl);

const styles = StyleSheet.create({
  wrap: { marginTop: 12, marginHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center' },
  amount: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  coin: { width: 18, height: 18, marginLeft: 4 },
  value: { marginLeft: 6, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  track: { height: 3, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  fill: { height: 3, borderRadius: 2 },
});

export default function __VideoRewardProgressRouteShim() {
  return null;
}
