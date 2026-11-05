// ═══════════════════════════════════════════════════════════════════════════
// SpireAllMembers.tsx — «Все участники»: строки комнаты с зонами повышения/понижения.
//
// зачем: макет делит 30 строк на «Зона повышения / Остаются / Зона понижения». Размер
// зоны — не константа 5, а SPIRE_ZONE_RATIO (15%) от размера комнаты, как у правил
// сервера (spireLiveZoneSize); понижение забирает и всех с нулём ступеней (TOWER §4.5).
// D190 (режим монет): зоны — та же функция, что у итога недели (shared/spire_coins_zones.ts): k лучших живых вверх,
// k последних вниз, нули сверх k остаются; боты в зоны не попадают.
// Ранга монеты у участников в данных комнаты нет — вместо монеты кружок с инициалом.
// Пакет B (30.09): строки — живая комната недели (живые + боты формулой + свои локальные
// ступени); шапка своя, без обрезки текста в одну строку (подпись «камень · N человек»).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Lang } from '../../constants/i18n';
import { V2 } from '../../constants/v2Style';
import { spireZonesFor, type SpireZone } from './spire_zones';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { useSpirePalette } from './useSpirePalette';
import SpireRankCoin from './SpireRankCoin';
import V2Pressable from '../v2/V2Pressable';
import type { PlayerInfo } from '../PlayerProfileModal';
import SpirePlayerCard from './scene/SpirePlayerCard';
import { spireText } from './spire_strings';
import { spireCoinsCount, spireGroupThousands } from './spire_plurals';
import { spireSortMembers, type SpireMemberRow, type SpireRankByView } from './spire_room_types';
import ScreenBackButton, { SCREEN_BACK_RESERVED, SCREEN_BACK_SIZE, ScreenOriginReset } from '../v2/ScreenBackButton';

export { spireZonesFor };

type Zone = SpireZone;


type Props = Readonly<{ lang: Lang; members: readonly SpireMemberRow[]; subtitle?: string; onBack: () => void; rankBy?: SpireRankByView }>;

function SpireAllMembers({ lang, members, onBack, rankBy = 'coins' }: Props) {
  const p = useSpirePalette();
  const insets = useStableSafeAreaInsets();
  const [player, setPlayer] = useState<PlayerInfo | null>(null);
  const myName = members.find((member) => member.isMe)?.name ?? '';
  const { rows, zones } = useMemo(() => {
    const sorted = spireSortMembers(members, rankBy);
    return { rows: sorted, zones: spireZonesFor(sorted, rankBy) };
  }, [members, rankBy]);

  const renderZone = (zone: Zone) => {
    const items = rows.map((m, i) => ({ m, i })).filter(({ i }) => zones[i] === zone);
    if (items.length === 0) return null;
    return (
      <View key={zone}>
        {/* зачем (владелец 05.11, «1 в 1» с variant_A_all): зоны разделены тонкой линией БЕЗ заголовков «ЗОНА ПОВЫШЕНИЯ / ОСТАЮТСЯ…»; первая зона — без линии сверху */}
        {zone !== 'up' && items.length > 0 && rows.length > 0 ? <View style={[s.zoneLine, { backgroundColor: p.hairline }]} testID={`spire-all-zone-line-${zone}`} /> : null}
        {items.map(({ m, i }) => (
          <V2Pressable
            key={m.uid}
            testID={`spire-all-member-${m.uid}`}
            accessibilityRole="button"
            onPress={() => setPlayer({
              uid: m.uid, name: m.name, isMe: m.isMe,
              points: m.weekCoins ?? 0,
              coinRank: m.coinRank ?? null, isPremium: m.isPremium === true,
            })}
            style={[s.row, m.isMe ? { backgroundColor: p.cardRaised } : null]}
            accessible
            accessibilityLabel={`${i + 1}. ${m.name}${m.isMe ? `, ${spireText(lang, 'you')}` : ''}, ${spireCoinsCount(lang, m.weekCoins ?? 0)}`}
          >
            {/* зачем (макет): у зоны повышения слева зелёная вертикальная линия */}
            {zone === 'up' ? <View pointerEvents="none" style={[s.upLine, { backgroundColor: p.correct }]} testID={`spire-all-up-line-${m.uid}`} /> : null}
            <Text style={[s.place, { color: p.textSecondary }]}>{i + 1}</Text>
            <SpireRankCoin rank={m.coinRank} size={40} plus={false} />
            {/* зачем (макет): у «я» вместо бейджа «Ты» — имя «Ты» на плашке; число — приглушённое, БЕЗ слов (монеты/ступени) */}
            <Text style={[s.name, { color: p.text }]} numberOfLines={2}>{m.isMe ? spireText(lang, 'you') : m.name}</Text>
            <Text style={[s.steps, { color: p.textSecondary }]}>{spireGroupThousands(m.weekCoins ?? 0)}</Text>
            <View style={s.arrowSlot}>{zone === 'up' ? <Ionicons name="arrow-up" size={22} color={p.correct} /> : null}</View>
          </V2Pressable>
        ))}
      </View>
    );
  };

  return (
    // зачем (координатор 22.10, вариант А): подвид вкладки — полноэкранное окно поверх шапки «Друзья/Пик/Наборы»; «назад» — общая кнопка
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onBack} statusBarTranslucent navigationBarTranslucent>
    <ScreenOriginReset>
    <View style={[s.root, { backgroundColor: p.bg, paddingTop: insets.top }]} testID="spire-all-screen">
      <View style={s.header}>
        <View style={s.headText}>
          <Text accessibilityRole="header" style={[s.headTitle, { color: p.text }]}>{spireText(lang, 'allMembers')}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} decelerationRate="fast">
        {/* зачем (координатор 05.11): пустой список без пояснения выглядел как поломка — короткая строка, без длинной расшифровки */}
        {rows.length === 0 ? <Text testID="spire-all-empty" style={[s.empty, { color: p.textSecondary }]}>{spireText(lang, 'allEmpty')}</Text> : null}
        {renderZone('up')}
        {renderZone('stay')}
        {renderZone('down')}
      </ScrollView>
      <ScreenBackButton screen="spire_all" testID="spire-all-back" accessibilityLabel={spireText(lang, 'back')} onPress={onBack} />
      {/* Визитка внутри окна списка: поверх него и с возвратом к тем же участникам. */}
      <SpirePlayerCard player={player} myName={myName} onClose={() => setPlayer(null)} />
    </View>
    </ScreenOriginReset>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  // зачем (закон «назад в одном месте»): заголовок справа от общей кнопки и по её центру (как .topbar макета)
  header: { paddingLeft: SCREEN_BACK_RESERVED, paddingRight: V2.screenPad, minHeight: SCREEN_BACK_SIZE, flexDirection: 'row', alignItems: 'center' },
  headText: { flex: 1, minWidth: 0 },
  headTitle: { fontSize: 26, lineHeight: 30, fontWeight: '700', letterSpacing: -0.3 },
  content: { paddingHorizontal: V2.screenPad, paddingBottom: 40 },
  empty: { fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: 48 },
  zoneLine: { height: 1, marginVertical: 10, marginHorizontal: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 62, paddingVertical: 8, paddingLeft: 12, paddingRight: 14, borderRadius: 18 },
  upLine: { position: 'absolute', left: -4, top: 8, bottom: 8, width: 3, borderRadius: 2 },
  arrowSlot: { width: 22, alignItems: 'center' },
  place: { minWidth: 26, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  name: { flex: 1, minWidth: 0, fontSize: 18, fontWeight: '700' },
  steps: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
});

export default memo(SpireAllMembers);
