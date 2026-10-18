// ─── «Сессия недоступна» — вид по learning-v2.html `unavailable` ─────────────
// зачем (сверка 05.10, договорённость с Ядром): шапка с крестиком .rb 42; ниже, в 260 от верха страницы, по центру —
// значок cloudOff 36 приглушённый, заголовок 22/700, пояснение 16/22 --sec, маленькая контурная «Назад» (.cta.sm.gh).
// Только вид: решения (когда показывать, куда вести, логи [V2-SESSION]) остаются в плеере. Пояснение — одна общая
// строка макета, пока Ядро не даст текст по причине (проп hint примет его без правки вида). Техническая причина —
// только в дев-сборке; «Повторить» — только если плеер решил, что повтор что-то изменит.
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { triLang, type Lang } from '../../constants/i18n';
import { useLineScale } from '../../hooks/useLineScale';
import { KitGlassLayer } from '../v2/KitLiquidGlass';
import { actionBoxShadow, nestedBoxShadow, plateBoxShadow } from '../v2/ShadowSurface';
import { useLv2Glass } from './LearningV2Glass';

export function learningV2SessionUnavailableDefaultHint(lang: Lang): string {
  return triLang(lang, {
    ru: 'Материал занятия не собрался. Вернись на карту и попробуй ещё раз.',
    uk: 'Матеріал заняття не зібрався. Повернись на карту й спробуй ще раз.',
    en: 'The session material did not load. Go back to the map and try again.',
    es: 'El material de la sesión no se cargó. Vuelve al mapa e inténtalo de nuevo.',
    'pt-BR': 'O material da sessão não carregou. Volte ao mapa e tente de novo.',
    vi: 'Không tải được nội dung phiên học. Hãy quay lại bản đồ và thử lại.',
    id: 'Materi sesi gagal dimuat. Kembali ke peta dan coba lagi.',
    tr: 'Oturum içeriği yüklenemedi. Haritaya dön ve tekrar dene.',
    pl: 'Materiał zajęć się nie wczytał. Wróć do mapy i spróbuj jeszcze raz.',
  });
}

type Props = Readonly<{
  title: string;
  /** Пояснение под заголовком; null — строки нет. */
  hint: string | null;
  backLabel: string;
  closeLabel: string;
  onBack: () => void;
  onClose: () => void;
  /** Техническая причина — показывается ТОЛЬКО в дев-сборке. */
  devReason?: string | null;
  retry?: Readonly<{ label: string; onPress: () => void }> | null;
}>;

function LearningV2SessionUnavailableBase({ title, hint, backLabel, closeLabel, onBack, onClose, devReason, retry }: Props) {
  const g = useLv2Glass();
  const insets = useStableSafeAreaInsets();
  const lh = useLineScale();
  // зачем (владелец 01.10 и 18.10 07:45: «экранов-ошибок нигде»): ученику экран «Сессия недоступна» не показываем —
  // после первого кадра тихо уходим назад (onBack ведёт на карту урока). Вид с «Повторить» остаётся только для
  // авторского превью: retry плеер передаёт лишь там, и автору нужна причина.
  const silentExit = !retry;
  const leftRef = useRef(false);
  useEffect(() => {
    if (!silentExit || leftRef.current) return;
    leftRef.current = true;
    console.warn(`[NO-ERROR-SCREEN] screen=learning_v2_session reason=${devReason ?? 'session_unavailable'} shown=silent_exit`); // guard-ok: причина ухода называется всегда
    // зачем (Ревизор 3.109): единственный выход — родительский exitLearningV2Session (onClose): он ставит флаг выхода
    // и делает replace на карту; safeRouterBack поверх него давал двойную навигацию. Энергия до первого вопроса не списана.
    onClose();
  }, [devReason, onClose, silentExit]);
  if (silentExit) return <View testID="learning-v2-session-unavailable-silent" style={[styles.screen, { backgroundColor: g.bg }]} />;
  return (
    <View testID="learning-v2-session-unavailable" style={[styles.screen, { backgroundColor: g.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          testID="learning-v2-unavailable-close"
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [
            styles.close,
            { backgroundColor: g.buttonFill, boxShadow: nestedBoxShadow(g), opacity: pressed ? 0.72 : 1 }, // «Тень» 12.10: круглая кнопка без кромки
          ]}
        >
          <KitGlassLayer radius={21} />
          <Ionicons name="close" size={20} color={g.text} />
        </Pressable>
      </View>
      {/* \`.empty\` padding-top 260 от верха страницы: 52 полей страницы входят в шапку, остаток — здесь. */}
      <View style={styles.empty}>
        <Ionicons name="cloud-offline-outline" size={36} color={g.mutedText} />
        <Text accessibilityRole="header" style={[styles.title, { color: g.text, lineHeight: lh(28) }]}>{title}</Text>
        {hint ? <Text style={[styles.hint, { color: g.secondary, lineHeight: lh(22) }]}>{hint}</Text> : null}
        {__DEV__ && devReason ? (
          <Text selectable style={[styles.devReason, { color: g.secondary, lineHeight: lh(18) }]}>{devReason}</Text>
        ) : null}
        <Pressable
          testID="learning-v2-unavailable-back"
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          onPress={onBack}
          style={({ pressed }) => [styles.back, { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g), opacity: pressed ? 0.72 : 1 }]} // «Тень» 12.10: контурная кнопка стала плашкой с тенью
        >
          <Text style={[styles.backText, { color: g.text, lineHeight: lh(21) }]}>{backLabel}</Text>
        </Pressable>
        {retry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={retry.label}
            onPress={retry.onPress}
            style={({ pressed }) => [styles.back, { backgroundColor: g.accent, boxShadow: actionBoxShadow(g), opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={[styles.backText, { color: g.accentInk, lineHeight: lh(21) }]}>{retry.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export const LearningV2SessionUnavailable = memo(LearningV2SessionUnavailableBase);

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // \`.shd\`: margin-top 8, поля 20.
  header: { paddingHorizontal: 20, minHeight: 42, flexDirection: 'row', alignItems: 'center' },
  close: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // \`.empty\`: gap 14, поля 30, сверху 260 от начала страницы (52 + 8 + 42 уже над этим блоком).
  empty: { alignItems: 'center', gap: 14, paddingTop: 158, paddingHorizontal: 30 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  // margin-top -6 у пояснения в макете: 14 - 6 = 8 от заголовка.
  hint: { fontSize: 16, textAlign: 'center', marginTop: -6, maxWidth: 320 },
  devReason: { fontSize: 13, textAlign: 'center' },
  // \`.cta.sm.gh\`: 42, r21, поля 18, по ширине текста; margin-top 10 → 24 от пояснения.
  back: {
    minHeight: 42,
    borderRadius: 21,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  backText: { fontSize: 16, fontWeight: '600' },
});
