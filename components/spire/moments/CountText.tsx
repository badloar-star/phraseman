// CountText.tsx — число, которое «досчитывается» до цели (монеты за этаж, время шага).
// зачем (координатор 15.10, аудит скорости окон моментов; UX-приятности 04.11): сначала счётчик жил в родителе (setInterval 40 мс → setState, окно
// перерисовывалось ~25 раз/с), потом в самом CountText (всё равно JS в кадрах); теперь число рисует UI-поток (AnimatedCountUpText: TextInput +
// useAnimatedProps), JS в кадрах ноль. Кривая прежняя: 1 − (1 − t)³. reduceMotion — сразу финальное число. Формат — описание (префикс, «м:сс»), не функция.
// Ширину держит скрытый Text с ФИНАЛЬНЫМ числом: TextInput не пересчитывает раскладку, пока цифры меняются на UI-потоке, — без этого «+120» обрезалось бы по ширине «+0».
import React, { memo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { AnimatedCountUpText } from '../../AnimatedCountUpText';
import { formatCountValue, type CountFormat } from '../../count_format';

export type CountTextProps = Readonly<{
  to: number;
  /** Через сколько мс после показа начать счёт (как метка сценария в родителе). */
  delayMs: number;
  durationMs: number;
  reduceMotion: boolean;
  /** Описание формата: `{ prefix: '+' }` для монет, `{ clock: true }` для времени шага (значение — мс). */
  format: CountFormat;
  style?: StyleProp<TextStyle>;
  testID?: string;
}>;

function CountText({ to, delayMs, durationMs, reduceMotion, format, style, testID }: CountTextProps) {
  return (
    <View>
      <Text style={[style, styles.sizer]} accessible={false} importantForAccessibility="no-hide-descendants">{formatCountValue(to, format)}</Text>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <AnimatedCountUpText
          value={to}
          delayMs={delayMs}
          durationMs={durationMs}
          format={format}
          easeOut
          reduceMotion={reduceMotion}
          style={style}
          testID={testID}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sizer: { opacity: 0 },
});

export default memo(CountText);
