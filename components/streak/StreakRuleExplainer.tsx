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
      id: 'Cara streak dihitung',
      tr: 'Seri nasıl sayılır',
      pl: 'Jak liczy się seria',
    }),
    body: triLang(lang, {
      ru: 'День в серии засчитывается, когда ты завершаешь хотя бы одно упражнение — в уроке, тренировке или в «Моих ошибках». С Plus один пропущенный день замораживается сам, и серия не сгорает.',
      uk: 'День у серії зараховується, коли ти завершуєш хоча б одну вправу — в уроці, тренуванні або в «Моїх помилках». З Plus один пропущений день заморожується сам, і серія не згорає.',
      en: 'A day counts toward your streak when you finish at least one exercise — in a lesson, a practice session, or in My mistakes. With Plus, one missed day freezes automatically, so your streak doesn’t break.',
      es: 'Un día cuenta para tu racha cuando terminas al menos un ejercicio: en una lección, un entrenamiento o en «Mis errores». Con Plus, un día perdido se congela solo y la racha no se rompe.',
      'pt-BR': 'Um dia conta na sua sequência quando você termina pelo menos um exercício — numa lição, num treino ou em «Meus erros». Com o Plus, um dia perdido é congelado sozinho e a sequência não se perde.',
      vi: 'Một ngày được tính vào chuỗi khi bạn hoàn thành ít nhất một bài tập — trong bài học, buổi luyện tập hoặc trong «Lỗi của tôi». Với Plus, một ngày bỏ lỡ sẽ tự đóng băng và chuỗi không bị mất.',
      id: 'Satu hari dihitung dalam streak saat kamu menyelesaikan setidaknya satu latihan — di pelajaran, sesi latihan, atau di «Kesalahanku». Dengan Plus, satu hari yang terlewat dibekukan otomatis dan streak tidak putus.',
      tr: 'Bir gün, en az bir alıştırmayı bitirdiğinde seriye sayılır — derste, antrenmanda ya da «Hatalarım»da. Plus ile kaçırılan bir gün kendiliğinden dondurulur ve seri bozulmaz.',
      pl: 'Dzień liczy się do serii, gdy ukończysz choć jedno ćwiczenie — w lekcji, treningu albo w «Moich błędach». Z Plus jeden opuszczony dzień zamraża się sam i seria nie przepada.',
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
        style={({ pressed }) => [{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 14, backgroundColor: g.opaqueControl }, pressed && { opacity: 0.8 }]}
      >
        <Text style={{ color: g.text, fontSize: f.body, fontWeight: '700' }}>{copy.ok}</Text>
      </Pressable>
    </View>
  );
}

export const StreakRuleExplainer = memo(StreakRuleExplainerBase);
