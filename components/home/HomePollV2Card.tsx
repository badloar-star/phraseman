import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useHomePollV2 } from '../../hooks/use_home_poll_v2';
import { hapticTap } from '../../hooks/use-haptics';
import { triLang, type Lang } from '../../constants/i18n';
import { V2, V2_TYPE } from '../../constants/v2Style';
import V2Pressable from '../v2/V2Pressable';
import { useV2Palette } from '../v2/useV2Palette';
import { useHomePlateStyle } from './v2/homePlate';

type Props = Readonly<{ lang: Lang; active?: boolean }>;

export default function HomePollV2Card({ lang, active = true }: Props) {
  const model = useHomePollV2({ lang, active });
  const p = useV2Palette();
  const plate = useHomePlateStyle(true);

  useEffect(() => {
    if (model.phase !== 'thanks') return undefined;
    const timer = setTimeout(model.dismiss, 1_400);
    return () => clearTimeout(timer);
  }, [model.dismiss, model.phase]);

  if (model.phase === 'hidden') return null;

  const copy = {
    poll: triLang(lang, { ru: 'ОПРОС', uk: 'ОПИТУВАННЯ', en: 'POLL', es: 'ENCUESTA', 'pt-BR': 'ENQUETE', vi: 'KHẢO SÁT', id: 'JAJAK PENDAPAT', tr: 'ANKET', pl: 'ANKIETA' }),
    next: triLang(lang, { ru: 'Дальше', uk: 'Далі', en: 'Next', es: 'Siguiente', 'pt-BR': 'Próximo', vi: 'Tiếp', id: 'Lanjut', tr: 'İleri', pl: 'Dalej' }),
    done: triLang(lang, { ru: 'Готово', uk: 'Готово', en: 'Done', es: 'Listo', 'pt-BR': 'Concluir', vi: 'Xong', id: 'Selesai', tr: 'Bitti', pl: 'Gotowe' }),
    thanks: triLang(lang, { ru: 'Спасибо за ответ!', uk: 'Дякуємо за відповідь!', en: 'Thanks for answering!', es: '¡Gracias por responder!', 'pt-BR': 'Obrigado por responder!', vi: 'Cảm ơn bạn!', id: 'Terima kasih!', tr: 'Teşekkürler!', pl: 'Dziękujemy!' }),
    queued: triLang(lang, { ru: 'Отправим, когда появится связь', uk: 'Надішлемо, коли з’явиться зв’язок', en: 'We’ll send it when you’re online', es: 'Lo enviaremos cuando vuelvas a tener conexión', 'pt-BR': 'Enviaremos quando houver conexão', vi: 'Sẽ gửi khi có mạng', id: 'Akan dikirim saat online', tr: 'Bağlantı gelince göndereceğiz', pl: 'Wyślemy po odzyskaniu połączenia' }),
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
                style={[styles.option, { borderColor: option.selected ? p.iconTint : p.textMuted }]}
              >
                {model.phase === 'result' && option.percent !== null ? (
                  <View style={[styles.fill, { width: `${option.percent}%`, backgroundColor: p.iconTint }]} />
                ) : null}
                <Text style={[styles.optionText, { color: p.text }]}>{option.label}</Text>
                {model.phase === 'result' ? <Text style={[styles.percent, { color: p.textSecondary }]}>{option.percent ?? 0}%</Text> : null}
              </V2Pressable>
            ))}
          </View>
          {model.phase === 'sending' ? <Text style={[styles.status, { color: p.textSecondary }]}>{copy.queued}</Text> : null}
          {model.phase === 'result' ? (
            <View style={styles.footer}>
              <Text style={[styles.votes, { color: p.textSecondary }]}>{model.voteCount ?? 0}</Text>
              <V2Pressable accessibilityRole="button" onPress={model.next} scaleTo={0.98} style={[styles.next, { backgroundColor: p.iconTint }]}> 
                <Text style={[styles.nextText, { color: p.card }]}>{model.isLastQuestion ? copy.done : copy.next}</Text>
              </V2Pressable>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 6, padding: 18, borderRadius: V2.radius.card, gap: 14, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { ...V2_TYPE.overline, fontSize: 12, lineHeight: 16, letterSpacing: 1.3 },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  question: { fontSize: 21, lineHeight: 27, fontWeight: '800' },
  options: { gap: 10 },
  option: { minHeight: 50, borderWidth: 1, borderRadius: V2.radius.row, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, opacity: 0.16 },
  optionText: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  percent: { marginLeft: 10, fontSize: 14, lineHeight: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  status: { fontSize: 12, lineHeight: 16, textAlign: 'center' },
  footer: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  votes: { fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] },
  next: { minHeight: 44, minWidth: 116, borderRadius: 22, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  nextText: { fontSize: 15, lineHeight: 19, fontWeight: '800' },
  thanks: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 12 },
  thanksMark: { fontSize: 34, lineHeight: 38, fontWeight: '900' },
  thanksText: { fontSize: 20, lineHeight: 26, fontWeight: '800', textAlign: 'center' },
});
