/**
 * Шапка экрана набора — макет docs/design/v2-app/cards-section.html (кадры «Свой набор», «Чужой — добавлен», «Карточка удалена»).
 *
 * зачем (владелец: «в приложении запрещены любые различия с одобренными макетами»): сверху «назад» без круга и квадратная «⋮»,
 * ниже название 34/40, строка автора с пилюлей-статусом, ряд действий («＋ Карточка» + «Тренировать →» у своего набора, отклики
 * + «Тренировать →» у добавленного), разделитель и подпись «Карточки N». Всё, что в макете не нарисовано (опубликовать, править,
 * пожаловаться), живёт в шторке «⋯». Логика экрана остаётся в flashcards_collection.tsx — здесь только вид.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useScaledTextStyles } from '../../hooks/useLineScale';

import { useLv2Glass } from '../../components/learning-v2/LearningV2Glass';
import { triLang, type Lang } from '../../constants/i18n';

const copyFor = (lang: Lang) => triLang(lang, {
  ru: { back: 'Назад', menu: 'Меню', you: 'Ты', onlyYou: 'Только ты', inYou: 'У тебя', inCommunity: 'В сообществе', card: 'Карточка', train: 'Тренировать', cards: 'Карточки' },
  uk: { back: 'Назад', menu: 'Меню', you: 'Ти', onlyYou: 'Тільки ти', inYou: 'У тебе', inCommunity: 'У спільноті', card: 'Картка', train: 'Тренувати', cards: 'Картки' },
  en: { back: 'Back', menu: 'Menu', you: 'You', onlyYou: 'Only you', inYou: 'In yours', inCommunity: 'In the community', card: 'Card', train: 'Train', cards: 'Cards' },
  es: { back: 'Atrás', menu: 'Menú', you: 'Tú', onlyYou: 'Solo tú', inYou: 'En los tuyos', inCommunity: 'En la comunidad', card: 'Tarjeta', train: 'Entrenar', cards: 'Tarjetas' },
  'pt-BR': { back: 'Voltar', menu: 'Menu', you: 'Você', onlyYou: 'Só você', inYou: 'Nos seus', inCommunity: 'Na comunidade', card: 'Cartão', train: 'Treinar', cards: 'Cartões' },
  vi: { back: 'Quay lại', menu: 'Menu', you: 'Bạn', onlyYou: 'Chỉ bạn', inYou: 'Của bạn', inCommunity: 'Trong cộng đồng', card: 'Thẻ', train: 'Luyện tập', cards: 'Thẻ' },
  id: { back: 'Kembali', menu: 'Menu', you: 'Kamu', onlyYou: 'Hanya kamu', inYou: 'Milikmu', inCommunity: 'Di komunitas', card: 'Kartu', train: 'Latihan', cards: 'Kartu' },
  tr: { back: 'Geri', menu: 'Menü', you: 'Sen', onlyYou: 'Yalnızca sen', inYou: 'Sende', inCommunity: 'Toplulukta', card: 'Kart', train: 'Çalış', cards: 'Kartlar' },
  pl: { back: 'Wstecz', menu: 'Menu', you: 'Ty', onlyYou: 'Tylko ty', inYou: 'U ciebie', inCommunity: 'W społeczności', card: 'Karta', train: 'Trenuj', cards: 'Karty' },
});

/** Верхняя панель: «назад» без круга (30×42) и квадратная «⋮» 36 (`.rb.bare` + `.rb.sq`). */
export const PackTopBar = memo(function PackTopBar({ lang, onBack, onMenu }: Readonly<{ lang: Lang; onBack: () => void; onMenu: () => void }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const g = useLv2Glass();
  const copy = useMemo(() => copyFor(lang), [lang]);
  return (
    <View style={styles.top}>
      <Pressable testID="fc-collection-back" accessibilityRole="button" accessibilityLabel={copy.back} hitSlop={12} onPress={onBack} style={({ pressed }) => [styles.bare, pressed && styles.pressed]}>
        <Ionicons name="chevron-back" size={24} color={g.text} />
      </Pressable>
      <Pressable testID="fc-pack-menu" accessibilityRole="button" accessibilityLabel={copy.menu} hitSlop={8} onPress={onMenu} style={({ pressed }) => [styles.square, pressed && styles.pressed]}>
        <Ionicons name="ellipsis-vertical" size={18} color={g.text} />
      </Pressable>
    </View>
  );
});

export type PackBadge = 'only_you' | 'in_you' | 'community' | null;

/** Блок под панелью: название, автор + статус, ряд действий, разделитель, «Карточки N». */
export const PackInfoBlock = memo(function PackInfoBlock({ lang, title, authorName, mine, badge, left, onTrain, cardCount }: Readonly<{
  lang: Lang;
  title: string;
  /** Имя автора; null — у встроенных наборов автора нет, строка не рисуется. */
  authorName: string | null;
  mine: boolean;
  badge: PackBadge;
  /** Левая часть ряда действий: «＋ Карточка» или отклики. */
  left: React.ReactNode;
  onTrain: (() => void) | null;
  cardCount: number;
}>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const g = useLv2Glass();
  const copy = useMemo(() => copyFor(lang), [lang]);
  const badgeLabel = badge === 'only_you' ? copy.onlyYou : badge === 'in_you' ? copy.inYou : badge === 'community' ? copy.inCommunity : null;
  const badgeIcon = badge === 'only_you' ? 'lock-closed' : badge === 'in_you' ? 'checkmark' : 'globe-outline';
  const hasAuthorRow = authorName !== null || badgeLabel !== null;
  return (
    <View style={styles.info}>
      <Text testID="fc-collection-title" accessibilityRole="header" style={[styles.title, { color: g.text }]}>{title}</Text>
      {hasAuthorRow ? (
        <View style={styles.authorRow}>
          {authorName !== null ? (
            <>
              <View style={styles.ava}><Ionicons name="person" size={14} color="#8C8C90" /></View>
              <Text style={[styles.author, { color: g.secondary }]}>{mine ? copy.you : authorName}</Text>
            </>
          ) : null}
          {badgeLabel ? (
            <View style={styles.badge}>
              <Ionicons name={badgeIcon} size={16} color="#DADADC" />
              <Text style={styles.badgeText}>{badgeLabel}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      <View style={styles.actions}>
        <View style={styles.actionLeft}>{left}</View>
        {onTrain ? (
          <Pressable
            testID="fc-pack-train"
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={copy.train}
            onPress={onTrain}
            style={({ pressed }) => [styles.train, { backgroundColor: g.accent, boxShadow: [{ offsetX: 0, offsetY: 14, blurRadius: 30, spreadDistance: -12, color: `${g.accent}B3` }] }, pressed && styles.pressed]}>
            <Text style={[styles.trainText, { color: g.accentInk }]}>{copy.train}</Text>
            <Ionicons name="arrow-forward" size={18} color={g.accentInk} />
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 21, boxShadow: [{ inset: true, offsetX: 0, offsetY: 1, blurRadius: 0, spreadDistance: 0, color: 'rgba(255,255,255,0.7)' }] }]} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.divider} />
      <Text style={[styles.cardsLabel, { color: g.text }]}>
        {copy.cards}
        <Text style={styles.cardsCount}>{`  ${cardCount}`}</Text>
      </Text>
    </View>
  );
});

/** «＋ Карточка» — прозрачная кнопка с тонкой кромкой (`.cta.sm.gh`). */
export const PackAddCardButton = memo(function PackAddCardButton({ lang, onPress }: Readonly<{ lang: Lang; onPress: () => void }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const g = useLv2Glass();
  const copy = useMemo(() => copyFor(lang), [lang]);
  return (
    <Pressable testID="fc-pack-add-card" hitSlop={4} accessibilityRole="button" accessibilityLabel={copy.card} onPress={onPress} style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}>
      <Ionicons name="add" size={18} color={g.text} />
      <Text style={[styles.ghostText, { color: g.text }]}>{copy.card}</Text>
    </Pressable>
  );
});

const baseStyles = StyleSheet.create({
  pressed: { opacity: 0.82 },
  top: { minHeight: 44, marginTop: 6, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bare: { width: 30, height: 42, justifyContent: 'center' },
  square: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', boxShadow: [{ inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1, color: 'rgba(255,255,255,0.14)' }] },
  info: { paddingHorizontal: 20 },
  title: { marginTop: 18, fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.4 },
  authorRow: { marginTop: 10, minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 10 },
  ava: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#2A2A2C', alignItems: 'center', justifyContent: 'center' },
  author: { flexShrink: 1, fontSize: 16, lineHeight: 22 },
  badge: { marginLeft: 'auto', minHeight: 30, borderRadius: 18, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.08)' },
  badgeText: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: '#DADADC' },
  actions: { marginTop: 16, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionLeft: { flexShrink: 1, flexDirection: 'row', alignItems: 'center' },
  train: { minHeight: 42, borderRadius: 21, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
  trainText: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
  ghost: { minHeight: 42, borderRadius: 21, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.06)', boxShadow: [{ inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1, color: 'rgba(255,255,255,0.14)' }] },
  ghostText: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
  divider: { marginTop: 22, height: 1, backgroundColor: 'rgba(255,255,255,0.09)' },
  cardsLabel: { marginTop: 22, marginBottom: 14, fontSize: 17, lineHeight: 20, fontWeight: '600' },
  cardsCount: { color: '#6E6E72' },
});
