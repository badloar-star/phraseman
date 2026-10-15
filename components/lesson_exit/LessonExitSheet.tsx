// ═══════════════════════════════════════════════════════════════════════════
// LessonExitSheet.tsx — шторка подтверждения «Выйти из урока?» (момент m15; эталон engagement-moments-v3-all.html, `exit3`).
//
// зачем (владелец 14.10: «перенести точно по макетам»; координатор: новая шторка на KitSheetModal, только за флагом moments_v3): выход из урока «назад» по умолчанию мгновенный, без вопроса. По образцу
// шторка спрашивает один раз: монета (60) дрожит со знаком пота на 0,4 с и кивает на 1,0 с — «просит остаться»; главная кнопка «Продолжить» (безопасный путь), вторичная «Выйти».
// Тексты — только правда кода: «Попытка не сохранится» всегда (D67: повторный вход в незавершённое занятие = новая попытка), фраза про энергию — только если энергия у человека действительно тратится
// (energyNote: не Plus и не тестер) и с числами из app/energy_contract.ts (окно бесплатного повторного входа D159, цена попытки). Компонент ничего не списывает и не пишет: «Выйти» зовёт прежний выход
// урока (колбэк), «Продолжить»/фон/«назад» закрывают шторку. Звуки V2: sheet_open на появлении, tap на дрожи; хаптик: лёгкий на появлении, средний на дрожи. reduceMotion — монета стоит.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import type { Lang } from '../../constants/i18n';
import { ENERGY_FREE_REENTRY_WINDOW_MS, ENERGY_SESSION_COST } from '../../app/energy_contract';
import { hapticMediumImpact, hapticTap } from '../../hooks/use-haptics';
import { useMyCoinRank } from '../../hooks/use_my_coin_rank';
import { playEvent } from '../../modules/sound_v2/sound_bank';
import MomentCoin from '../moments/MomentCoin';
import { useSpirePalette } from '../spire/useSpirePalette';
import { KitSheetModal } from '../v2/KitSheetModal';
import { V2Button } from '../v2/V2Kit';
import { lessonExitText } from './lesson_exit_strings';

/** Тайминги образца: дрожь + «пот» на 0,4 с, кивок на 1,0 с. */
export const LESSON_EXIT_SHIVER_MS = 400;
export const LESSON_EXIT_NOD_MS = 1000;

export type LessonExitSheetProps = Readonly<{
  lang: Lang;
  visible: boolean;
  /** true — у человека энергия за попытку тратится (не Plus, не тестер): добавляем фразу про энергию. */
  energyNote: boolean;
  /** «Продолжить», фон, «назад», перетаскивание вниз — шторка закрывается, урок продолжается. */
  onContinue: () => void;
  /** «Выйти» — прежний выход из урока (beginLessonExit + abandon + навигация). */
  onLeave: () => void;
  testID?: string;
}>;

function LessonExitSheet({ lang, visible, energyNote, onContinue, onLeave, testID = 'lesson-exit-sheet' }: LessonExitSheetProps) {
  const p = useSpirePalette();
  const reduceMotion = useReducedMotion();
  const coinRank = useMyCoinRank();
  const [mood, setMood] = useState<'idle' | 'shiver' | 'nod'>('idle');
  const [emote, setEmote] = useState<'sweat' | null>(null);

  // сценарий образца играет на каждом показе шторки; закрыли — сбрасываем в покой
  useEffect(() => {
    if (!visible) { setMood('idle'); setEmote(null); return undefined; }
    console.log(`[LESSON-EXIT] шторка показана: энергия_в_тексте=${String(energyNote)} reduceMotion=${String(reduceMotion)} ранг=${String(coinRank)}`); // guard-ok: единичный лог показа
    playEvent('sheet_open');
    void hapticTap();
    if (reduceMotion) return undefined;
    const shiver = setTimeout(() => { setMood('shiver'); setEmote('sweat'); playEvent('tap'); void hapticMediumImpact(); }, LESSON_EXIT_SHIVER_MS);
    const nod = setTimeout(() => { setMood('nod'); setEmote(null); }, LESSON_EXIT_NOD_MS);
    return () => { clearTimeout(shiver); clearTimeout(nod); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: сценарий зависит только от показа шторки
  }, [visible]);

  const minutes = Math.round(ENERGY_FREE_REENTRY_WINDOW_MS / 60_000);
  const body = energyNote
    ? `${lessonExitText(lang, 'body')} ${lessonExitText(lang, 'energy', { min: minutes, cost: ENERGY_SESSION_COST })}`
    : lessonExitText(lang, 'body');

  return (
    <KitSheetModal
      visible={visible}
      onRequestClose={onContinue}
      closeLabel={lessonExitText(lang, 'close')}
      testID={testID}
      header={(
        <View style={s.head}>
          <MomentCoin rank={coinRank} size={60} mood={mood} emote={emote} shadow={false} testID={`${testID}-coin`} />
          <View style={s.copy}>
            <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{lessonExitText(lang, 'title')}</Text>
            <Text style={[s.body, { color: p.textSecondary }]} testID={`${testID}-body`}>{body}</Text>
          </View>
        </View>
      )}
    >
      <View style={s.acts}>
        <V2Button label={lessonExitText(lang, 'keep')} onPress={onContinue} testID={`${testID}-continue`} />
        <View style={s.gap} />
        <V2Button label={lessonExitText(lang, 'leave')} variant="secondary" onPress={onLeave} testID={`${testID}-leave`} />
      </View>
    </KitSheetModal>
  );
}

const s = StyleSheet.create({
  // образец: ряд «монета 60 · заголовок + текст», зазор 14
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 6 },
  copy: { flex: 1, minWidth: 0 },
  // `.h-md` 21/26/700
  // зачем (Макеты 15.10, CODE_VS_ETALON; решение координатора): типографика по листам приёмки m15: заголовок шторки 26/31 · 800 · −0,4
  title: { fontSize: 26, lineHeight: 31, fontWeight: '800', letterSpacing: -0.4 },
  body: { marginTop: 4, fontSize: 16, lineHeight: 22 },
  // кнопки: отступ сверху 18, зазор 12
  acts: { marginTop: 18 },
  gap: { height: 12 },
});

export default memo(LessonExitSheet);
