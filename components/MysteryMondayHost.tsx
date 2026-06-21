/**
 * MysteryMondayHost — модал «Загадочный понедельник» (Weekly Boon mystery_monday).
 *
 * Первый вход в день с активным бонусом mystery_monday → открыть «сундук недели» с
 * переменной наградой (осколки). Раз в неделю (claim-ключ по weekId). Монтируется из
 * _layout.tsx внутри OverlayArbiterProvider; видимостью управляет арбитр через
 * useOverlayVisible('mysteryMondayChest', …) — правило «авто-модалка главной идёт
 * через арбитр, не через свой visible» (иначе риск фриза, см. OverlayArbiter.tsx).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { useOverlayVisible } from './OverlayArbiter';
import { triLang, type Lang } from '../constants/i18n';
import { getTodaysBoons } from '../app/boons/boon_engine';
import {
  pickMysteryReward,
  currentWeekId,
  isClaimed,
  markClaimed,
  grantBoonReward,
  type BoonReward,
} from '../app/boons/boon_rewards';
import { weeklyBoonIconSource } from '../constants/boonIconAssets';

const CLAIM_KEY = 'boon_mystery_monday_claimed_v1';

function makeL(lang: Lang) {
  return (ru: string, uk: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
}

// Псевдослучайный roll из weekId — стабилен в пределах недели, без Math.random в рендере.
function rollFromWeek(weekId: string): number {
  let h = 2166136261;
  for (let i = 0; i < weekId.length; i++) {
    h ^= weekId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

export default function MysteryMondayHost() {
  const { theme: t, themeMode } = useTheme();
  const { lang } = useLang();
  const L = makeL(lang as Lang);

  const [wantShow, setWantShow] = useState(false);
  const [reward, setReward] = useState<BoonReward | null>(null);
  const [opened, setOpened] = useState(false);
  const visible = useOverlayVisible('mysteryMondayChest', wantShow);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (getTodaysBoons().primary !== 'mystery_monday') return;
      const week = currentWeekId();
      if (await isClaimed(CLAIM_KEY, week)) return;
      if (alive) {
        setReward(pickMysteryReward(rollFromWeek(week)));
        setWantShow(true);
      }
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 80 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [visible, scale, opacity]);

  const open = async () => {
    if (opened || !reward) return;
    setOpened(true);
    const week = currentWeekId();
    // Помечаем claim ДО выдачи и в строгом порядке (await), чтобы повторный показ/
    // перемонтирование не выдали награду дважды. Если уже заклеймлено — выходим.
    if (await isClaimed(CLAIM_KEY, week)) return;
    await markClaimed(CLAIM_KEY, week);
    await grantBoonReward(reward, 'boon_mystery_monday');
  };

  const close = () => {
    // Если юзер тапнул по фону, ещё НЕ открыв сундук — не прячем молча с тихой выдачей
    // (тогда reveal и сумма награды не показываются). Вместо этого ОТКРЫВАЕМ сундук на
    // месте: пройдёт reveal, покажется «N осколков — твои», и закрыть можно кнопкой
    // «Забрать». Так дофаминовый момент не пропадает (аудит P2 #13).
    if (!opened) {
      void open();
      return;
    }
    setWantShow(false);
  };

  if (!visible || !reward) return null;

  const accent = (t as { accent?: string }).accent ?? '#7C5CFF';
  const bgCard = (t as { bgCard?: string; bgPrimary?: string }).bgCard
    ?? (t as { bgPrimary?: string }).bgPrimary ?? '#15181a';
  const textPrimary = (t as { textPrimary?: string }).textPrimary ?? '#FFFFFF';
  const textSecond = (t as { textSecond?: string }).textSecond ?? 'rgba(255,255,255,0.7)';
  const iconSource = weeklyBoonIconSource('mystery_monday', themeMode);

  const title = L(
    'Сундук недели', 'Скриня тижня', 'Cofre de la semana', 'Baú da semana',
    'Rương của tuần', 'Peti minggu ini', 'Haftanın sandığı', 'Skrzynia tygodnia',
  );
  const sub = opened
    ? L(
        `${reward.shards} осколков — теперь твои.`,
        `${reward.shards} осколків — тепер твої.`,
        `${reward.shards} fragmentos: ahora son tuyos.`,
        `${reward.shards} fragmentos: agora são seus.`,
        `${reward.shards} mảnh — giờ là của bạn.`,
        `${reward.shards} serpihan — kini milikmu.`,
        `${reward.shards} parça — artık senin.`,
        `${reward.shards} odłamków — teraz twoje.`,
      )
    : L(
        'Внутри награда. Открой и забери своё.',
        'Усередині нагорода. Відкрий і забери своє.',
        'Dentro hay una recompensa. Ábrelo, es tuyo.',
        'Dentro tem recompensa. Abra, é seu.',
        'Bên trong có phần thưởng. Mở và nhận.',
        'Ada hadiah di dalam. Buka dan ambil.',
        'İçinde ödül var. Aç ve seninki olsun.',
        'W środku nagroda. Otwórz i bierz swoje.',
      );
  const cta = opened
    ? L('Забрать', 'Забрати', 'Recoger', 'Pegar', 'Nhận', 'Ambil', 'Al', 'Odbierz')
    : L('Открыть сундук', 'Відкрити скриню', 'Abrir cofre', 'Abrir baú', 'Mở rương', 'Buka peti', 'Sandığı aç', 'Otwórz skrzynię');

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Animated.View
            testID="mystery-monday-card"
            style={[styles.card, { backgroundColor: bgCard, transform: [{ scale }], opacity }]}
          >
            <View style={styles.badge}>
              <Image source={iconSource} resizeMode="contain" style={styles.boonIcon} />
            </View>
            <Text style={[styles.title, { color: textPrimary }]}>{title}</Text>
            <Text style={[styles.body, { color: textSecond }]}>{sub}</Text>
            <Pressable
              testID="mystery-monday-cta"
              onPress={opened ? close : open}
              style={[styles.primaryBtn, { backgroundColor: accent }]}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>{cta}</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, borderRadius: 22, paddingHorizontal: 22, paddingVertical: 26, alignItems: 'center' },
  badge: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  boonIcon: { width: 76, height: 76 },
  title: { fontSize: 21, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 22 },
  primaryBtn: { alignSelf: 'stretch', height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
