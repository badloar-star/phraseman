/**
 * Окно «в этом занятии есть задания с голосом» при старте занятия V2 (решение — app/learning_v2_voice_headsup_v1.ts).
 *
 * зачем (владелец 17.10): Free с остатком голосовых попыток меньше числа голосовых заданий узнаёт об этом ДО первого задания,
 * а не упирается в лимит посреди занятия. Две кнопки: «Попробовать Plus» (пейвол ai_voice_input) и «Начать всё равно».
 * Вёрстка временная — подгоняется под макет Макетов после одобрения владельца; тексты и поведение уже финальные по смыслу.
 */
import React, { memo } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { triLang, type Lang } from '../../constants/i18n';
import { Lv2Cta, lv2CardStyle, useLv2Glass } from './LearningV2Glass';

type Props = Readonly<{
  visible: boolean;
  lang: Lang;
  voiceTasks: number;
  remaining: number;
  onTryPlus: () => void;
  onStartAnyway: () => void;
}>;

const copyFor = (lang: Lang, voiceTasks: number, remaining: number) => triLang(lang, {
  ru: { title: 'В занятии есть задания с голосом', body: `Заданий с голосом: ${voiceTasks}. Попыток на сегодня: ${remaining} — до конца занятия не хватит. С Plus лимита на голос нет.`, plus: 'Попробовать Plus', start: 'Начать всё равно' },
  uk: { title: 'У занятті є завдання з голосом', body: `Завдань із голосом: ${voiceTasks}. Спроб на сьогодні: ${remaining} — до кінця заняття не вистачить. З Plus ліміту на голос немає.`, plus: 'Спробувати Plus', start: 'Почати все одно' },
  en: { title: 'This session has voice tasks', body: `Voice tasks: ${voiceTasks}. Voice attempts left today: ${remaining} — not enough to finish. With Plus there is no voice limit.`, plus: 'Try Plus', start: 'Start anyway' },
  es: { title: 'Esta sesión tiene tareas de voz', body: `Tareas de voz: ${voiceTasks}. Intentos de voz para hoy: ${remaining}: no alcanzan para terminar. Con Plus no hay límite de voz.`, plus: 'Probar Plus', start: 'Empezar igualmente' },
  'pt-BR': { title: 'Esta sessão tem tarefas de voz', body: `Tarefas de voz: ${voiceTasks}. Tentativas de voz hoje: ${remaining} — não dá para terminar. Com o Plus não há limite de voz.`, plus: 'Experimentar o Plus', start: 'Começar mesmo assim' },
  vi: { title: 'Buổi học có bài nói', body: `Bài nói: ${voiceTasks}. Lượt nói còn lại hôm nay: ${remaining} — không đủ để học hết. Với Plus không giới hạn lượt nói.`, plus: 'Dùng thử Plus', start: 'Vẫn bắt đầu' },
  id: { title: 'Sesi ini punya tugas suara', body: `Tugas suara: ${voiceTasks}. Sisa percobaan suara hari ini: ${remaining} — tidak cukup sampai selesai. Dengan Plus, suara tanpa batas.`, plus: 'Coba Plus', start: 'Tetap mulai' },
  tr: { title: 'Bu derste sesli görevler var', body: `Sesli görev: ${voiceTasks}. Bugün kalan ses hakkı: ${remaining} — bitirmeye yetmez. Plus ile ses sınırı yok.`, plus: "Plus'ı dene", start: 'Yine de başla' },
  pl: { title: 'W tej lekcji są zadania głosowe', body: `Zadania głosowe: ${voiceTasks}. Prób głosowych na dziś: ${remaining} — nie wystarczy do końca. Z Plus nie ma limitu głosu.`, plus: 'Wypróbuj Plus', start: 'Zacznij mimo to' },
});

function LearningV2VoiceHeadsupSheet({ visible, lang, voiceTasks, remaining, onTryPlus, onStartAnyway }: Props) {
  const g = useLv2Glass();
  const copy = copyFor(lang, voiceTasks, remaining);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onStartAnyway} statusBarTranslucent>
      <View style={styles.root} testID="learning-v2-voice-headsup">
        <View style={[StyleSheet.absoluteFill, styles.scrim]} />
        <View style={[lv2CardStyle(g, 24), styles.card]}>
          <Text style={[styles.title, { color: g.text }]} maxFontSizeMultiplier={1.4}>{copy.title}</Text>
          <Text style={[styles.body, { color: g.secondary }]} maxFontSizeMultiplier={1.4}>{copy.body}</Text>
          <View style={styles.actions}>
            <Lv2Cta onPress={onTryPlus} testID="learning-v2-voice-headsup-plus">{copy.plus}</Lv2Cta>
            <Lv2Cta ghost onPress={onStartAnyway} testID="learning-v2-voice-headsup-start">{copy.start}</Lv2Cta>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(LearningV2VoiceHeadsupSheet);

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', padding: 16 },
  scrim: { backgroundColor: 'rgba(0,0,0,0.56)' }, // theme-exempt: затемнение под окном чёрное в любой теме
  card: { padding: 22, gap: 10, marginBottom: 12 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22 },
  actions: { marginTop: 10, gap: 10 },
});
