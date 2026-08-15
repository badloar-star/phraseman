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
import { emitAppEvent, onAppEvent } from '../app/events';
import { triLang, type Lang } from '../constants/i18n';
import { isPrimaryBoonActive } from '../app/boons/boon_engine';
import {
  pickMysteryReward,
  currentWeekId,
  isClaimed,
  markClaimed,
  grantBoonReward,
  MYSTERY_MONDAY_CLAIM_KEY,
  type BoonReward,
} from '../app/boons/boon_rewards';
import { getThemedShardIcon } from '../constants/levelGiftRewardIcons';
import {
  ruKnowledgeShardsAfterNumber,
  ukKnowledgeShardsAfterNumber,
} from '../constants/shard_plurals';
import BoonChestModal, { type BoonChestRarity } from './BoonChestModal';

const CLAIM_KEY = MYSTERY_MONDAY_CLAIM_KEY;

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

/**
 * Размер награды → «редкость» сундука (драма растёт с призом).
 * зачем: пороги привязаны к актуальной шкале MYSTERY_TIERS (1/2/3/5). Старые
 * пороги 8/15 после перехода на скромную шкалу стали недостижимы — сундук
 * всегда был бы голубым, и золотой топ-тир не читался как редкая удача.
 */
function rarityForShards(shards: number): BoonChestRarity {
  if (shards >= 5) return 'epic';
  if (shards >= 3) return 'rare';
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
    let generation = 0;

    const clearPending = () => {
      setWantShow(false);
      setReward(null);
    };

    const evaluate = async (currentGeneration: number) => {
      if (!isPrimaryBoonActive('mystery_monday')) {
        if (alive && currentGeneration === generation) clearPending();
        return;
      }
      // Во время онбординга сундук не показываем (он на базе RN Modal — вылез бы поверх
      // полноэкранного онбординг-оверлея). Гейт стоит ДО setWantShow → слот арбитра не
      // занимается зря и не голодит тосты. onboarding_done пишется значением '1'.
      const onboardingDone = await AsyncStorage.getItem('onboarding_done').catch(() => null);
      if (onboardingDone !== '1') return;
      const week = currentWeekId();
      if (await isClaimed(CLAIM_KEY, week)) return;
      if (
        alive
        && currentGeneration === generation
        && isPrimaryBoonActive('mystery_monday')
      ) {
        claimedRef.current = false;
        setReward(pickMysteryReward(rollFromWeek(week)));
        setWantShow(true);
      } else if (alive && currentGeneration === generation) {
        clearPending();
      }
    };

    const refresh = () => {
      const currentGeneration = ++generation;
      if (!isPrimaryBoonActive('mystery_monday')) clearPending();
      void evaluate(currentGeneration).catch(() => {});
    };

    refresh();
    const remoteConfigSub = onAppEvent('remote_config_changed', refresh);
    return () => {
      alive = false;
      generation += 1;
      remoteConfigSub.remove();
    };
  }, []);

  /** Начислить осколки строго один раз за неделю (анти-двойная-выдача). */
  const claim = async () => {
    if (claimedRef.current || !reward) return;
    if (!isPrimaryBoonActive('mystery_monday')) {
      setWantShow(false);
      setReward(null);
      return;
    }
    claimedRef.current = true;
    const week = currentWeekId();
    if (await isClaimed(CLAIM_KEY, week)) return;
    if (!isPrimaryBoonActive('mystery_monday')) {
      claimedRef.current = false;
      setWantShow(false);
      setReward(null);
      return;
    }
    if (!isPrimaryBoonActive('mystery_monday')) {
      setWantShow(false);
      setReward(null);
      return;
    }
    await grantBoonReward(
      reward,
      'boon_mystery_monday',
      week,
      [[CLAIM_KEY, week]],
    );
    // Плашка «Сундук недели» в статистике должна сразу сменить текст на «уже открыт».
    emitAppEvent('mystery_chest_claimed');
  };

  if (!visible || !reward) return null;

  const rarity = rarityForShards(reward.shards);

  const title = L(
    'Сундук недели', 'Скриня тижня', 'Cofre de la semana', 'Baú da semana',
    'Rương của tuần', 'Peti minggu ini', 'Haftanın sandığı', 'Skrzynia tygodnia',
  );
  // зачем: число склоняем — при тире «1» без склонения выходило «1 жемчужин».
  // Сказуемое тоже согласуем по числу («1 жемчужина — теперь твоя»).
  // UK-строка раньше содержала русское «жемчужин»; правильное слово — «перлина/перлин».
  const one = reward.shards % 10 === 1 && reward.shards % 100 !== 11;
  const rewardLine = L(
    `${reward.shards} ${ruKnowledgeShardsAfterNumber(reward.shards)} — теперь ${one ? 'твоя' : 'твои'}`,
    `${reward.shards} ${ukKnowledgeShardsAfterNumber(reward.shards)} — тепер ${one ? 'твоя' : 'твої'}`,
    `${reward.shards} perlas — ahora son tuyos`,
    `${reward.shards} perlas — agora são seus`,
    `${reward.shards} mảnh — giờ là của bạn`,
    `${reward.shards} serpihan — kini milikmu`,
    `${reward.shards} parça — artık senin`,
    `${reward.shards} monet — teraz twoje`,
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
