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
      ru: `В этом месяце осталось ${remaining} из ${total} ответов`, uk: `Цього місяця залишилось ${remaining} з ${total} відповідей`,
      en: `${remaining} of ${total} replies left this month`, es: `${remaining === 1 ? 'Queda' : 'Quedan'} ${remaining} de ${total} respuestas este mes`,
      'pt-BR': `${remaining === 1 ? 'Resta' : 'Restam'} ${remaining} de ${total} respostas este mês`, vi: `Tháng này còn ${remaining}/${total} lượt trả lời`,
      id: `Sisa ${remaining} dari ${total} balasan bulan ini`, tr: `Bu ay ${total} yanıttan ${remaining} kaldı`,
      pl: `W tym miesiącu zostało ${remaining} z ${total} odpowiedzi`, fr: `Il reste ${remaining} réponses sur ${total} ce mois-ci`,
      de: `Diesen Monat noch ${remaining} von ${total} Antworten`,
    }),
    // зачем (Ревизор 3.45): остаток ещё не известен телефону — диктор называет месячный лимит, а не выдуманный остаток.
    quotaUnknownA11y: (total: number) => triLang(lang, {
      // зачем (переводчик 18.10): та же фраза, что aiDialogMonthlyLimitText, со склонением по числу для ru/uk/pl
      ru: `Лимит — ${total} ${pluralWord('ru', total, DIALOG_REPLY_FORMS.ru)} в месяц`, uk: `Ліміт — ${total} ${pluralWord('uk', total, DIALOG_REPLY_FORMS.uk)} на місяць`,
      en: `Limit: ${total} replies a month`, es: `Límite: ${total} respuestas al mes`,
      'pt-BR': `Limite: ${total} respostas por mês`, vi: `Giới hạn: ${total} lượt trả lời mỗi tháng`,
      id: `Batas: ${total} balasan per bulan`, tr: `Sınır: ayda ${total} yanıt`,
      pl: `Limit: ${total} ${pluralWord('pl', total, DIALOG_REPLY_FORMS.pl)} miesięcznie`, fr: `Limite : ${total} réponses par mois`,
      de: `Limit: ${total} Antworten pro Monat`,
    }),
    exhaustedTitle: triLang(lang, { ru: 'Plus снимает лимит ответов', uk: 'Plus знімає ліміт відповідей', en: 'Plus removes the reply limit', es: 'Plus quita el límite de respuestas', 'pt-BR': 'O Plus remove o limite de respostas', vi: 'Plus bỏ giới hạn lượt trả lời', id: 'Plus menghapus batas balasan', tr: 'Plus yanıt sınırını kaldırır', pl: 'Plus znosi limit odpowiedzi', fr: 'Plus supprime la limite de réponses', de: 'Plus hebt das Antwortlimit auf' }),
    exhaustedText: (total: number) => triLang(lang, {
      ru: `В этом месяце осталось 0 из ${total} ответов.`, uk: `Цього місяця залишилось 0 з ${total} відповідей.`,
      en: `0 of ${total} replies left this month.`, es: `Quedan 0 de ${total} respuestas este mes.`,
      'pt-BR': `Restam 0 de ${total} respostas este mês.`, vi: `Tháng này còn 0/${total} lượt trả lời.`,
      id: `Sisa 0 dari ${total} balasan bulan ini.`, tr: `Bu ay ${total} yanıttan 0 kaldı.`,
      pl: `W tym miesiącu zostało 0 z ${total} odpowiedzi.`, fr: `Il reste 0 réponse sur ${total} ce mois-ci.`,
      de: `Diesen Monat noch 0 von ${total} Antworten.`,
    }),
    // зачем (Сверка dialogs-001, макет dialogs.html `lockedCard`): карточка без действия под каталогом — часть сценариев закрыта рангом.
    lockedNoteTitle: triLang(lang, {
      ru: 'Некоторые диалоги пока закрыты', uk: 'Деякі діалоги поки що закриті', en: 'Some dialogues are still locked',
      es: 'Algunos diálogos aún están bloqueados', 'pt-BR': 'Alguns diálogos ainda estão bloqueados', vi: 'Một số đoạn hội thoại vẫn đang khóa',
      id: 'Beberapa dialog masih terkunci', tr: 'Bazı diyaloglar henüz kilitli', pl: 'Niektóre dialogi są jeszcze zablokowane',
      fr: 'Certains dialogues sont encore verrouillés', de: 'Einige Dialoge sind noch gesperrt',
    }),
    lockedNoteText: triLang(lang, {
      ru: 'Продолжай заниматься, чтобы постепенно открывать новые диалоги и расширять практику.',
      uk: 'Продовжуй займатися, щоб поступово відкривати нові діалоги й розширювати практику.',
      en: 'Keep practicing to gradually unlock new dialogues and widen your practice.',
      es: 'Sigue practicando para ir desbloqueando nuevos diálogos y ampliar tu práctica.',
      'pt-BR': 'Continue praticando para desbloquear novos diálogos aos poucos e ampliar sua prática.',
      vi: 'Hãy tiếp tục luyện tập để dần mở khóa các đoạn hội thoại mới và mở rộng việc luyện tập.',
      id: 'Terus berlatih untuk membuka dialog baru secara bertahap dan memperluas latihanmu.',
      tr: 'Yeni diyaloglara kademeli olarak ulaşmak ve pratiğini genişletmek için çalışmaya devam et.',
      pl: 'Ćwicz dalej, aby stopniowo odblokowywać nowe dialogi i poszerzać praktykę.',
      fr: 'Continue à t’entraîner pour débloquer peu à peu de nouveaux dialogues et élargir ta pratique.',
      de: 'Übe weiter, um nach und nach neue Dialoge freizuschalten und deine Praxis zu erweitern.',
    }),
    gateTitle: triLang(lang, { ru: 'Диалоги на этом языке ещё проверяются', uk: 'Діалоги цією мовою ще перевіряються', en: 'Dialogues in this language are still being checked', es: 'Los diálogos en este idioma aún se están revisando', 'pt-BR': 'Os diálogos neste idioma ainda estão em revisão', vi: 'Hội thoại cho ngôn ngữ này vẫn đang được kiểm tra', id: 'Dialog dalam bahasa ini masih diperiksa', tr: 'Bu dildeki diyaloglar hâlâ kontrol ediliyor', pl: 'Dialogi w tym języku są jeszcze sprawdzane', fr: 'Les dialogues dans cette langue sont encore en vérification', de: 'Dialoge in dieser Sprache werden noch geprüft' }),
    gateText: triLang(lang, { ru: 'Сценарии, подсказки и озвучка ещё проходят отдельную проверку. Пока можно заниматься уроками.', uk: 'Сценарії, підказки й озвучення ще проходять окрему перевірку. Поки можна займатися уроками.', en: 'Scenarios, hints and audio are still under review. Meanwhile, keep going with lessons.', es: 'Los escenarios, pistas y audios aún se revisan. Mientras tanto, sigue con las lecciones.', 'pt-BR': 'Cenários, dicas e áudio ainda estão em revisão. Enquanto isso, siga com as lições.', vi: 'Kịch bản, gợi ý và âm thanh vẫn đang được kiểm tra. Trong lúc chờ, hãy học bài nhé.', id: 'Skenario, petunjuk, dan audio masih ditinjau. Sementara itu, lanjutkan pelajaran.', tr: 'Senaryolar, ipuçları ve seslendirme hâlâ inceleniyor. Bu arada derslere devam et.', pl: 'Scenariusze, podpowiedzi i nagrania są jeszcze sprawdzane. Na razie ucz się z lekcji.', fr: 'Scénarios, indices et audio sont encore en vérification. En attendant, continue les leçons.', de: 'Szenarien, Tipps und Audio werden noch geprüft. Mach inzwischen mit den Lektionen weiter.' }),
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
