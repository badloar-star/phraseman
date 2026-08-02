/**
 * sound_event_preview.tsx — запуск НАСТОЯЩЕГО интерфейса звукового события.
 *
 * Зачем: в Sound Lab тап по событию раньше только проигрывал звук, а на экране
 * оставалась статичная плашка. Владелец справедливо заметил, что так не видно
 * главного — как звук ложится на реальную анимацию тоста или модалки. Здесь
 * событие сопоставляется с тем UI, который его и издаёт в бою:
 *
 *  • тосты — через emitAppEvent('action_toast'): их рисует глобальный
 *    ActionToast из _layout.tsx, поэтому достаточно эмита, и вылетит
 *    настоящая плашка со своей анимацией, хаптикой и звуком;
 *  • модалки — монтируются прямо в лаборатории по своему пропсу `visible`.
 *
 * Звук при этом НЕ дублируем: тост и модалка сами зовут soundDirector, как в
 * приложении. Двойной вызов дал бы кулдаун-дедуп и лживую картину.
 *
 * Живёт отдельным файлом (а не внутри _admin_sound_lab.tsx) намеренно: этот
 * экран правит другая сессия, и общий файл означал бы конфликт.
 */
import React, { memo, useCallback, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';

import { emitAppEvent } from '../../app/events';
import type { SoundEventId } from '../../modules/audio/sound_events';
import NoEnergyModal from '../NoEnergyModal';
import PremiumCelebrationModal from '../PremiumCelebrationModal';
import LeagueResultModal from '../../app/LeagueResultModal';
import BoonChestModal from '../BoonChestModal';
import { getThemedShardIcon } from '../../constants/levelGiftRewardIcons';
import { useTheme } from '../ThemeContext';

/** Какой UI умеет показать лаборатория для конкретного события. */
export type PreviewKind = 'toast' | 'modal' | 'sound-only';

type ToastSpec = {
  kind: 'toast';
  /** Тип тоста — от него зависят иконка, подпись, хаптика и звук по умолчанию. */
  type: 'success' | 'error' | 'info' | 'warning' | 'reward';
  text: string;
  /** Явный звук, когда он отличается от типового (напр. подарок, квест). */
  soundEventId?: SoundEventId;
};

type ModalSpec = {
  kind: 'modal';
  modal: 'no-energy' | 'premium' | 'vip' | 'league-promo' | 'league-demote' | 'chest';
};

type PreviewSpec = ToastSpec | ModalSpec;

/**
 * Сопоставление «событие → его настоящий UI».
 * Событий, которые звучат без своего интерфейса (record_ready, turn_ready,
 * no_speech, тики таймера), здесь намеренно нет — для них лаборатория остаётся
 * чистым проигрывателем, и это честнее, чем рисовать несуществующую плашку.
 */
const PREVIEW: Partial<Record<SoundEventId, PreviewSpec>> = {
  'pm.system.success': { kind: 'toast', type: 'success', text: 'Готово — изменения сохранены' },
  'pm.system.info': { kind: 'toast', type: 'info', text: 'Информационное сообщение' },
  'pm.system.warning': { kind: 'toast', type: 'warning', text: '🔥 Цепочка 12 дн. сгорит в полночь — позанимайся, чтобы сохранить' },
  'pm.system.error_recoverable': { kind: 'toast', type: 'error', text: 'Не удалось загрузить — проверь соединение' },
  'pm.reward.small': { kind: 'toast', type: 'reward', text: '+15 XP за упражнение' },

  'pm.social.gift_received': {
    kind: 'toast',
    type: 'reward',
    text: '🎁 Друг прислал тебе подарок',
    soundEventId: 'pm.social.gift_received',
  },
  'pm.social.friend_request': {
    kind: 'toast',
    type: 'info',
    text: '👋 Тебе пришла заявка в друзья',
    soundEventId: 'pm.social.friend_request',
  },
  'pm.social.quest_complete': {
    kind: 'toast',
    type: 'reward',
    text: '✅ Задание дня выполнено',
    soundEventId: 'pm.social.quest_complete',
  },

  // зачем: у этих событий своего окна нет, но показать их «как в жизни» всё
  // равно можно — тостом с их собственным звуком. Владельцу нужно видеть
  // интерфейс у КАЖДОГО события, а не у полутора десятков.
  'pm.learn.correct': { kind: 'toast', type: 'success', text: 'Верно!', soundEventId: 'pm.learn.correct' },
  'pm.learn.needs_work': { kind: 'toast', type: 'error', text: 'Почти — попробуй ещё раз', soundEventId: 'pm.learn.needs_work' },
  'pm.learn.hint_reveal': { kind: 'toast', type: 'info', text: '💡 Подсказка открыта', soundEventId: 'pm.learn.hint_reveal' },
  'pm.learn.timer_warning': { kind: 'toast', type: 'warning', text: '⏳ Осталось 5 секунд', soundEventId: 'pm.learn.timer_warning' },
  'pm.learn.timer_expired': { kind: 'toast', type: 'warning', text: '⏰ Время вышло', soundEventId: 'pm.learn.timer_expired' },
  'pm.learn.combo_5': { kind: 'toast', type: 'reward', text: '🔥 Серия из 5!', soundEventId: 'pm.learn.combo_5' },
  'pm.learn.combo_10': { kind: 'toast', type: 'reward', text: '🔥 Серия из 10!', soundEventId: 'pm.learn.combo_10' },

  'pm.voice.record_ready': { kind: 'toast', type: 'info', text: '🎤 Говори', soundEventId: 'pm.voice.record_ready' },
  'pm.voice.turn_ready': { kind: 'toast', type: 'info', text: '💬 Твой ход', soundEventId: 'pm.voice.turn_ready' },
  'pm.voice.no_speech': { kind: 'toast', type: 'error', text: '🔇 Не расслышал — скажи чуть громче', soundEventId: 'pm.voice.no_speech' },

  'pm.complete.micro': { kind: 'toast', type: 'success', text: 'Блок пройден', soundEventId: 'pm.complete.micro' },
  'pm.complete.session': { kind: 'toast', type: 'success', text: 'Занятие завершено', soundEventId: 'pm.complete.session' },
  'pm.complete.perfect': { kind: 'toast', type: 'reward', text: '⭐ Идеально — без ошибок!', soundEventId: 'pm.complete.perfect' },
  'pm.complete.exam_pass': { kind: 'toast', type: 'reward', text: '🎓 Экзамен сдан', soundEventId: 'pm.complete.exam_pass' },
  'pm.complete.exam_retry': { kind: 'toast', type: 'warning', text: 'Экзамен не сдан — попробуй ещё', soundEventId: 'pm.complete.exam_retry' },
  'pm.complete.star_1': { kind: 'toast', type: 'reward', text: '⭐ Первая звезда', soundEventId: 'pm.complete.star_1' },
  'pm.complete.star_2': { kind: 'toast', type: 'reward', text: '⭐⭐ Вторая звезда', soundEventId: 'pm.complete.star_2' },
  'pm.complete.star_3': { kind: 'toast', type: 'reward', text: '⭐⭐⭐ Третья звезда', soundEventId: 'pm.complete.star_3' },

  'pm.system.destructive_done': { kind: 'toast', type: 'warning', text: '🗑 Аккаунт удалён', soundEventId: 'pm.system.destructive_done' },
  'pm.energy.refilled': { kind: 'toast', type: 'reward', text: '⚡ Энергия восстановлена', soundEventId: 'pm.energy.refilled' },
  'pm.streak.saved': { kind: 'toast', type: 'reward', text: '🔥 Цепочка сохранена', soundEventId: 'pm.streak.saved' },
  'pm.reward.collectible': { kind: 'toast', type: 'reward', text: '🃏 Новая карточка в коллекцию', soundEventId: 'pm.reward.collectible' },
  'pm.reward.achievement': { kind: 'toast', type: 'reward', text: '🏅 Достижение получено', soundEventId: 'pm.reward.achievement' },
  'pm.reward.level_up': { kind: 'toast', type: 'reward', text: '🆙 Новый уровень!', soundEventId: 'pm.reward.level_up' },
  // зачем: у сундука есть СВОЯ модалка с тряской, откидыванием крышки и влётом
  // награды — именно её и надо смотреть вместе со звуком. Тост показал бы
  // только плашку и скрыл всю анимацию, ради которой событие и проверяют.
  'pm.reward.chest_open': { kind: 'modal', modal: 'chest' },

  'pm.energy.empty': { kind: 'modal', modal: 'no-energy' },
  'pm.reward.premium_open': { kind: 'modal', modal: 'premium' },
  'pm.reward.premium_finale': { kind: 'modal', modal: 'premium' },
  'pm.reward.vip_open': { kind: 'modal', modal: 'vip' },
  'pm.reward.vip_finale': { kind: 'modal', modal: 'vip' },
  'pm.league.promoted': { kind: 'modal', modal: 'league-promo' },
  'pm.league.demoted': { kind: 'modal', modal: 'league-demote' },
};

/**
 * Сколько слушателей у 'action_toast' прямо сейчас.
 * зачем: если глобальный ActionToast по какой-то причине не смонтирован, эмит
 * уходит в пустоту БЕЗ ошибки — снаружи это выглядит как «ничего не
 * запускается». Показываем это число в вердикте, чтобы отличать «тост не
 * показался» от «его вообще некому показать».
 */
export function actionToastListenerCount(): number {
  try {
    return DeviceEventEmitter.listenerCount('action_toast');
  } catch {
    return -1;
  }
}

export function previewKindFor(id: SoundEventId): PreviewKind {
  const spec = PREVIEW[id];
  return spec ? spec.kind : 'sound-only';
}

/** Человеческая метка для строки списка: что произойдёт по тапу. */
export function previewLabelFor(id: SoundEventId): string | null {
  const kind = previewKindFor(id);
  if (kind === 'toast') return 'покажет настоящий тост';
  if (kind === 'modal') return 'откроет настоящую модалку';
  return null;
}

function leagueResult(promoted: boolean) {
  return {
    prevLeagueId: promoted ? 1 : 2,
    newLeagueId: promoted ? 2 : 1,
    myRank: promoted ? 2 : 27,
    totalInGroup: 30,
    promoted,
    demoted: !promoted,
    group: [],
  };
}

type Props = {
  /** Событие, чей UI показываем. null — ничего не смонтировано. */
  eventId: SoundEventId | null;
  onDismiss: () => void;
};

/**
 * Возвращает true, если для события удалось запустить НАСТОЯЩИЙ UI.
 * false — интерфейса нет, вызывающий сам играет звук.
 */
export function launchToastPreview(id: SoundEventId): boolean {
  const spec = PREVIEW[id];
  if (!spec || spec.kind !== 'toast') return false;
  // зачем: звук здесь НЕ зовём — ActionToast сам просит его у директора в
  // момент, когда плашка реально начинает показ. Свой вызов рядом означал бы
  // два запроса на одно событие и дедуп по кулдауну.
  emitAppEvent('action_toast', {
    type: spec.type,
    ...(spec.soundEventId ? { soundEventId: spec.soundEventId } : null),
    messageRu: spec.text,
  });
  return true;
}

/** Монтирует настоящую модалку события. Ничего не рисует для остальных. */
function SoundEventPreviewHost({ eventId, onDismiss }: Props) {
  const { themeMode } = useTheme();
  const spec = eventId ? PREVIEW[eventId] : undefined;
  const modal = spec && spec.kind === 'modal' ? spec.modal : null;

  if (!modal) return null;

  if (modal === 'chest') {
    return (
      <BoonChestModal
        visible
        rarity="epic"
        rewardIcon={getThemedShardIcon(themeMode)}
        title="Сундук идеальной недели"
        rewardLine="25 жемчужин — теперь твои (превью, без начисления)"
        tapHint="Нажми, чтобы открыть"
        claimCta="Забрать"
        closeLabel="Закрыть"
        // зачем: в лаборатории награда НЕ начисляется — открытие сундука здесь
        // проверяет анимацию и звук, а не выдаёт жемчуг тестеру.
        onClaim={onDismiss}
        onClose={onDismiss}
      />
    );
  }

  if (modal === 'no-energy') {
    return (
      <NoEnergyModal
        visible
        onClose={onDismiss}
        // зачем: в лаборатории энергия у тестера обычно полная и аккаунт часто
        // премиальный — без этих QA-флагов модалка просто не отрисовалась бы.
        qaForceShardCta
        qaIgnorePremiumAccess
      />
    );
  }

  if (modal === 'premium' || modal === 'vip') {
    return <PremiumCelebrationModal visible onClose={onDismiss} variant={modal} />;
  }

  return (
    <LeagueResultModal
      visible
      result={leagueResult(modal === 'league-promo')}
      onClose={onDismiss}
    />
  );
}

export const SoundEventPreview = memo(SoundEventPreviewHost);

/** Состояние превью + запуск. Держит логику вне экрана лаборатории. */
export function useSoundEventPreview() {
  const [previewEvent, setPreviewEvent] = useState<SoundEventId | null>(null);

  /** true — UI запущен и звук прозвучит сам; false — играть звук вызывающему. */
  const openPreview = useCallback((id: SoundEventId): boolean => {
    const kind = previewKindFor(id);
    if (kind === 'toast') return launchToastPreview(id);
    if (kind === 'modal') {
      setPreviewEvent(id);
      return true;
    }
    return false;
  }, []);

  const dismissPreview = useCallback(() => setPreviewEvent(null), []);

  return { previewEvent, openPreview, dismissPreview };
}
