import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { HomePollV2CardModel } from '../../hooks/use_home_poll_v2';
import { hapticTap } from '../../hooks/use-haptics';
import { triLang, type Lang } from '../../constants/i18n';
import { V2, V2_TYPE } from '../../constants/v2Style';
import V2Pressable from '../v2/V2Pressable';
import { useV2Palette } from '../v2/useV2Palette';
import { useHomePlateStyle } from './v2/homePlate';

type Props = Readonly<{ lang: Lang; model: HomePollV2CardModel; onFinished: () => void }>;

export default function HomePollV2Card({ lang, model, onFinished }: Props) {
  const p = useV2Palette();
  const plate = useHomePlateStyle(true);
  const { dismiss, phase } = model;

  useEffect(() => {
    if (phase !== 'thanks') return undefined;
    const timer = setTimeout(() => {
      dismiss();
      onFinished();
    }, 1_400);
    return () => clearTimeout(timer);
  }, [dismiss, onFinished, phase]);

  if (model.phase === 'hidden') return null;

  const copy = {
    poll: triLang(lang, { ru: 'ОПРОС', uk: 'ОПИТУВАННЯ', en: 'POLL', es: 'ENCUESTA', 'pt-BR': 'ENQUETE', vi: 'KHẢO SÁT', id: 'JAJAK PENDAPAT', tr: 'ANKET', pl: 'ANKIETA' }),
    thanks: triLang(lang, { ru: 'Спасибо за ответ!', uk: 'Дякуємо за відповідь!', en: 'Thanks for answering!', es: '¡Gracias por responder!', 'pt-BR': 'Obrigado por responder!', vi: 'Cảm ơn bạn!', id: 'Terima kasih!', tr: 'Teşekkürler!', pl: 'Dziękujemy!' }),
  };

  return (
    <View testID="home-poll-v2-card" style={[styles.card, plate]}>
      {model.phase === 'thanks' ? (
        <View style={styles.thanks} accessibilityLiveRegion="polite">
          <Text style={[styles.thanksMark, { color: p.iconTint }]}>✓</Text>
          <Text style={[styles.thanksText, { color: p.text }]}>{copy.thanks}</Text>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={[styles.eyebrow, { color: p.textSecondary }]}>{copy.poll} · {model.step} / {model.total}</Text>
            <View style={styles.dots} accessibilityElementsHidden>
              {Array.from({ length: model.total }, (_, index) => (
                <View key={index} style={[styles.dot, { backgroundColor: index + 1 === model.step ? p.iconTint : p.textMuted }]} />
              ))}
            </View>
          </View>
          <Text accessibilityRole="header" style={[styles.question, { color: p.text }]}>{model.question}</Text>
          <View style={styles.options}>
            {model.options.map((option) => (
              <V2Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected: option.selected, disabled: model.phase !== 'question' }}
                accessibilityLabel={`${option.label}${option.percent === null ? '' : `, ${option.percent}%`}`}
                disabled={model.phase !== 'question'}
                onPress={() => {
                  hapticTap();
                  model.choose(option.id);
                }}
                scaleTo={0.985}
                // зачем (стиль «Тень», сторож обводок): вариант выделяется тоном, а не рамкой — выбранный в цвете темы.
                style={[styles.option, { backgroundColor: option.selected ? p.accentSoft : p.control }]}
              >
                <Text style={[styles.optionText, { color: p.text }]}>{option.label}</Text>
              </V2Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 6, padding: 18, borderRadius: V2.radius.card, gap: 14, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { ...V2_TYPE.overline, fontSize: 13, lineHeight: 17, letterSpacing: 1.3 },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  question: { fontSize: 21, lineHeight: 27, fontWeight: '800' },
  options: { gap: 10 },
  option: { minHeight: 50, borderRadius: V2.radius.row, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  optionText: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: '700' },
  thanks: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 12 },
  thanksMark: { fontSize: 34, lineHeight: 38, fontWeight: '900' },
  thanksText: { fontSize: 20, lineHeight: 26, fontWeight: '800', textAlign: 'center' },
});
