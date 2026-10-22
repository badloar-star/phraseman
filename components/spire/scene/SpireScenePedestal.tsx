// ═══════════════════════════════════════════════════════════════════════════
// SpireScenePedestal.tsx — «Комната недели» слева от башни на «Сцене» Пика: список топ-3, своя строка, «Все участники».
//
// зачем (владелец 22.10 по макету docs/design/v2-app/peak-pedestal-left.html, вариант 3 «Список топ-3»; координатор: «всё на одном экране
// без прокрутки; люди → визитка»): пьедестал переехал из панели под сценой в левую колонку под «Этаж N / ступень». Три строки — место,
// монета, ник; ниже своя строка «N место / ник» и «Все участники ›». Строка любого человека открывает его визитку. Монеты без колец
// (владелец: «вот так не надо» про кольцо вокруг монеты). Цвета — свет сцены (белое стекло макета, одинаковое во всех темах; сила — от
// белого сцены, без своих литералов). Подбор комнаты — пустые строки той же высоты, без сети — приглушено. Не влезает над «Играть»
// (низкий экран, крупный шрифт) — сжатый вид: строки 44, без ника под местом, «Все участники» — нажатием на заголовок.
// ЗАМОК ВЛАДЕЛЬЦА 22.10: «не надо писать 1 ступ и тд! просто ник полностью» — ни ступеней, ни монет недели в строках; ник целиком,
// длинный переносится (spireNickWrap), без многоточия и без ужатия шрифта.
// ЗАМОК ВЛАДЕЛЬЦА 22.10: «вот это убери текст» — строки «N мест до повышения» здесь нет (и тёплой строкой сцены тоже).
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Lang } from '../../../constants/i18n';
import { useScaledTextStyles } from '../../../hooks/useLineScale';
import { colorWithAlpha } from '../../v2/plateAlpha';
import V2Pressable from '../../v2/V2Pressable';
import SpireRankCoin from '../SpireRankCoin';
import { spireNickWrap } from '../spire_nick_wrap';
import type { SpireMemberRow } from '../spire_room_types';
import { spireText } from '../spire_strings';
import { SPIRE_SCENE_INK } from './spire_scene_palette';
import { spireSceneText } from './spire_scene_strings';

/** Рост подписей с системным шрифтом — как у текста сцены (SpireScene TEXT_MAX_SCALE). */
const TEXT_MAX_SCALE = 1.3;
/** Строка топ-3 и монеты (макет `.pp-li` 56, `.pp-li .pp-coin` 28, `.pp-me .pp-coin` 32); сжатый вид — 44 и 24, dp. */
const ROW_H = 56;
const ROW_H_COMPACT = 44;
const COIN = 28;
const COIN_COMPACT = 24;
const ME_COIN = 32;
/** Строк в списке: три лидера (меньше — сколько есть; подбор комнаты — три пустые). */
const TOP_N = 3;
/** Пьедестал на 4 dp левее текста сцены (макет: колонка 16, текст 20) — заголовок и ссылки стоят по тексту полями 4. */
export const SPIRE_SCENE_PEDESTAL_INSET = 4;
/** Свет сцены нужной силы — от белого сцены, без новых литералов (макет: линия 14 %, своя строка 26 % и блик 30 %, ссылка 90 %). */
const DIVIDER = colorWithAlpha(SPIRE_SCENE_INK.text, 0.14);
const ME_GLASS = colorWithAlpha(SPIRE_SCENE_INK.text, 0.26);
const ME_HIGHLIGHT = colorWithAlpha(SPIRE_SCENE_INK.text, 0.3);
const LINK = colorWithAlpha(SPIRE_SCENE_INK.text, 0.9);

type Props = Readonly<{
  lang: Lang;
  /** Ширина колонки: от левого края пьедестала до окна башни (spire_scene_layout), dp. */
  width: number;
  /** Тройка лидеров по местам 1, 2, 3 (spireSceneRoom). */
  top: readonly SpireMemberRow[];
  /** Людей в комнате (правее заголовка). */
  count: number;
  myPlace: number | null;
  /** Своя строка комнаты (кэш недели); нет — своя строка показывает только место. */
  me: SpireMemberRow | null;
  myCoinRank: number | null;
  /** Не влезает над «Играть» — сжатый вид (spireScenePedestalCompact). */
  compact: boolean;
  /** Комната подбирается: пустые строки той же высоты. */
  loading: boolean;
  /** Нет сети: чужие цифры приглушены. */
  dim: boolean;
  onPressMember: (m: SpireMemberRow) => void;
  onPressMe: () => void;
  onOpenAll: () => void;
}>;

function SpireScenePedestal({ lang, width, top, count, myPlace, me, myCoinRank, compact, loading, dim, onPressMember, onPressMe, onOpenAll }: Props) {
  // зачем (FONTSCALE2): межстрочный растёт вместе с системным шрифтом, строки не наезжают
  const ts = useScaledTextStyles(s, TEXT_MAX_SCALE);
  const rows: readonly (SpireMemberRow | null)[] = loading ? Array.from({ length: TOP_N }, () => null) : top.slice(0, TOP_N);
  const placeText = myPlace !== null ? spireSceneText(lang, 'place', { n: myPlace }) : '—';
  const rowH = compact ? ROW_H_COMPACT : ROW_H;
  const coin = compact ? COIN_COMPACT : COIN;
  return (
    <View testID="spire-scene-pedestal" style={[s.wrap, { width }, dim ? s.dim : null]}>
      {compact ? (
        // зачем: в сжатом виде нижней ссылки нет — «Все участники» открывает сам заголовок со стрелкой (как прежняя карточка «Комнаты недели»)
        <V2Pressable testID="spire-scene-pedestal-head" onPress={onOpenAll} disabled={loading || count === 0} scaleTo={0.97} accessibilityLabel={`${spireText(lang, 'roomWeek')}, ${count}. ${spireText(lang, 'allMembers')}`} style={s.head}>
          <Text style={[ts.headTitle, s.shrink]} numberOfLines={1} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{spireText(lang, 'roomWeek')}</Text>
          <Text style={ts.headCount} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{loading ? '…' : String(count)}</Text>
          <Ionicons name="chevron-forward" size={14} color={LINK} />
        </V2Pressable>
      ) : (
        <View style={s.head}>
          <Text style={[ts.headTitle, s.shrink]} numberOfLines={1} maxFontSizeMultiplier={TEXT_MAX_SCALE} accessibilityRole="header">{spireText(lang, 'roomWeek')}</Text>
          <Text style={ts.headCount} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{loading ? '…' : String(count)}</Text>
        </View>
      )}
      {rows.length > 0 ? (
        <View style={s.list}>
          {rows.map((m, i) => {
            const place = i + 1;
            const rowStyle = [s.row, { minHeight: rowH }, i > 0 ? s.rowDivider : null];
            if (!m) {
              return (
                <View key={place} style={rowStyle} testID={`spire-scene-pedestal-empty-${place}`}>
                  <Text style={ts.place} maxFontSizeMultiplier={1}>{place}</Text>
                  <View style={[s.coinEmpty, { width: coin, height: coin, borderRadius: coin / 2 }]} />
                  <View style={s.nameEmpty} />
                </View>
              );
            }
            return (
              <V2Pressable
                key={place}
                testID={`spire-scene-pedestal-${place}`}
                onPress={() => onPressMember(m)}
                scaleTo={0.97}
                accessibilityLabel={`${place}. ${m.name}`}
                style={rowStyle}
              >
                <Text style={ts.place} maxFontSizeMultiplier={1}>{place}</Text>
                <SpireRankCoin rank={m.coinRank ?? null} size={coin} plus={false} />
                {/* ЗАМОК ВЛАДЕЛЬЦА 22.10: «просто ник полностью» — без ограничения строк: длинный ник переносится, не режется */}
                <Text style={[ts.name, s.grow]} maxFontSizeMultiplier={TEXT_MAX_SCALE} android_hyphenationFrequency="full">{spireNickWrap(m.name)}</Text>
              </V2Pressable>
            );
          })}
        </View>
      ) : null}
      {loading ? (
        <View style={s.me}>
          <View style={[s.coinEmpty, { width: ME_COIN, height: ME_COIN, borderRadius: ME_COIN / 2 }]} />
          <Text style={[ts.name, s.grow]} numberOfLines={2} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{spireSceneText(lang, 'searching')}</Text>
        </View>
      ) : (
        <V2Pressable testID="spire-scene-my-coin" onPress={onPressMe} scaleTo={0.97} accessibilityLabel={me ? `${placeText}. ${me.name}` : placeText} style={s.me}>
          <SpireRankCoin rank={myCoinRank} size={ME_COIN} plus={false} />
          <View style={s.grow}>
            <Text style={ts.name} numberOfLines={1} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{placeText}</Text>
            {me && !compact ? <Text style={ts.sub} maxFontSizeMultiplier={TEXT_MAX_SCALE} android_hyphenationFrequency="full">{spireNickWrap(me.name)}</Text> : null}
          </View>
        </V2Pressable>
      )}
      {compact ? null : (
      <V2Pressable testID="spire-scene-pedestal-all" onPress={onOpenAll} disabled={loading || count === 0} scaleTo={0.96} hitSlop={10} outerStyle={s.allOuter} style={s.all}>
        <Text style={ts.allText} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{spireText(lang, 'allMembers')}</Text>
        <Ionicons name="chevron-forward" size={14} color={LINK} />
      </V2Pressable>
      )}
    </View>
  );
}

export default memo(SpireScenePedestal);

const s = StyleSheet.create({
  wrap: { marginTop: 18, marginLeft: -SPIRE_SCENE_PEDESTAL_INSET },
  dim: { opacity: 0.55 },
  grow: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
  // макет `.pp-head`: заголовок 16/21 800 и число людей 13/17 справа, поля 4 — текст стоит по колонке текста сцены
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, marginHorizontal: SPIRE_SCENE_PEDESTAL_INSET, marginBottom: 10 },
  headTitle: { color: SPIRE_SCENE_INK.text, fontSize: 16, lineHeight: 21, fontWeight: '800' },
  headCount: { color: SPIRE_SCENE_INK.muted, fontSize: 13, lineHeight: 17, fontWeight: '600', fontVariant: ['tabular-nums'] }, // guard-ok: число людей справа от заголовка (макет .pp-head span) — данные комнаты, не подпись-расшифровка
  // макет `.pp-list`: белое стекло 16 %, скругление 22, поля 6 / 10, блик сверху
  list: { borderRadius: 22, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: SPIRE_SCENE_INK.glass, boxShadow: `inset 0 1px 0 ${SPIRE_SCENE_INK.halo}` },
  // макет `.pp-li`: строка 56, зазор 6; между строками — тонкая линия света сверху (`.pp-li + .pp-li`), не обводка
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowDivider: { boxShadow: `inset 0 1px 0 ${DIVIDER}` },
  place: { width: 14, color: SPIRE_SCENE_INK.text, fontSize: 16, lineHeight: 21, fontWeight: '800', textAlign: 'center' },
  name: { color: SPIRE_SCENE_INK.text, fontSize: 16, lineHeight: 21, fontWeight: '700' },
  coinEmpty: { backgroundColor: SPIRE_SCENE_INK.skeletonCoin },
  nameEmpty: { flex: 1, height: 12, borderRadius: 6, backgroundColor: SPIRE_SCENE_INK.skeleton },
  // макет `.pp-me`: стекло 26 %, скругление 18, поля 10 / 12, блик 30 %
  me: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, borderRadius: 18, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: ME_GLASS, boxShadow: `inset 0 1px 0 ${ME_HIGHLIGHT}` },
  sub: { color: SPIRE_SCENE_INK.label, fontSize: 13, lineHeight: 17, fontWeight: '600' }, // guard-ok: ник под своим местом (макет .pp-me .pp-sub) — данные, не подпись-расшифровка
  allOuter: { alignSelf: 'flex-start', marginTop: 10, marginHorizontal: SPIRE_SCENE_PEDESTAL_INSET },
  all: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  allText: { color: LINK, fontSize: 13, lineHeight: 17, fontWeight: '700' },
});
