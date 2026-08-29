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
import BoonChestModal, { type BoonChestRarity } from './BoonChestModal';

const CLAIM_KEY = MYSTERY_MONDAY_CLAIM_KEY;

/**
 * «Сундук недели этой недели уже показывали» — переживает перезапуск.
 *
 * зачем (владелец, 2026-08-26, «он появляется каждый раз, когда я захожу»):
 * замок показа жил только в памяти (`shownWeekRef`), поэтому любой путь, при
 * котором награда не была забрана — закрытие крестиком, «Позже», выгрузка
 * приложения на анимации открытия — возвращал сундук при следующем запуске.
 * Владелец видел одну и ту же модалку бесконечно. Теперь показ фиксируется на
 * диске: одна неделя — один показ, независимо от того, чем он закончился.
 */
const MYSTERY_MONDAY_SHOWN_KEY = 'boon_mystery_monday_shown_v1';

function makeL(lang: Lang) {
  return (ru: string, uk: string, en: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang, { ru, uk, en, es, 'pt-BR': ptBr, vi, id, tr, pl });
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
  const { lang } = useLang();
  const L = makeL(lang as Lang);

  const [wantShow, setWantShow] = useState(false);
  const [reward, setReward] = useState<BoonReward | null>(null);
  const claimedRef = useRef(false);
  /**
   * Неделя, за которую сундук УЖЕ показан в этом запуске приложения.
   *
   * зачем (владелец, 2026-08-26 — «показался два раза подряд»): `refresh()`
   * вызывается и при монтировании, и на каждое событие `remote_config_changed`.
   * Конфиг обычно приходит через секунду-другую после старта, поэтому вторая
   * проверка заставала сундук ещё не забранным и открывала модалку ПОВТОРНО.
   * Замок держим по weekId, а не булевым флагом: смена недели обязана снова
   * разрешить показ.
   */
  const shownWeekRef = useRef<string | null>(null);
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
      // Второй показ за один запуск не нужен: см. shownWeekRef.
      if (shownWeekRef.current === week) return;
      // Показ за эту неделю уже был (в т.ч. в прошлом запуске) — не повторяем.
      if (await isClaimed(MYSTERY_MONDAY_SHOWN_KEY, week)) return;
      if (
        alive
        && currentGeneration === generation
        && isPrimaryBoonActive('mystery_monday')
      ) {
        shownWeekRef.current = week;
        claimedRef.current = false;
        // Пишем ДО показа: если приложение убьют на анимации, сундук не
        // вернётся навсегда. Награда при этом не теряется — см. claim().
        await markClaimed(MYSTERY_MONDAY_SHOWN_KEY, week);
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

  // зачем: редкость приехала отдельным полем (см. BoonReward.rarityShards) —
  // `shards` теперь честный ноль выплаты и цвет по нему был бы всегда common.
  const rarity = rarityForShards(reward.rarityShards ?? reward.shards);

  const title = L(
    'Сундук недели', 'Скриня тижня', 'Weekly chest', 'Cofre de la semana', 'Baú da semana',
    'Rương của tuần', 'Peti minggu ini', 'Haftanın sandığı', 'Skrzynia tygodnia',
  );
  // зачем (владелец, 2026-08-26): наградой были жемчужины — заменены на спин
  // общей рулетки. Число склоняем: «1 спин», «2 спина», «5 спинов».
  const spins = Math.max(1, Math.floor(Number(reward.spins) || 1));
  const spinOne = spins % 10 === 1 && spins % 100 !== 11;
  const spinFew = spins % 10 >= 2 && spins % 10 <= 4 && (spins % 100 < 12 || spins % 100 > 14);
  const ruSpin = spinOne ? 'спин' : spinFew ? 'спина' : 'спинов';
  const ukSpin = spinOne ? 'спін' : spinFew ? 'спіни' : 'спінів';
  const rewardLine = L(
    `${spins} ${ruSpin} — ${spinOne ? 'теперь твой' : 'теперь твои'}`,
    `${spins} ${ukSpin} — ${spinOne ? 'тепер твій' : 'тепер твої'}`,
    `${spins} ${spins === 1 ? 'spin' : 'spins'} — now yours`,
    `${spins} ${spins === 1 ? 'giro' : 'giros'} — ${spins === 1 ? 'ahora es tuyo' : 'ahora son tuyos'}`,
    `${spins} ${spins === 1 ? 'giro' : 'giros'} — ${spins === 1 ? 'agora é seu' : 'agora são seus'}`,
    `${spins} lượt quay — giờ là của bạn`,
    `${spins} putaran — kini milikmu`,
    `${spins} çevirme — artık senin`,
    `${spins} ${spins === 1 ? 'spin' : 'spinów'} — teraz ${spins === 1 ? 'twój' : 'twoje'}`,
  );
  const tapHint = L(
    'Нажми, чтобы открыть', 'Натисни, щоб відкрити', 'Tap to open', 'Toca para abrir', 'Toque para abrir',
    'Nhấn để mở', 'Ketuk untuk membuka', 'Açmak için dokun', 'Dotknij, aby otworzyć',
  );
  const claimCta = L('Забрать', 'Забрати', 'Claim', 'Recoger', 'Pegar', 'Nhận', 'Ambil', 'Al', 'Odbierz');
  const closeLabel = L('Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij');

  return (
    <BoonChestModal
      visible={visible}
      rarity={rarity}
      title={title}
      rewardLine={rewardLine}
      rewardArt="spin"
      tapHint={tapHint}
      claimCta={claimCta}
      closeLabel={closeLabel}
      onClaim={() => { void claim(); }}
      onClose={() => {
        // зачем: показ за неделю теперь один (MYSTERY_MONDAY_SHOWN_KEY), поэтому
        // закрытие «Позже»/крестиком больше НЕ откладывает награду — второго
        // показа не будет. Выдаём молча, чтобы спин не пропал: claim()
        // идемпотентен (claimedRef + ключ спина), задвоения не будет.
        void claim();
        setWantShow(false);
      }}
    />
  );
}
