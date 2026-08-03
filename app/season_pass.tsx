// ════════════════════════════════════════════════════════════════════════════
// season_pass.tsx — экран дорожки Season Pass (макет «Причал»: две линии наград,
// хребет прогресса по центру). Этап-витрина: прогресс уровня считается по-настоящему
// (season_pass_model ← registerXP), выдача наград и покупка дорожки включаются
// в день старта сезона серверными callable (жёсткий гейт владельца: подарок без
// рабочего пути использования в продовую дорожку не попадает).
// зачем: владелец — «на главной плашка, она открывает сезон»; экран обязан жить
// уже сейчас, честно говоря, когда начнётся выдача.
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Text, TouchableOpacity, View, type ListRenderItemInfo } from 'react-native';
import { FlowText } from '../components/text-integrity/FlowText';
import { Stack, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { triLang, type Lang } from '../constants/i18n';
import { actionToastTri, emitAppEvent, onAppEvent } from './events';
import { hapticTap } from '../hooks/use-haptics';
import { pearlIconForTheme } from './coin_icons';
import { safeRouterBack } from './navigation_back';
import TapScale from '../components/TapScale';
import {
  hydrateSeasonPassProgress,
  peekSeasonPassProgress,
  SEASON_PASS_LEVELS,
  seasonPassDaysLeft,
  type SeasonPassProgress,
} from './season_pass_model';
import {
  SEASON_AURA_STAGE_ASSETS,
  SEASON_REWARD_ICONS,
  SEASON_TRACK,
  type SeasonReward,
  type SeasonTrackNode,
} from './season_pass_track_config';
import SeasonAuraRing from '../components/SeasonAuraRing';

const ROW_HEIGHT = 96;
const NODE_COLUMN_WIDTH = 56;
const SPINE_WIDTH = 4;
const SEASON_PASS_PRICE_PEARLS = 250;

const REWARD_LABELS: Record<SeasonReward['kind'], Record<Lang, string>> = {
  pearls:            { ru: 'Жемчужины', uk: 'Перлини', es: 'Perlas', 'pt-BR': 'Pérolas', vi: 'Ngọc trai', id: 'Mutiara', tr: 'İnciler', pl: 'Perły' },
  battery:           { ru: 'Полный заряд', uk: 'Повний заряд', es: 'Carga completa', 'pt-BR': 'Carga completa', vi: 'Sạc đầy', id: 'Isi penuh', tr: 'Tam şarj', pl: 'Pełna energia' },
  league_boost:      { ru: 'Буст лиги ×2', uk: 'Буст ліги ×2', es: 'Impulso liga ×2', 'pt-BR': 'Impulso liga ×2', vi: 'Tăng tốc giải ×2', id: 'Dorongan liga ×2', tr: 'Lig desteği ×2', pl: 'Boost ligi ×2' },
  club_totem:        { ru: 'Тотем клуба', uk: 'Тотем клубу', es: 'Tótem del club', 'pt-BR': 'Totem do clube', vi: 'Vật tổ câu lạc bộ', id: 'Totem klub', tr: 'Kulüp totemi', pl: 'Totem klubu' },
  golden_lesson:     { ru: 'Золотой урок', uk: 'Золотий урок', es: 'Lección dorada', 'pt-BR': 'Lição dourada', vi: 'Bài học vàng', id: 'Pelajaran emas', tr: 'Altın ders', pl: 'Złota lekcja' },
  collection_magnet: { ru: 'Магнит коллекции', uk: 'Магніт колекції', es: 'Imán de colección', 'pt-BR': 'Ímã de coleção', vi: 'Nam châm bộ sưu tập', id: 'Magnet koleksi', tr: 'Koleksiyon mıknatısı', pl: 'Magnes kolekcji' },
  turbo_regen:       { ru: 'Второе дыхание', uk: 'Друге дихання', es: 'Segundo aliento', 'pt-BR': 'Segundo fôlego', vi: 'Hồi phục nhanh', id: 'Napas kedua', tr: 'İkinci nefes', pl: 'Drugi oddech' },
  tournament_ticket: { ru: 'Билет на турнир', uk: 'Квиток на турнір', es: 'Entrada al torneo', 'pt-BR': 'Ingresso do torneio', vi: 'Vé giải đấu', id: 'Tiket turnamen', tr: 'Turnuva bileti', pl: 'Bilet na turniej' },
  time_machine:      { ru: 'Машина времени', uk: 'Машина часу', es: 'Máquina del tiempo', 'pt-BR': 'Máquina do tempo', vi: 'Cỗ máy thời gian', id: 'Mesin waktu', tr: 'Zaman makinesi', pl: 'Wehikuł czasu' },
  friend_battery:    { ru: 'Заряд другу', uk: 'Заряд другові', es: 'Carga para amigo', 'pt-BR': 'Carga para amigo', vi: 'Tặng bạn năng lượng', id: 'Energi untuk teman', tr: 'Arkadaşa şarj', pl: 'Energia dla znajomego' },
  choice_3:          { ru: 'Выбор из трёх', uk: 'Вибір із трьох', es: 'Elige una de tres', 'pt-BR': 'Escolha uma de três', vi: 'Chọn một trong ba', id: 'Pilih satu dari tiga', tr: 'Üçten birini seç', pl: 'Wybór z trzech' },
  xp_bank:           { ru: 'Банк опыта', uk: 'Банк досвіду', es: 'Banco de XP', 'pt-BR': 'Banco de XP', vi: 'Ngân hàng XP', id: 'Bank XP', tr: 'XP bankası', pl: 'Bank XP' },
  plus_days:         { ru: 'Дни Plus', uk: 'Дні Plus', es: 'Días Plus', 'pt-BR': 'Dias Plus', vi: 'Ngày Plus', id: 'Hari Plus', tr: 'Plus günleri', pl: 'Dni Plus' },
  frame:             { ru: 'Рамка профиля', uk: 'Рамка профілю', es: 'Marco de perfil', 'pt-BR': 'Moldura de perfil', vi: 'Khung hồ sơ', id: 'Bingkai profil', tr: 'Profil çerçevesi', pl: 'Ramka profilu' },
  aura_stage:        { ru: 'Аура · стадия', uk: 'Аура · стадія', es: 'Aura · etapa', 'pt-BR': 'Aura · estágio', vi: 'Hào quang · cấp', id: 'Aura · tahap', tr: 'Aura · aşama', pl: 'Aura · etap' },
  nick_color:        { ru: 'Цвет ника', uk: 'Колір ніка', es: 'Color del nombre', 'pt-BR': 'Cor do nome', vi: 'Màu biệt danh', id: 'Warna nama', tr: 'Takma ad rengi', pl: 'Kolor nicku' },
  custom_avatar:     { ru: 'Кастомный аватар', uk: 'Кастомний аватар', es: 'Avatar personalizado', 'pt-BR': 'Avatar personalizado', vi: 'Ảnh đại diện riêng', id: 'Avatar kustom', tr: 'Özel avatar', pl: 'Własny awatar' },
  card_pack:         { ru: 'Набор карточек', uk: 'Набір карток', es: 'Set de tarjetas', 'pt-BR': 'Pacote de cartões', vi: 'Bộ thẻ', id: 'Paket kartu', tr: 'Kart paketi', pl: 'Zestaw fiszek' },
  season_finale:     { ru: 'Финал сезона', uk: 'Фінал сезону', es: 'Final de temporada', 'pt-BR': 'Final da temporada', vi: 'Chung kết mùa', id: 'Final musim', tr: 'Sezon finali', pl: 'Finał sezonu' },
};

export default function SeasonPassScreen() {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const [progress, setProgress] = useState<SeasonPassProgress>(peekSeasonPassProgress);

  useEffect(() => {
    let alive = true;
    hydrateSeasonPassProgress().then((p) => { if (alive) setProgress(p); });
    const sub = onAppEvent('season_pass_xp_changed', () => {
      if (alive) setProgress(peekSeasonPassProgress());
    });
    return () => { alive = false; sub.remove(); };
  }, []);

  const daysLeft = seasonPassDaysLeft();
  const pearlIcon = pearlIconForTheme(themeMode);
  const pct = progress.levelCostXp > 0
    ? Math.min(100, Math.round((progress.intoLevelXp / progress.levelCostXp) * 100))
    : 100;

  // зачем: покупка включается серверным этапом в день старта сезона; кнопка живая
  // (не disabled — правило UX), тап честно объясняет когда. Мгновенный отклик тостом.
  const onBuyPress = useCallback(() => {
    hapticTap();
    emitAppEvent('action_toast', actionToastTri('info', {
      ru: 'Продажа пропуска откроется в день старта сезона',
      uk: 'Продаж перепустки відкриється в день старту сезону',
      es: 'La venta del pase abrirá el día del inicio de temporada',
      'pt-BR': 'A venda do passe abre no dia de início da temporada',
      vi: 'Vé mùa sẽ mở bán vào ngày khai mạc',
      id: 'Penjualan pass dibuka pada hari mulai musim',
      tr: 'Bilet satışı sezon başlangıç günü açılır',
      pl: 'Sprzedaż przepustki ruszy w dniu startu sezonu',
    }));
  }, []);

  const renderReward = useCallback((reward: SeasonReward | undefined, side: 'free' | 'pass', reached: boolean, level: number) => {
    // Пустая сторона — прозрачный заполнитель ТОЙ ЖЕ формы, что и карточка,
    // чтобы высота строки была одинаковой независимо от того, где лежит награда
    // (макет: узкая колонка с одной картой, вторая половина строки пуста).
    if (!reward) return <View style={{ flex: 1, alignSelf: 'stretch' }} />;
    const icon = SEASON_REWARD_ICONS[reward.kind];
    const label = REWARD_LABELS[reward.kind][lang]
      + (reward.kind === 'aura_stage' ? ` ${['I', 'II', 'III', 'IV'][Math.max(0, (reward.amount ?? 1) - 1)]}` : '')
      + (reward.kind === 'plus_days' || reward.kind === 'xp_bank' ? ` ${reward.amount ?? ''}` : '');
    const isPassLane = side === 'pass';
    return (
      <View style={{
        flex: 1,
        alignSelf: 'stretch',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 16,
        paddingHorizontal: 10,
        backgroundColor: isPassLane ? t.goldBg : t.bgCard,
        opacity: reached ? 1 : 0.72,
      }}>
        {reward.kind === 'pearls'
          ? (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Image source={pearlIcon} style={{ width: 20, height: 20 }} resizeMode="contain" accessible={false} />
              <Text style={{ color: t.textOnCard, fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{reward.amount}</Text>
            </View>)
          : reward.kind === 'aura_stage' || reward.kind === 'season_finale'
            ? (() => {
                // season_finale = утверждённый финальный вихрь (та же ассет, что
                // и стадия IV) — уровень 60 не должен показывать общую корону.
                const asset = SEASON_AURA_STAGE_ASSETS[
                  reward.kind === 'season_finale' ? 3 : Math.max(0, Math.min(3, (reward.amount ?? 1) - 1))
                ];
                return (
                  <SeasonAuraRing
                    source={asset.source}
                    size={38}
                    pulse={asset.pulse}
                    spin={asset.spin}
                    pulseDurationMs={asset.pulseMs}
                    spinDurationMs={asset.spinMs}
                  />
                );
              })()
            : icon
              ? <Image source={icon} style={{ width: 34, height: 34 }} resizeMode="contain" accessible={false} />
              : null}
        <FlowText
          testID={`season-pass-reward-label-${level}-${side}`}
          provenance="authored"
          style={{ flex: 1, color: t.textOnCard, fontSize: 11.5, fontWeight: '700', lineHeight: 14 }}
        >
          {reward.kind === 'pearls' ? '' : label}
        </FlowText>
      </View>
    );
  }, [lang, pearlIcon, t]);

  const renderItem = useCallback(({ item, index }: ListRenderItemInfo<SeasonTrackNode>) => {
    const reached = progress.level >= item.level;
    const isCurrent = progress.level + 1 === item.level;
    const isLast = index === SEASON_TRACK.length - 1;
    return (
      <View style={{ height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'stretch', gap: 8, paddingHorizontal: 14 }}>
        {renderReward(item.free, 'free', reached, item.level)}
        <View style={{ width: NODE_COLUMN_WIDTH, alignItems: 'center', justifyContent: 'center' }}>
          {/* Хребет: сегмент СВЕРХУ узла (кроме первой строки) и СНИЗУ (кроме
              последней), пройденный участок закрашен акцентом — та же идея,
              что .a-spine i в макете, но реализована по сегментам под FlatList. */}
          {index > 0 && (
            <View style={{
              position: 'absolute', top: 0, left: '50%', marginLeft: -SPINE_WIDTH / 2,
              width: SPINE_WIDTH, height: ROW_HEIGHT / 2, borderRadius: SPINE_WIDTH / 2,
              backgroundColor: progress.level >= item.level - 1 ? t.gold : t.bgSurface,
            }} />
          )}
          {!isLast && (
            <View style={{
              position: 'absolute', bottom: 0, left: '50%', marginLeft: -SPINE_WIDTH / 2,
              width: SPINE_WIDTH, height: ROW_HEIGHT / 2, borderRadius: SPINE_WIDTH / 2,
              backgroundColor: reached ? t.gold : t.bgSurface,
            }} />
          )}
          <View style={{
            width: isCurrent ? 36 : 30,
            height: isCurrent ? 36 : 30,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: reached ? t.gold : isCurrent ? t.accentBg : t.bgSurface,
            zIndex: 2,
          }}>
            <Text style={{
              color: reached ? t.textOnGold : isCurrent ? t.accent : t.textMuted,
              fontSize: isCurrent ? 14 : 12,
              fontWeight: '900',
              fontVariant: ['tabular-nums'],
            }}>
              {item.level}
            </Text>
          </View>
        </View>
        {renderReward(item.pass, 'pass', reached, item.level)}
      </View>
    );
  }, [progress.level, renderReward, t]);

  const getItemLayout = useCallback((_: unknown, index: number) => (
    { length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index }
  ), []);

  const header = useMemo(() => (
    <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <TapScale
          onPress={() => safeRouterBack(router)}
          accessibilityLabel={triLang(lang, {
            ru: 'Назад', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar',
            vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
          })}
          accessibilityRole="button"
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
        </TapScale>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Text style={{ color: t.textPrimary, fontSize: Math.max(24, f.h1), fontWeight: '900', letterSpacing: -0.3 }}>
          {triLang(lang, {
            ru: 'Сезон 1', uk: 'Сезон 1', es: 'Temporada 1', 'pt-BR': 'Temporada 1',
            vi: 'Mùa 1', id: 'Musim 1', tr: 'Sezon 1', pl: 'Sezon 1',
          })}
        </Text>
        <Text style={{ color: t.textSecond, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
          {triLang(lang, {
            ru: `${daysLeft} дн.`, uk: `${daysLeft} дн.`, es: `${daysLeft} d`, 'pt-BR': `${daysLeft} d`,
            vi: `${daysLeft} ngày`, id: `${daysLeft} hr`, tr: `${daysLeft} g`, pl: `${daysLeft} dni`,
          })}
        </Text>
      </View>
      <View style={{ marginTop: 12, borderRadius: 18, backgroundColor: t.bgCard, padding: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: t.textSecond, fontSize: 13, fontWeight: '700' }}>
            {triLang(lang, {
              ru: `Уровень ${progress.level} из ${SEASON_PASS_LEVELS}`,
              uk: `Рівень ${progress.level} із ${SEASON_PASS_LEVELS}`,
              es: `Nivel ${progress.level} de ${SEASON_PASS_LEVELS}`,
              'pt-BR': `Nível ${progress.level} de ${SEASON_PASS_LEVELS}`,
              vi: `Cấp ${progress.level}/${SEASON_PASS_LEVELS}`,
              id: `Level ${progress.level}/${SEASON_PASS_LEVELS}`,
              tr: `Seviye ${progress.level}/${SEASON_PASS_LEVELS}`,
              pl: `Poziom ${progress.level} z ${SEASON_PASS_LEVELS}`,
            })}
          </Text>
          <Text style={{ color: t.textPrimary, fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
            {progress.intoLevelXp}/{progress.levelCostXp} XP
          </Text>
        </View>
        <View style={{ height: 10, borderRadius: 6, overflow: 'hidden', backgroundColor: t.bgSurface }}>
          <View style={{ height: '100%', width: `${pct}%`, borderRadius: 6, backgroundColor: t.gold }} />
        </View>
      </View>
      {/* зачем: честность до старта — выдача наград включается серверным этапом,
          экран не притворяется, что «Забрать» уже работает (гейт владельца). */}
      <View style={{ marginTop: 10, borderRadius: 16, backgroundColor: t.accentBg, paddingHorizontal: 14, paddingVertical: 11 }}>
        <Text style={{ color: t.textOnCard, fontSize: 13, fontWeight: '700', lineHeight: 18 }}>
          {triLang(lang, {
            ru: 'Витрина сезона. Очки уже копятся за занятия, выдача наград откроется в день старта.',
            uk: 'Вітрина сезону. Бали вже накопичуються, видача нагород відкриється в день старту.',
            es: 'Vista previa. Los puntos ya cuentan; las recompensas se entregan desde el día de inicio.',
            'pt-BR': 'Prévia. Os pontos já contam; as recompensas abrem no dia de início.',
            vi: 'Bản xem trước. Điểm đã được tính; phần thưởng mở vào ngày khai mạc.',
            id: 'Pratinjau. Poin sudah dihitung; hadiah dibuka pada hari mulai.',
            tr: 'Ön izleme. Puanlar sayılıyor; ödüller başlangıç günü açılır.',
            pl: 'Podgląd. Punkty już się liczą; nagrody ruszą w dniu startu.',
          })}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, marginTop: 16, marginBottom: 2 }}>
        <Text /* guard-ok: заголовок КОЛОНКИ дорожки (шапка таблицы над рядами наград), не подпись под названием экрана */ style={{ color: t.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 0.4 }}>
          {triLang(lang, { ru: 'БЕСПЛАТНО', uk: 'БЕЗКОШТОВНО', es: 'GRATIS', 'pt-BR': 'GRÁTIS', vi: 'MIỄN PHÍ', id: 'GRATIS', tr: 'ÜCRETSİZ', pl: 'DARMOWE' })}
        </Text>
        <Text style={{ color: t.gold, fontSize: 12, fontWeight: '800', letterSpacing: 0.4 }}>
          {triLang(lang, { ru: 'ПРОПУСК', uk: 'ПЕРЕПУСТКА', es: 'PASE', 'pt-BR': 'PASSE', vi: 'VÉ MÙA', id: 'PASS', tr: 'BİLET', pl: 'PRZEPUSTKA' })}
        </Text>
      </View>
    </View>
  ), [daysLeft, f.h1, lang, pct, progress.intoLevelXp, progress.level, progress.levelCostXp, router, t]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bgPrimary }}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={SEASON_TRACK as SeasonTrackNode[]}
        keyExtractor={(n) => String(n.level)}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        ListHeaderComponent={header}
        initialNumToRender={10}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: insets.bottom + 14, paddingTop: 10 }}>
        <TouchableOpacity
          testID="season-pass-buy"
          activeOpacity={0.85}
          onPress={onBuyPress}
          accessibilityRole="button"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderRadius: 18,
            paddingVertical: 16,
            backgroundColor: t.gold,
          }}
        >
          <Text style={{ color: t.textOnGold, fontSize: 16, fontWeight: '900' }}>
            {triLang(lang, {
              ru: 'Открыть пропуск', uk: 'Відкрити перепустку', es: 'Abrir pase', 'pt-BR': 'Abrir passe',
              vi: 'Mở vé mùa', id: 'Buka pass', tr: 'Bileti aç', pl: 'Otwórz przepustkę',
            })}
          </Text>
          <Image source={pearlIcon} style={{ width: 18, height: 18 }} resizeMode="contain" accessible={false} />
          <Text style={{ color: t.textOnGold, fontSize: 16, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
            {SEASON_PASS_PRICE_PEARLS}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
