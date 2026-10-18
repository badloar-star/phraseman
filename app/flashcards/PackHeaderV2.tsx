/**
 * Шапка экрана набора — макет docs/design/v2-app/cards-v2.html (кадры «Свой набор», «Чужой — добавлен», «Действия с набором»; setHead()).
 *
 * зачем (владелец 12.10: cards-v2 утверждён целиком, «приложение = макет»): сверху «назад» без круга и квадратная «⋮», ниже название 34/40,
 * у чужого набора — строка автора (аватар 23 + имя), строка «уровень · N карточек · ♥», ряд кнопок: у своего «Тренировать» и круглая «+»
 * (новая карточка), у добавленного «✓ В моих наборах» и «Тренировать». Подписи-разделителя «Карточки N» и линии больше нет — за шапкой
 * идёт полоса масштаба и сетка. Всё, что в макете не нарисовано (опубликовать, править, пожаловаться), живёт в шторке «⋮».
 * Логика экрана остаётся в flashcards_collection.tsx — здесь только вид.
 *
 * Уровень набора (A1–C2) в документах пока нет — чип `level` скрыт, пока поле не придёт от Ядра (packDeckLevel).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useCallback, useMemo, useRef } from 'react';
import { Platform, StatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { stableInitialWindowMetrics, useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import { useScaledTextStyles } from '../../hooks/useLineScale';

import { useLv2Glass } from '../../components/learning-v2/LearningV2Glass';
import { packCardsWord } from '../../components/packs/PackRow';
import { PackBackBare, PackCta, PackGhostCta, PackRoundButton, PackSquareButton, PackTopBarRow } from '../../components/packs/PackScreenKit';
import { nestedBoxShadow } from '../../components/v2/ShadowSurface';
import { triLang, type Lang } from '../../constants/i18n';

const copyFor = (lang: Lang) => triLang(lang, {
  ru: { back: 'Назад', menu: 'Меню', onlyYou: 'Только ты', inCommunity: 'В сообществе', inMine: 'В моих наборах', card: 'Новая карточка', train: 'Практика' },
  uk: { back: 'Назад', menu: 'Меню', onlyYou: 'Тільки ти', inCommunity: 'У спільноті', inMine: 'У моїх наборах', card: 'Нова картка', train: 'Тренувати' },
  en: { back: 'Back', menu: 'Menu', onlyYou: 'Only you', inCommunity: 'In the community', inMine: 'In my packs', card: 'New card', train: 'Train' },
  es: { back: 'Atrás', menu: 'Menú', onlyYou: 'Solo tú', inCommunity: 'En la comunidad', inMine: 'En mis packs', card: 'Nueva tarjeta', train: 'Entrenar' },
  'pt-BR': { back: 'Voltar', menu: 'Menu', onlyYou: 'Só você', inCommunity: 'Na comunidade', inMine: 'Nos meus pacotes', card: 'Novo cartão', train: 'Treinar' },
  vi: { back: 'Quay lại', menu: 'Menu', onlyYou: 'Chỉ bạn', inCommunity: 'Trong cộng đồng', inMine: 'Trong bộ của tôi', card: 'Thẻ mới', train: 'Luyện tập' },
  id: { back: 'Kembali', menu: 'Menu', onlyYou: 'Hanya kamu', inCommunity: 'Di komunitas', inMine: 'Di paket saya', card: 'Kartu baru', train: 'Latihan' },
  tr: { back: 'Geri', menu: 'Menü', onlyYou: 'Yalnızca sen', inCommunity: 'Toplulukta', inMine: 'Paketlerimde', card: 'Yeni kart', train: 'Çalış' },
  pl: { back: 'Wstecz', menu: 'Menu', onlyYou: 'Tylko ty', inCommunity: 'W społeczności', inMine: 'W moich zestawach', card: 'Nowa karta', train: 'Trenuj' },
});

const noop = (): void => undefined;

/** Верхняя панель: «назад» без круга (30×42) и квадратная «⋮» 36 (`.rb.bare` + `.rb.sq`). */
export const PackTopBar = memo(function PackTopBar({ lang, onBack, onMenu }: Readonly<{ lang: Lang; onBack: () => void; onMenu: () => void }>) {
  const g = useLv2Glass();
  const styles = useMemo(() => makeStyles(g), [g]);
  const copy = useMemo(() => copyFor(lang), [lang]);
  // зачем (координатор 12.10, Сверка cards-042: «‹ … ⋮» лежит ПОД строкой состояния, сдвиг ≈75 px; сперва логи): каждое новое положение панели
  // в окне + откуда взялся отступ сверху («стабильный» inset, inset первого замера окна, высота строки состояния). Строка пишется только при
  // изменении положения/высоты, чтобы не засорять журнал; по ней видно, на каком кадре панель стояла не там и чему равнялись отступы.
  const stableInsets = useStableSafeAreaInsets();
  const { height: windowH } = useWindowDimensions();
  const wrapRef = useRef<View>(null);
  const lastLogRef = useRef('');
  const mountedAtRef = useRef(Date.now());
  const logPosition = useCallback((layoutY: number, layoutH: number) => {
    wrapRef.current?.measureInWindow((_x, y, _w, h) => {
      const key = `${Math.round(y)}:${Math.round(h)}`;
      if (key === lastLogRef.current) return;
      lastLogRef.current = key;
      console.log('[CARDS-SET-HEADER]', JSON.stringify({ // guard-ok: журнал положения шапки набора (расследование сдвига под строкой состояния)
        windowY: Math.round(y), height: Math.round(h), layoutY: Math.round(layoutY), layoutH: Math.round(layoutH),
        insetTopStable: stableInsets.top, insetTopInitialWindow: stableInitialWindowMetrics.insets.top,
        statusBarH: Platform.OS === 'android' ? StatusBar.currentHeight ?? null : null, windowH: Math.round(windowH),
        sinceMountMs: Date.now() - mountedAtRef.current,
      }));
    });
  }, [stableInsets.top, windowH]);
  return (
    <View ref={wrapRef} collapsable={false} onLayout={(e) => logPosition(e.nativeEvent.layout.y, e.nativeEvent.layout.height)} style={styles.topWrap}>
      <PackTopBarRow
        left={<PackBackBare g={g} testID="fc-collection-back" label={copy.back} onPress={onBack} />}
        right={<PackSquareButton g={g} testID="fc-pack-menu" label={copy.menu} onPress={onMenu} />}
      />
    </View>
  );
});

export type PackBadge = 'only_you' | 'in_you' | 'community' | null;

/** Блок под панелью: название, автор, «уровень · N карточек · ♥», ряд кнопок. */
export const PackInfoBlock = memo(function PackInfoBlock({ lang, title, authorName, mine, badge, left, onTrain, cardCount, level = null }: Readonly<{
  lang: Lang;
  title: string;
  /** Имя автора; null — у встроенных наборов автора нет, строка не рисуется. */
  authorName: string | null;
  mine: boolean;
  badge: PackBadge;
  /** Свой набор: круглая «+» (новая карточка) в конце ряда кнопок; чужой: счётчики (♥ и отклики) в строке «N карточек». */
  left: React.ReactNode;
  onTrain: (() => void) | null;
  cardCount: number;
  /** Уровень A1–C2 (чип `.lvl`); null — чип скрыт. */
  level?: string | null;
}>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const g = useLv2Glass();
  // зачем (замечание владельца 10.10): цвета — токены выбранной темы, стили пересобираются при смене темы.
  const styles = useScaledTextStyles(useMemo(() => makeStyles(g), [g]));
  const copy = useMemo(() => copyFor(lang), [lang]);
  const badgeLabel = badge === 'only_you' ? copy.onlyYou : badge === 'community' ? copy.inCommunity : null;
  const badgeIcon = badge === 'only_you' ? 'lock-closed' : 'globe-outline';
  const showAuthor = !mine && authorName !== null;
  const added = badge === 'in_you';
  return (
    <View style={styles.info}>
      <Text maxFontSizeMultiplier={1.15} testID="fc-collection-title" accessibilityRole="header" style={[styles.title, { color: g.text }]}>{title}</Text>
      {showAuthor ? (
        <View style={styles.authorRow}>
          <View style={styles.ava}><Ionicons name="person" size={14} color={g.mutedText} /></View>
          <Text style={[styles.author, { color: g.secondary }]}>{authorName}</Text>
        </View>
      ) : null}
      <View style={styles.metaRow}>
        {level ? <View style={[styles.lvl, { backgroundColor: g.dividerTone, boxShadow: nestedBoxShadow(g) }]}><Text style={[styles.lvlText, { color: g.text }]}>{level}</Text></View> : null}
        <Text style={[styles.metaText, { color: g.secondary }]}>{`${cardCount} ${packCardsWord(lang, cardCount)}`}</Text>
        {/* зачем: у своего набора статус (кто видит) — единственное, что макет не рисует, но продукт обязан показать; тихий, в этой же строке */}
        {mine && badgeLabel ? (
          <View style={styles.status}>
            <Ionicons name={badgeIcon} size={16} color={g.secondary} />
            <Text style={[styles.metaText, { color: g.secondary }]}>{badgeLabel}</Text>
          </View>
        ) : null}
        {!mine ? left : null}
      </View>
      <View style={styles.actions}>
        {/* зачем (cards-section-014 / cards-v2-016): подпись «В моих наборах» переносилась на две строки в кнопке ровно вдвое уже ряда; образец — одна строка, кнопка шире. flex 1.25 против 1 у «Тренировать» (на узком экране перенос остаётся допустим — кнопка растёт по высоте). */}
        {added ? <PackGhostCta g={g} grow icon="checkmark" label={copy.inMine} onPress={noop} disabled testID="fc-pack-in-mine" style={{ flex: 1.25 }} /> : null}
        {onTrain ? <PackCta g={g} grow icon="play" label={copy.train} onPress={onTrain} testID="fc-pack-train" /> : null}
        {mine ? left : null}
      </View>
    </View>
  );
});

/** Круглая «+» 48 (`.rb.l`) — новая карточка в свой набор (в макете: «Новая карточка» живёт и в шторке «⋮»). */
export const PackAddCardButton = memo(function PackAddCardButton({ lang, onPress }: Readonly<{ lang: Lang; onPress: () => void }>) {
  const g = useLv2Glass();
  const copy = useMemo(() => copyFor(lang), [lang]);
  return <PackRoundButton g={g} size={48} icon="add" testID="fc-pack-add-card" label={copy.card} onPress={onPress} />;
});

const makeStyles = (g: ReturnType<typeof useLv2Glass>) => StyleSheet.create({
  topWrap: { marginTop: 6, paddingHorizontal: 20 },
  // зачем (Макеты cards-v2-014/017, cards-gap-030, 12.10): шапка лежит внутри сетки, у которой уже есть боковой отступ 20 (CollectionGalleryView.content) — свои 20 ставили текст на 40 вместо края списка; боковой отступ здесь не нужен
  info: { paddingBottom: 14 },
  title: { marginTop: 14, fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5 },
  authorRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  ava: { width: 23, height: 23, borderRadius: 12, backgroundColor: g.opaqueControl, alignItems: 'center', justifyContent: 'center' },
  author: { flexShrink: 1, fontSize: 16, lineHeight: 22 },
  metaRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 18, flexWrap: 'wrap' },
  metaText: { fontSize: 16, lineHeight: 22 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  lvl: { minWidth: 38, height: 26, paddingHorizontal: 9, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  lvlText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  actions: { marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
});
