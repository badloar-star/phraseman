// зачем: владелец забраковал витрину «скриптовых режимов» и указал на правильный
// слой поставки Kimi — «УРОК — НОВОЕ (MVP)»: карта юнита → сессия → раннер с
// карточками, звёздами и лестницей подсказок. Этот экран и есть вход: показывает
// карту юнита, тап по узлу открывает сессию, выход из сессии возвращает на карту.
// Экран монтируется только на странице V2 (ENABLE_DEV_TOOLS) и не трогает сеть.
import React, { memo, useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { challengeFixture, unit1Fixture, sessionByRef } from './session/fixtures';
import { PracticeLab } from './session/PracticeLab';
import { SessionRunner } from './session/SessionRunner';
import { UnitMap } from './session/UnitMap';
import { ZoneCeremony } from './session/ZoneCeremony';
import type { SessionVM } from './session/contracts';
import { C, LEADING, RADIUS, SPACE, TEXT, WEIGHT } from './kimi/tokens';

interface LearningV2ModesLabProps {
  readonly bottomPadding?: number;
}

const LearningV2ModesLab = memo(function LearningV2ModesLab({ bottomPadding = 0 }: LearningV2ModesLabProps) {
  const [openSession, setOpenSession] = useState<SessionVM | null>(null);
  /** Боковой узел тропы: сейчас это «Моя практика». */
  const [openSurface, setOpenSurface] = useState<string | null>(null);
  /** Сессия, которая есть в карте, но ещё не перенесена из поставки. */
  const [pendingRef, setPendingRef] = useState<string | null>(null);
  /** Одноразовая церемония зоны после пройденной сессии. */
  const [ceremony, setCeremony] = useState<{ zoneTitle: string; canDo: string } | null>(null);

  const handleOpen = useCallback((sessionRef: string) => {
    const session = sessionByRef(sessionRef);
    // зачем: отклик мгновенный — переход на карточки без ожиданий и спиннеров
    if (session) {
      setPendingRef(null);
      setOpenSession(session);
      return;
    }
    // Честно говорим, что эта сессия ещё готовится, вместо пустого экрана.
    setPendingRef(sessionRef);
  }, []);

  const handleExit = useCallback(
    (completed?: boolean) => {
      // зачем: церемония зоны — награда именно за пройденную сессию; выход
      // крестиком её не запускает, иначе поздравление обесценится.
      if (completed && openSession) {
        setCeremony({ zoneTitle: openSession.zone, canDo: openSession.finale.canDo });
      }
      setOpenSession(null);
    },
    [openSession],
  );
  const handleSurfaceExit = useCallback(() => setOpenSurface(null), []);

  if (openSession) {
    return <SessionRunner session={openSession} onExit={handleExit} />;
  }

  if (openSurface === 'practice-lab') {
    return <PracticeLab onExit={handleSurfaceExit} bottomPadding={bottomPadding} />;
  }

  if (openSurface === 'challenge') {
    // зачем: челлендж — тот же раннер, но без подсказок и без показа ответа
    return <SessionRunner session={challengeFixture} onExit={handleSurfaceExit} challenge />;
  }

  return (
    <View style={s.root}>
      <UnitMap
        vm={unit1Fixture}
        onOpenSession={handleOpen}
        onOpenSurface={setOpenSurface}
        bottomPadding={bottomPadding}
      />
      {pendingRef ? (
        <View style={s.toast} accessibilityRole="alert">
          <Text style={s.toastText}>Эта сессия ещё готовится — открой «I am — о себе».</Text>
        </View>
      ) : null}
      {ceremony ? (
        <ZoneCeremony
          zoneTitle={ceremony.zoneTitle}
          canDo={ceremony.canDo}
          onDone={() => setCeremony(null)}
        />
      ) : null}
    </View>
  );
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bgCanvas },
  toast: {
    position: 'absolute',
    left: SPACE.s4,
    right: SPACE.s4,
    bottom: SPACE.s6,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s4,
    borderRadius: RADIUS.lg,
    backgroundColor: C.card3,
  },
  toastText: {
    fontSize: TEXT.sm,
    color: C.fgPrimary,
    fontWeight: WEIGHT.semibold,
    lineHeight: TEXT.sm * LEADING.snug,
  },
});

export default LearningV2ModesLab;
