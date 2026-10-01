import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { COIN_RANK_TABLE, coinRankTitle } from '../../app/coin_rank_table_v1';
import { triLang, type Lang } from '../../constants/i18n';
import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';

// зачем (владелец 2026-09-30, coins.html «каталог рангов 00–19»): полный ряд из 20 монет-рангов
// одной сеткой 4×5 — плитка `.rank-cell` (radius 15, монета 50, подпись «Ранг N»), текущий ранг
// подсвечен тоном. Только ВИД поверх существующей таблицы COIN_RANK_TABLE: цены, повышение и
// списание монет здесь не участвуют; название металла/уровня не выдумываем.

type Glass = ReturnType<typeof liquidGlassTokens>;

const COPY = {
  ru: { title: 'Ранги монеты', rank: 'Ранг' },
  uk: { title: 'Ранги монети', rank: 'Ранг' },
  en: { title: 'Coin ranks', rank: 'Rank' },
  es: { title: 'Rangos de moneda', rank: 'Rango' },
  'pt-BR': { title: 'Ranks da moeda', rank: 'Rank' },
  vi: { title: 'Hạng đồng xu', rank: 'Hạng' },
  id: { title: 'Peringkat koin', rank: 'Peringkat' },
  tr: { title: 'Jeton sıraları', rank: 'Sıra' },
  pl: { title: 'Rangi monety', rank: 'Ranga' },
} as const;

type Props = Readonly<{
  glass: Glass;
  lang: Lang;
  /** Текущий ранг (null, пока неизвестен) — плитка подсвечивается. */
  currentRank: number | null;
}>;

function CoinRankCatalog({ glass, lang, currentRank }: Props) {
  const copy = triLang(lang, COPY);
  return (
    <View testID="coin-rank-catalog" style={styles.wrap}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={[styles.title, { color: glass.text }]}>{copy.title}</Text>
      <View style={styles.grid}>
        {COIN_RANK_TABLE.map((row) => {
          const on = currentRank === row.rank;
          return (
            <View
              key={row.rank}
              testID={`coin-rank-catalog-cell-${row.rank}`}
              accessible
              accessibilityLabel={`${copy.rank} ${row.rank}, ${coinRankTitle(row.rank, lang)}`}
              accessibilityState={{ selected: on }}
              style={[
                styles.cell,
                {
                  backgroundColor: on ? glass.selected : glass.opaqueCard,
                  borderColor: glass.glassEdge, // guard-ok: 1 px кромка плитки макета
                },
              ]}
            >
              <Image source={row.source} contentFit="contain" style={styles.coin} accessible={false} />
              <Text maxFontSizeMultiplier={1.2} style={[styles.label, { color: on ? glass.text : glass.secondary }]}>
                {`${copy.rank} ${row.rank}`}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, paddingTop: 8 },
  title: { fontSize: 20, lineHeight: 25, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: {
    width: '22.5%',
    flexGrow: 1,
    minHeight: 88,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
  },
  coin: { width: 50, height: 50 },
  label: { fontSize: 11, lineHeight: 15, marginTop: 4, textAlign: 'center' },
});

export default memo(CoinRankCatalog);
