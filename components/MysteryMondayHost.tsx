/**
 * MysteryMondayHost — модал «Сундук недели» (Weekly Boon mystery_monday).
 *
 * Первый вход в день с активным бонусом mystery_monday → объёмный сундук-награда
 * (общий BoonChestModal, тот же визуальный язык, что и подарок за уровень): парит →
 * тап → крышка отлетает → награда-орб (осколки) всплывает. Раз в неделю (claim-ключ
 * по weekId). Монтируется из _layout.tsx внутри OverlayArbiterProvider; видимостью
 * управляет арбитр через useOverlayVisible('mysteryMondayChest', …).
 *
 * «Дороговизна» сундука растёт с размером награды: 3/5 → energy (голубой),
 * 8 → glow (фиолет), 15 → gold (золото).
 */
import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { getThemedShardIcon } from '../constants/levelGiftRewardIcons';
import BoonChestModal, { type BoonChestRarity } from './BoonChestModal';

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

/** Размер награды → «редкость» сундука (драма растёт с призом). */
function rarityForShards(shards: number): BoonChestRarity {
  if (shards >= 15) return 'epic';
  if (shards >= 8) return 'rare';
  return 'common';
}

export default function MysteryMondayHost() {
  const { themeMode } = useTheme();
  const { lang } = useLang();
  const L = makeL(lang as Lang);

  const [wantShow, setWantShow] = useState(false);
  const [reward, setReward] = useState<BoonReward | null>(null);
  const claimedRef = useRef(false);
  const visible = useOverlayVisible('mysteryMondayChest', wantShow);

  // Подобрать награду на первый вход в активный день (раз в неделю).
  useEffect(() => {
    let alive = true;
    (async () => {
      if (getTodaysBoons().primary !== 'mystery_monday') return;
      // Во время онбординга сундук не показываем (он на базе RN Modal — вылез бы поверх
      // полноэкранного онбординг-оверлея). Гейт стоит ДО setWantShow → слот арбитра не
      // занимается зря и не голодит тосты. onboarding_done пишется значением '1'.
      const onboardingDone = await AsyncStorage.getItem('onboarding_done').catch(() => null);
      if (onboardingDone !== '1') return;
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

  /** Начислить осколки строго один раз за неделю (анти-двойная-выдача). */
  const claim = async () => {
    if (claimedRef.current || !reward) return;
    claimedRef.current = true;
    const week = currentWeekId();
    if (await isClaimed(CLAIM_KEY, week)) return;
    await markClaimed(CLAIM_KEY, week);
    await grantBoonReward(reward, 'boon_mystery_monday');
  };

  if (!visible || !reward) return null;

  const rarity = rarityForShards(reward.shards);

  const title = L(
    'Сундук недели', 'Скриня тижня', 'Cofre de la semana', 'Baú da semana',
    'Rương của tuần', 'Peti minggu ini', 'Haftanın sandığı', 'Skrzynia tygodnia',
  );
  const rewardLine = L(
    `${reward.shards} осколков — теперь твои`,
    `${reward.shards} осколків — тепер твої`,
    `${reward.shards} fragmentos — ahora son tuyos`,
    `${reward.shards} fragmentos — agora são seus`,
    `${reward.shards} mảnh — giờ là của bạn`,
    `${reward.shards} serpihan — kini milikmu`,
    `${reward.shards} parça — artık senin`,
    `${reward.shards} odłamków — teraz twoje`,
  );
  const tapHint = L(
    'Нажми, чтобы открыть', 'Натисни, щоб відкрити', 'Toca para abrir', 'Toque para abrir',
    'Nhấn để mở', 'Ketuk untuk membuka', 'Açmak için dokun', 'Dotknij, aby otworzyć',
  );
  const claimCta = L('Забрать', 'Забрати', 'Recoger', 'Pegar', 'Nhận', 'Ambil', 'Al', 'Odbierz');
  const closeLabel = L('Закрыть', 'Закрити', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij');

  return (
    <BoonChestModal
      visible={visible}
      rarity={rarity}
      rewardIcon={getThemedShardIcon(themeMode)}
      title={title}
      rewardLine={rewardLine}
      tapHint={tapHint}
      claimCta={claimCta}
      closeLabel={closeLabel}
      onClaim={() => { void claim(); }}
      onClose={() => setWantShow(false)}
    />
  );
}
