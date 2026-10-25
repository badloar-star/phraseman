import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import PressableHybrid from '../PressableHybrid';
import { DIALOG_REPLY_FORMS } from '../DialogQuotaBadge';
import { pluralWord } from '../../constants/plural';
import { triLang, type Lang } from '../../constants/i18n';
import { DialogueGlassCta, dialogueGlassCardStyle, useDialogueGlass } from './glass/DialogueGlassKit';
import { DialogueGlassQuotaPill } from './glass/DialogueGlassSessionParts';

// зачем (владелец 2026-09-30, макет dialogs.html A1/A5/A6, D111): на хабе «Диалоги» Free видит
// МЕСЯЧНЫЙ остаток ответов («на сегодня» из макета заменено на месячный смысл), исчерпан —
// карточка «Plus снимает лимит ответов»; язык без проверенных диалогов — карточка с замком.
// Только вид; данные и переходы решает контейнер каталога.

export function dialogueV2HubCopy(lang: Lang) {
  return Object.freeze({
    quotaA11y: (remaining: number, total: number) => triLang(lang, {
      ru: `В этом месяце осталось\u00A0${remaining}\u00A0из\u00A0${total}\u00A0ответов`, uk: `Цього місяця залишилось\u00A0${remaining}\u00A0з\u00A0${total}\u00A0відповідей`,
      en: `${remaining}\u00A0of\u00A0${total}\u00A0replies left this month`, es: `${remaining === 1 ? 'Queda' : 'Quedan'} ${remaining}\u00A0de\u00A0${total}\u00A0respuestas este mes`,
      'pt-BR': `${remaining === 1 ? 'Resta' : 'Restam'} ${remaining}\u00A0de\u00A0${total}\u00A0respostas este mês`, vi: `Tháng này còn\u00A0${remaining}/${total}\u00A0lượt trả lời`,
      id: `Sisa\u00A0${remaining}\u00A0dari\u00A0${total}\u00A0balasan bulan ini`, tr: `Bu ay\u00A0${total}\u00A0yanıttan\u00A0${remaining}\u00A0kaldı`,
      pl: `W tym miesiącu zostało\u00A0${remaining}\u00A0z\u00A0${total}\u00A0odpowiedzi`, fr: `Il reste\u00A0${remaining}\u00A0réponses sur\u00A0${total}\u00A0ce mois-ci`,
      de: `Diesen Monat noch\u00A0${remaining}\u00A0von\u00A0${total}\u00A0Antworten`,
    }),
    // зачем (Ревизор 3.45): остаток ещё не известен телефону — диктор называет месячный лимит, а не выдуманный остаток.
    quotaUnknownA11y: (total: number) => triLang(lang, {
      // зачем (переводчик 18.10): та же фраза, что aiDialogMonthlyLimitText, со склонением по числу для ru/uk/pl
      ru: `Лимит — ${total} ${pluralWord('ru', total, DIALOG_REPLY_FORMS.ru)} в месяц`, uk: `Ліміт — ${total} ${pluralWord('uk', total, DIALOG_REPLY_FORMS.uk)} на місяць`,
      en: `Limit:\u00A0${total} ${pluralWord('en', total, DIALOG_REPLY_FORMS.en)} a month`, es: `Límite:\u00A0${total}\u00A0respuestas al mes`,
      'pt-BR': `Limite:\u00A0${total}\u00A0respostas por mês`, vi: `Giới hạn:\u00A0${total}\u00A0lượt trả lời mỗi tháng`,
      id: `Batas:\u00A0${total}\u00A0balasan per bulan`, tr: `Sınır: ayda\u00A0${total}\u00A0yanıt`,
      pl: `Limit:\u00A0${total} ${pluralWord('pl', total, DIALOG_REPLY_FORMS.pl)} miesięcznie`, fr: `Limite : ${total}\u00A0réponses par mois`,
      de: `Limit:\u00A0${total}\u00A0Antworten pro Monat`,
    }),
    exhaustedTitle: triLang(lang, { ru: 'Plus снимает лимит ответов', uk: 'Plus знімає ліміт відповідей', en: 'Plus removes the reply limit', es: 'Plus quita el límite de respuestas', 'pt-BR': 'O Plus remove o limite de respostas', vi: 'Plus bỏ giới hạn lượt trả lời', id: 'Plus menghapus batas balasan', tr: 'Plus yanıt sınırını kaldırır', pl: 'Plus znosi limit odpowiedzi', fr: 'Plus supprime la limite de réponses', de: 'Plus hebt das Antwortlimit auf' }),
    exhaustedText: (total: number) => triLang(lang, {
      ru: `В этом месяце осталось 0 из\u00A0${total}\u00A0ответов.`, uk: `Цього місяця залишилось 0 з\u00A0${total}\u00A0відповідей.`,
      en: `0 of\u00A0${total}\u00A0replies left this month.`, es: `Quedan 0 de\u00A0${total}\u00A0respuestas este mes.`,
      'pt-BR': `Restam 0 de\u00A0${total}\u00A0respostas este mês.`, vi: `Tháng này còn 0/${total}\u00A0lượt trả lời.`,
      id: `Sisa 0 dari\u00A0${total}\u00A0balasan bulan ini.`, tr: `Bu ay\u00A0${total}\u00A0yanıttan 0 kaldı.`,
      pl: `W tym miesiącu zostało 0 z\u00A0${total}\u00A0odpowiedzi.`, fr: `Il reste 0 réponse sur\u00A0${total}\u00A0ce mois-ci.`,
      de: `Diesen Monat noch 0 von\u00A0${total}\u00A0Antworten.`,
    }),
    // зачем (Сверка dialogs-001, макет dialogs.html `lockedCard`): карточка без действия под каталогом — часть сценариев закрыта рангом.
    lockedNoteTitle: triLang(lang, {
      ru: 'Некоторые диалоги пока закрыты', uk: 'Деякі діалоги поки що закриті', en: 'Some dialogues are still locked',
      es: 'Algunos diálogos aún están bloqueados', 'pt-BR': 'Alguns diálogos ainda estão bloqueados', vi: 'Một số đoạn hội thoại vẫn đang khóa',
      id: 'Beberapa dialog masih terkunci', tr: 'Bazı diyaloglar henüz kilitli', pl: 'Niektóre dialogi są jeszcze zablokowane',
      fr: 'Certains dialogues sont encore verrouillés', de: 'Einige Dialoge sind noch gesperrt',
    }),
    lockedNoteText: triLang(lang, {
      ru: 'Занимайся — и новые диалоги будут открываться сами.',
      uk: 'Займайся — і нові діалоги відкриватимуться самі.',
      en: 'Keep practicing and new dialogues will open up on their own.',
      es: 'Sigue practicando y los diálogos nuevos se abrirán solos.',
      'pt-BR': 'Continue praticando e novos diálogos vão se abrir sozinhos.',
      vi: 'Cứ luyện tập — hội thoại mới sẽ tự mở.',
      id: 'Terus berlatih — dialog baru akan terbuka sendiri.',
      tr: 'Çalışmaya devam et — yeni diyaloglar kendiliğinden açılır.',
      pl: 'Ćwicz dalej — nowe dialogi będą się otwierać same.',
      fr: 'Continue à t’entraîner pour débloquer peu à peu de nouveaux dialogues et élargir ta pratique.',
      de: 'Übe weiter, um nach und nach neue Dialoge freizuschalten und deine Praxis zu erweitern.',
    }),
    // зачем (голос PhraseMan, VOICE.md 25.10): без кухни «сценарии проходят проверку» — коротко и тепло
    gateTitle: triLang(lang, { ru: 'Диалоги на этом языке ещё готовим', uk: 'Діалоги цією мовою ще готуємо', en: 'We’re still preparing dialogues in this language', es: 'Aún estamos preparando los diálogos en este idioma', 'pt-BR': 'Ainda estamos preparando os diálogos neste idioma', vi: 'Hội thoại cho ngôn ngữ này vẫn đang được chuẩn bị', id: 'Dialog untuk bahasa ini masih kami siapkan', tr: 'Bu dildeki diyalogları hâlâ hazırlıyoruz', pl: 'Dialogi w tym języku wciąż przygotowujemy', fr: 'Les dialogues dans cette langue sont encore en vérification', de: 'Dialoge in dieser Sprache werden noch geprüft' }),
    gateText: triLang(lang, { ru: 'Скоро! А пока — уроки ждут.', uk: 'Скоро! А поки — уроки чекають.', en: 'Coming soon! Meanwhile, lessons are waiting.', es: '¡Muy pronto! Mientras tanto, las lecciones te esperan.', 'pt-BR': 'Em breve! Enquanto isso, as lições esperam por você.', vi: 'Sắp có rồi! Trong lúc chờ, bài học đang đợi bạn.', id: 'Segera! Sementara itu, pelajaran menunggumu.', tr: 'Çok yakında! Bu arada dersler seni bekliyor.', pl: 'Już wkrótce! A na razie czekają lekcje.', fr: 'Scénarios, indices et audio sont encore en vérification. En attendant, continue les leçons.', de: 'Szenarien, Tipps und Audio werden noch geprüft. Mach inzwischen mit den Lektionen weiter.' }),
    gateCta: triLang(lang, { ru: 'К урокам', uk: 'До уроків', en: 'To lessons', es: 'A las lecciones', 'pt-BR': 'Para as lições', vi: 'Đến bài học', id: 'Ke pelajaran', tr: 'Derslere', pl: 'Do lekcji', fr: 'Aux leçons', de: 'Zu den Lektionen' }),
  });
}

/** Пилюля месячного остатка справа (A1, D111). Только Free и только известный остаток. */
export function DialogueV2HubQuotaRow({ text, accessibilityLabel }: Readonly<{ text: string; accessibilityLabel: string }>) {
  const glass = useDialogueGlass();
  return (
    <View style={styles.quotaRow}>
      <DialogueGlassQuotaPill glass={glass} testID="dialogue-v2-hub-quota" text={text} accessibilityLabel={accessibilityLabel} />
    </View>
  );
}

/** A5: остаток исчерпан — карточка «Plus снимает лимит ответов», тап ведёт на Plus. */
export function DialogueV2HubExhaustedCard({ title, text, onPress }: Readonly<{ title: string; text: string; onPress: () => void }>) {
  const glass = useDialogueGlass();
  return (
    <PressableHybrid
      testID="dialogue-v2-hub-exhausted"
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${text}`}
      onPress={onPress}
      withSound={false}
      variant="secondary"
      style={styles.cardHit}
      contentStyle={[dialogueGlassCardStyle(glass, 22), styles.card]}
    >
      <View style={[styles.tile, { backgroundColor: glass.opaqueControl }]}>
        <Ionicons name="lock-open-outline" size={26} color={glass.text} />
      </View>
      <View style={styles.cardText}>
        <Text maxFontSizeMultiplier={1.3} style={[styles.cardTitle, { color: glass.text }]}>{title}</Text>
        <Text maxFontSizeMultiplier={1.3} style={[styles.cardBody, { color: glass.secondary }]}>{text}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={glass.secondary} />
    </PressableHybrid>
  );
}

/** Карточка-пояснение (макет `lockedCard`): часть диалогов закрыта рангом. Без нажатия — просто объясняет, как открыть остальные. */
export function DialogueV2HubLockedNote({ title, text }: Readonly<{ title: string; text: string }>) {
  const glass = useDialogueGlass();
  return (
    <View testID="dialogue-v2-hub-locked-note" accessible accessibilityLabel={`${title}. ${text}`} style={[dialogueGlassCardStyle(glass, 22), styles.card, styles.note]}>
      <View style={[styles.tile, { backgroundColor: glass.opaqueControl }]}>
        <Ionicons name="lock-open-outline" size={26} color={glass.text} />
      </View>
      <View style={styles.cardText}>
        <Text maxFontSizeMultiplier={1.3} style={[styles.cardTitle, { color: glass.text }]}>{title}</Text>
        <Text maxFontSizeMultiplier={1.3} style={[styles.cardBody, { color: glass.secondary }]}>{text}</Text>
      </View>
    </View>
  );
}

/** A6: язык без проверенных диалогов — замок, объяснение и «К урокам». Миры не показываются. */
export function DialogueV2HubLanguageGate({ title, text, ctaLabel, onPress, icon = 'lock-closed', testID = 'dialogue-v2-hub-language-gate' }: Readonly<{
  title: string; text: string; ctaLabel: string; onPress: () => void;
  /** Та же карточка A6 служит и ошибкой загрузки каталога (значок «нет сети», «Повторить»). */
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  testID?: string;
}>) {
  const glass = useDialogueGlass();
  return (
    <View testID={testID} style={[dialogueGlassCardStyle(glass, 22), styles.gate]}>
      <View style={[styles.tileSmall, { backgroundColor: glass.opaqueControl }]}>
        <Ionicons name={icon} size={24} color={glass.secondary} />
      </View>
      <View style={styles.cardText}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={[styles.cardTitle, { color: glass.text }]}>{title}</Text>
        <Text maxFontSizeMultiplier={1.3} style={[styles.cardBody, { color: glass.secondary }]}>{text}</Text>
        {/* зачем (R1 dialogs-005, Ядро 12.10): в образце A6 кнопка «К урокам» со стрелкой вправо (`.cta.sm` + arrowR 18); у карточки-ошибки (значок «нет сети», «Повторить») стрелки нет */}
        <DialogueGlassCta glass={glass} size="small" label={ctaLabel} onPress={onPress} trailingArrow={icon === 'lock-closed'} testID={`${testID}-cta`} style={styles.gateCta} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  quotaRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  cardHit: { alignSelf: 'stretch', marginTop: 24 },
  note: { marginTop: 24, alignItems: 'flex-start' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 22, paddingLeft: 20, paddingRight: 16 },
  tile: { width: 61, height: 61, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tileSmall: { width: 55, height: 55, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  cardBody: { fontSize: 16, lineHeight: 21, marginTop: 6 },
  gate: { flexDirection: 'row', alignItems: 'flex-start', gap: 18, marginTop: 32, paddingTop: 22, paddingBottom: 24, paddingLeft: 20, paddingRight: 18 },
  gateCta: { alignSelf: 'flex-start', marginTop: 16 },
});
