/**
 * _admin_sound_lab.tsx — DEV/QA превью всех семантических звуков приложения.
 *
 * Зачем: звуки разбросаны по экранам и слышны только в момент реального
 * события (истёк таймер, пришла заявка в друзья, удалён аккаунт). Руками
 * половину не воспроизвести, а на слух невозможно сравнить громкость двух
 * соседних наград. Эта лаборатория проигрывает ЛЮБОЕ событие каталога по
 * тапу — тем же путём, что и приложение (soundDirector.request), поэтому
 * слышно ровно то, что услышит пользователь, вместе с кулдаунами и
 * приоритетами арбитра.
 *
 * Ещё она отвечает на вопрос «почему тихо?»: у каждой строки есть метка
 * состояния — есть ли WAV-файл и подключено ли событие к экрану. Раньше
 * событие могло иметь звук, лежать в каталоге и не вызываться ниоткуда, и
 * увидеть это можно было только грепом.
 *
 * Открывается только под ENABLE_DEV_TOOLS из хаба настроек. В продакшн-сборке
 * экран вырезается (см. стаб admin_sound_lab.tsx) и редиректит на главную.
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  Easing as REasing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { useTheme } from '../components/ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { SOUND_EVENTS, type SoundEventId, type SoundFamily } from '../modules/audio/sound_events';
import { soundDirector } from '../modules/audio/sound_director';
import { getSoundSettingsSnapshot } from '../modules/audio/sound_settings';
import {
  SoundEventPreview,
  actionToastListenerCount,
  previewKindFor,
  previewLabelFor,
  useSoundEventPreview,
} from '../components/admin_panel/sound_event_preview';
import { SOUND_MOTION, type SoundMotionProfile } from '../modules/audio/sound_motion';

/** Порядок групп — как в каталоге, чтобы лаборатория читалась вместе с ним. */
const FAMILY_ORDER: readonly SoundFamily[] = [
  'learning',
  'voice',
  'completion',
  'system',
  'energy',
  'streak',
  'reward',
  'arena',
  'league',
  'social',
];

const FAMILY_TITLE: Record<SoundFamily, string> = {
  learning: 'Учёба',
  voice: 'Голос и запись',
  completion: 'Завершение',
  system: 'Системные',
  energy: 'Энергия',
  streak: 'Цепочка',
  reward: 'Награды',
  arena: 'Арена',
  league: 'Лига',
  social: 'Социальное',
};

const FAMILY_ICON: Record<SoundFamily, string> = {
  learning: 'school-outline',
  voice: 'mic-outline',
  completion: 'checkmark-done-outline',
  system: 'information-circle-outline',
  energy: 'flash-outline',
  streak: 'flame-outline',
  reward: 'gift-outline',
  arena: 'game-controller-outline',
  league: 'trophy-outline',
  social: 'people-outline',
};

type EventRow = {
  id: SoundEventId;
  family: SoundFamily;
  hasAsset: boolean;
  volume: number;
  priority: number;
  cooldownMs: number;
  durationMs: number;
  deferAfterVoice: boolean;
  iosOnly: boolean;
};

function buildRows(): readonly EventRow[] {
  return (Object.keys(SOUND_EVENTS) as SoundEventId[]).map((id) => {
    const d = SOUND_EVENTS[id];
    return {
      id,
      family: d.family,
      hasAsset: d.source !== null,
      volume: d.volume,
      priority: d.priority,
      cooldownMs: d.cooldownMs,
      durationMs: d.durationMs,
      deferAfterVoice: d.deferAfterVoice,
      iosOnly: d.platform === 'ios',
    };
  });
}

/** Высота полосы прогресса звука. */
const WAVE_TRACK_HEIGHT = 4;

/**
 * Человеческие названия событий.
 *
 * зачем: в списке владелец ищет «что происходит в игре», а не идентификатор из
 * каталога. `pm.complete.exam_pass` требует расшифровки, «Экзамен сдан» — нет.
 * Сам идентификатор остаётся в вердикте под кнопкой, где он реально нужен.
 */
const EVENT_TITLE: Partial<Record<SoundEventId, string>> = {
  'pm.learn.correct': 'Верный ответ',
  'pm.learn.needs_work': 'Ответ неверный',
  'pm.learn.hint_reveal': 'Открыта подсказка',
  'pm.learn.timer_warning': 'Время на исходе',
  'pm.learn.timer_expired': 'Время вышло',
  'pm.learn.combo_5': 'Серия из 5',
  'pm.learn.combo_10': 'Серия из 10',
  'pm.voice.record_ready': 'Запись началась',
  'pm.voice.turn_ready': 'Твоя очередь говорить',
  'pm.voice.no_speech': 'Речь не распознана',
  'pm.complete.micro': 'Блок пройден',
  'pm.complete.session': 'Урок завершён',
  'pm.complete.perfect': 'Идеальный результат',
  'pm.complete.exam_pass': 'Экзамен сдан',
  'pm.complete.exam_retry': 'Экзамен не сдан',
  'pm.complete.star_1': 'Первая звезда',
  'pm.complete.star_2': 'Вторая звезда',
  'pm.complete.star_3': 'Третья звезда',
  'pm.system.success': 'Успешно',
  'pm.system.info': 'Уведомление',
  'pm.system.warning': 'Предупреждение',
  'pm.system.error_recoverable': 'Ошибка',
  'pm.system.destructive_done': 'Удаление выполнено',
  'pm.energy.empty': 'Энергия кончилась',
  'pm.energy.refilled': 'Энергия восполнена',
  'pm.streak.saved': 'Цепочка сохранена',
  'pm.reward.small': 'Небольшая награда',
  'pm.reward.collectible': 'Коллекционный предмет',
  'pm.reward.achievement': 'Достижение получено',
  'pm.reward.level_up': 'Новый уровень',
  'pm.reward.chest_open': 'Сундук открыт',
  'pm.reward.premium_open': 'Премиум: открытие',
  'pm.reward.premium_finale': 'Премиум: финал',
  'pm.reward.vip_open': 'VIP: открытие',
  'pm.reward.vip_finale': 'VIP: финал',
  'pm.arena.match_found': 'Соперник найден',
  'pm.arena.countdown_3': 'Отсчёт: три',
  'pm.arena.countdown_2': 'Отсчёт: два',
  'pm.arena.countdown_1': 'Отсчёт: один',
  'pm.arena.round_start': 'Раунд начался',
  'pm.arena.victory': 'Победа',
  'pm.arena.defeat': 'Поражение',
  'pm.arena.draw': 'Ничья',
  'pm.league.promoted': 'Повышение в лиге',
  'pm.league.demoted': 'Понижение в лиге',
  'pm.social.gift_received': 'Подарок от друга',
  'pm.social.friend_request': 'Заявка в друзья',
  'pm.social.quest_complete': 'Задание выполнено',
};

/**
 * Строка события: играет звук и одновременно двигается по его волне.
 *
 * зачем: владелец просил, чтобы в лаборатории было слышно И видно. Тайминги
 * берутся из `SOUND_MOTION` — таблицы, измеренной разбором PCM каждого WAV:
 * подъём идёт до пика на `attackMs`, вспышки падают на `hits[]`, движение
 * гаснет на `audibleMs` (реальном звучании, а не длине файла — у всех WAV
 * длинный хвост тишины). Поэтому движение совпадает со звуком, а не «примерно».
 */
const SoundEventRow = memo(function SoundEventRow({
  row, t, onPlay, onShowUi,
}: {
  row: EventRow;
  t: ReturnType<typeof useTheme>['theme'];
  onPlay: (row: EventRow) => void;
  onShowUi: (row: EventRow) => void;
}) {
  const motion: SoundMotionProfile | undefined = SOUND_MOTION[row.id];

  const pulse = useSharedValue(0);
  const glow = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => () => {
    cancelAnimation(pulse);
    cancelAnimation(glow);
    cancelAnimation(progress);
  }, [pulse, glow, progress]);

  // Звонкий тембр — золото, глухой — акцент темы. Порог 0.55 подобран по
  // измеренной яркости: выше него звуки читаются как «звенящие».
  const tone = motion && motion.bright > 0.55 ? '#FFC800' : t.accent;

  const handlePress = useCallback(() => {
    onPlay(row);
    if (!motion) return;

    const audible = motion.audibleMs;
    const attack = Math.max(16, motion.attackMs || Math.round(audible * 0.25));

    // зачем: половина звуков очень короткая (hint_reveal 47 мс, no_speech 109 мс).
    // Если гасить движение строго на длине звука, глаз не успевает его поймать —
    // владелец так и сказал: «только играет звук, анимации не вижу». Поэтому
    // подъём остаётся привязан к атаке звука (совпадение слышно и видно), а
    // спад получает минимум 260 мс «выдоха» — движение читается, но не живёт
    // своей жизнью: оно всё ещё начинается вместе со звуком.
    const release = Math.max(260, audible - attack);

    cancelAnimation(pulse);
    pulse.value = 0;
    pulse.value = withSequence(
      withTiming(1, { duration: attack, easing: REasing.out(REasing.cubic) }),
      withTiming(0, { duration: release, easing: REasing.out(REasing.quad) }),
    );

    cancelAnimation(glow);
    glow.value = 0;
    const hits = motion.hits.length ? motion.hits : [attack];
    for (const at of hits) {
      glow.value = withDelay(
        at,
        withSequence(
          withTiming(1, { duration: 60, easing: REasing.out(REasing.cubic) }),
          withTiming(0, { duration: 300, easing: REasing.out(REasing.quad) }),
        ),
      );
    }

    cancelAnimation(progress);
    progress.value = 0;
    progress.value = withTiming(1, { duration: audible, easing: REasing.linear });
  }, [onPlay, row, motion, pulse, glow, progress]);

  // зачем: амплитуды подняты после проверки на устройстве — прежние 3% масштаба
  // и 22% свечения были не видны, особенно на светлой теме. Здесь лаборатория,
  // а не боевой экран: движение должно ЧИТАТЬСЯ, иначе проверять нечего.
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.045 }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.5,
    backgroundColor: tone,
  }));
  // Иконка — главный индикатор: она заметно раздувается и наливается цветом.
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.75 }],
    opacity: 0.55 + pulse.value * 0.45,
  }));
  const previewLabel = previewLabelFor(row.id);
  /** Полоса «сколько звук ещё звучит» — один узел вместо 26 столбиков. */
  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <Animated.View style={cardStyle}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={!row.hasAsset}
        testID={`sound-lab-event-${row.id}`}
        accessibilityRole="button"
        accessibilityLabel={
          row.hasAsset ? `Проиграть ${row.id}` : `${row.id} — нет файла, событие молчит`
        }
        accessibilityState={{ disabled: !row.hasAsset }}
        style={[styles.row, { backgroundColor: t.bgCard }, !row.hasAsset && styles.rowSilent]}
      >
        <Animated.View style={[StyleSheet.absoluteFill, styles.rowGlow, glowStyle]} pointerEvents="none" />

        <View style={{ flex: 1 }}>
          {/* зачем: человеческое название вместо идентификатора. Владелец
              проверяет «что происходит в игре», а не читает каталог: строка
              «Верный ответ» отвечает на это сразу, pm.learn.correct — нет. */}
          <Text style={[styles.rowTitle, { color: t.textPrimary }]} numberOfLines={1}>
            {EVENT_TITLE[row.id] ?? row.id}
          </Text>
          {!row.hasAsset ? (
            <Text style={[styles.rowDesc, { color: t.textMuted }]}>
              звука пока нет — событие молчит
            </Text>
          ) : null}
          {/* зачем: заранее видно, что даст тап — настоящий тост/модалку или
              только звук. Без этого «просто плашка» выглядела как поломка. */}
          {row.hasAsset && previewLabel ? (
            <Text style={[styles.rowDesc, { color: t.accent }]}>{previewLabel}</Text>
          ) : null}

          {motion ? (
            <>
              {/* зачем: раньше здесь было 26 отдельных анимируемых столбиков на
                  КАЖДУЮ из 39 строк — больше тысячи узлов Reanimated на экране,
                  из-за чего тормозила и анимация, и сам звук. Одна полоса
                  прогресса даёт то же понимание («звук идёт вот столько»)
                  ценой одного анимируемого узла. */}
              {/* зачем: полоса показывает, что звук ещё идёт. Технические цифры
                  (мс, число ударов, форма огибающей) отсюда убраны — владелец
                  проверяет события приложения, а не разбирает звуковые файлы. */}
              <View style={[styles.waveTrack, { backgroundColor: t.textGhost }]}>
                <Animated.View style={[styles.waveFill, { backgroundColor: tone }, fillStyle]} />
              </View>
            </>
          ) : null}
        </View>

        {/* зачем: отдельная кнопка, а не тап по строке. Владелец жаловался, что
            «окна и тосты не запускаются»: тап по строке играл звук, и было
            неочевидно, чем вызвать сам интерфейс. Теперь это явное действие. */}
        {previewLabel ? (
          <TouchableOpacity
            onPress={() => onShowUi(row)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Показать интерфейс события ${row.id}`}
            testID={`sound-lab-ui-${row.id}`}
            style={styles.uiBtn}
          >
            <Ionicons name="albums-outline" size={20} color={t.accent} />
          </TouchableOpacity>
        ) : null}

        <Animated.View style={iconStyle}>
          <Ionicons
            name={row.hasAsset ? 'play-circle-outline' : 'ban-outline'}
            size={22}
            color={row.hasAsset ? tone : t.textMuted}
          />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function AdminSoundLab() {
  const router = useRouter();
  const { theme: t } = useTheme();
  const insets = useStableSafeAreaInsets();

  const rows = useMemo(buildRows, []);
  /** Последнее сыгранное + вердикт арбитра — видно, почему звук не прозвучал. */
  const [lastPlayed, setLastPlayed] = useState<{ id: SoundEventId; verdict: string } | null>(null);
  const [effectsEnabled, setEffectsEnabled] = useState(() => getSoundSettingsSnapshot().effectsEnabled);
  const { previewEvent, openPreview, dismissPreview } = useSoundEventPreview();

  const grouped = useMemo(() => {
    return FAMILY_ORDER.map((family) => ({
      family,
      items: rows.filter((r) => r.family === family),
    })).filter((g) => g.items.length > 0);
  }, [rows]);

  const totals = useMemo(() => {
    const withAsset = rows.filter((r) => r.hasAsset).length;
    return { all: rows.length, withAsset, silent: rows.length - withAsset };
  }, [rows]);

  /** Тап по строке — только звук, тем же путём, что и приложение. */
  const play = useCallback((row: EventRow) => {
    hapticTap();
    const decision = soundDirector.request(row.id, { scope: 'sound-lab' });
    const verdict =
      decision.kind === 'play'
        ? 'играет'
        : decision.kind === 'defer'
          ? 'отложен до конца речи'
          : `пропущен: ${decision.reason}`;
    setLastPlayed({ id: row.id, verdict });
  }, []);

  /**
   * Кнопка справа — поднять НАСТОЯЩИЙ интерфейс события.
   * зачем: тост и модалка сами зовут директора в момент показа, поэтому свой
   * request здесь НЕ делаем — иначе два запроса на одно событие и дедуп по
   * кулдауну съел бы звук у настоящей плашки.
   */
  const showUi = useCallback((row: EventRow) => {
    hapticTap();
    const kind = previewKindFor(row.id);
    const launched = openPreview(row.id);
    if (!launched) {
      setLastPlayed({ id: row.id, verdict: 'у события нет своего интерфейса' });
      return;
    }
    // зачем: у тоста показ делает ГЛОБАЛЬНЫЙ ActionToast — если он не смонтирован,
    // эмит уходит в пустоту молча, и снаружи это выглядит как «кнопка работает,
    // интерфейс не запускается». Показываем число слушателей: 0 — виноват не
    // эмит, а отсутствующий хост, и искать надо там.
    const listeners = kind === 'toast' ? actionToastListenerCount() : -1;
    setLastPlayed({
      id: row.id,
      verdict:
        kind === 'modal'
          ? 'открыта настоящая модалка'
          : listeners > 0
            ? `тост отправлен (слушателей: ${listeners})`
            : `тост отправлен, но слушателей НЕТ (${listeners}) — ActionToast не смонтирован`,
    });
  }, [openPreview]);

  const toggleEffects = useCallback(() => {
    hapticTap();
    setEffectsEnabled((prev) => {
      const next = !prev;
      // зачем: локальный тумблер лаборатории, чтобы проверить «выключенные
      // эффекты» не выходя в настройки. Сам пользовательский параметр не
      // трогаем — сюда придёт его значение при следующем изменении настроек.
      soundDirector.setEffectsEnabled(next);
      return next;
    });
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: t.bgPrimary, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Назад"
          testID="sound-lab-back"
        >
          <Ionicons name="chevron-back" size={26} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Звуки — все события</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: t.textMuted }]}>
          {`${totals.all} событий, из них ${totals.withAsset} со звуком и ${totals.silent} пока без файла. `}
          Тап по строке проигрывает событие так же, как это делает приложение — через арбитра,
          с его кулдаунами и приоритетами.
        </Text>

        <TouchableOpacity
          onPress={toggleEffects}
          activeOpacity={0.8}
          testID="sound-lab-effects-toggle"
          accessibilityRole="switch"
          accessibilityLabel="Звуковые эффекты"
          accessibilityState={{ checked: effectsEnabled }}
          style={[styles.toggleBtn, { backgroundColor: t.bgCard }]}
        >
          <Ionicons
            name={effectsEnabled ? 'volume-high' : 'volume-mute'}
            size={22}
            color={effectsEnabled ? t.accent : t.textMuted}
            style={{ marginRight: 12 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: t.textPrimary }]}>
              {effectsEnabled ? 'Звуковые эффекты включены' : 'Звуковые эффекты выключены'}
            </Text>
          </View>
          <Ionicons
            name={effectsEnabled ? 'toggle' : 'toggle-outline'}
            size={30}
            color={effectsEnabled ? t.accent : t.textMuted}
          />
        </TouchableOpacity>

        {lastPlayed && (
          <View style={[styles.verdict, { backgroundColor: t.bgCard }]}>
            <Text style={[styles.verdictId, { color: t.textPrimary }]} numberOfLines={1}>
              {lastPlayed.id}
            </Text>
            <Text style={[styles.verdictText, { color: t.textMuted }]}>{lastPlayed.verdict}</Text>
          </View>
        )}

        {grouped.map((group) => (
          <View key={group.family}>
            <View style={styles.groupHead}>
              <Ionicons
                name={FAMILY_ICON[group.family] as never}
                size={15}
                color={t.textSecond}
                style={{ marginRight: 7 }}
              />
              <Text style={[styles.sectionLabel, { color: t.textSecond }]}>
                {FAMILY_TITLE[group.family].toUpperCase()}
              </Text>
            </View>

            {group.items.map((row) => (
              <SoundEventRow key={row.id} row={row} t={t} onPlay={play} onShowUi={showUi} />
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Настоящая модалка события — поверх списка, со своей анимацией и звуком.
          Тосты сюда не попадают: их рисует глобальный ActionToast из _layout. */}
      <SoundEventPreview eventId={previewEvent} onDismiss={dismissPreview} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  intro: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  groupHead: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  verdict: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 4 },
  verdictId: { fontSize: 13, fontWeight: '700' },
  verdictText: { fontSize: 12, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  /** Без файла — приглушаем всю строку, а не подписываем её мелким шрифтом. */
  rowSilent: { opacity: 0.45 },
  rowTitle: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  rowDesc: { fontSize: 12, lineHeight: 17 },
  /** Вспышка на ударах волны — заливка тоном, а не рамка. */
  rowGlow: { borderRadius: 12 },
  waveTrack: {
    height: WAVE_TRACK_HEIGHT,
    borderRadius: WAVE_TRACK_HEIGHT / 2,
    marginTop: 8,
    marginBottom: 6,
    overflow: 'hidden',
    opacity: 0.5,
  },
  waveFill: { height: '100%', borderRadius: WAVE_TRACK_HEIGHT / 2 },
  uiBtn: { paddingHorizontal: 10, paddingVertical: 8, marginLeft: 4 },
});
