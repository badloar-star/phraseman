import React, { memo, useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from '../SafeLinearGradient';
import type { Theme } from '../../constants/theme';

/**
 * Полки главного экрана раздела «Карточки» (макет flashcards-screens.html,
 * экран A1: `.shelf-t` / `.cont-grid` / `.mini-row` / `.theme-row`).
 *
 * зачем: экран был сеткой одинаковых круглых значков — по ней нельзя понять
 * ни что уже начато, ни насколько продвинулся, ни что вообще есть в разделе.
 * Макет строит его как витрину: крупные карточки «Продолжи» с процентом
 * освоения, ряд обложек по темам, чипы категорий. Пользователь видит свой
 * прогресс и следующий шаг сразу, без захода вглубь.
 *
 * Обводки из макета НЕ переносим (§0.D) — разделение тоном подложки.
 */

export interface ShelfPack {
  id: string;
  title: string;
  /** Короткий код для обложки — «PB», «DL». */
  mono: string;
  /** Два цвета обложки. */
  cover: [string, string];
  /** Куплен ли пак. */
  owned: boolean;
  /** Цена в монетах, если не куплен. */
  price?: number;
  /** Часы до конца триала, напр. «6ч». */
  trial?: string;
  isNew?: boolean;
}

export interface ShelfTheme {
  id: string;
  emoji: string;
  label: string;
}

interface Props {
  continuePacks: ShelfPack[];
  cinemaPacks: ShelfPack[];
  themes: ShelfTheme[];
  labels: { continue: string; cinema: string; themes: string; opened: string };
  onPackPress: (id: string) => void;
  onThemePress: (id: string) => void;
  t: Theme;
}

/** Заголовок полки (макет `.shelf-t`): 15px/800. */
function ShelfTitle({ text, t }: { text: string; t: Theme }) {
  return (
    <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: '800', marginTop: 9, marginBottom: 7 }}>
      {text}
    </Text>
  );
}

function FlashcardsShelvesBase({
  continuePacks,
  cinemaPacks,
  themes,
  labels,
  onPackPress,
  onThemePress,
  t,
}: Props) {
  // Крупные карточки «Продолжи» — максимум 2 в ряд (макет `.cont-grid`).
  const cont = useMemo(() => continuePacks.slice(0, 2), [continuePacks]);
  // зачем (perf): полка-витрина, а не каталог — режем до 12 обложек. Дальше
  // юзер идёт во вкладку «Витрина» со списком. Это и держит ScrollView дешёвым
  // (12 лёгких тайлов), и не даёт полке растянуться на весь маркет.
  const cinema = useMemo(() => cinemaPacks.slice(0, 12), [cinemaPacks]);

  return (
    <View>
      {cont.length > 0 && (
        <>
          <ShelfTitle text={labels.continue} t={t} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {cont.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => onPackPress(p.id)}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel={p.title}
                style={{
                  flex: 1,
                  borderRadius: 18,
                  overflow: 'hidden',
                  // §0.D — карточка держится тоном подложки, без кромки.
                  backgroundColor: t.bgSurface,
                }}
              >
                <LinearGradient
                  colors={p.cover}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ height: 52, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 26, fontWeight: '900', color: 'rgba(255,255,255,0.92)' }}>
                    {p.mono}
                  </Text>
                  {!!p.trial && (
                    <View style={{ position: 'absolute', top: 7, right: 7, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(6,7,10,0.72)' }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: t.gold, fontVariant: ['tabular-nums'] }}>
                        ⏳ {p.trial}
                      </Text>
                    </View>
                  )}
                  {p.isNew && (
                    <View style={{ position: 'absolute', top: 7, left: 7, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: t.accent }}>
                      <Text style={{ fontSize: 10, fontWeight: '900', color: t.correctText }}>новый</Text>
                    </View>
                  )}
                </LinearGradient>
                <View style={{ paddingHorizontal: 11, paddingTop: 9, paddingBottom: 11 }}>
                  {/* зачем: процент освоения убран решением владельца — поля
                      прогресса по набору в модели нет, а выдуманное число хуже
                      его отсутствия. Обложка и название самодостаточны. */}
                  <Text numberOfLines={1} style={{ color: t.textPrimary, fontSize: 12.5, fontWeight: '800' }}>
                    {p.title}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {cinema.length > 0 && (
        <>
          <ShelfTitle text={labels.cinema} t={t} />
          {/* guard-ok (perf): полка ограничена 12 тайлами (см. `cinema` выше) —
              горизонтальный ScrollView здесь дешевле FlatList, у которого на
              таком объёме overhead больше самой отрисовки. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9 }}> {/* guard-ok: полка ограничена 12 тайлами */}
            {cinema.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => onPackPress(p.id)}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel={p.title}
                style={{ width: 64 }}
              >
                <LinearGradient
                  colors={p.cover}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ height: 52, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '900', color: 'rgba(255,255,255,0.9)' }}>{p.mono}</Text>
                </LinearGradient>
                <Text numberOfLines={2} style={{ color: t.textPrimary, fontSize: 10.5, fontWeight: '700', marginTop: 5 }}>
                  {p.title}
                </Text>
                {p.owned ? (
                  <Text style={{ color: t.correct, fontSize: 10, fontWeight: '800', marginTop: 2 }}>
                    ✓ {labels.opened}
                  </Text>
                ) : p.price !== undefined ? (
                  <Text style={{ color: t.gold, fontSize: 10, fontWeight: '800', marginTop: 2, fontVariant: ['tabular-nums'] }}>
                    {p.price}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {themes.length > 0 && (
        <>
          <ShelfTitle text={labels.themes} t={t} />
          <View style={{ flexDirection: 'row', gap: 9 }}>
            {themes.map((th) => (
              <TouchableOpacity
                key={th.id}
                onPress={() => onThemePress(th.id)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={th.label}
                style={{
                  flex: 1,
                  minHeight: 56,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 11,
                  paddingHorizontal: 6,
                  // §0.D — чип держится тоном, не кромкой.
                  backgroundColor: t.bgSurface,
                }}
              >
                <Text style={{ fontSize: 18 }}>{th.emoji}</Text>
                <Text numberOfLines={1} style={{ color: t.textPrimary, fontSize: 11.5, fontWeight: '800', marginTop: 3 }}>
                  {th.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

export default memo(FlashcardsShelvesBase);
