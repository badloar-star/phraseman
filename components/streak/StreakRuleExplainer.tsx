import React, { memo, useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { triLang, type Lang } from '../../constants/i18n';
import { peekStoredItem, readStoredItem, writeStoredItem } from '../../app/storage_snapshot';
import { animateNextLayoutTransition } from '../../app/smooth_layout';

// зачем (§126/§137, жалобы «как работает серия — непонятно», 04.10): одноразовое объяснение правила
// на «Твои результаты» после обновления. Что засчитывает день — решение §137 (Fable): первое
// завершённое упражнение дня. Показываем один раз на устройство; «Понятно» прячет карточку сразу,
// флаг пишется фоном. Флаг — не «долг на показ»: пропустили — ничего не теряется.
export const STREAK_RULE_EXPLAINER_SEEN_KEY = 'streak_rule_explainer_seen_v1';

type Seen = 'seen' | 'unseen' | 'unknown';

function peekSeen(): Seen {
  const value = peekStoredItem(STREAK_RULE_EXPLAINER_SEEN_KEY);
  if (value === undefined) return 'unknown';
  return value ? 'seen' : 'unseen';
}

export function streakRuleExplainerCopy(lang: Lang): { title: string; body: string; ok: string } {
  return {
    title: triLang(lang, {
      ru: 'Как считается серия',
      uk: 'Як рахується серія',
      en: 'How your streak counts',
      es: 'Cómo cuenta tu racha',
      'pt-BR': 'Como sua sequência conta',
      vi: 'Chuỗi ngày được tính thế nào',
      id: 'Cara rangkaian dihitung',
      tr: 'Seri nasıl sayılır',
      pl: 'Jak liczy się seria',
    }),
    // зачем (§137, координатор 04.10): разговор тоже засчитывает день; заморозка Plus — до 3 раз в месяц
    // (PREMIUM_FREE_FREEZES_PER_MONTH = 3) — пишем лимит, чтобы не обещать больше, чем есть.
    // зачем (голос PhraseMan, VOICE.md, владелец 25.10): «замораживается / не сгорает» → живо «Plus прикроет», без «С Plus… Plus»
    body: triLang(lang, {
      ru: 'День в серии засчитывается, когда ты завершаешь хотя бы одно упражнение — урок, тренировку, «Мои ошибки» или разговор. Пропустишь день — Plus прикроет его сам, до 3 раз в месяц. Серия не сгорит.',
      uk: 'День у серії зараховується, коли ти завершуєш хоча б одну вправу — урок, тренування, «Мої помилки» або розмову. Пропустиш день — Plus прикриє його сам, до 3 разів на місяць. Серія не згорить.',
      en: 'A day counts toward your streak when you finish at least one exercise — a lesson, a practice session, My mistakes, or a conversation. Miss a day and Plus covers it for you, up to 3 times a month. Your streak survives.',
      es: 'Un día cuenta para tu racha cuando terminas al menos un ejercicio: una lección, un entrenamiento, «Mis errores» o una conversación. Si te saltas un día, Plus lo cubre solo, hasta 3 veces al mes. Tu racha sigue viva.',
      'pt-BR': 'Um dia conta na sua sequência quando você termina pelo menos um exercício — uma lição, um treino, «Meus erros» ou uma conversa. Pulou um dia? O Plus cobre sozinho, até 3 vezes por mês. Sua sequência continua.',
      vi: 'Một ngày được tính vào chuỗi khi bạn hoàn thành ít nhất một bài tập — bài học, buổi luyện tập, «Lỗi của tôi» hoặc một cuộc trò chuyện. Lỡ một ngày? Plus tự bù giúp bạn, tối đa 3 lần mỗi tháng. Chuỗi vẫn còn nguyên.',
      id: 'Satu hari dihitung dalam rangkaian saat kamu menyelesaikan setidaknya satu latihan — pelajaran, sesi latihan, «Kesalahanku», atau percakapan. Kelewat sehari? Plus menutupnya otomatis, hingga 3 kali sebulan. Rangkaianmu aman.',
      tr: 'Bir gün, en az bir alıştırmayı bitirdiğinde seriye sayılır — ders, antrenman, «Hatalarım» ya da bir sohbet. Bir günü kaçırırsan Plus onu kendisi kapatır, ayda 3 kereye kadar. Serin yanmaz.',
      pl: 'Dzień liczy się do serii, gdy ukończysz choć jedno ćwiczenie — lekcję, trening, «Moje błędy» albo rozmowę. Opuścisz dzień — Plus sam go zaliczy, do 3 razy w miesiącu. Seria nie przepadnie.',
    }),
    ok: triLang(lang, {
      ru: 'Понятно', uk: 'Зрозуміло', en: 'Got it', es: 'Entendido', 'pt-BR': 'Entendi',
      vi: 'Đã hiểu', id: 'Mengerti', tr: 'Anladım', pl: 'Rozumiem',
    }),
  };
}

function StreakRuleExplainerBase({ lang }: Readonly<{ lang: Lang }>) {
  const { liquidGlassThemeId, f } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const [seen, setSeen] = useState<Seen>(peekSeen);

  useEffect(() => {
    if (seen !== 'unknown') return;
    let alive = true;
    readStoredItem(STREAK_RULE_EXPLAINER_SEEN_KEY).then((value) => {
      if (!alive) return;
      // Вставка в поток после первого кадра — только плавно (правило стабильности раскладки).
      if (!value) animateNextLayoutTransition();
      setSeen(value ? 'seen' : 'unseen');
    }, (error: unknown) => {
      // Не смогли прочитать — не показываем: лучше пропустить объяснение, чем показывать его каждый раз.
      console.warn('[STREAK-RULE] seen flag read failed — explainer hidden', String(error)); // guard-ok: редкая ветка ошибки, catch обязан писать причину
      if (alive) setSeen('seen');
    });
    return () => { alive = false; };
  }, [seen]);

  const dismiss = useCallback(() => {
    animateNextLayoutTransition();
    setSeen('seen');
    writeStoredItem(STREAK_RULE_EXPLAINER_SEEN_KEY, '1').catch((error: unknown) => {
      console.warn('[STREAK-RULE] seen flag write failed — may show once more', String(error)); // guard-ok: редкая ветка ошибки
    });
  }, []);

  if (seen !== 'unseen') return null;
  const copy = streakRuleExplainerCopy(lang);
  return (
    <View testID="streak-rule-explainer" style={{ backgroundColor: g.opaqueCard, borderRadius: 22, padding: 18, gap: 10 }}>
      <Text accessibilityRole="header" style={{ color: g.text, fontSize: f.body, fontWeight: '800' }}>{copy.title}</Text>
      <Text style={{ color: g.secondary, fontSize: f.body, lineHeight: f.body * 1.4 }}>{copy.body}</Text>
      <Pressable
        testID="streak-rule-explainer-ok"
        accessibilityRole="button"
        onPress={dismiss}
        style={({ pressed }) => [{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 14, backgroundColor: g.buttonFill }, pressed && { opacity: 0.8 }]}
      >
        <Text style={{ color: g.text, fontSize: f.body, fontWeight: '700' }}>{copy.ok}</Text>
      </Pressable>
    </View>
  );
}

export const StreakRuleExplainer = memo(StreakRuleExplainerBase);
